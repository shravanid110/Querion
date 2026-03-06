import json
import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict
import redis.asyncio as redis
from app.monitoring.schemas import LogMessage
from app.monitoring.agents.monitoring_agent import MonitoringAgent
from app.config import settings
from app.services.log_chart_mapper import analyze_log_and_assign_chart, explain_log_issue

logger = structlog.get_logger()
router = APIRouter()

# Lazy agent — created only on first use so import never blocks startup
_agent = None
def get_agent() -> MonitoringAgent:
    global _agent
    if _agent is None:
        try:
            _agent = MonitoringAgent(groq_api_key=settings.GROK_API_KEY)
        except Exception as e:
            logger.warning("agent_init_failed", error=str(e))
    return _agent


# Valkey/Redis connection
redis_client = None
try:
    redis_client = redis.from_url("redis://localhost:6379", decode_responses=True)
    print("âœ… Monitoring Module: Connected to Redis/Valkey")
except Exception as e:
    print(f"âš ï¸ Monitoring Module: Redis connection failed ({e}). Logs will not be persisted.")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)

    async def broadcast_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/monitor")
async def websocket_endpoint(websocket: WebSocket):
    # In a full RBAC system, we would extract user_id from JWT here
    user_id = "default_user" 
    await manager.connect(user_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_json = json.loads(data)
            log = LogMessage(**message_json)
            
            # Log structured data
            logger.info("received_log", type=log.type, user_id=user_id)
            
            # Publish to Valkey
            try:
                if redis_client:
                    await redis_client.publish(f"monitor:{user_id}", data)
                else:
                    logger.warning("redis_not_available", user_id=user_id)
            except Exception as re:
                logger.error("redis_publish_error", error=str(re))
            
            # ── Log Mapping & AI Analysis ───────────────────────────────────
            try:
                chart_mapping = analyze_log_and_assign_chart(message_json)
                explanation = explain_log_issue(message_json)
                
                # Broadcast mapped chart to frontend
                await manager.broadcast_to_user(user_id, {
                    "type": "mapped_chart",
                    "log": message_json,
                    "mapping": chart_mapping,
                    "ai": explanation
                })
            except Exception as mapping_err:
                logger.error("mapping_error", error=str(mapping_err))

            # If error detected, trigger agent
            if log.type == "error" or (log.status_code and log.status_code >= 500):
                ag = get_agent()
                if ag:
                    report = await ag.run([log])
                    await manager.broadcast_to_user(user_id, {
                        "type": "agent_report",
                        "content": report.content,
                        "fix": report.suggested_fix,
                        "severity": report.severity
                    })

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error("websocket_error", error=str(e))
        manager.disconnect(user_id, websocket)
