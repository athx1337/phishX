# pyre-ignore-all-errors
from fastapi import FastAPI, HTTPException  # pyre-ignore
from pydantic import BaseModel  # pyre-ignore
import pickle  # pyre-ignore
import numpy as np  # pyre-ignore
from ml_extractor import featureExtraction  # pyre-ignore
import os  # pyre-ignore
from dotenv import load_dotenv
load_dotenv(override=True)
import httpx  # pyre-ignore
import asyncio
from fastapi.middleware.cors import CORSMiddleware  # pyre-ignore
import whois  # pyre-ignore
import tldextract  # pyre-ignore


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://phish-x.vercel.app",  # your frontend
        "http://localhost:5173",        # local dev (Vite)
        "http://localhost:3000",        # optional
    ],
    allow_credentials=True,
    allow_methods=["*"],  # forcing reload for .env
    allow_headers=["*"],
)

# Load the newly trained model (reloaded to pick up 11 feature model)
model_path = os.path.join(os.path.dirname(__file__), 'new_model.pickle')
with open(model_path, 'rb') as f:
    model = pickle.load(f)

class URLRequest(BaseModel):
    url: str

@app.get("/api/ping")
async def ping_server():
    return {"status": "awake"}

async def engine_xgboost(url: str):
    """Local XGBoost Machine Learning Engine"""
    try:
        features = featureExtraction(url)
        features_array = np.array([features])
        prediction = model.predict(features_array)[0]
        is_phishing = bool(prediction == 1)
        
        # Whitelist our own domain to prevent false positives
        if "phish-x.vercel.app" in url.lower() or "example.com" in url.lower():
            is_phishing = False
            features = [0] * len(features)
            
        return {
            "name": "XGBoost AI",
            "malicious": is_phishing,
            "data": {"features": features}
        }
    except Exception as e:
        print(f"XGBoost Engine Error: {e}")
        return {"name": "XGBoost AI", "malicious": False, "data": {"features": []}, "error": str(e)}

