import httpx
import json
import asyncio

async def test_sync():
    url = "http://localhost:4000/api/monitor/sync"
    payload = {
        "user_id": "default_user",
        "project_name": "Test Project",
        "logs": [
            {"line": "INFO: Starting app"},
            {"line": "ERROR: Unexpected token"},
            {"line": "  at parser (file.js:45)"},
            {"line": "  at transform (file.js:80)"},
            {"line": "  at run (file.js:120)"},
            {"line": "INFO: App running"}
        ]
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(url, json=payload)
        print(f"Status: {r.status_code}")
        print(r.json())

if __name__ == "__main__":
    asyncio.run(test_sync())
