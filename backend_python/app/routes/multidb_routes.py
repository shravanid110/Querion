import hashlib
import re
from fastapi import APIRouter, Depends, HTTPException, Body, Request
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.models import get_db, MultidbConnection, QueryHistory
from app.services.encryption import encrypt, decrypt
from app.connectors.factory import MultiDBFactory

router = APIRouter()

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

from pydantic import field_validator

class MultiDbConnectionCreate(BaseModel):
    user_id: Optional[str] = "default_user"
    dbType: str
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    uri: Optional[str] = None
    master_password: str

    @field_validator('port', mode='before')
    @classmethod
    def coerce_port(cls, v):
        if not v:
            return None
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

@router.post("/test")
async def test_multidb_connection(request: Request):
    """Tests a database connection by dynamically delegating to the right connector."""
    try:
        # Use direct JSON parsing for maximum reliability
        try:
            data = await request.json()
        except Exception:
            return {"success": False, "error": "Invalid request body. JSON expected."}

        print(f"DEBUG: [TEST_GATEWAY] Body received: {data}")
        
        # Robust dbType extraction
        db_type = data.get("dbType") or data.get("databaseType")
        
        # Fallback: case-insensitive check
        if not db_type:
            for k, v in data.items():
                if k.lower() in ["dbtype", "databasetype"]:
                    db_type = v
                    break
        
        if not db_type:
            print("ERROR: No dbType found in payload")
            return {"success": False, "error": "Database type (dbType) is required."}
            
        db_type = str(db_type).lower()
        print(f"DEBUG: [TEST_GATEWAY] Delegating test to MultiDBFactory for: {db_type}")
        
        # Run synchronous connector logic in a thread pool to avoid blocking
        import asyncio
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, MultiDBFactory.test_connection, db_type, data)
        
        print(f"DEBUG: [TEST_GATEWAY] Result for {db_type}: {result}")
        return result
        
    except Exception as e:
        print(f"DEBUG: [MULTIDB_TEST_EXCEPTION] {str(e)}")
        return {"success": False, "error": f"Internal Server Error: {str(e)}"}

@router.post("/save")
async def save_multidb_connection(data: MultiDbConnectionCreate, db: Session = Depends(get_db)):
    try:
        encrypted_db_password = encrypt(data.password) if data.password else None
        hashed_master_password = hash_pw(data.master_password)
        
        name = data.name or f"{data.dbType} Connection"
        
        db_connection = MultidbConnection(
            user_id=data.user_id,
            db_type=data.dbType,
            name=name,
            host=data.host,
            port=data.port,
            database=data.database,
            username=data.username,
            password=encrypted_db_password,
            uri=data.uri,
            user_master_password=hashed_master_password
        )
        
        db.add(db_connection)
        db.commit()
        db.refresh(db_connection)
        
        return {"success": True, "id": db_connection.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def list_multidb_connections(user_id: str = "default_user", db: Session = Depends(get_db)):
    try:
        connections = db.query(MultidbConnection).filter(MultidbConnection.user_id == user_id).all()
        return [
            {
                "id": c.id,
                "name": c.name,
                "dbType": c.db_type,
                "host": c.host,
                "database": c.database,
                "createdAt": c.created_at
            }
            for c in connections
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch connections")

@router.post("/query")
async def run_multidb_query(connectionId: str = Body(...), prompt: str = Body(...), db: Session = Depends(get_db)):
    try:
        from app.services.nl_to_sql import convert_nl_to_sql, generate_data_insights
        import json
        from fastapi.encoders import jsonable_encoder
        
        conn = db.query(MultidbConnection).filter(MultidbConnection.id == connectionId).first()
        if not conn:
            raise HTTPException(status_code=404, detail="Connection not found")
            
        credentials = {
            "host": conn.host,
            "port": conn.port,
            "database": conn.database,
            "username": conn.username,
            "password": decrypt(conn.password) if conn.password else None,
            "uri": conn.uri,
        }
        db_type = conn.db_type
        
        schema = MultiDBFactory.get_schema_summary(db_type, credentials)
        
        result = await convert_nl_to_sql(schema, prompt, db_type=db_type)
        
        if not result.get("sql"):
            return {
                "sql": None,
                "explanation": result.get("explanation", "Could not process."),
                "columns": [],
                "rows": [],
                "metrics": {"totalRows": 0, "approxSum": 0}
            }
            
        data = MultiDBFactory.execute_read_only_query(db_type, credentials, result["sql"])
        
        rows = data["rows"]
        total_rows = len(rows)
        numeric_sum = 0
        if total_rows > 0:
            first_row = rows[0]
            number_fields = [k for k, v in first_row.items() if isinstance(v, (int, float))]
            if number_fields:
                field = number_fields[0]
                numeric_sum = sum(float(row.get(field) or 0) for row in rows)
                
        suggested_chart = result.get("suggestedChart", "bar")
        
        rich_explanation = result.get("explanation", "")
        if total_rows > 0 and result.get("sql"):
            try:
                data_insights = await generate_data_insights(prompt, result["sql"], rows, schema)
                explanation_parts = rich_explanation.split("📊 Data Visualization & Insights:")
                header_part = explanation_parts[0] if explanation_parts else rich_explanation
                rich_explanation = f"{header_part.strip()}\n\n{data_insights.strip()}"
                
                # If insights contain a CHART_TYPE, override the suggestion
                chart_match = re.search(r"CHART_TYPE:\s*(bar|line|pie|area)", rich_explanation, re.IGNORECASE)
                if chart_match:
                    suggested_chart = chart_match.group(1).lower()
            except Exception as e:
                print(e)
                
        # Save to history
        try:
            history_record = QueryHistory(
                user_id=conn.user_id or "default_user",
                conn_id=conn.id,
                conn_name=conn.name,
                prompt=prompt,
                sql_query=result["sql"],
                explanation=rich_explanation,
                columns=json.dumps(jsonable_encoder(data["columns"])),
                rows_data=json.dumps(jsonable_encoder(rows[:100])),
                metrics=json.dumps({"totalRows": total_rows, "approxSum": numeric_sum, "suggestedChart": suggested_chart})
            )
            db.add(history_record)
            db.commit()
        except Exception:
            db.rollback()
            
        return {
            "sql": result["sql"],
            "explanation": rich_explanation,
            "columns": data["columns"],
            "rows": rows,
            "suggestedChart": suggested_chart,
            "metrics": {
                "totalRows": total_rows,
                "approxSum": numeric_sum
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