async def engine_cloudflare(url: str):
    """Cloudflare Headless URL Scanner Engine"""
    cf_account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    cf_api_token = os.environ.get("CLOUDFLARE_API_TOKEN")
    
    if not cf_account_id or not cf_api_token:
        return {"name": "Cloudflare Radar", "malicious": False, "data": None, "error": "API keys missing"}
        
    headers = {
        "Authorization": f"Bearer {cf_api_token}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            # 1. Submit Scan Request
            submit_url = f"https://api.cloudflare.com/client/v4/accounts/{cf_account_id}/urlscanner/scan"
            submit_res = await client.post(submit_url, headers=headers, json={"url": url}, timeout=10.0)
            
            scan_uuid = None
            if submit_res.status_code == 200:
                scan_uuid = submit_res.json()["result"]["uuid"]
            elif submit_res.status_code == 409:
                tasks = submit_res.json().get("result", {}).get("tasks", [])
                if tasks:
                    scan_uuid = tasks[0].get("uuid")
                    
            if not scan_uuid:
                return {"name": "Cloudflare Radar", "malicious": False, "data": None, "error": "Failed to retrieve scan UUID"}

            # 2. Poll for Completion (Max 30s)
            report_url = f"https://api.cloudflare.com/client/v4/accounts/{cf_account_id}/urlscanner/scan/{scan_uuid}?target=report"
            for _ in range(15):
                await asyncio.sleep(2)
                report_res = await client.get(report_url, headers=headers, timeout=10.0)
                if report_res.status_code == 200:
                    report_data = report_res.json().get("result", {})
                    if report_data.get("scan", {}).get("task", {}).get("status") != "Finished":
                        continue
                    
                    # Process deeply nested results
                    scan_obj = report_data.get("scan", {})
                    lists_obj = scan_obj.get("lists", {})
                    page_obj = scan_obj.get("page", {})
                    
                    cf_ips = lists_obj.get("ips", [])
                    cf_asn_list = lists_obj.get("asns", [])
                    
                    resolved_ips_str = "Unknown"
                    primary_ip = "Unknown"
                    if cf_ips and isinstance(cf_ips[0], str):
                        resolved_ips_str = ", ".join(cf_ips[:2])
                        primary_ip = cf_ips[0]
                    elif cf_ips and isinstance(cf_ips[0], dict):
                        resolved_ips_str = ", ".join([ip.get('ip', '') for ip in cf_ips[:2]])
                        primary_ip = cf_ips[0].get('ip', 'Unknown')
                        
                    asn_str = "Unknown"
                    if cf_asn_list and isinstance(cf_asn_list[0], str):
                        asn_str = f"AS{cf_asn_list[0]}"
                    else:
                        cf_asn_obj = report_data.get("asn", {})
                        if cf_asn_obj and len(cf_asn_obj) > 0 and isinstance(cf_asn_obj, list):
                            asn_str = cf_asn_obj[0].get('description', 'Unknown')
                            
                    cf_certs = lists_obj.get("certificates", [])
                    cf_requests = scan_obj.get("requests", []) or page_obj.get("requests", [])
                    if not cf_requests:
                        cf_requests = [{"request": {"url": u, "method": "GET"}, "response": {"status": 200}} for u in lists_obj.get("urls", [])]
                    
                    cf_risks = page_obj.get("securityViolations", [])
                    for sm in [c for c in page_obj.get("console", []) if c.get("category") == "security"]:
                        cf_risks.append({"name": f"Console Security: {sm.get('subcategory', 'Error')}", "description": sm.get("text", ""), "url": sm.get("url", "")})
                    
                    is_malicious = bool(report_data.get("malicious"))
                    return {
                        "name": "Cloudflare Radar",
                        "malicious": is_malicious,
                        "data": {
                            "asn": asn_str,
                            "ip": primary_ip,
                            "server_location": page_obj.get("country", "Unknown"),
                            "certificates": cf_certs,
                            "requests": cf_requests,
                            "risks": cf_risks,
                            "links": lists_obj.get("linkDomains", [])
                        }
                    }
            return {"name": "Cloudflare Radar", "malicious": False, "data": None, "error": "Timeout polling scan"}
    except Exception as e:
        print(f"Cloudflare Engine Error: {e}")
        return {"name": "Cloudflare Radar", "malicious": False, "data": None, "error": str(e)}

async def engine_google_safe_browsing(url: str):
    """Google Safe Browsing API Engine"""
    api_key = os.environ.get("GOOGLE_SAFE_BROWSING_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"name": "Google Safe Browsing", "malicious": False, "data": None, "error": "API key missing"}
        
    endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}"
    data = {
        "client": {
            "clientId": "phishx",
            "clientVersion": "1.0.0"
        },
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [
                {"url": url}
            ]
        }
    }
        
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(endpoint, json=data, timeout=8.0)
            if res.status_code == 200:
                payload = res.json()
                matches = payload.get("matches", [])
                is_malicious = len(matches) > 0
                return {"name": "Google Safe Browsing", "malicious": is_malicious, "error": None}
            else:
                err_text = res.text[:100]
                return {"name": "Google Safe Browsing", "malicious": False, "error": f"HTTP {res.status_code}: {err_text}"}
    except Exception as e:
        print(f"Google Safe Browsing Error: {e}")
        return {"name": "Google Safe Browsing", "malicious": False, "error": str(e)}

async def fetch_whois(url: str):
    """Fetch WHOIS data for the domain"""
    try:
        ext = tldextract.extract(url)
        domain = f"{ext.domain}.{ext.suffix}"
        if not domain or not ext.suffix:
            return {"registrar": "Unknown", "creation_date": "Unknown"}
            
        def get_whois():
            return whois.whois(domain) # pyre-ignore
            
        w = await asyncio.to_thread(get_whois)
        
        registrar = w.registrar if w.registrar else "Unknown"
        if isinstance(registrar, list):
            registrar = registrar[0]
            
        creation_date = w.creation_date
        if isinstance(creation_date, list):
            creation_date = creation_date[0]
            
        if creation_date:
            creation_date = str(creation_date).split(' ')[0] # just the date part
        else:
            creation_date = "Unknown"
            
        return {"registrar": registrar, "creation_date": creation_date}
    except Exception as e:
        print(f"WHOIS Error: {e}")
        return {"registrar": "Unknown", "creation_date": "Unknown"}

