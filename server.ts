import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Firebase Init from environment variables ──────────────────────────────
if (!getApps().length) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const databaseId = process.env.FIREBASE_DATABASE_ID || '(default)';
console.log('Target Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Target Database ID:', databaseId);

let db = getFirestore(databaseId);

// ── Seed Data ──────────────────────────────────────────────────────────────
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
          { name: 'Oil', stock: 15, unit: 'litre', price: 120, minStock: 5 },
          { name: 'Dal', stock: 30, unit: 'kg', price: 90, minStock: 8 },
        ];
        for (const p of initialProducts) {
          await productsRef.add(p);
        }
        // Seed customers
        await db.collection('customers').doc('ram').set({ name: 'Ram', balance: 500 });
        await db.collection('customers').doc('mohan').set({ name: 'Mohan', balance: 0 });
        console.log('Seeding completed.');
      } else {
        console.log('Firestore connected and data exists.');
      }
      return;
    } catch (err: any) {
      console.error(`Firestore attempt ${i + 1} failed:`, err.message);
      if (err.message.includes('PERMISSION_DENIED') && i === 0) {
        console.log('Named DB failed. Falling back to default database.');
        db = getFirestore();
      }
      if (i === retries - 1) throw err;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// ── Server ──────────────────────────────────────────────────────────────────
async function startServer() {
  try {
    await seedData();
  } catch (err: any) {
    console.error('seedData failed, starting server anyway:', err.message);
  }

  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // ── POST /api/execute-intent ─────────────────────────────────────────────
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
      let actionResult: { success: boolean; message: string; reply: string; intent: string; data?: any } = {
        success: true,
        message: '',
        reply: reply || '',
        intent: intent || 'UNKNOWN',
      };

      // ── ADD_STOCK ──────────────────────────────────────────────────────────
      if (intent === 'ADD_STOCK') {
        const { item, quantity } = params;
        const q = await db.collection('products').where('name', '==', item).limit(1).get();
        if (!q.empty) {
          const doc = q.docs[0];
          await doc.ref.update({ stock: FieldValue.increment(quantity) });
          actionResult.message = `Added ${quantity} ${doc.data().unit} of ${item}`;
        } else {
          actionResult.success = false;
          actionResult.message = `Product "${item}" not found in inventory.`;
        }

      // ── SALE ──────────────────────────────────────────────────────────────
      } else if (intent === 'SALE') {
        const { item, quantity } = params;
        const q = await db.collection('products').where('name', '==', item).limit(1).get();
        if (!q.empty) {
          const doc = q.docs[0];
          const currentStock = doc.data().stock;
          if (currentStock >= quantity) {
            await doc.ref.update({ stock: FieldValue.increment(-quantity) });
            const revenue = quantity * (doc.data().price || 0);
            actionResult.message = `Sold ${quantity} ${doc.data().unit} of ${item}. Revenue: ₹${revenue}`;
          } else {
            actionResult.success = false;
            actionResult.message = `Not enough stock. Only ${currentStock} ${doc.data().unit} left.`;
          }
        } else {
          actionResult.success = false;
          actionResult.message = `Product "${item}" not found in inventory.`;
        }

      // ── CREDIT ────────────────────────────────────────────────────────────
      } else if (intent === 'CREDIT') {
        const { customer, amount } = params;
        const ref = db.collection('customers').doc(customer.toLowerCase());
        const doc = await ref.get();
        if (doc.exists) {
          await ref.update({ balance: FieldValue.increment(amount) });
        } else {
          await ref.set({ name: customer, balance: amount });
        }
        actionResult.message = `Added ₹${amount} credit for ${customer}`;

      // ── PAYMENT ───────────────────────────────────────────────────────────
      } else if (intent === 'PAYMENT') {
        const { customer, amount } = params;
        const ref = db.collection('customers').doc(customer.toLowerCase());
        const doc = await ref.get();
        if (!doc.exists) {
          actionResult.success = false;
          actionResult.message = `Customer "${customer}" not found.`;
        } else {
          await ref.update({ balance: FieldValue.increment(-amount) });
          actionResult.message = `Recorded ₹${amount} payment from ${customer}`;
        }

      // ── QUERY_STOCK ───────────────────────────────────────────────────────
      } else if (intent === 'QUERY_STOCK') {
        const { item } = params || {};
        if (item) {
          // Query for a specific item
          const q = await db.collection('products').where('name', '==', item).limit(1).get();
          if (!q.empty) {
            const data = q.docs[0].data();
            actionResult.data = { products: [{ id: q.docs[0].id, ...data }] };
            actionResult.message = `${item} has ${data.stock} ${data.unit} in stock.`;
            if (!actionResult.reply) {
              actionResult.reply = language === 'hi-IN'
                ? `${item} mein ${data.stock} ${data.unit} bacha hai.`
                : language === 'te-IN'
                ? `${item} lo ${data.stock} ${data.unit} undi.`
                : `${item} has ${data.stock} ${data.unit} remaining.`;
            }
          } else {
            actionResult.success = false;
            actionResult.message = `Product "${item}" not found.`;
          }
        } else {
          // Return full inventory
          const snap = await db.collection('products').orderBy('name').get();
          const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const lowStock = products.filter((p: any) => p.stock <= p.minStock);
          actionResult.data = { products };
          actionResult.message = `${products.length} items in inventory. ${lowStock.length} low-stock alerts.`;
          if (!actionResult.reply) {
            actionResult.reply = language === 'hi-IN'
              ? `Aapke paas ${products.length} items hain. ${lowStock.length} items kam hai.`
              : language === 'te-IN'
              ? `Meeru ${products.length} items unnai. ${lowStock.length} items takkuva.`
              : `You have ${products.length} items. ${lowStock.length} running low.`;
          }
        }

      // ── QUERY_SALE ────────────────────────────────────────────────────────
      } else if (intent === 'QUERY_SALE') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const snap = await db
          .collection('transactions')
          .where('timestamp', '>=', todayStart.toISOString())
          .where('type', '==', 'SALE')
          .get();

        let totalRevenue = 0;
        let totalUnits = 0;
        const salesByItem: Record<string, number> = {};

        snap.forEach(doc => {
          const d = doc.data();
          totalRevenue += (d.amount || 0) * (d.price || 0);
          totalUnits += d.amount || 0;
          if (d.item) salesByItem[d.item] = (salesByItem[d.item] || 0) + (d.amount || 0);
        });

        actionResult.data = { totalRevenue, totalUnits, salesByItem, count: snap.size };
        actionResult.message = `Today: ${snap.size} sales, ${totalUnits} units sold.`;
        if (!actionResult.reply) {
          actionResult.reply = language === 'hi-IN'
            ? `Aaj ${snap.size} sales hui. ${totalUnits} units becha.`
            : language === 'te-IN'
            ? `Ivi ${snap.size} sales ayindi. ${totalUnits} units ammaindi.`
            : `Today: ${snap.size} sales, ${totalUnits} units sold.`;
        }

      // ── UNKNOWN ───────────────────────────────────────────────────────────
      } else {
        actionResult.success = false;
        actionResult.message = `Unknown intent: ${intent}`;
      }

      // ── Log Transaction ───────────────────────────────────────────────────
      const readOnlyIntents = ['QUERY_STOCK', 'QUERY_SALE'];
      if (actionResult.success && !readOnlyIntents.includes(intent)) {
        try {
          await db.collection('transactions').add({
            type: intent,
            item: params?.item || null,
            amount: params?.amount || params?.quantity || 0,
            customer: params?.customer || null,
            timestamp,
            transcript: transcript || null,
            reply: reply || null,
            language: language || null,
            status: 'SUCCESS',
          });
        } catch (logErr: any) {
          console.error('Transaction log failed (action succeeded):', logErr.message);
        }
      }

      res.json({ ...actionResult, timestamp });
    } catch (error: any) {
      console.error('Error executing intent:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ── GET /api/kpis/today ──────────────────────────────────────────────────
  app.get('/api/kpis/today', async (req, res) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [transSnap, custSnap, prodSnap] = await Promise.all([
        db.collection('transactions').where('timestamp', '>=', todayStart.toISOString()).get(),
        db.collection('customers').get(),
        db.collection('products').get(),
      ]);

      let salesToday = 0;
      transSnap.forEach(doc => {
        if (doc.data().type === 'SALE') salesToday += doc.data().amount || 0;
      });

      let pendingKhata = 0;
      custSnap.forEach(doc => { pendingKhata += doc.data().balance || 0; });

      let itemsInStock = 0;
      let lowStockCount = 0;
      prodSnap.forEach(doc => {
        const d = doc.data();
        itemsInStock += d.stock || 0;
        if (d.stock <= d.minStock) lowStockCount++;
      });

      res.json({ salesToday, pendingKhata, itemsInStock, lowStockCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── GET /api/history ─────────────────────────────────────────────────────
  app.get('/api/history', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '20', 10);
      const snap = await db.collection('transactions').orderBy('timestamp', 'desc').limit(limit).get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── GET /api/inventory ───────────────────────────────────────────────────
  app.get('/api/inventory', async (req, res) => {
    try {
      const snap = await db.collection('products').orderBy('name').get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── GET /api/customers ───────────────────────────────────────────────────
  app.get('/api/customers', async (req, res) => {
    try {
      const snap = await db.collection('customers').orderBy('name').get();
      const customers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const totalKhata = customers.reduce((sum: number, c: any) => sum + (c.balance || 0), 0);
      res.json({ customers, totalKhata });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Vite / Static ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, _res) => _res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
