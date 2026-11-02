<div align="center">

  <img src="https://raw.githubusercontent.com/athx1337/phishX/main/phishx-shield.PNG" alt="phishX Logo" width="130"/>

  # 🛡️ phishX

  **Next-Generation Multi-Engine Phishing & Threat URL Scanner**  
  *Serverless • Multi-Engine Consensus • Edge Caching • Generative AI Threat Intelligence*

  <p align="center">
    <a href="https://github.com/athx1337/phishX/stargazers"><img src="https://img.shields.io/github/stars/athx1337/phishX?style=for-the-badge&color=ffd700&labelColor=0d1117" alt="Stars"></a>
    <a href="https://github.com/athx1337/phishX/network/members"><img src="https://img.shields.io/github/forks/athx1337/phishX?style=for-the-badge&color=ff7f50&labelColor=0d1117" alt="Forks"></a>
    <a href="https://github.com/athx1337/phishX/issues"><img src="https://img.shields.io/github/issues/athx1337/phishX?style=for-the-badge&color=ef4444&labelColor=0d1117" alt="Issues"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-3b82f6.svg?style=for-the-badge&labelColor=0d1117" alt="License"></a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Workers">
    <img src="https://img.shields.io/badge/Hono-E36002?style=flat-square&logo=hono&logoColor=white" alt="Hono">
    <img src="https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React 19">
    <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
    <img src="https://img.shields.io/badge/Google_Gemini-8E75C2?style=flat-square&logo=googlebard&logoColor=white" alt="Google Gemini">
  </p>

  <p align="center">
    <a href="#-overview">Overview</a> •
    <a href="#-architecture--how-it-works">Architecture</a> •
    <a href="#-the-5-engine-detection-pipeline">Detection Engines</a> •
    <a href="#-key-features">Key Features</a> •
    <a href="#-api-reference">API Reference</a> •
    <a href="#-quickstart--local-setup">Quickstart</a> •
    <a href="#-deployment">Deployment</a> •
    <a href="#-credits--acknowledgments">Credits</a>
  </p>

</div>

---

## 📌 Overview

**phishX** is a high-speed, serverless threat intelligence application that inspects and classifies URLs for phishing, malware, and social engineering campaigns in real-time.

Instead of relying on a single vendor or static blacklist, **phishX orchestrates 5 independent detection layers in parallel**—combining live industry blocklists, multi-vendor threat telemetry, automated headless browser scanning, heuristic decision trees, and Generative AI to deliver an accurate **Consensus Verdict**.

### ⚡ Highlights at a Glance
- **Zero-Cold-Start Serverless Backend**: Powered by Cloudflare Workers and Hono with global edge routing.
- **5-Engine Security Consensus**: Eliminates blindspots by querying Google Safe Browsing, URLhaus, VirusTotal v3, Cloudflare Radar, and local XGBoost heuristic models simultaneously.
- **Dual-Protocol Inspection**: Automatically tests both `HTTP` and `HTTPS` endpoints when a bare domain or IP is entered.
- **Sub-Second KV Cache**: Caches verified scan reports in Cloudflare KV (1-hour TTL) for lightning-fast repeat queries and API quota savings.
- **AI-Powered Threat Assessment**: Google Gemini 2.5 Flash translates technical indicators (ASN, certificates, redirects, blocklist hits) into human-readable security analysis.

---

## 🧠 Architecture & How It Works

```
                                [ User Enters URL ]
                                         │
                                         ▼
                            [ Input Sanitization & Regex ]
                                         │
                                         ▼
                             [ Cloudflare KV Cache ]
                                  ├── (Hit)  ──> Return Cached Verdict (< 50ms)
                                  └── (Miss) ──> Proceed to Parallel Scans
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              ▼                          ▼                          ▼
      [ Google Safe Browsing ]     [ Abuse.ch URLhaus ]     [ VirusTotal v3 API ]
       Known Phishing & Malware     Active Payload Feeds     90+ Vendor Aggregation
              │                          │                          │
              │                          │                          │
              ▼                          ▼                          │
    [ Cloudflare Radar API ]    [ XGBoost Heuristic Model ]         │
    Headless Browser & Network   URL Structural Anomalies           │
              │                          │                          │
              └──────────────────────────┼──────────────────────────┘
                                         │
                                         ▼
                            [ Hybrid Consensus Engine ]
                             • Deterministic Override (GSB / URLhaus)
                             • Multi-Engine Majority Threshold (>= 2)
                                         │
                                         ▼
                            [ Gemini 2.5 Flash Assessor ]
                             Generates Plain-English Context
                                         │
                                         ▼
                              [ Save to Cloudflare KV ]
                                         │
                                         ▼
                             [ Structured JSON Response ]
```

