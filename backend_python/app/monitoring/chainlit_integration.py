import chainlit as cl
import os
import json
from datetime import datetime, timedelta
from app.monitoring.agents.monitoring_agent import MonitoringAgent
from app.config import settings
from app.monitoring.models import MonitorSessionLocal, UserProject, ProjectFile, ProjectLog
from app.monitoring.schemas import LogMessage
from app.models import SessionLocal, Connection, MultidbConnection
from app.services.encryption import decrypt
from app.connectors.factory import MultiDBFactory
from app.services.nl_to_sql import convert_nl_to_sql
from app.reporting.report_engine import ReportGenerator
from sqlalchemy.orm import Session
import os

# Lazy agents — never instantiated at import time (avoids blocking startup)
_agent = None
_report_generator = None

def get_agent():
    global _agent
    if _agent is None:
        try:
            _agent = MonitoringAgent(groq_api_key=settings.GROK_API_KEY)
        except Exception as e:
            print(f"⚠️ Agent init failed: {e}")
    return _agent

def get_report_generator():
    global _report_generator
    if _report_generator is None:
        _report_generator = ReportGenerator()
    return _report_generator


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
    cl.user_session.set("current_connection_id", None)
    
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
    await show_connection_selector()

async def show_connection_selector():
    db = SessionLocal()
    try:
        # Fetch legacy connections and multi-db connections
        legacy_connections = db.query(Connection).all()
        multidb_connections = db.query(MultidbConnection).all()
        
        header_content = "## Database Assistant\nSelect a connection to start querying your data or generate reports."
        
        if not legacy_connections and not multidb_connections:
            content = f"{header_content}\n\nNo database connections found. Please go to the [Connect Page](/connect) to add one."
            actions = [cl.Action(name="switch_to_monitoring", value="monitoring", label="Switch to Monitoring")]
        else:
            content = f"{header_content}\n\n"
            actions = []
            
            # Legacy/One-off (MySQL)
            for c in legacy_connections:
                content += f"**{c.name}** (MySQL/MariaDB)\n"
                actions.append(cl.Action(name="select_connection", value=f"legacy_{c.id}", label=f"Connect to {c.name}"))
            
            # Multi-DB (Postgres, Redis, MongoDB, etc.)
            for c in multidb_connections:
                content += f"**{c.name}** ({c.db_type.upper()})\n"
                actions.append(cl.Action(name="select_connection", value=f"multi_{c.id}", label=f"Connect to {c.name}"))
            
            actions.append(cl.Action(name="switch_to_monitoring", value="monitoring", label="Switch to Monitoring"))
        
        await cl.Message(content=content, actions=actions).send()
    finally:
        db.close()

@cl.action_callback("select_connection")
async def on_select_connection(action: cl.Action):
    val = action.value
    db = SessionLocal()
    
    connection_id = None
    db_type = "mysql" # default fallback
    name = "Database"
    
    if val.startswith("multi_"):
        conn_id = val.replace("multi_", "")
        connection = db.query(MultidbConnection).filter(MultidbConnection.id == conn_id).first()
        if connection:
            connection_id = conn_id
            db_type = connection.db_type
            name = connection.name
            cl.user_session.set("is_multi", True)
    else:
        conn_id = val.replace("legacy_", "") if val.startswith("legacy_") else val
        connection = db.query(Connection).filter(Connection.id == conn_id).first()
        if connection:
            connection_id = conn_id
            db_type = "mysql" # Legacy assumes MySQL/MariaDB
            name = connection.name
            cl.user_session.set("is_multi", False)
            
    db.close()
    
    if connection_id:
        cl.user_session.set("current_connection_id", connection_id)
        cl.user_session.set("current_db_type", db_type)
        cl.user_session.set("db_interaction_mode", "result") # Default to result
        
        actions = [
            cl.Action(name="set_interaction_mode", value="result", label="📊 Data Result (Table View)", description="Get quick data tables and summaries"),
            cl.Action(name="set_interaction_mode", value="report", label="📄 Professional Report (PDF/Excel)", description="Generate high-quality enterprise reports with charts")
        ]
        
        await cl.Message(
            content=f"### Connected to: **{name}** ({db_type.upper()})\n\nHow would you like me to process your queries today? You can switch this at any time.",
            actions=actions
        ).send()

