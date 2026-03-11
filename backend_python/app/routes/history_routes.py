from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models import get_db, QueryHistory
import json

router = APIRouter()

@router.get("/")
async def get_history(user_id: str = "default_user", db: Session = Depends(get_db)):
    try:
        history = db.query(QueryHistory).filter(QueryHistory.user_id == user_id).order_by(QueryHistory.created_at.desc()).all()
        return [
            {
                "id": h.id,
                "conn_id": h.conn_id,
                "conn_name": h.conn_name,
                "prompt": h.prompt,
                "sql_query": h.sql_query,
                "explanation": h.explanation,
                "columns": json.loads(h.columns) if h.columns else [],
                "rows_data": json.loads(h.rows_data) if h.rows_data else [],
                "metrics": json.loads(h.metrics) if h.metrics else {"totalRows": 0, "approxSum": 0},
                "created_at": h.created_at
            }
            for h in history
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")
