# phishX 🛡️
**Next-Generation Multi-Engine Phishing & Threat URL Scanner**

phishX is an advanced, educational cybersecurity web application that analyzes suspicious URLs for phishing risks, malware, and fraudulent redirects in real-time. It goes beyond simple blacklists by orchestrating multiple detection layers—including Machine Learning, headless browser scanning, and Generative AI to provide a comprehensive threat analysis.

---

## ✨ Core Features

- **🔍 Machine Learning Engine**: Local XGBoost classification model evaluating structural URL heuristics and feature extraction.
- **🌐 Cloudflare Radar Deep Scan**: Asynchronous headless browser integration extracting live HTTP transactions, SSL certificates, and active security policy violations.
- **🛡️ Google Safe Browsing**: Real-time known threat and malware repository cross-referencing.
- **� Generative AI Analysis**: Google Gemini AI (3-flash-preview) integration that synthesizes the technical findings into a 2-3 sentence, human-readable threat context explanation.
- **🧮 Consensus Verdict System**: Intelligent multi-engine routing that flags a URL as malicious if multiple heuristic and reputation engines agree.
- **⚡ Modern Architecture**: High-performance FastAPI Python backend paired with a dynamic React (Vite + Tailwind CSS) frontend frontend.

---

## 🧠 How It Works (The Pipeline)

When a URL is submitted, the system orchestrates the following parallel processes:

1. **Feature Extraction**: `URLFeatureExtraction.py` parses the target URL for structural anomalies (length, IP obfuscation, subdomains, etc.).
2. **ML Classification**: The extracted features are fed into the XGBoost model to generate a baseline probability score (Safe vs. Phishing).
3. **Dynamic Threat Intel**: The URL is simultaneously dispatched to the Cloudflare URL Scanner API and Google Safe Browsing.
4. **Consensus Logic**: The backend aggregates the intelligence. For example, if Cloudflare detects an active known-threat signature, it overrides the baseline ML model.
5. **Generative Synthesis**: The aggregated threat data (verdict, hosting ASN, engine confidence) is structured into a strict prompt and fed into Gemini AI to generate a contextual explanation for the user.
6. **Delivery**: The React frontend dynamically renders the results, including deep-dive technical tabs for DNS, SSL, and network transactions.

---

## 🚀 Deployment Architecture

To handle the computationally intensive Machine Learning dependencies alongside a lightning-fast UI, phishX utilizes a split microservice deployment:

* **Frontend (Vercel)**: The React + Vite SPA is statically built and hosted on Vercel's global edge network for immediate time-to-first-byte delivery. 
* **Backend (Render)**: The FastAPI application runs natively as an always-on Python Web Service via `gunicorn`, keeping the XGBoost models loaded securely in memory and communicating with the frontend via CORS constraint overrides.

*Note: The React application incorporates an active heartbeat polling mechanism designed to keep the Render Free-Tier instance awake during active browser sessions.*

---

## � Getting Started (Local Development)

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
GOOGLE_SAFE_BROWSING_API_KEY=your_google_key (optional, will fallback to Gemini key if same GCP project)
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

Navigate to `http://localhost:5173` in your browser.

---

## 🙏 Credits & Acknowledgements

The foundational Machine Learning model and heuristic feature extraction (`URLFeatureExtraction.py`) logic was sourced and adapted from:

- **Phishing Website Detection by Machine Learning Techniques**  
  [https://github.com/shreyagopal/Phishing-Website-Detection-by-Machine-Learning-Techniques](https://github.com/shreyagopal/Phishing-Website-Detection-by-Machine-Learning-Techniques)

This original research was significantly extended into the multi-engine, Generative AI integrated, full-stack web application seen here.

---

## 📄 Legal & Disclaimer

* **Educational Purpsoses Only**: This project is built for educational and demonstration purposes.
* **No Guarantees**: There is no guarantee of 100% accuracy. Threat intelligence models have false positives and false negatives. 
* **Liability**: Do not rely on this tool as your sole security decision system. The author is not responsible for any damages or losses resulting from the use of this tool.
* **Data Privacy**: URLs are processed transiently to generate analysis results. No persistent user data is intentionally stored.

## 📜 License

MIT License
