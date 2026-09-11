<<<<<<< HEAD
# ScamSniff — Full-Stack AI Scam Detection & Risk Assessment Platform

> **Tagline:** *"Sniff Out Scams Before They Sniff You."*  
> **Main Message:** *"Don't trust it blindly. Let ScamSniff check it first."*

---

## 🛡️ Project Overview

**ScamSniff** is a specialized, production-quality full-stack AI-powered scam detection and risk assessment platform. Designed specifically for college students, general internet users, online shoppers, and job seekers, ScamSniff analyzes suspicious messages, emails, URLs, job/internship offers, payment requests, and social media interactions to flag potential fraud before damage occurs.

Unlike generic AI chat assistants, ScamSniff is built exclusively as a **cybersecurity risk scanner**. It features hybrid analysis combining an offline rule engine, link security inspection, sensitive data redaction, and LLM JSON analysis.

---

## ✨ Key Features

- **Hybrid Detection Pipeline**: Integrates deterministic pattern rules, URL analysis, and LLM structured analysis.
- **Sensitive Data Redaction**: Automatically redacts OTPs, PINs, credit card numbers, and passwords before processing or storage.
- **URL & Domain Security Engine**: Inspects HTTPS usage, IP hostnames, URL shorteners, excessive hyphens, lookalike brand domains, and high-risk TLDs (`.xyz`, `.top`, `.online`).
- **Offline Fallback Engine**: Operates seamlessly without an external LLM API key or MongoDB instance—ideal for zero-dependency presentations and offline environments.
- **Interactive Risk Dashboard**: Real-time metrics on total scans, risk classifications (HIGH, SUSPICIOUS, LOW), and threat category bar charts powered by Recharts.
- **Scan Audit History**: Allows searching, filtering by risk level or category, and reviewing detailed scan red flags.
- **Cybersecurity Education Hub**: Practical guides on Phishing, Fake Job Scams, Domain Security, OTP protection, and UPI payment traps.
- **Dark/Light Theme System**: Modern cybersecurity aesthetic with persistent theme preferences.
- **Responsive Mobile-First Design**: Optimized UX for mobile phones, tablets, and desktop displays.

---

## 🏗️ Tech Stack & Architecture

### Frontend
- **Framework**: React.js 18 + Vite
- **Styling**: Tailwind CSS (with custom Dark/Light cybersecurity theme)
- **Routing**: React Router v6
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js & Express.js
- **Database**: MongoDB & Mongoose (with built-in memory store fallback)
- **Security & Utilities**: Express Rate Limit, CORS, Axios, Dotenv

### AI & Rule Engine
- **LLM Integration**: OpenAI-compatible chat completion API (`LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`)
- **Fallback Analyzer**: Rule-based scoring engine for offline reliability

---

## 📁 Repository Structure

```text
ScamSniff/
│
├── package.json               # Monorepo scripts (npm run dev, npm run install:all)
├── .env.example               # Root environment variable template
├── README.md                  # Complete project documentation
│
├── server/                    # Node.js + Express Backend API
│   ├── config/
│   │   └── db.js              # MongoDB connection & Memory Store fallback
│   ├── controllers/
│   │   ├── analyzeController.js   # POST /api/analyze handler
│   │   ├── historyController.js   # GET /api/history handlers
│   │   ├── dashboardController.js # GET /api/dashboard stats handler
│   │   └── feedbackController.js  # POST /api/feedback handler
│   ├── middleware/
│   │   ├── rateLimiter.js     # IP rate limiting
│   │   └── errorHandler.js    # Global error handler
│   ├── models/
│   │   ├── Scan.js            # Mongoose Scan schema
│   │   └── Feedback.js        # Mongoose Feedback schema
│   ├── routes/
│   │   └── api.js             # Express API routes definition
│   ├── services/
│   │   ├── redactor.js        # Sensitive credential redactor
│   │   ├── ruleEngine.js      # Pattern matching for scam indicators
│   │   ├── urlAnalyzer.js     # URL & domain security inspection
│   │   ├── llmService.js      # LLM API caller & JSON validator
│   │   └── scamAnalyzer.js    # Master analyzer orchestrator
│   ├── utils/
│   │   └── seedData.js        # Initial seed demo scans
│   ├── tests/
│   │   └── analyzer.test.js   # Automated unit test suite
│   ├── package.json
│   └── server.js              # Express app entry point
│
└── client/                    # React + Vite Frontend
    ├── src/
    │   ├── components/        # Navbar, Footer, QuickActions, DemoPresets, ChatInterface, ResultCard, GaugeChart, RedFlagsList, Disclaimer
    │   ├── context/           # ThemeContext (Dark/Light mode)
    │   ├── pages/             # Home, Dashboard, History, Learn, Categories
    │   ├── services/          # Frontend API HTTP client
    │   ├── utils/             # Formatters & badge helpers
    │   ├── App.jsx            # Router setup
    │   └── main.jsx           # React DOM entry
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Clone & Install Dependencies

Run the root workspace install script to install dependencies for root, server, and client:

```bash
npm run install:all
```

Alternatively, install individually:

```bash
# Install root
npm install

# Install server
cd server && npm install

# Install client
cd ../client && npm install
```

### 2. Environment Configuration

Create a `.env` file inside the `server/` folder or root directory based on `.env.example`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/scamsniff

# LLM Configuration (Optional - Leave blank to use built-in offline rule engine)
LLM_API_KEY=
LLM_MODEL=gpt-3.5-turbo
LLM_BASE_URL=https://api.openai.com/v1

CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

## 🏃 Running the Application

### Option A: Run Both Client & Server Concurrently (Recommended)

From the root directory:

```bash
npm run dev
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api`

### Option B: Run Services Separately

**Start Server:**
```bash
cd server
npm run dev
```

**Start Client:**
```bash
cd client
npm run dev
```

---

## 🧪 Automated Testing

Run the backend analyzer test suite to verify sensitive data redaction, rule indicators, URL security checks, prize scams, internship fee scams, and safe content classification:

```bash
npm run test:server
```

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & service status |
| `POST` | `/api/analyze` | Submit content for scam risk analysis |
| `GET` | `/api/history` | Retrieve previous scan audit logs |
| `GET` | `/api/history/:id` | Retrieve single scan result by ID |
| `GET` | `/api/dashboard` | Aggregated threat metrics & category counts |
| `POST` | `/api/feedback` | Submit user helpfulness feedback (thumbs up/down) |

---

## 🔒 Safety & Disclaimer

ScamSniff is designed for automated risk assessment. It follows strict guidelines:
- Never outputs false absolutes (e.g., *"100% safe"* or *"definitely fraudulent"*).
- Displays clear disclaimers that low risk scores do not guarantee absolute safety.
- Automatically redacts passwords, OTPs, and card numbers to protect user privacy.

---

## 🎓 License & Credits

Developed for CSE College Project presentation and general internet safety awareness.
=======
# Scamsniff
>>>>>>> fe3d2f22573ded40d31e4ae6dd3a83ce996750f9
