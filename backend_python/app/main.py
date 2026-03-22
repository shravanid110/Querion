import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from contextlib import asynccontextmanager

from app.routes import connection_routes, query_routes, url_connect_routes, security_routes, voice_routes, report_routes, auth_routes, ai_insights, history_routes, multidb_routes
from app.monitoring.routers import monitor_ws, monitor_sync
from app.reporting.api import router as reporting_router
from app.monitoring.dash_app import init_dash
from app.models import init_db
from app.monitoring.models import init_monitor_db
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    import threading
    def run_init():
        print("DEBUG: Starting Async Database Initialization...")
        try:
            init_db()
            init_monitor_db()
            print("✅ Database initialization complete.")
        except Exception as e:
            print(f"❌ Database initialization failed: {e}")

    # Start DB initialization in background thread to avoid hanging the app startup
    threading.Thread(target=run_init, daemon=True).start()
    
    # Preheat Whisper model in background
    from app.services.voice_service import preheat_model
    preheat_model()
    
    print(f"🚀 Querion API is warming up on port {settings.PORT}...")
    yield

app = FastAPI(title="Querion Backend", version="1.0.0", lifespan=lifespan)

# ── CORS must be first middleware (before all routes) ─────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request logger ────────────────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {request.method} {request.url.path}")
    
    # ── Secure Pipeline Logging ──────────────────────────────────────────────────
    pipeline_hash = request.headers.get("x-secure-pipeline-hash")
    if pipeline_hash and "/query" in request.url.path:
        print(f"🔒 SHA 256 started successfully. Secure Pipeline Session: {pipeline_hash[:8]}...")
        
    return await call_next(request)

# ── Static ────────────────────────────────────────────────────────────────────
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)

@app.get("/")
async def root():
    return {"message": "Querion API is running", "status": "ok", "time": datetime.now().isoformat()}

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.1-fallbacks"}

# ── API Routes ────────────────────────────────────────────────────────────────
app.include_router(connection_routes.router, prefix="/api/connections", tags=["connections"])
app.include_router(connection_routes.router, prefix="/api/connect",     tags=["connections"])
app.include_router(query_routes.router,      prefix="/api/query",       tags=["query"])
app.include_router(url_connect_routes.router,prefix="/api/url",         tags=["url"])
app.include_router(security_routes.router,   prefix="/api/security",    tags=["security"])
app.include_router(voice_routes.router,      prefix="/api",             tags=["voice"])
app.include_router(auth_routes.router,       prefix="/api/auth",        tags=["auth"])
app.include_router(monitor_ws.router,                                   tags=["monitoring-ws"])
app.include_router(monitor_sync.router,      prefix="/api/monitor",     tags=["monitoring"])
app.include_router(report_routes.router,     prefix="/api/report",      tags=["reports"])
app.include_router(reporting_router,                                    tags=["Enterprise Reporting"])
app.include_router(ai_insights.router,       prefix="/api",             tags=["ai-insights"])
app.include_router(history_routes.router,    prefix="/api/history",     tags=["history"])
app.include_router(multidb_routes.router,    prefix="/api/multidb",     tags=["multidb"])

# ── Dash dashboard ────────────────────────────────────────────────────────────
init_dash(app)

# ── Chainlit (optional – wrapped so startup never fails if path issues) ───────
try:
    from chainlit.utils import mount_chainlit
    mount_chainlit(app=app, target="app/monitoring/chainlit_integration.py", path="/chat")
    print("✅ Chainlit mounted at /chat")
except Exception as e:
    print(f"⚠️  Chainlit not mounted: {e}")

# ── 404 handler ───────────────────────────────────────────────────────────────
@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    print(f"[404] {request.method} {request.url.path}")
    return JSONResponse(
        status_code=404,
        content={"error": f"Route not found: {request.method} {request.url.path}"}
    )

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
