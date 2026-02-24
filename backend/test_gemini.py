import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.environ.get("GEMINI_API_KEY")
print(f"Loaded API Key: {api_key[:5] if api_key else 'None'}... (hidden for security)")

try:
    if api_key:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-3-flash-preview',
            contents="Say hello!",
        )
        print("Success! Response from Gemini:", response.text)
    else:
        print("Error: GEMINI_API_KEY is not set.")
except Exception as e:
    print(f"Gemini API Error: {e}")
