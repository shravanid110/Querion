import chainlit as cl
import os
import json
from datetime import datetime, timedelta
from app.monitoring.agents.monitoring_agent import MonitoringAgent
from app.config import settings
from app.monitoring.models import MonitorSessionLocal, UserProject, ProjectFile, ProjectLog
from app.monitoring.schemas import LogMessage
from sqlalchemy.orm import Session

# Initialize Agent
agent = MonitoringAgent(groq_api_key=settings.GROK_API_KEY)

def get_db():
    db = MonitorSessionLocal()
    try:
        return db
    finally:
        pass # Handle closing in caller

@cl.on_chat_start
async def start():
    cl.user_session.set("mode", "database") # Default mode
    cl.user_session.set("current_project", None)
    
    # CSS for the Indigo Theme and Floating Button
    # Note: Chainlit allows custom CSS injection
    await cl.Message(content="""
<style>
    :root {
        --background: 215 28% 10%;
        --foreground: 0 0% 98%;
        --primary: 243 75% 59%;
        --card: 217 32% 17%;
    }
    .cl-header {
        background-color: #0F172A !important;
        border-bottom: 1px solid #1E293B !important;
    }
    .monitoring-btn {
        background-color: #6366F1 !important;
        color: white !important;
        border-radius: 9999px !important;
        padding: 8px 16px !important;
        font-weight: 600 !important;
        border: none !important;
        cursor: pointer !important;
        position: fixed;
        top: 20px;
        right: 80px;
        z-index: 1000;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    .project-card {
        background-color: #1E293B;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 16px;
        margin: 8px;
        transition: all 0.2s;
    }
    .project-card:hover {
        border-color: #6366F1;
        transform: translateY(-2px);
    }
    .status-dot {
        height: 8px;
        width: 8px;
        background-color: #22C55E;
        border-radius: 50%;
        display: inline-block;
        margin-right: 6px;
    }
</style>
""", relay=False).send()

    actions = [
        cl.Action(name="switch_to_monitoring", value="monitoring", label="Backend Monitoring", description="Switch to real-time backend monitoring")
    ]
    
    await cl.Message(content="Welcome to **Querion**. I am your Database Assistant. How can I help you today?", actions=actions).send()

@cl.action_callback("switch_to_monitoring")
async def on_monitoring_mode(action: cl.Action):
    cl.user_session.set("mode", "monitoring")
    await show_project_selector()

@cl.action_callback("switch_to_database")
async def on_database_mode(action: cl.Action):
    cl.user_session.set("mode", "database")
    cl.user_session.set("current_project", None)
    await cl.Message(content="Switched to **Database Assistant**. Ask me anything about your SQL data.").send()

async def show_project_selector():
    db = get_db()
    try:
        # Mocking user_id as 'default_user' for now
        projects = db.query(UserProject).filter(UserProject.user_id == 'default_user').all()
        
        header_content = "## Backend Monitoring\nSelect a project to view deep context, logs, and get intelligent fixes."
        
        if not projects:
            content = f"{header_content}\n\nNo projects connected yet. Run `querion watch --project \"MyProject\"` to get started."
            actions = [cl.Action(name="switch_to_database", value="database", label="Switch to Database")]
        else:
            content = f"{header_content}\n\n"
            actions = []
            for p in projects:
                status = "Connected"
                last_upd = p.last_updated.strftime("%Y-%m-%d %H:%M")
                content += f"**{p.project_name}**\n*Last updated: {last_upd}*\n\n"
                actions.append(cl.Action(name="select_project", value=p.project_name, label=f"Open {p.project_name}"))
            
            actions.append(cl.Action(name="switch_to_database", value="database", label="Switch to Database"))
        
        await cl.Message(content=content, actions=actions).send()
    finally:
        db.close()

@cl.action_callback("select_project")
async def on_select_project(action: cl.Action):
    project_name = action.value
    cl.user_session.set("current_project", project_name)
    
    await cl.Message(content=f"### Monitoring: {project_name}\nCode & Logs loaded. How can I help you with this project?").send()

@cl.on_message
async def main(message: cl.Message):
    mode = cl.user_session.get("mode")
    current_project = cl.user_session.get("current_project")
    
    if mode == "monitoring":
        if not current_project:
            await cl.Message(content="Please select a project first from the Monitoring dashboard.").send()
            await show_project_selector()
            return

        # Fetch project context
        db = get_db()
        try:
            project = db.query(UserProject).filter(
                UserProject.user_id == 'default_user',
                UserProject.project_name == current_project
            ).first()
            
            if not project:
                await cl.Message(content="Project not found. Please re-select.").send()
                return

            # Prepare logs for the agent
            recent_logs = project.logs[-10:] # Last 10 lines
            log_messages = [LogMessage(type="terminal", data=l.log_line, timestamp=l.timestamp) for l in recent_logs]
            
            # Prepare code context (simplified: last 3 modified files)
            recent_files = project.files[-3:]
            file_context = "\n".join([f"File: {f.file_path}\nContent:\n{f.content[:500]}..." for f in recent_files])
            
            msg = cl.Message(content=f"Querion is analyzing `{current_project}` context...")
            await msg.send()

            # In a real flow, we'd pass files and logs to the agent
            # For now, we use the agent's run method with logs
            res = await agent.run(log_messages)
            
            # Format the output with Cyan highlights as requested
            formatted_content = f"**Querion:** {res.content}"
            msg.content = formatted_content
            await msg.update()
            
            if res.suggested_fix:
                await cl.Message(content=f"**Querion:** Suggested Fix:\n```python\n{res.suggested_fix}\n```").send()
        finally:
            db.close()
    else:
        # DB Logic (existing)
        # DO NOT MODIFY OR REPLACE ANY EXISTING CODE RELATED TO DATABASE QUERYING
        pass
