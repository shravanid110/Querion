from fastapi import APIRouter

router = APIRouter()

# Global variable to store last generated AI insights (for /api/ai-insights)
recent_insights = []

@router.get("/ai-insights")
async def get_ai_insights():
    if not recent_insights:
        return {
            "severity": "low",
            "service": "Unknown",
            "cause": "No recent logs to analyze.",
            "fix": "Generate traffic to view insights."
        }
    return recent_insights[-1]

def add_insight(ai_result: dict, log_line: str):
    # Map raw ai_result to the exact structure expected by the endpoint
    insight = {
        "severity": ai_result.get("severity", "medium"),
        "service": ai_result.get("type", "backend"),
        "cause": ai_result.get("cause", log_line[:50]),
        "fix": ai_result.get("suggested_fix", "Investigate manually.")
    }
    
    recent_insights.append(insight)
    if len(recent_insights) > 50:
        recent_insights.pop(0)
