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

**phishX** is a serverless, educational cybersecurity engine designed to analyze suspicious URLs for phishing risks, malware, and malicious redirects in real-time. It operates as an orchestrator across multiple scanning models and intelligence databases, combining deterministic blocklists, reputation feeds, heuristic scoring, and generative AI to deliver a unified consensus verdict.

---

## 🧠 Core Architecture & Engine Orchestration

When a target URL is submitted, the backend worker parallelizes queries across **five threat intelligence layers** to form a consensus determination:

| Detection Engine | Verification Mechanism |
| :--- | :--- |
| **🔍 XGBoost AI (Heuristic Simulation)** | Performs a real-time structural parsing of the address bar. It inspects parameters such as IP hostname usage, `@` symbol inclusions, redirection indicators (`//`), presence of `https` strings within subdomains, URL shortening flags, and netloc prefix/suffix hyphens. |
| **🛡️ Google Safe Browsing API** | Queries Google's threat registry for known malware, social engineering campaigns (phishing), and unwanted or harmful software. |
| **🦠 URLhaus (Abuse.ch)** | Cross-references active database feeds tracking malicious distribution endpoints to intercept zero-day downloads and remote payloads. |
| **🌐 VirusTotal v3 API** | Queries VirusTotal database records to aggregate vendor scan flags and retrieve registrars, WHOIS data, and registration timelines. |
| **📡 Cloudflare Radar Scanner** | Dispatches the URL to Cloudflare's URL scanner API, running a headless browser to extract live network requests, active security violations, certificate chains, and server physical location details. |

### ⚖️ The Consensus Algorithm

The final verdict is derived through a hybrid voting system:
1. **Deterministic Overrides**: If high-confidence blocklists (**Google Safe Browsing** or **URLhaus**) confirm a positive threat signature, the URL is immediately flagged as **Malicious**.
2. **Consensus Voting**: If blocklists are clean, the URL is flagged as **Malicious** if **two or more** of the individual engines flag it. Otherwise, it is marked **Safe**.

### 🤖 Generative AI Synthesis

Once the engines finish scanning, the system compiles the structured threat data (ASN origin, registrar records, IP address, engine results) and dispatches it to **Google Gemini 2.5 Flash**. The AI generates a concise, 2-3 sentence technical assessment explaining the risk factors or verifying the domain safety.

---

## 🛠️ Stack & Technologies

* **Backend**: Serverless architecture running on [Cloudflare Workers](https://workers.cloudflare.com/) via the [Hono](https://hono.dev/) framework.
* **Frontend**: Single Page Application built on [React](https://react.dev/) + [Vite](https://vite.dev/) and styled with [Tailwind CSS](https://tailwindcss.com/).

---

## 🚀 Local Development Setup

Follow these steps to run both services locally.

### 1. Clone the Repository
```bash
git clone https://github.com/athx1337/phishX.git
cd phishX
```

### 2. Configure the Backend Worker (`backend-worker`)
Cloudflare Workers use `.dev.vars` to store secret environment variables locally. Create a file named `.dev.vars` inside the `backend-worker/` directory:

```env
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_SAFE_BROWSING_API_KEY=your_google_safe_browsing_api_key
URLHAUS_API_KEY=your_urlhaus_api_key
VIRUSTOTAL_API_KEY=your_virustotal_api_key
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
```

Install dependencies and boot the local worker server (runs on `http://localhost:8787` by default):
```bash
cd backend-worker
npm install
npm run dev
```

### 3. Configure the Frontend (`frontend`)
Create a `.env` file in the `frontend/` directory to bind it to the local worker API:

```env
VITE_API_URL=http://localhost:8787
```

Install dependencies and start the React development server:
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🌐 Production Deployment

### Backend Worker
Deploy the backend Hono worker to your Cloudflare account using Wrangler:
```bash
cd backend-worker
npx wrangler deploy
```

Securely upload your API keys to the production environment:
```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
npx wrangler secret put URLHAUS_API_KEY
npx wrangler secret put VIRUSTOTAL_API_KEY
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_API_TOKEN
```

### Frontend
Build and export the React app static files to deploy to hosts like Vercel or Netlify:
```bash
cd frontend
npm run build
```
Make sure to configure your production backend URL via the `VITE_API_URL` environment variable in your frontend hosting dashboard.

---

## 🙏 Credits & Acknowledgements

The foundational Machine Learning model structure and heuristic feature extraction logic was adapted from:
* **Phishing Website Detection by Machine Learning Techniques**  
  [github.com/shreyagopal/Phishing-Website-Detection-by-Machine-Learning-Techniques](https://github.com/shreyagopal/Phishing-Website-Detection-by-Machine-Learning-Techniques)

This research was extended to create the multi-engine, serverless full-stack scanner present in this repository.

---

## ⚖️ Legal & Disclaimer

* **Educational Sandbox Only**: This project is built strictly for demonstration and research purposes.
* **No Warranty**: Predictive models and threat feeds are subject to false positives and false negatives. 
* **Zero Liability**: Do not rely on this tool as your sole security decision system. The authors are not responsible for any damages or network exploits.
* **Data Processing**: Submitted URLs are processed transiently to generate real-time metrics. No user data is stored or logged.
