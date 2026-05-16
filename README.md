<div align="center">

# 🎙️ Swar Kirana
### Voice-first store management for Indian kirana shops

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)

*बोलो, और दुकान चलाओ।*

</div>

---

## What is Swar Kirana?

**Swar Kirana** is a voice-first mini OS for kirana (grocery) shop owners. Instead of typing into a computer or maintaining paper registers, the shopkeeper just **speaks a command in Hindi, Telugu, or English** — and the system updates stock, records sales, manages the khata (credit ledger), and speaks a confirmation back.

Built for shopkeepers who may not be tech-savvy but **run their entire store by voice**.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎙️ **Voice Commands** | Speak in Hindi, Telugu, or English |
| 📦 **Stock Management** | Add stock, check levels, low-stock alerts |
| 💰 **Sales Recording** | Record a sale with voice — stock auto-updates |
| 📒 **Khata (Ledger)** | Track customer credit and payments |
| 📊 **Live Dashboard** | Today's sales, pending khata, inventory overview |
| 🔁 **Offline-first** | Works on low-end Android phones and slow internet |
| 🗣️ **Voice Reply** | System speaks back confirmation in your language |

---

## 🗣️ Example Voice Commands

```
"Atta aaya 20 kilo"              → Add 20kg Atta to stock
"Ram ko 2 kilo chini becho"      → Sell 2kg Sugar to Ram
"Mohan ka udhaar 500 rupaye"     → Add ₹500 credit for Mohan
"Suresh ne 200 diye"             → Record ₹200 payment from Suresh
"Stock kitna hai?"               → Show full inventory
"Aaj ki sale dikhao"             → Show today's sales summary
```

---

## 🏗️ Tech Stack

- **Frontend** — React 18 + TypeScript + Vite + Tailwind CSS
- **Animations** — Framer Motion (the glowing Orb)
- **Voice Input** — Web Speech API (browser-native, no external service)
- **AI Parsing** — Google Gemini (converts natural language → structured intent)
- **Backend** — Node.js + Express
- **Database** — Firebase Firestore
- **Voice Output** — Web Speech Synthesis API

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Google account (for Firebase + Gemini API)

### 1. Clone the repo
```bash
git clone https://github.com/balaji18-creator/swar-kirana-.git
cd swar-kirana-
```

### 2. Set up environment variables
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in:
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Firebase config — from [Firebase Console](https://console.firebase.google.com/) → Project Settings → Your Apps

### 3. Install dependencies
```bash
npm install
```

### 4. Run the app
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** Voice recognition works best in Chrome/Edge. Use HTTPS in production.

---

## 📁 Project Structure

```
swar-kirana/
├── server.ts              # Express backend + Firestore logic
├── src/
│   ├── App.tsx            # Main app — voice flow & state
│   ├── components/
│   │   ├── Orb.tsx        # Animated mic orb
│   │   └── Dashboard.tsx  # Stats overlay
│   ├── hooks/
│   │   └── useVoiceRecognition.ts
│   ├── lib/
│   │   └── gemini.ts      # Gemini AI command parser
│   └── types/             # TypeScript types
├── firestore.rules        # Firestore security rules
├── .env.example           # Environment variable template
└── firebase-blueprint.json
```

---

## 🔐 Security Notes

- **Never commit `.env.local`** — it's in `.gitignore`
- Firebase config (API key, project ID) must be stored in `.env.local` only
- Firestore security rules in `firestore.rules` restrict write access

---

## 🗺️ Roadmap

- [ ] PWA install support (Android home screen)
- [ ] WhatsApp daily report sharing
- [ ] Offline mode with IndexedDB sync
- [ ] Multi-shop / owner login via Firebase Auth
- [ ] UPI payment integration
- [ ] Barcode scan support for stock entry

---

## 🤝 Contributing

Pull requests are welcome! For major changes, open an issue first.
If you're a kirana shop owner and want to try this — reach out!

---

<div align="center">
Made with ❤️ in India by <a href="https://github.com/balaji18-creator">Balaji</a>
</div>
