# phishX  
**Multi-Engine Phishing URL Scanner**

phishX is an **educational web application** that analyzes URLs for phishing risk using multiple detection layers:
- XGBoost machine learning model
- Cloudflare URL Scanner
- Google Safe Browsing
- Heuristic URL analysis
- Gemini AI for human-readable explanations

---

## ✨ Features

- 🔍 XGBoost-based phishing classification
- 🌐 Cloudflare URL Scanner integration
- 🛡️ Google Safe Browsing reputation checks
- 🧠 Heuristic checks (URL length, IP usage, subdomains, HTTPS, etc.)
- 🤖 Gemini AI 2–3 sentence security explanation
- 🧮 Multi-engine consensus verdict
- ⚡ FastAPI backend + React (Vite + Tailwind) frontend

---

## 🧠 How It Works

### Scan Pipeline

1. Extract features from the URL  
2. Classify using XGBoost (safe vs phishing)  
3. Run Cloudflare URL Scanner  
4. Run Google Safe Browsing reputation check  
5. Run heuristic checks  
6. Apply consensus logic (malicious if ≥ 2 engines flag it)  
7. Build a structured prompt for Gemini (gemini-3-flash-preview)  
8. Gemini returns a 2–3 sentence explanation  
9. API returns verdict + engine results + explanation  

### Engines

- XGBoost (local ML)
- Cloudflare URL Scanner (dynamic analysis)
- Google Safe Browsing (reputation)

---

## 🧱 Project Structure

### Backend

- `backend/main.py` — FastAPI app and engine orchestration
- `backend/ml_extractor.py` — Feature extraction logic
- `backend/requirements.txt` — Python dependencies

Main dependencies:
- fastapi
- uvicorn
- gunicorn
- xgboost
- requests
- python-whois
- pydantic
- google-genai
- python-dotenv

### Frontend

- `frontend/src/App.jsx` — Main UI logic
- `frontend/src/CloudflareDeepAnalysis.jsx` — Deep analysis tab
- `frontend/tailwind.config.js` — Design system config
- `frontend/index.html` — Fonts and icons

---

## 🚀 Getting Started (Local)

### 1) Clone the repo

```bash
git clone https://github.com/athx1337/phishX.git
cd phishX
````

### 2) Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# or: source venv/bin/activate  (macOS/Linux)

pip install -r requirements.txt
```

### Create a .env file (local only):

```
GEMINI_API_KEY=your_key_here
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
GOOGLE_SAFEBROWSING_API_KEY=your_key_here
```

### Frontend
```
cd frontend
npm install
npm run dev
```
### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# or: source venv/bin/activate  (macOS/Linux)

pip install -r requirements.txt
uvicorn main:app --reload
```
Open the shown localhost URL in your browser.

## 🙏 Credits

This project is based on the work from:

- **Phishing Website Detection by Machine Learning Techniques**  
  https://github.com/shreyagopal/Phishing-Website-Detection-by-Machine-Learning-Techniques  

The original repository provided the ML model and feature extraction logic, which were adapted and extended into a full-stack, multi-engine web application.

## 📄 Legal / Disclaimer

* This is an **educational project**.
* No guarantee of 100% accuracy.
* Do not rely on this tool as your only security decision system.
* URLs are processed only to generate analysis results.

---

## 📜 License

MIT License
