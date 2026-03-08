from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.models import get_db, Connection
from app.services.encryption import encrypt, decrypt
from app.services.mysql_executor import MySQLService

router = APIRouter()

class ConnectionCreate(BaseModel):
    name: Optional[str] = None
    host: str
    port: int = 3306
    database: str
    username: str
    password: str

@router.post("/test")
async def test_connection(data: dict = Body(...)):
    try:
        result = MySQLService.test_connection({
            "host": data.get("host"),
            "port": int(data.get("port", 3306)),
            "database": data.get("database"),
            "user": data.get("username"),
            "password": data.get("password")
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_connection(data: ConnectionCreate, db: Session = Depends(get_db)):
    try:
        encrypted_password = encrypt(data.password)
        
        name = data.name or f"{data.database} @ {data.host}"
        
        db_connection = Connection(
            name=name,
            host=data.host,
            port=data.port,
            database=data.database,
            username=data.username,
            password=encrypted_password
        )
        
        db.add(db_connection)
        db.commit()
        db.refresh(db_connection)
        
        return db_connection
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def list_connections(db: Session = Depends(get_db)):
    try:
        connections = db.query(Connection).all()
        # Filter to remove password from response
        return [
            {
                "id": c.id,
                "name": c.name,
                "host": c.host,
                "database": c.database,
                "port": c.port,
                "createdAt": c.created_at
            }
            for c in connections
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch connections")

@router.delete("/{connection_id}")
async def delete_connection(connection_id: str, db: Session = Depends(get_db)):
    try:
        connection = db.query(Connection).filter(Connection.id == connection_id).first()
        if not connection:
            raise HTTPException(status_code=404, detail="Connection not found")
            
        db.delete(connection)
        db.commit()
        return {"success": True}
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete connection")
