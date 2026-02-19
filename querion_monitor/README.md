# Querion Intelligent Backend Monitoring

This module turns Querion into a real-time AI dev companion by capturing terminal output, API calls, and errors directly from VS Code and providing intelligent analysis.

## Setup Instructions

### 1. VS Code Extension
1. Open `querion_monitor/extension` in VS Code.
2. Run `npm install`.
3. Press `F5` to start the Extension Development Host.
4. Open the Command Palette (`Ctrl+Shift+P`) and type `Connect to Querion`.
5. Paste your JWT Token.

### 2. Backend Setup (Integrated)
1. Navigate to `backend_python`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Start Valkey (Redis): `docker run -d -p 6379:6379 valkey/valkey:7.2`.
4. Run the FastAPI server: `uvicorn app.main:app --port 4000 --reload`.
5. The monitoring dashboard is available at `http://localhost:4000/dash`.
6. The monitoring WebSocket is at `ws://localhost:4000/ws/monitor`.

### 3. Chainlit Integration
1. Add `from app.monitoring.chainlit_integration import *` to your main Chainlit app file.
2. Use the toggle button in the chat UI to switch modes.

## Security & Robustness Summary
- **Integrated Auth**: Monitoring now uses the same authentication system as the rest of Querion.
- **Embedded Dashboard**: No separate server needed for visuals.
- **Valkey Channeling**: Logs are isolated per `user_id` using Valkey Pub/Sub.
- **LangGraph Analysis**: Automated RCA (Root Cause Analysis) for backend errors.
