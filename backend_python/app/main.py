import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from contextlib import asynccontextmanager

from app.routes import connection_routes, query_routes, url_connect_routes, security_routes
from app.monitoring.routers import monitor_ws, monitor_sync
from app.monitoring.dash_app import init_dash
from app.models import init_db
from app.monitoring.models import init_monitor_db
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing Database...")
    try:
        init_db()
        init_monitor_db()
        print(f"✅ Querion Backend running on port {settings.PORT}")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
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
    return {"status": "ok", "version": "1.0.0"}

# ── API Routes ────────────────────────────────────────────────────────────────
app.include_router(connection_routes.router, prefix="/api/connections", tags=["connections"])
app.include_router(connection_routes.router, prefix="/api/connect",     tags=["connections"])
app.include_router(query_routes.router,      prefix="/api/query",       tags=["query"])
app.include_router(url_connect_routes.router,prefix="/api/url",         tags=["url"])
app.include_router(security_routes.router,   prefix="/api/security",    tags=["security"])
app.include_router(monitor_ws.router,                                   tags=["monitoring-ws"])
app.include_router(monitor_sync.router,      prefix="/api/monitor",     tags=["monitoring"])

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
    uvicorn.run("app.main:app", host="127.0.0.1", port=settings.PORT, reload=True)