---

## 🛡️ The 5-Engine Detection Pipeline

Every scan dispatches non-blocking concurrent queries with strict timeouts (`AbortSignal.timeout`) to ensure high availability:

| Detection Engine | Source / Provider | Verification Role |
| :--- | :--- | :--- |
| **🔍 XGBoost AI (Heuristic Parser)** | Local ML Decision Logic | Analyzes URL structure for 8 core phishing traits: IP address hostnames, `@` symbols, redirect sequences (`//`), prefix/suffix hyphens, fake `https` tokens in subdomains, and known link shorteners. |
| **🛡️ Google Safe Browsing** | Google Safe Browsing v4 | Cross-references Google's live reputation database for malware, deceptive social engineering, and unwanted application hosts. |
| **🦠 URLhaus** | Abuse.ch | Interrogates real-time feeds tracking domains actively distributing malware binaries and ransomware payloads. |
| **🌐 VirusTotal v3** | Google Chronicle | Aggregates scanning data across 90+ antivirus engines and extracts domain metadata (WHOIS registrar, creation date). |
| **📡 Cloudflare Radar Scanner** | Cloudflare URL Scanner | Spawns an isolated headless browser session to capture live SSL/TLS certificate chains, network request traces, and security policy violations. |

### ⚖️ The Consensus Algorithm

1. **Deterministic Override**: If deterministic malware and phishing blocklists (**Google Safe Browsing** or **URLhaus**) confirm a positive threat signature, the URL is immediately classified as **Malicious**.
2. **Consensus Threshold**: If the deterministic databases return clean, the URL is classified as **Malicious** if **two or more** engines flag risk. Otherwise, it is designated **Safe**.

---

## ✨ Key Features

- **Dual-Protocol Testing**: Submitting `example.com` automatically scans both `http://example.com` and `https://example.com` to prevent evasive redirect bypasses.
- **Gemini 2.5 Flash Context**: Instead of cryptic error codes, users receive a tailored, 2-to-3 sentence technical briefing explaining the exact risk factors or clean indicators.
- **Deep Technical Telemetry**:
  - Live ASN, IP address, and server country identification.
  - Complete SSL/TLS certificate validation chain.
  - HTTP transaction inspection (methods, status codes, payload sizes).
- **Session Scan History**: Clean, client-side history drawer stored locally for quick rescans and auditing.
- **Resilient & Timeout-Protected**: Every external API fetch is guarded with a timeout signal to prevent stalled connections.

---

## 📡 API Reference

The backend exposes a lightweight, CORS-configured REST API.

### `POST /api/verify`
Analyzes a submitted URL through all engines.

#### Request
```json
POST /api/verify
Content-Type: application/json

{
  "url": "https://example-phishing-login.com"
}
```

#### Response (Example)
```json
{
  "url": "https://example-phishing-login.com",
  "checked_urls": ["https://example-phishing-login.com"],
  "dual_protocol": false,
  "is_phishing": true,
  "features_extracted": [0, 1, 0, 0, 1, 0, 0, 0],
  "gemini_analysis": "The submitted URL mimics a secure login interface on an unverified domain with newly registered credentials. Multiple security vendors and structural heuristics flagged suspicious credential-harvesting patterns.",
  "whois": {
    "registrar": "Example Registrar LLC",
    "creation_date": "2026-10-15"
  },
  "cloudflare_report": {
    "asn": "AS13335 CLOUDFLARENET",
    "ip": "104.21.57.174",
    "server_location": "United States (US)",
    "certificates": [...],
    "requests": [...],
    "risks": [...]
  },
  "engines": [
    { "name": "VirusTotal", "malicious": true, "data": { "malicious_count": 3 }, "error": null },
    { "name": "Google Safe Browsing", "malicious": true, "data": null, "error": null },
    { "name": "URLhaus", "malicious": false, "data": null, "error": null },
    { "name": "Cloudflare Radar", "malicious": false, "data": null, "error": null },
    { "name": "XGBoost AI", "malicious": true, "data": null, "error": null }
  ],
  "cached": false
}
```

### `GET /api/ping`
Healthcheck endpoint.
```json
{ "status": "ok" }
```

---

## 📂 Repository Structure

