from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class LogMessage(BaseModel):
    type: str # terminal, api_call, file_change, error
    data: str
    timestamp: datetime
    terminalId: Optional[str] = None
    file: Optional[str] = None
    status_code: Optional[int] = None
    endpoint: Optional[str] = None

class AgentResponse(BaseModel):
    id: str
    type: str
    content: str
    suggested_fix: Optional[str] = None
    severity: str = "info"