@cl.action_callback("set_interaction_mode")
async def on_set_interaction_mode(action: cl.Action):
    new_mode = action.value
    cl.user_session.set("db_interaction_mode", new_mode)
    
    mode_text = "📊 **Data Result Mode**" if new_mode == "result" else "📄 **Professional Report Mode**"
    desc = "Ask me questions and I'll show you the data table." if new_mode == "result" else "Tell me what report you need (e.g., 'Sales Summary') and I'll generate a PDF with charts."
    
    await cl.Message(content=f"Sub-mode switched to: {mode_text}\n{desc}").send()

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
            ag = get_agent()
            if ag:
                res = await ag.run(log_messages)
                # Format the output with Cyan highlights as requested
                formatted_content = f"**Querion:** {res.content}"
                msg.content = formatted_content
                await msg.update()
                
                if res.suggested_fix:
                    await cl.Message(content=f"**Querion:** Suggested Fix:\n```python\n{res.suggested_fix}\n```").send()
            else:
                msg.content = "⚠️ AI agent unavailable. Check your GROK_API_KEY in the .env file."
                await msg.update()
        finally:
            db.close()
    else:
        # DB Logic & Reporting
        connection_id = cl.user_session.get("current_connection_id")
        if not connection_id:
            await cl.Message(content="Please select a database connection first.").send()
            await show_connection_selector()
            return

        db = SessionLocal()
        is_multi = cl.user_session.get("is_multi")
        db_type = cl.user_session.get("current_db_type") or "mysql"
        
        if is_multi:
            connection = db.query(MultidbConnection).filter(MultidbConnection.id == connection_id).first()
        else:
            connection = db.query(Connection).filter(Connection.id == connection_id).first()
        db.close()

        if not connection:
            await cl.Message(content="Connection no longer exists. Please re-select.").send()
            await show_connection_selector()
            return

        # Prepare credentials for MultiDBFactory
        credentials = {
            "host": connection.host,
            "port": connection.port,
            "database": connection.database,
            "username": connection.username if hasattr(connection, 'username') else None,
            "password": decrypt(connection.password) if connection.password else None,
            "uri": getattr(connection, 'uri', None)
        }

        msg = cl.Message(content="Analyzing your request...")
        await msg.send()

        try:
            # 1. Determine if we should generate a report
            interaction_mode = cl.user_session.get("db_interaction_mode") or "result"
            keyword_report = any(word in message.content.lower() for word in ["report", "generate", "download", "export", "pdf", "excel", "csv"])
            
            # Explicitly set is_report_request if mode is 'report' OR keywords match
            is_report_request = (interaction_mode == "report") or keyword_report
            
            # Clean prompt for SQL generator so it doesn't get confused by "PDF report"
            sql_prompt = message.content
            if is_report_request:
                # Add instruction to LLM to focus on DATA needed for the report
                sql_prompt += " (Focus: Generate the SELECT query to fetch all raw data required for this request. Do not mention reports in your explanation.)"

            # 2. Get Schema
            schema = MultiDBFactory.get_schema_summary(db_type, credentials)
            
            # 3. Convert NL to SQL/Query
            # Pass db_type hint to converter if possible
            sql_result = await convert_nl_to_sql(schema, sql_prompt, db_type=db_type)
            
            if not sql_result.get("sql"):
                msg.content = f"Sorry, I couldn't generate a query for that. {sql_result.get('explanation', '')}"
                await msg.update()
                return

            # 4. Execute Query
            data_result = MultiDBFactory.execute_read_only_query(db_type, credentials, sql_result["sql"])
            data = data_result.get("rows", [])

            if not data:
                msg.content = f"Query executed successfully but returned **no data**.\n\n**SQL:**\n```sql\n{sql_result['sql']}\n```"
                await msg.update()
                return

            if is_report_request:
                msg.content = f"Data fetched ({len(data)} rows). Generating professional report..."
                await msg.update()
                
                # Determine format (default pdf)
                fmt = "pdf"
                if "excel" in message.content.lower() or "xlsx" in message.content.lower(): fmt = "excel"
                elif "csv" in message.content.lower(): fmt = "csv"
                elif "json" in message.content.lower(): fmt = "json"

                # Generate Report
                gen = get_report_generator()
                report_res = gen.generate_report(
                    user_query=message.content,
                    sql_query=sql_result["sql"],
                    data=data,
                    metadata={"database_name": connection.database},
                    export_format=fmt
                )

                if report_res["status"] == "success":
                    file_path = report_res["file_path"]
                    filename = os.path.basename(file_path)
                    
                    # Serve file via elements
                    elements = [
                        cl.File(name=filename, path=file_path, display="inline")
                    ]
                    msg.content = f"✅ **Report Generated Successfully!**\n\n**Type:** {report_res['report_type'].replace('_', ' ').title()}\n**Status:** Ready for download\n\n**SQL Used:**\n```sql\n{sql_result['sql']}\n```"
                    msg.elements = elements
                    await msg.update()
                else:
                    msg.content = f"❌ Report generation failed: {report_res.get('message')}"
                    await msg.update()
            else:
                # Normal Response
                summary = f"I found **{len(data)}** records.\n\n**Sample Data:**\n"
                # Show first 5 rows as a table
                sample = data[:5]
                headers = list(sample[0].keys())
                table_md = "| " + " | ".join(headers) + " |\n"
                table_md += "| " + " | ".join(["---"] * len(headers)) + " |\n"
                for row in sample:
                    table_md += "| " + " | ".join([str(row.get(h, "")) for h in headers]) + " |\n"
                
                msg.content = f"{summary}{table_md}\n\n"
                msg.actions = [
                    cl.Action(name="set_interaction_mode", value="report", label="📄 Generate Full Professional Report", description="Transform these results into a branded PDF/Excel report with charts")
                ]
                await msg.update()

        except Exception as e:
            msg.content = f"⚠️ An error occurred: {str(e)}"
            await msg.update()
