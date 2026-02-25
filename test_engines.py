import urllib.request
import json
url = 'http://localhost:8000/api/verify'
data = json.dumps({'url': 'http://paypal.login.xyz'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        out = json.loads(response.read().decode('utf-8'))
        print('Phishing Overview:', out['is_phishing'])
        print('Consensus:', out['consensus'])
        for e in out['engines']:
            print(f"- {e['name']}: {e['malicious']} (Error: {e.get('error')})")
except Exception as e:
    print(e)
