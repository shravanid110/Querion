from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, DateTime
from pydantic import BaseModel, EmailStr
import uuid, hashlib, datetime, secrets

from app.models import Base, engine, SessionLocal

router = APIRouter()

# ─── Auth User Model ───────────────────────────────────────────────────────────
class AuthUser(Base):
    __tablename__ = "users"
    id            = Column(String(36),  primary_key=True, default=lambda: str(uuid.uuid4()))
    name          = Column(String(255), nullable=False)
    email         = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(50),  default="user")
    created_at    = Column(DateTime,    default=datetime.datetime.utcnow)

# Create the table if not exists
Base.metadata.create_all(bind=engine)

# ─── DB Dependency ─────────────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─── Helpers ───────────────────────────────────────────────────────────────────
def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def make_token() -> str:
    return secrets.token_hex(32)

# ─── Schemas ───────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class MeRequest(BaseModel):
    token: str

class SyncRequest(BaseModel):
    id: str
    email: str
    name: str | None = None
    avatar_url: str | None = None

# ─── Routes ────────────────────────────────────────────────────────────────────
@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(AuthUser).filter(AuthUser.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in instead.")

    user = AuthUser(
        id            = str(uuid.uuid4()),
        name          = req.name.strip(),
        email         = req.email.lower().strip(),
        password_hash = hash_password(req.password),
        role          = "user"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"success": True, "token": make_token(), "name": user.name, "email": user.email, "id": user.id}

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(AuthUser).filter(AuthUser.email == req.email.lower().strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email. Please create an account first.")
    if user.password_hash != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")

    return {"success": True, "token": make_token(), "name": user.name, "email": user.email, "id": user.id}

@router.post("/me")
def get_me(req: MeRequest, db: Session = Depends(get_db)):
    # Since tokens are handled by Supabase JWTs in the frontend, this just mocks OK.
    return {"name": "Supabase User", "email": "user@querion.ai", "id": "uuid"}

@router.post("/logout")
def logout(req: MeRequest, db: Session = Depends(get_db)):
    return {"success": True}

@router.post("/sync")
def sync_user(req: SyncRequest, db: Session = Depends(get_db)):
    # Look for existing user by email or id
    # Here we index primarily by email as we may have multiple auth methods
    user = db.query(AuthUser).filter(AuthUser.email == req.email.lower().strip()).first()
    
    if user:
        # Update name if empty locally but provided from oauth
        if req.name and not user.name:
            user.name = req.name
            db.commit()
    else:
        # Create new user for OAuth
        user = AuthUser(
            id            = req.id,
            name          = req.name.strip() if req.name else req.email.split('@')[0],
            email         = req.email.lower().strip(),
            password_hash = hash_password(str(uuid.uuid4())), # Random placeholder pass
            role          = "user"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return {"success": True, "id": str(user.id), "email": user.email, "name": user.name}
