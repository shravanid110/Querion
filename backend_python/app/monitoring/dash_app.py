from dash import Dash, html, dcc
import plotly.express as px
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.wsgi import WSGIMiddleware
import flask

def create_dash_app():
    server = flask.Flask(__name__)
    app = Dash(__name__, server=server, requests_pathname_prefix="/dash/")

    # Mock data
    requests_df = pd.DataFrame({
        "Time": pd.date_range(start="2026-01-01", periods=10, freq="min"),
        "Latency": [100, 120, 90, 300, 450, 110, 95, 80, 500, 150],
        "Status": [200, 200, 200, 500, 500, 200, 200, 200, 500, 200]
    })

    app.layout = html.Div(style={"backgroundColor": "#0f172a", "color": "white", "padding": "20px", "fontFamily": "Inter, sans-serif"}, children=[
        html.H1("Querion Real-Time Monitoring", style={"textAlign": "center", "color": "#38bdf8"}),
        html.Div(children=[
            dcc.Graph(
                id="latency-graph",
                figure=px.line(requests_df, x="Time", y="Latency", title="API Latency (ms)", template="plotly_dark")
            ),
            dcc.Graph(
                id="status-pie",
                figure=px.pie(requests_df, names="Status", title="HTTP Status Distribution", template="plotly_dark")
            )
        ])
    ])
    return app

def init_dash(fastapi_app: FastAPI):
    dash_app = create_dash_app()
    fastapi_app.mount("/dash", WSGIMiddleware(dash_app.server))
