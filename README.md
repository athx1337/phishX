## 🧱 Backend (FastAPI)

### Pipeline

1. Extract features from the URL  
2. Classify with XGBoost (safe vs phishing)  
3. Build a structured prompt for **Gemini (gemini-3-flash-preview)** using:
   - URL structure signals (IP usage, length, subdomains, suspicious chars, typosquatting)
   - Domain & hosting signals (risky TLDs, free subdomains, brand mismatch)
   - HTTPS usage
4. Gemini returns a **2–3 sentence explanation**
5. API returns **prediction + reasoning**

### Key files

- `backend/main.py` — FastAPI app & API endpoint  
- `backend/ml_extractor.py` — Feature extraction logic  
- `backend/requirements.txt` — Python dependencies  

### Main dependencies

- fastapi  
- uvicorn  
- xgboost  
- beautifulsoup4  
- python-whois  
- urllib3  
- google-genai  
- python-dotenv  

---

## 🖥️ Frontend (React + Vite + Tailwind CSS)

- UI based on custom templates (from `@stitch`)
- Tailwind configured with design tokens (colors, fonts, light/dark)
- States:
  - Initial  
  - Loading  
  - Safe (Clean)  
  - Phishing (Critical)  
- Fetches real results from `/api/verify`
- Branded as **phishX by athx1337**
- Includes simple **Privacy Policy** and **Terms** modals

### Key files

- `frontend/src/App.jsx` — Main UI logic  
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

Create a `.env` file **locally only**:

```env
GEMINI_API_KEY=your_api_key_here
```

Run the backend:

```bash
uvicorn main:app --reload
```

Backend will be available at:
`http://127.0.0.1:8000`

### 3) Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open the shown localhost URL in your browser.

---

## 🌍 Deployment (Free)

* **Frontend**: Vercel (free)
* **Backend**: Render (free)

### Backend on Render

Start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Set environment variable in Render dashboard:

```text
GEMINI_API_KEY=your_api_key_here
```

> Do NOT commit `.env` files to GitHub. Use platform environment variables in production.

---

## 🧪 Testing

### Manual

* Try a safe URL:

  * `https://www.google.com`
* Try a sketchy-looking URL:

  * `http://192.168.1.1/login.php`

Check:

* UI transitions (Initial → Loading → Result)
* Result correctness
* Gemini reasoning text appears

---

## 📄 Legal / Disclaimer

* This is an **educational project**.
* No guarantee of 100% accuracy.
* Do not rely on this tool as your only security decision system.
* URLs are processed only to generate analysis results.

---

## 📜 License

MIT License
