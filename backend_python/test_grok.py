import os
import requests
import json

api_key = "GROK_API_KEY_REMOVED"

url = "https://api.x.ai/v1/chat/completions"

payload = {
    "model": "grok-2-1212",
    "messages": [
        {"role": "system", "content": "You are a test."},
        {"role": "user", "content": "Say hello."}
    ],
    "temperature": 0.2
}
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, json=payload, headers=headers)
    print("STATUS:", response.status_code)
    print("RESP:", response.text)
except Exception as e:
    print("ERR:", e)
