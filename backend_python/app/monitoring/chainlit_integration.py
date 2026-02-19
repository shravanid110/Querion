import chainlit as cl
from app.monitoring.agents.monitoring_agent import MonitoringAgent
from app.config import settings

# Initialize Agent
agent = MonitoringAgent(groq_api_key=settings.GROK_API_KEY)

@cl.on_chat_start
async def start():
    cl.user_session.set("mode", "database") # Default mode
    
    actions = [
        cl.Action(name="toggle_mode", value="monitoring", label="Switch to Monitoring Mode", description="Switch to real-time backend monitoring")
    ]
    
    await cl.Message(content="Welcome to Querion! Use the button below to toggle between Database and Monitoring modes.", actions=actions).send()

@cl.action_callback("toggle_mode")
async def on_action(action: cl.Action):
    current_mode = cl.user_session.get("mode")
    new_mode = "monitoring" if current_mode == "database" else "database"
    cl.user_session.set("mode", new_mode)
    
    await cl.Message(content=f"Switched to **{new_mode.upper()}** mode.").send()
    
    if new_mode == "monitoring":
        await cl.Message(content="You can now see live visualizations at [http://localhost:4000/dash](http://localhost:4000/dash)").send()

@cl.on_message
async def main(message: cl.Message):
    mode = cl.user_session.get("mode")
    
    if mode == "monitoring":
        # In real flow, this would fetch recent context from Redis
        res = await agent.run([]) 
        await cl.Message(content=res.content).send()
        if res.suggested_fix:
            await cl.Message(content=f"**Suggested Fix:**\n```python\n{res.suggested_fix}\n```").send()
    else:
        # DB Logic (existing)
        pass
