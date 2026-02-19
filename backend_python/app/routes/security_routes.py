from fastapi import APIRouter, HTTPException, Body
import httpx
from urllib.parse import urlparse
import re

router = APIRouter()

MALICIOUS_PATTERNS = [
    re.compile(r'<script', re.I),
    re.compile(r'alert\(', re.I),
    re.compile(r'onerror', re.I),
    re.compile(r'eval\(', re.I),
    re.compile(r'SELECT.*FROM', re.I),
    re.compile(r'INSERT.*INTO', re.I),
    re.compile(r'DELETE.*FROM', re.I),
    re.compile(r'DROP.*TABLE', re.I),
    re.compile(r'UNION.*SELECT', re.I),
    re.compile(r'OR.*1=1', re.I),
]

HARMFUL_KEYWORDS = [
    'drugs', 'bomb', 'terror', 'porn', 'violence', 'hate', 'suicide', 'kill', 'attack'
]

CSV_INJECTION_PREFIXES = ['=', '+', '-', '@']

def is_private_ip(host: str) -> bool:
    parts = host.split('.')
    if len(parts) == 4:
        try:
            first = int(parts[0])
            second = int(parts[1])
            if first == 10: return True
            if first == 127: return True
            if first == 172 and (16 <= second <= 31): return True
            if first == 192 and second == 168: return True
        except:
            pass
    return host == 'localhost' or host == '::1'

@router.post("/scan-url")
async def scan_url(url: str = Body(..., embed=True)):
    if not url:
        raise HTTPException(status_code=400, detail='URL is required')

    try:
        parsed_url = urlparse(url)

        # 1. HTTPS validation
        if parsed_url.scheme != 'https':
            return {
                "status": "blocked",
                "score": 0,
                "issues": ["URL must use HTTPS for secure data transfer."],
                "domain": parsed_url.hostname,
                "fileSize": 0,
                "riskLevel": "High"
            }

        # 2. CSV extension check
        if not parsed_url.path.lower().endswith('.csv'):
            return {
                "status": "blocked",
                "score": 10,
                "issues": ["URL must point to a .csv file."],
                "domain": parsed_url.hostname,
                "fileSize": 0,
                "riskLevel": "High"
            }

        # 3. Private IP check
        if is_private_ip(parsed_url.hostname or ""):
            return {
                "status": "blocked",
                "score": 0,
                "issues": ["Access to private network or localhost is restricted."],
                "domain": parsed_url.hostname,
                "fileSize": 0,
                "riskLevel": "High"
            }

        # 4. Fetch metadata (File size check)
        file_size = 0
        async with httpx.AsyncClient() as client:
            try:
                head_response = await client.head(url, timeout=5.0)
                content_length = head_response.headers.get('content-length')
                file_size = int(content_length) if content_length else 0
            except:
                pass

        MAX_SIZE = 5 * 1024 * 1024 # 5MB

        if file_size > MAX_SIZE:
            return {
                "status": "blocked",
                "score": 20,
                "issues": ["File size exceeds 5MB limit."],
                "domain": parsed_url.hostname,
                "fileSize": round(file_size / 1024),
                "riskLevel": "High"
            }

        # 5. Content Scanning
        issues = []
        score = 100

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url, 
                    timeout=10.0,
                    headers={'Range': 'bytes=0-102400'} # Get first 100KB
                )
                content = response.text

                # Script/SQL Injection
                for pattern in MALICIOUS_PATTERNS:
                    if pattern.search(content):
                        issues.append(f"Detected malicious pattern: {pattern.pattern}")
                        score -= 30

                # Harmful Keywords
                for keyword in HARMFUL_KEYWORDS:
                    if keyword.lower() in content.lower():
                        issues.append(f"Detected prohibited keyword: {keyword}")
                        score -= 20

                # CSV Formula Injection
                lines = content.split('\n')
                formula_injections = 0
                for line in lines[:100]:
                    cells = line.split(',')
                    for cell in cells:
                        trimmed = cell.strip()
                        if any(trimmed.startswith(p) for p in CSV_INJECTION_PREFIXES) and len(trimmed) > 1:
                            formula_injections += 1
                
                if formula_injections > 0:
                    issues.append(f"Detected {formula_injections} potential CSV formula injection attempts.")
                    score -= 25

        except Exception as e:
            issues.append("Could not verify file content security.")
            score -= 50

        # Final assessment
        score = max(0, score)
        risk_level = "Low" if score > 80 else "Medium" if score > 40 else "High"
        status = "safe" if score > 60 else "blocked"

        return {
            "status": status,
            "score": score,
            "issues": issues,
            "domain": parsed_url.hostname,
            "fileSize": round(file_size / 1024),
            "risk_level": risk_level
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail='Invalid URL provided')
