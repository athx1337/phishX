<div align="center">
  <img src="https://raw.githubusercontent.com/athx1337/phishX/main/phishx-shield.PNG" alt="phishX Logo" width="150"/>
  <h1>🛡️ phishX</h1>
  <p><strong>Next-Generation Multi-Engine Phishing & Threat URL Scanner</strong></p>
  
  <p>
    <a href="https://github.com/athx1337/phishX/stargazers"><img src="https://img.shields.io/github/stars/athx1337/phishX?style=for-the-badge&color=yellow" alt="Stars"></a>
    <a href="https://github.com/athx1337/phishX/network/members"><img src="https://img.shields.io/github/forks/athx1337/phishX?style=for-the-badge&color=orange" alt="Forks"></a>
    <a href="https://github.com/athx1337/phishX/issues"><img src="https://img.shields.io/github/issues/athx1337/phishX?style=for-the-badge&color=red" alt="Issues"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License"></a>
  </p>
</div>

---

**phishX** is an advanced, educational cybersecurity web application that analyzes suspicious URLs for phishing risks, malware, and fraudulent redirects in real-time. It goes beyond simple blacklists by orchestrating multiple detection layers including Machine Learning, headless browser scanning, Open Source threat intelligence, and Generative AI to provide a comprehensive threat analysis.

---

## ✨ Core Features

- **🔍 Machine Learning Engine**: Local XGBoost classification model evaluating structural URL heuristics and feature extraction.
- **🌐 Cloudflare Radar Deep Scan**: Asynchronous headless browser integration extracting live HTTP transactions, SSL certificates, and active security policy violations.
- **🛡️ Google Safe Browsing**: Real-time known threat and malware repository cross-referencing.
- **🦠 URLhaus Threat Intel**: Live interrogation of Abuse.ch's active malware distribution database to catch zero-day payloads.
- **🤖 Generative AI Analysis**: Google Gemini AI (Flash) integration that synthesizes technical findings into a concise, human-readable threat context explanation.
- **🧮 Consensus Verdict System**: Intelligent multi-engine routing that flags a URL as malicious if multiple heuristic and reputation engines agree (or if deterministic blocklists flag it).
- **⚡ Modern Architecture**: High-performance FastAPI Python backend paired with a beautiful, dynamic React (Vite + Tailwind CSS) frontend.

---

## 🧠 How It Works (The Pipeline)

When a URL is submitted, the system orchestrates the following parallel processes:

1. **Feature Extraction**: `URLFeatureExtraction.py` parses the target URL for structural anomalies (length, IP obfuscation, subdomains, etc.).
2. **ML Classification**: The extracted features are fed into the XGBoost model to generate a baseline probability score (Safe vs. Phishing).
3. **Dynamic Threat Intel**: The URL is simultaneously dispatched to the **Cloudflare URL Scanner API**, **Google Safe Browsing**, and **URLhaus**.
4. **Consensus Logic**: The backend aggregates the intelligence. For example, if deterministic blocklists (Google Safe Browsing, URLhaus) detect an active known-threat signature, it overrides the baseline ML model.
5. **Generative Synthesis**: The aggregated threat data (verdict, hosting ASN, engine confidence, Cloudflare deep trace) is structured into a strict prompt and fed into Gemini AI to generate a contextual explanation for the user.
6. **Delivery**: The React frontend dynamically renders the results, including deep-dive technical tabs for DNS, SSL, and network transactions.

---

## 🚀 Deployment Architecture

To handle the computationally intensive Machine Learning dependencies alongside a lightning-fast UI, phishX utilizes a split microservice deployment:

* **Frontend (Vercel)**: The React + Vite SPA is statically built and hosted on Vercel's global edge network for immediate time-to-first-byte delivery. 
* **Backend (Render)**: The FastAPI application runs natively as an always-on Python Web Service via `gunicorn`, keeping the XGBoost models loaded securely in memory and communicating with the frontend.

*Note: The React application incorporates an active heartbeat polling mechanism designed to keep the Render Free-Tier instance awake during active browser sessions.*

---

## 🛠️ Getting Started (Local Development)

### 1) Clone the Repository

```bash
git clone https://github.com/athx1337/phishX.git
cd phishX
```

### 2) Environment Configuration

You will need API keys for the external intelligence engines. Create a `.env` file in the `backend/` directory:

```env
GEMINI_API_KEY=your_gemini_key
CLOUDFLARE_API_TOKEN=your_cloudflare_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
GOOGLE_SAFE_BROWSING_API_KEY=your_google_key
URLHAUS_API_KEY=your_urlhaus_auth_key
```

Create a `.env` file in the `frontend/` directory to point the React app to your local backend:

```env
VITE_API_URL=http://localhost:8000
```

### 3) Backend Setup (FastAPI + XGBoost)

```bash
cd backend
python -m venv venv

# Activate Virtual Environment
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux

# Install ML Dependencies
pip install -r requirements.txt

# Start Development Server
uvicorn main:app --reload
```

### 4) Frontend Setup (React + Vite)

Open a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:5173` in your browser to view the application.

---

## 🙏 Credits & Acknowledgements

The foundational Machine Learning model and heuristic feature extraction (`URLFeatureExtraction.py`) logic was sourced and adapted from:

- **Phishing Website Detection by Machine Learning Techniques**  
  [https://github.com/shreyagopal/Phishing-Website-Detection-by-Machine-Learning-Techniques](https://github.com/shreyagopal/Phishing-Website-Detection-by-Machine-Learning-Techniques)

This original research was significantly extended into the multi-engine, Generative AI integrated, full-stack web application seen here.

---

## ⚖️ Legal & Disclaimer

- **Educational Purposes Only**: This project is built for educational and demonstration purposes.
- **No Guarantees**: There is no guarantee of 100% accuracy. Threat intelligence models have false positives and false negatives. 
- **Liability**: Do not rely on this tool as your sole security decision system. The author is not responsible for any damages or losses resulting from the use of this tool.
- **Data Privacy**: URLs are processed transiently to generate analysis results. No persistent user data is unintentionally stored.

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/athx1337">athx1337</a></p>
</div>
