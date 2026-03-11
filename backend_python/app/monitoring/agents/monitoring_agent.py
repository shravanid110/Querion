import os
import json
from typing import TypedDict, Annotated, List, Union
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from app.monitoring.schemas import LogMessage, AgentResponse

class AgentState(TypedDict):
    logs: List[LogMessage]
    parsed_data: dict
    analysis: str
    explanation: str
    suggested_fix: str
    severity: str
    messages: List[BaseMessage]

class MonitoringAgent:
    def __init__(self, groq_api_key: str):
        self.llm = ChatGroq(
            model_name="llama-3.3-70b-versatile",
            groq_api_key=groq_api_key,
            temperature=0.1
        )
        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(AgentState)

        workflow.add_node("parser", self.parse_logs)
        workflow.add_node("analyzer", self.analyze_issue)
        workflow.add_node("explainer", self.explain_issue)
        workflow.add_node("fixer", self.suggest_fix)

        workflow.set_entry_point("parser")
        workflow.add_edge("parser", "analyzer")
        workflow.add_edge("analyzer", "explainer")
        workflow.add_edge("explainer", "fixer")
        workflow.add_edge("fixer", END)

        return workflow.compile()

    async def parse_logs(self, state: AgentState):
        # Join lines but cap to prevent excessive token usage
        raw_logs = "\n".join([f"[{log.type}] {log.data}" for log in state["logs"][-3:]])
        prompt = f"""Parse these backend logs. Note: They may contain multi-line stack traces or build errors.
Identify the EXACT error message, the file affected, and any code snippets (like variable typos).
LOGS:
{raw_logs}"""
        res = await self.llm.ainvoke([HumanMessage(content=prompt)])
        return {"parsed_data": {"summary": res.content}}

    async def analyze_issue(self, state: AgentState):
        parsed = state["parsed_data"]
        prompt = f"Analyze this parsed backend log summary and determine the root cause:\n{parsed['summary']}"
        res = await self.llm.ainvoke([HumanMessage(content=prompt)])
        severity = "error" if "error" in res.content.lower() or "500" in res.content else "info"
        return {"analysis": res.content, "severity": severity}

    async def explain_issue(self, state: AgentState):
        analysis = state["analysis"]
        prompt = f"Explain this issue in simple terms for a developer:\n{analysis}"
        res = await self.llm.ainvoke([HumanMessage(content=prompt)])
        return {"explanation": res.content}

    async def suggest_fix(self, state: AgentState):
        explanation = state["explanation"]
        prompt = f"Suggest a code fix for this issue:\n{explanation}"
        res = await self.llm.ainvoke([HumanMessage(content=prompt)])
        return {"suggested_fix": res.content}

    async def run(self, logs: List[LogMessage]):
        initial_state = {
            "logs": logs,
            "parsed_data": {},
            "analysis": "",
            "explanation": "",
            "suggested_fix": "",
            "severity": "info",
            "messages": []
        }
        final_state = await self.graph.ainvoke(initial_state)
        return AgentResponse(
            id="agent_" + str(os.urandom(4).hex()),
            type="monitoring_report",
            content=f"### Analysis\n{final_state['explanation']}",
            suggested_fix=final_state['suggested_fix'],
            severity=final_state['severity']
        )
