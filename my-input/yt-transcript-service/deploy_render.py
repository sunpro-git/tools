"""Create yt-transcript-service on Render.com via API"""
import json
import secrets
import urllib.request

RENDER_API_KEY = "rnd_rLkQeuL4SVXNFaxDKGoZInL9fbYh"
OWNER_ID = "tea-d6p5c1n5gffc738ucrjg"
API_SECRET = secrets.token_hex(32)

payload = {
    "type": "web_service",
    "name": "yt-transcript-service",
    "ownerId": OWNER_ID,
    "repo": "https://github.com/sunpro-git/tools",
    "autoDeploy": "yes",
    "rootDir": "my-input/yt-transcript-service",
    "serviceDetails": {
        "runtime": "python",
        "buildCommand": "pip install -r requirements.txt",
        "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
        "plan": "free",
        "envSpecificDetails": {
            "buildCommand": "pip install -r requirements.txt",
            "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
        },
    },
    "envVars": [{"key": "API_KEY", "value": API_SECRET}],
}

req = urllib.request.Request(
    "https://api.render.com/v1/services",
    data=json.dumps(payload).encode(),
    headers={
        "Authorization": f"Bearer {RENDER_API_KEY}",
        "Content-Type": "application/json",
    },
    method="POST",
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        svc = data["service"]
        url = svc["serviceDetails"]["url"]
        print(f"Service created successfully!")
        print(f"Service ID: {svc['id']}")
        print(f"Service URL: https://{url}")
        print(f"API_KEY (for Supabase): {API_SECRET}")
except urllib.error.HTTPError as e:
    print(f"Error {e.code}: {e.read().decode()}")