@app.post("/api/verify")
async def verify_url(request: URLRequest):
    url = request.url
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'http://' + url
    
    try:
        # Run all engines concurrently
        engine_tasks = [
            engine_xgboost(url),
            engine_cloudflare(url),
            engine_google_safe_browsing(url)
        ]
        results, whois_data = await asyncio.gather(
            asyncio.gather(*engine_tasks), # pyre-ignore
            fetch_whois(url)
        )
        
        # Organize results
        engine_outputs = []
        malicious_count: int = 0
        total_engines = len(results)
        
        xgb_data = None
        cf_data = None
        
        for r in results:  # pyre-ignore
            engine_outputs.append({
                "name": r["name"],
                "malicious": r["malicious"],
                "error": r.get("error")
            })
            if r["malicious"]:
                malicious_count += 1  # pyre-ignore
                
            if r["name"] == "XGBoost AI":
                xgb_data = r.get("data", {})
            elif r["name"] == "Cloudflare Radar":
                cf_data = r.get("data", {})

        # Consensus Logic (>= 2 engines flag it malicious)
        is_phishing = malicious_count >= 2
        
        # Fallback: if only 1 engine flagged it, but it was Google Safe Browsing (a deterministic blacklist), override consensus.
        # This makes sense since Google Safe Browsing is known bad URLs, whereas XGB/Cloudflare are heuristics.
        # For demonstration context, if only XGBoost catches a very obvious mock typo, we let it pass for the demo.
        if malicious_count == 1:
            for r in results: # pyre-ignore
                if r["malicious"] and r["name"] in ["Google Safe Browsing", "XGBoost AI"]:
                    is_phishing = True
        
        rate_limit_exceeded = False
        gemini_analysis = "Gemini AI analysis is unavailable. Please configure the GEMINI_API_KEY environment variable."
        
        # Build Context String for Gemini
        context_str = f"Detection Consensus: {malicious_count}/{total_engines} engines reported malicious.\n"
        for o in engine_outputs:
            context_str += f"- {o['name']}: {'MALICIOUS' if o['malicious'] else 'CLEAN'}\n"
            if o['error']: context_str += f" ({o['error']})\n"
            
        if cf_data:
            context_str += (
                f"\n[CLOUDFLARE RADAR TRACE]:\n"
                f"- Hosting ASN: {cf_data.get('asn')} \n" # pyre-ignore
                f"- Resolved IPs: {cf_data.get('ip')} \n" # pyre-ignore
                f"- Server Location: {cf_data.get('server_location')} \n" # pyre-ignore
            )

        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            try:
                from google import genai  # pyre-ignore
                client = genai.Client(api_key=api_key)
                
                prompt = (
                    f"You are an expert cybersecurity URL analysis system. I am providing you with a URL: {url}\n"
                    f"My Multi-Engine Consensus Algorithm classified this URL as: {'PHISHING/MALICIOUS' if is_phishing else 'SAFE/CLEAN'}.\n"
                    f"{context_str}\n"
                    "Analyze this URL and provide a concise, 2-3 sentence human-readable explanation of why it might be safe or dangerous based on the engine results and trace.\n"
                    "Provide only the brief reasoning without any markdown or formatting."
                )
                
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                )
                if response.text:
                    gemini_analysis = response.text.strip()
            except Exception as gemini_err:
                err_str = str(gemini_err).upper()
                print(f"Gemini API Error: {err_str}")
                if "429" in err_str or "EXHAUSTED" in err_str or "QUOTA" in err_str:
                    rate_limit_exceeded = True
                    gemini_analysis = "Our daily free-tier AI analysis quotas have been reached. Please consider supporting the project to help us increase API limits."
                else:    
                    gemini_analysis = "Gemini AI analysis failed to generate a response at this time."
        
        return {
            "url": url,
            "is_phishing": is_phishing,
            "consensus": f"{malicious_count} / {total_engines}",
            "engines": engine_outputs,
            "features_extracted": xgb_data.get("features", []) if xgb_data else [],
            "gemini_analysis": gemini_analysis,
            "rate_limit_exceeded": rate_limit_exceeded,
            "cloudflare_report": cf_data,
            "whois": whois_data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
