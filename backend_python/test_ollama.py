import httpx
import asyncio
import json

async def test_ollama():
    url = "http://localhost:11434/api/generate"
    model = "deepseek-coder"
    prompt = "Hello, are you DeepSeek?"
    
    print(f"Testing connection to {url} with model {model}...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json={
                "model": model,
                "prompt": prompt,
                "stream": False
            }, timeout=5.0)
            
            if resp.status_code == 200:
                print("Connection Success!")
                print("Response:", resp.json().get("response"))
            else:
                print(f"Connection Failed with status {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"Error connecting to Ollama: {e}")

if __name__ == "__main__":
    asyncio.run(test_ollama())
