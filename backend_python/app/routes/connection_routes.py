import hashlib
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.models import get_db, Connection
from app.services.encryption import encrypt, decrypt
from app.services.mysql_executor import MySQLService

router = APIRouter()

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

from pydantic import field_validator

class ConnectionCreate(BaseModel):
    user_id: Optional[str] = "default_user"
    name: Optional[str] = None
    host: str
    port: int = 3306
    database: str
    username: str
    password: str
    master_password: str  # The user's master password field

    @field_validator('port', mode='before')
    @classmethod
    def coerce_port(cls, v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return 3306


@router.post("/test")
async def test_connection(data: dict = Body(...)):
    try:
        # Reduced timeout internally for "fast" testing
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
        encrypted_db_password = encrypt(data.password)
        hashed_master_password = hash_pw(data.master_password)
        
        name = data.name or f"{data.database} @ {data.host}"
        
        db_connection = Connection(
            user_id=data.user_id,
            name=name,
            host=data.host,
            port=data.port,
            database=data.database,
            username=data.username,
            password=encrypted_db_password,
            user_master_password=hashed_master_password
        )
        
        db.add(db_connection)
        db.commit()
        db.refresh(db_connection)
        
        return db_connection
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def list_connections(user_id: str = "default_user", db: Session = Depends(get_db)):
    try:
        connections = db.query(Connection).filter(Connection.user_id == user_id).all()
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

@router.post("/verify-master-password")
async def verify_master_password(data: dict = Body(...), db: Session = Depends(get_db)):
    """
    Verify the master password for a specific connection.
    Expected data: {'connectionId': str, 'masterPassword': str}
    """
    conn_id = data.get("connectionId")
    master_pw = data.get("masterPassword")
    
    if not conn_id or not master_pw:
        raise HTTPException(status_code=400, detail="Missing connectionId or masterPassword")
        
    conn = db.query(Connection).filter(Connection.id == conn_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
        
    if conn.user_master_password == hash_pw(master_pw):
        # Decrypt and return the DB password ONLY on success
        decrypted_db_password = decrypt(conn.password)
        return {
            "success": True, 
            "db_password": decrypted_db_password,
            "username": conn.username,
            "host": conn.host,
            "port": conn.port,
            "database": conn.database
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid master password")

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
