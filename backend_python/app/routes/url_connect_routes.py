from fastapi import APIRouter, HTTPException, Body
from app.services.url_service import UrlService

router = APIRouter()

@router.post("/connect")
async def connect_url(url: str = Body(..., embed=True)):
    try:
        if not url:
            raise HTTPException(status_code=400, detail="URL is required.")

        session = await UrlService.connect(url)

        return {
            "connectionId": session["id"],
            "type": session["type"],
            "summary": session["summary"] or "Successfully connected. You can now query the content.",
            "columns": session["columns"],
            "preview": session["structuredData"],
            "data": session["structuredData"]
        }
    except Exception as e:
        print(f"Connection Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e) or "Failed to connect to URL.")

@router.post("/query")
async def query_url(connectionId: str = Body(...), prompt: str = Body(...)):
    try:
        if not connectionId or not prompt:
            raise HTTPException(status_code=400, detail="Connection ID and Prompt are required.")

        answer = await UrlService.query(connectionId, prompt)

        return {
            "answer": answer["answer"],
        }

    except Exception as e:
        print(f"Query Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e) or "Failed to process query.")

@router.get("/session/{session_id}")
async def get_session(session_id: str):
    session = UrlService.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    return {
        "id": session["id"],
        "url": session["url"],
        "type": session["type"],
        "columns": session["columns"],
        "structuredData": session["structuredData"],
        "timestamp": session["timestamp"]
    }
