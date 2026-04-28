import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

console.log('Target Project ID:', firebaseConfig.projectId);
console.log('Target Database ID:', firebaseConfig.firestoreDatabaseId);

let db = getFirestore(firebaseConfig.firestoreDatabaseId);

// Seed Data with retry
async function seedData(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Connecting to Firestore attempt ${i + 1}...`);
      const productsRef = db.collection('products');
      const snapshot = await productsRef.limit(1).get();

      if (snapshot.empty) {
        console.log('Seeding initial products...');
        const initialProducts = [
          { name: 'Atta', stock: 50, unit: 'kg', price: 45, minStock: 10 },
          { name: 'Milk', stock: 5, unit: 'packet', price: 30, minStock: 10 },
          { name: 'Sugar', stock: 25, unit: 'kg', price: 40, minStock: 5 },
          { name: 'Rice', stock: 100, unit: 'kg', price: 60, minStock: 20 },
        ];

        for (const p of initialProducts) {
          await productsRef.add(p);
        }

        // Seed some customers
        await db.collection('customers').doc('ram').set({ name: 'Ram', balance: 500 });
        await db.collection('customers').doc('mohan').set({ name: 'Mohan', balance: 0 });
        console.log('Seeding completed.');
      } else {
        console.log('Firestore connected and data exists.');
      }
      return; // Success
    } catch (err: any) {
      console.error(`Firestore connection attempt ${i + 1} failed:`, err.message);
      
      // If we got permission denied on the named database, try the default one
      if (err.message.includes('PERMISSION_DENIED') && i === 0) {
        console.log('Named database failed. Switching to default database for next attempts.');
        db = getFirestore(); // Fallback to default
      }
      
      if (i === retries - 1) throw err;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

async function startServer() {
  try {
    await seedData();
  } catch (err: any) {
    console.error('Initial seedData failed, but starting server anyway:', err.message);
  }

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Execute parsed intent
  app.post('/api/execute-intent', async (req, res) => {
    try {
      const { intent, params, transcript, reply, language } = req.body as {
        intent: string;
        params: any;
        transcript?: string;
        reply?: string;
        language?: string;
      };

      const timestamp = new Date().toISOString();
      let actionResult: { success: boolean; message: string; reply: string; intent: string } = {
        success: true,
        message: '',
        reply: reply || '',
        intent: intent || 'UNKNOWN'
      };

      if (intent === 'ADD_STOCK') {
        const { item, quantity } = params;
        const productsRef = db.collection('products');
        const query = await productsRef.where('name', '==', item).limit(1).get();

        if (!query.empty) {
          const doc = query.docs[0];
          await doc.ref.update({
            stock: FieldValue.increment(quantity),
          });
          actionResult.message = `Added ${quantity} ${doc.data().unit} to ${item}`;
        } else {
          actionResult.success = false;
          actionResult.message = `Product ${item} not found in inventory.`;
        }
      } else if (intent === 'SALE') {
        const { item, quantity } = params;
        const productsRef = db.collection('products');
        const query = await productsRef.where('name', '==', item).limit(1).get();

        if (!query.empty) {
          const doc = query.docs[0];
          const currentStock = doc.data().stock;
          if (currentStock >= quantity) {
            await doc.ref.update({
              stock: FieldValue.increment(-quantity),
            });
            actionResult.message = `Sold ${quantity} ${doc.data().unit} of ${item}`;
          } else {
            actionResult.success = false;
            actionResult.message = `Not enough stock. Only ${currentStock} left.`;
          }
        } else {
          actionResult.success = false;
          actionResult.message = `Product ${item} not found in inventory.`;
        }
      } else if (intent === 'CREDIT') {
        const { customer, amount } = params;
        const customerRef = db.collection('customers').doc(customer.toLowerCase());
        const doc = await customerRef.get();

        if (doc.exists) {
          await customerRef.update({
            balance: FieldValue.increment(amount),
          });
        } else {
          await customerRef.set({
            name: customer,
            balance: amount,
          });
        }

        actionResult.message = `Added ₹${amount} credit for ${customer}`;
      } else if (intent === 'PAYMENT') {
        const { customer, amount } = params;
        const customerRef = db.collection('customers').doc(customer.toLowerCase());
        await customerRef.update({
          balance: FieldValue.increment(-amount),
        });
        actionResult.message = `Recorded ₹${amount} payment from ${customer}`;
      } else {
        actionResult.success = false;
        actionResult.message = `Unknown intent: ${intent}`;
      }

      // Log Transaction
      if (actionResult.success) {
        try {
          await db.collection('transactions').add({
            type: intent,
            item: params.item || null,
            amount: params.amount || params.quantity || 0,
            customer: params.customer || null,
            timestamp,
            transcript: transcript || null,
            reply: reply || null,
            language: language || null,
            status: 'SUCCESS',
          });
        } catch (logErr: any) {
          console.error('Failed to log transaction, but action succeeded:', logErr.message);
        }
      }

      res.json({ ...actionResult, timestamp });
    } catch (error: any) {
      console.error('Error executing intent:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get('/api/kpis/today', async (req, res) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const transactionsSnap = await db
        .collection('transactions')
        .where('timestamp', '>=', todayStart.toISOString())
        .get();

      let salesToday = 0;
      transactionsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'SALE') {
          salesToday += data.amount || 0;
        }
      });

      const customersSnap = await db.collection('customers').get();
      let pendingKhata = 0;
      customersSnap.forEach((doc) => {
        pendingKhata += doc.data().balance || 0;
      });

      const productsSnap = await db.collection('products').get();
      let itemsInStock = 0;
      let lowStockCount = 0;
      productsSnap.forEach((doc) => {
        const data = doc.data();
        itemsInStock += data.stock || 0;
        if (data.stock <= data.minStock) {
          lowStockCount++;
        }
      });

      res.json({
        salesToday,
        pendingKhata,
        itemsInStock,
        lowStockCount,
      });
    } catch (error: any) {
      console.error('Error getting KPIs:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/history', async (req, res) => {
    try {
      const snapshot = await db
        .collection('transactions')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.json(history);
    } catch (error: any) {
      console.error('Error getting history:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/inventory', async (req, res) => {
    try {
      const snapshot = await db.collection('products').orderBy('name').get();
      const inventory = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.json(inventory);
    } catch (error: any) {
      console.error('Error getting inventory:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});