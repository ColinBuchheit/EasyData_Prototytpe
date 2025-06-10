# tools/auth_token.py

import os, time, json, hmac, hashlib, base64

def generate_agent_token():
    secret = os.getenv("BACKEND_SECRET")
    service_id = os.getenv("BACKEND_SERVICE_ID", "ai-agent-network-service")

    payload = {
        "service_id": service_id,
        "timestamp": int(time.time()),
        "exp": int(time.time()) + 3600
    }

    payload_json = json.dumps(payload, separators=(",", ":"))
    payload_b64 = base64.b64encode(payload_json.encode()).decode()

    signature = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()

    return f"{payload_b64}.{signature}"