```text
phishX/
├── backend-worker/          # Cloudflare Worker API (Hono + TypeScript)
│   ├── src/
│   │   └── index.ts         # Core verification router & engine logic
│   ├── wrangler.jsonc       # Cloudflare Worker & KV namespace configuration
│   └── package.json         # Worker dependencies (Hono, Wrangler, Vitest)
├── frontend/                # React 19 + Vite web client
│   ├── src/
│   │   ├── components/      # UI components (Scanner, Results, History Drawer)
│   │   ├── App.jsx          # Application entrypoint & state management
│   │   └── index.css        # Tailwind styling & dark aesthetic tokens
│   ├── vite.config.js       # Vite build configuration
│   └── package.json         # Client dependencies (React 19, Motion, Three.js)
├── repo/                    # Foundational Machine Learning research files
│   ├── DataFiles/           # Training datasets (Benign & Phishing URLs)
│   ├── URLFeatureExtraction.py
│   └── XGBoostClassifier.pickle.dat
└── README.md                # Project documentation
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or later)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A free [Cloudflare](https://dash.cloudflare.com/) account (for Wrangler local development)

### 1. Clone the Repository
```bash
git clone https://github.com/athx1337/phishX.git
cd phishX
```

### 2. Configure the Backend (`backend-worker`)
In the `backend-worker/` directory, create a local environment file named `.dev.vars`:

```bash
cd backend-worker
```

Create `.dev.vars` with your API credentials:
```env
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_SAFE_BROWSING_API_KEY=your_google_safe_browsing_api_key
URLHAUS_API_KEY=your_urlhaus_api_key
VIRUSTOTAL_API_KEY=your_virustotal_api_key
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
```

> **API Key Resources:**
> - Gemini API: [Google AI Studio](https://aistudio.google.com/)
> - Google Safe Browsing: [Google Cloud Console](https://console.cloud.google.com/)
> - URLhaus: [Abuse.ch URLhaus API](https://urlhaus.abuse.ch/api/)
> - VirusTotal: [VirusTotal API Portal](https://developers.virustotal.com/)
> - Cloudflare URL Scanner: [Cloudflare Dash](https://dash.cloudflare.com/)

Install dependencies and start the local worker:
```bash
npm install
npm run dev
```
*The Worker will start on `http://localhost:8787`.*

### 3. Configure the Frontend (`frontend`)
In another terminal, navigate to the `frontend/` directory and configure the environment:

```bash
cd ../frontend
```

Create a `.env` file:
```env
VITE_API_URL=http://localhost:8787
```

Install dependencies and start the Vite dev server:
```bash
npm install
npm run dev
```
*The frontend will run on `http://localhost:5173`.*

---

## 🌐 Deployment

### Deploying the Backend (Cloudflare Workers)
Deploy the Hono API globally in seconds using Wrangler:

```bash
cd backend-worker
npx wrangler deploy
```

Set your production secrets in Cloudflare:
```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
npx wrangler secret put URLHAUS_API_KEY
npx wrangler secret put VIRUSTOTAL_API_KEY
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_API_TOKEN
```

### Deploying the Frontend (Vercel / Cloudflare Pages / Netlify)
Build the production-ready static assets:

```bash
cd frontend
npm run build
```
Deploy the resulting `dist/` directory to your hosting provider. Make sure to define `VITE_API_URL` in your hosting dashboard targeting your deployed worker (e.g. `https://phishx-api.<your-subdomain>.workers.dev`).

---

## 🙏 Credits & Acknowledgments

The foundational heuristic feature extraction logic (`URLFeatureExtraction.py`) and initial Machine Learning datasets were adapted from:
* **Phishing Website Detection by Machine Learning Techniques** by Shreya Gopal  
  [GitHub Repository](https://github.com/shreyagopal/Phishing-Website-Detection-by-Machine-Learning-Techniques)

phishX heavily extends this research into a modern, production-grade serverless platform featuring real-time multi-engine orchestration, edge caching, and Generative AI threat synthesis.

---

## ⚖️ Legal & Disclaimer

* **Educational & Research Purposes Only**: phishX is designed for educational demonstrations and threat intelligence pattern analysis.
* **No Warranty**: Machine learning heuristics and threat intelligence feeds are subject to false positives and false negatives. Never rely on this service as your sole cybersecurity control.
* **Transient Processing**: URLs submitted to phishX are processed ephemerally to compute metrics; no personal user identities or browsing histories are saved.

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/athx1337">athx1337</a></p>
</div>
