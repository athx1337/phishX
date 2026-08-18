<div align="center">
  <img src="https://raw.githubusercontent.com/athx1337/phishX/main/phishx-shield.PNG" alt="phishX Logo" width="120"/>
  <h1>🛡️ phishX</h1>
  <p><strong>Next-Generation Serverless Multi-Engine Phishing & Threat URL Scanner</strong></p>

  <p>
    <a href="https://github.com/athx1337/phishX/stargazers"><img src="https://img.shields.io/github/stars/athx1337/phishX?style=flat-square&color=ffd700&labelColor=1a1a1a" alt="Stars"></a>
    <a href="https://github.com/athx1337/phishX/network/members"><img src="https://img.shields.io/github/forks/athx1337/phishX?style=flat-square&color=ff7f50&labelColor=1a1a1a" alt="Forks"></a>
    <a href="https://github.com/athx1337/phishX/issues"><img src="https://img.shields.io/github/issues/athx1337/phishX?style=flat-square&color=ff4500&labelColor=1a1a1a" alt="Issues"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&color=1e90ff&labelColor=1a1a1a" alt="License"></a>
  </p>
</div>

---

**phishX** is a serverless web app that scans suspicious URLs for phishing and malware in real-time. By checking multiple security databases, using AI, and analyzing the URL's structure, it gives you a clear verdict on whether a site is safe to visit.

---

## 🧠 How It Works (The Multi-Engine Scanner)

When you submit a link, the backend runs it through **five security checks** at the same time:

| Detection Engine | What it checks |
| :--- | :--- |
| **🔍 Heuristic Analyzer (XGBoost Rules)** | Analyzes the URL's structure for red flags (suspicious characters like `@`, excessive redirects, netloc hyphens, and link shortening). |
| **🛡️ Google Safe Browsing** | Checks Google's database of known unsafe websites (phishing, malware, etc.). |
| **🦠 URLhaus** | Checks the Abuse.ch database for domains hosting active malware or downloads. |
| **🌐 VirusTotal** | Combines checks from dozens of security vendors and gathers domain information (like domain age and registrar). |
| **📡 Cloudflare Radar Scanner** | Simulates visiting the page to extract active security issues, TLS certificates, and hosting information. |

### ⚖️ The Verdict Decision

The final result is decided using a simple voting system:
1. **Immediate Block**: If Google Safe Browsing or URLhaus flags the link as malicious, it is immediately marked as **unsafe**.
2. **Engine Vote**: If the databases are clean, the URL is flagged as **unsafe** if at least **two** other engines agree it is suspicious. Otherwise, it is marked **safe**.

### 🤖 AI Assessment

After scanning, **Google Gemini 2.5 Flash** reviews the gathered data (such as hosting info and engine flags) and explains *why* the URL is safe or unsafe in a few easy-to-read sentences.

---

## 🛠️ Stack & Technologies

* **Backend**: Serverless API running on [Cloudflare Workers](https://workers.cloudflare.com/) built with the [Hono](https://hono.dev/) framework.
* **Frontend**: Single Page Application built on [React](https://react.dev/) + [Vite](https://vite.dev/) and styled with [Tailwind CSS](https://tailwindcss.com/).

---

## 🚀 Local Development Setup

Follow these steps to run the project locally.

### 1. Clone the Repository
```bash
git clone https://github.com/athx1337/phishX.git
cd phishX
```

### 2. Set Up the Backend (`backend-worker`)
Cloudflare Workers use `.dev.vars` to store secret API keys locally. Create a file named `.dev.vars` inside the `backend-worker/` directory:

```env
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_SAFE_BROWSING_API_KEY=your_google_safe_browsing_api_key
URLHAUS_API_KEY=your_urlhaus_api_key
VIRUSTOTAL_API_KEY=your_virustotal_api_key
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
```

Install dependencies and start the local development worker (runs on `http://localhost:8787`):
```bash
cd backend-worker
npm install
npm run dev
```

### 3. Set Up the Frontend (`frontend`)
Create a `.env` file in the `frontend/` directory to point to the local worker API:

```env
VITE_API_URL=http://localhost:8787
```

Install dependencies and start the React dev server:
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🌐 Deploying to Production

### Deploying the Backend
Deploy the worker backend to your Cloudflare account:
```bash
cd backend-worker
npx wrangler deploy
```

Add your production API keys securely using wrangler secrets:
```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
npx wrangler secret put URLHAUS_API_KEY
npx wrangler secret put VIRUSTOTAL_API_KEY
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_API_TOKEN
```

### Deploying the Frontend
Build and export the React app static files to deploy to Vercel, Netlify, or similar hosts:
```bash
cd frontend
npm run build
```
Make sure to set the `VITE_API_URL` environment variable in your frontend hosting dashboard to point to your live Cloudflare Worker URL.

---

## 🙏 Credits & Acknowledgements

The foundational Machine Learning model structure and heuristic feature extraction logic was adapted from:
* **Phishing Website Detection by Machine Learning Techniques**  
  [github.com/shreyagopal/Phishing-Website-Detection-by-Machine-Learning-Techniques](https://github.com/shreyagopal/Phishing-Website-Detection-by-Machine-Learning-Techniques)

---

## ⚖️ Legal & Disclaimer

* **Educational Sandbox Only**: This project is built strictly for demonstration and research purposes.
* **No Warranty**: Predictive models and threat feeds are subject to false positives and false negatives. 
* **Zero Liability**: Do not rely on this tool as your sole security firewall. The authors are not responsible for any damages.
* **Data Processing**: Submitted URLs are processed transiently. No user data is stored or logged.
