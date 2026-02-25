# pyre-ignore-all-errors
from fastapi import FastAPI, HTTPException  # pyre-ignore
from pydantic import BaseModel  # pyre-ignore
import pickle  # pyre-ignore
import numpy as np  # pyre-ignore
from ml_extractor import featureExtraction  # pyre-ignore
import os  # pyre-ignore
from dotenv import load_dotenv
load_dotenv()
import httpx
import asyncio
from fastapi.middleware.cors import CORSMiddleware  # pyre-ignore


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

@app.post("/api/verify")
async def verify_url(request: URLRequest):
    url = request.url
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'http://' + url
    
    try:
        features = featureExtraction(url)
        # XGBoost expects 2D array
        features_array = np.array([features])
        prediction = model.predict(features_array)[0]
        
        is_phishing = bool(prediction == 1)
        
        # Whitelist our own domain to prevent false positives
        if "phish-x.vercel.app" in url.lower():
            is_phishing = False
            features = [0] * len(features) # Clear any false positive threat indicators
        
        gemini_analysis = "Gemini AI analysis is unavailable. Please configure the GEMINI_API_KEY environment variable."
        rate_limit_exceeded = False # Add tracking flag
        
        cloudflare_context = ""
        cloudflare_report = None
        cloudflare_account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
        cloudflare_api_token = os.environ.get("CLOUDFLARE_API_TOKEN")

        # Integrate Cloudflare URL Scanner for advanced heuristic validation
        if cloudflare_account_id and cloudflare_api_token:
            headers = {
                "Authorization": f"Bearer {cloudflare_api_token}",
                "Content-Type": "application/json"
            }
            try:
                async with httpx.AsyncClient() as client_http:
                    # 1. Submit Scan Request
                    submit_url = f"https://api.cloudflare.com/client/v4/accounts/{cloudflare_account_id}/urlscanner/scan"
                    submit_res = await client_http.post(submit_url, headers=headers, json={"url": url}, timeout=10.0)
                    
                    if submit_res.status_code == 200:
                        scan_uuid = submit_res.json()["result"]["uuid"]
                        
                        # 2. Poll for Completion (Max 15 seconds to match Render queue UX)
                        report_url = f"https://api.cloudflare.com/client/v4/accounts/{cloudflare_account_id}/urlscanner/scan/{scan_uuid}?target=report"
                        for _ in range(8):
                            await asyncio.sleep(2)
                            report_res = await client_http.get(report_url, headers=headers, timeout=10.0)
                            if report_res.status_code == 200:
                                report_data = report_res.json().get("result", {})
                                
                                # Extract verdict
                                if report_data.get("malicious"):
                                    is_phishing = True
                                    features[0] = 1 # pyre-ignore
                                    
                                # Build intelligence context for Gemini
                                # Extract Data from Nested Scan Object
                                scan_obj = report_data.get("scan", {})
                                lists_obj = scan_obj.get("lists", {})
                                # Build intelligence context for Gemini
                                scan_obj = report_data.get("scan", {})
                                lists_obj = scan_obj.get("lists", {})
                                page_obj = scan_obj.get("page", {})
                                
                                cf_ips = lists_obj.get("ips", [])
                                cf_asn_list = lists_obj.get("asns", []) # fallback to list in case it's nested differently
                                
                                # Process IP strings
                                resolved_ips_str = "Unknown"
                                primary_ip = "Unknown"
                                if cf_ips and isinstance(cf_ips[0], str):
                                    resolved_ips_str = ", ".join(cf_ips[:2])
                                    primary_ip = cf_ips[0]
                                elif cf_ips and isinstance(cf_ips[0], dict):
                                    resolved_ips_str = ", ".join([ip.get('ip', '') for ip in cf_ips[:2]])
                                    primary_ip = cf_ips[0].get('ip', 'Unknown')
                                    
                                # Process ASN strings
                                asn_str = "Unknown"
                                if cf_asn_list and isinstance(cf_asn_list[0], str):
                                    asn_str = f"AS{cf_asn_list[0]}"
                                else:
                                    cf_asn_obj = report_data.get("asn", {})
                                    if cf_asn_obj and len(cf_asn_obj) > 0 and isinstance(cf_asn_obj, list):
                                        asn_str = cf_asn_obj[0].get('description', 'Unknown')
                                
                                cf_certs = lists_obj.get("certificates", [])
                                
                                # Cloudflare API natively strips HTTP transactions (HAR) for standard tokens, 
                                # so we fallback to the raw 'urls' array.
                                cf_requests = scan_obj.get("requests", [])
                                if not cf_requests: cf_requests = page_obj.get("requests", [])
                                if not cf_requests:
                                    # Convert flat URL list to mocked req objects for frontend table
                                    urls_list = lists_obj.get("urls", [])
                                    cf_requests = [{"request": {"url": u, "method": "GET"}, "response": {"status": 200}} for u in urls_list]
                                
                                cf_risks = page_obj.get("securityViolations", []) # Risks are called securityViolations in the scanner payload
                                
                                cloudflare_context = (
                                    f"\n\n[CLOUDFLARE THREAT INTELLIGENCE RADAR]:\n"
                                    f"- Cloudflare Verdict: {'MALICIOUS' if report_data.get('malicious') else 'Clean'}\n"
                                    f"- Hosting ASN: {asn_str}\n"
                                    f"- Resolved IPs: {resolved_ips_str}\n"
                                )
                                cloudflare_report = {
                                    "malicious": report_data.get("malicious", False),
                                    "asn": asn_str,
                                    "ip": primary_ip,
                                    "certificates": cf_certs,
                                    "requests": cf_requests,
                                    "risks": cf_risks
                                }
                                break
            except Exception as cf_err:
                print(f"Cloudflare API Error: {cf_err}")

        # Integrate Google GenAI
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            try:
                from google import genai  # pyre-ignore
                client = genai.Client(api_key=api_key)
                
                prompt = (
                    f"You are an expert cybersecurity URL analysis system. I am providing you with a URL: {url}\n"
                    f"My machine learning heuristic engine has classified this URL as: {'PHISHING/MALICIOUS' if is_phishing else 'SAFE/CLEAN'}.\n"
                    f"{cloudflare_context}\n"
                    "Analyze this URL and provide a concise, 2-3 sentence human-readable explanation of why it might be safe or dangerous.\n"
                    "Consider the following criteria in your brief analysis:\n"
                    "1. URL Structure Red Flags: Is it using an IP instead of a domain? Is the URL excessively long? Too many subdomains? Typosquatting (e.g., go0gle)? Brand name in wrong place (e.g., paypal.login.xyz)? Suspicious characters (@, multiple //, % encoding)?\n"
                    "2. Domain & Hosting Signals: Is the extension a high-risk TLD (.xyz, .top, .ru)? Is it a free hosting domain (weebly, 000webhostapp)? Incorporate Cloudflare Threat Intelligence if provided above, noting if the ASN/IPs seem suspicious or mismatched for a legitimate service.\n"
                    "3. HTTPS & Certificate: If the URL uses HTTP instead of HTTPS, explicitly flag it as insecure for sensitive data.\n\n"
                    "Instructions: Synthesize these signals into a tight, 2-3 sentence summary reasoning. Do not list out bullet points. Just write a natural explanation. "
                    "Example output: 'This URL is highly suspicious because it uses a well-known brand name in a subdomain rather than the root domain, combined with an insecure HTTP connection. The Cloudflare Radar identifies the hosting ASN as a generic provider rather than the official corporate infrastructure, strongly indicating a phishing attempt.'\n"
                    "Do not use markdown formatting or bolding, just plain text."
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
            "features_extracted": features,
            "gemini_analysis": gemini_analysis,
            "rate_limit_exceeded": rate_limit_exceeded,
            "cloudflare_report": cloudflare_report
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
