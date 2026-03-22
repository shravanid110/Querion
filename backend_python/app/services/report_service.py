"""
Querion AI Report Service
Generates professional, corporate-grade PDF reports from dynamic query result data.
No database dependency — everything is derived from the input data.
"""
import os
import uuid
import json
import logging
import io
import math
import httpx
import asyncio
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend — safe for server use
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

from app.config import settings

logger = logging.getLogger(__name__)

# ── Directories ─────────────────────────────────────────────────────────────
REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "reports")
CHARTS_DIR  = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "charts")
for _d in (REPORTS_DIR, CHARTS_DIR):
    os.makedirs(_d, exist_ok=True)

# ── Colour Palette ───────────────────────────────────────────────────────────
# Corporate palette
PALETTE = ["#4F46E5", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444",
           "#8B5CF6", "#06B6D4", "#14B8A6", "#F97316", "#EC4899"]
BG_DARK   = "#0F1117"
BG_CARD   = "#1A1F2E"
ACCENT    = "#4F46E5"
ACCENT2   = "#0EA5E9"
TEXT_MAIN = "#F1F5F9"
TEXT_SUB  = "#94A3B8"


# ─────────────────────────────────────────────────────────────────────────────
# 1.  Chart Generator
# ─────────────────────────────────────────────────────────────────────────────
class ChartGenerator:
    """Dynamically generates charts from any dataset."""

    def __init__(self, report_id: str):
        self.report_id = report_id
        self.chart_paths: List[str] = []
        plt.style.use('dark_background')

    def _save(self, fig, name: str) -> str:
        path = os.path.join(CHARTS_DIR, f"{self.report_id}_{name}.png")
        fig.savefig(path, dpi=150, bbox_inches='tight',
                    facecolor=BG_CARD, edgecolor='none')
        plt.close(fig)
        self.chart_paths.append(path)
        return path

    def _style_ax(self, ax, title: str):
        ax.set_facecolor(BG_CARD)
        ax.set_title(title, color=TEXT_MAIN, fontsize=11, fontweight='bold', pad=12)
        ax.tick_params(colors=TEXT_SUB, labelsize=8)
        for spine in ax.spines.values():
            spine.set_edgecolor('#2D3748')

    def generate_all(self, df: pd.DataFrame, numeric_cols: List[str],
                     cat_col: Optional[str]) -> List[str]:
        paths = []
        if df.empty:
            return paths

        # ── Strategy: adapt to whatever data shape we have ────────────────────
        # CASE A: We have numeric cols + a categorical col → standard charts
        # CASE B: Pure numeric (e.g. patient records) → record-by-record comparison
        # CASE C: Many rows + cat col → grouped/aggregated charts

        if not numeric_cols:
            # Nothing to chart
            return paths

        row_labels = [f"Row {i+1}" for i in range(len(df))]

        # ── Chart 1: Horizontal bar — all numeric column values for each record ──
        # Great for showing a complete breakdown per record
        try:
            charts_per_fig = min(len(df), 20)  # cap at 20 rows
            plot_cols = numeric_cols[:8]         # cap at 8 columns
            plot_df = df[plot_cols].head(charts_per_fig).apply(
                pd.to_numeric, errors='coerce').fillna(0)

            fig, ax = plt.subplots(figsize=(10, max(4, len(plot_cols) * 0.7)))
            x = range(len(plot_cols))
            bar_width = 0.8 / max(len(plot_df), 1)

            for i, (idx, row) in enumerate(plot_df.iterrows()):
                label = str(df.iloc[i, 0]) if len(df.columns) > 0 else f"Record {i+1}"
                if cat_col:
                    label = str(df[cat_col].iloc[i])
                ax.bar(
                    [xi + i * bar_width for xi in x],
                    row.values,
                    width=bar_width,
                    color=PALETTE[i % len(PALETTE)],
                    label=label,
                    edgecolor='none',
                    alpha=0.9
                )

            ax.set_xticks([xi + bar_width * (len(plot_df) - 1) / 2 for xi in x])
            ax.set_xticklabels(plot_cols, rotation=35, ha='right',
                               color=TEXT_SUB, fontsize=8)
            ax.set_ylabel('Value', color=TEXT_SUB, fontsize=9)
            ax.legend(fontsize=7, labelcolor=TEXT_MAIN,
                      facecolor=BG_CARD, edgecolor='#2D3748', loc='upper right')
            self._style_ax(ax, 'Column-by-Column Comparison Across Records')
            fig.patch.set_facecolor(BG_DARK)
            paths.append(self._save(fig, 'comparison'))
        except Exception as e:
            logger.warning(f"Comparison chart failed: {e}")

        # ── Chart 2: Individual column values across all records ───────────────
        # Shows each numeric column as a separate category bar
        try:
            summary_df = df[numeric_cols[:10]].apply(
                pd.to_numeric, errors='coerce').describe().loc[['mean', 'min', 'max']]
            
            fig, ax = plt.subplots(figsize=(10, 4))
            x_pos = range(len(numeric_cols[:10]))
            means  = summary_df.loc['mean'].values
            mins   = summary_df.loc['min'].values
            maxs   = summary_df.loc['max'].values

            ax.bar(x_pos, maxs,  color=PALETTE[2], alpha=0.4, label='Max',  edgecolor='none')
            ax.bar(x_pos, means, color=PALETTE[0], alpha=0.85, label='Mean', edgecolor='none')
            ax.bar(x_pos, mins,  color=PALETTE[4], alpha=0.6,  label='Min',  edgecolor='none', width=0.4)

            ax.set_xticks(list(x_pos))
            ax.set_xticklabels(numeric_cols[:10], rotation=35, ha='right',
                               color=TEXT_SUB, fontsize=8)
            ax.set_ylabel('Value', color=TEXT_SUB, fontsize=9)
            ax.legend(fontsize=8, labelcolor=TEXT_MAIN,
                      facecolor=BG_CARD, edgecolor='#2D3748')
            self._style_ax(ax, 'Min / Mean / Max Summary per Column')
            fig.patch.set_facecolor(BG_DARK)
            paths.append(self._save(fig, 'minmaxmean'))
        except Exception as e:
            logger.warning(f"MinMaxMean chart failed: {e}")

        # ── Chart 3: Line trend OR categorical distribution ────────────────────
        if len(df) > 2:
            try:
                if cat_col:
                    # Grouped aggregation
                    grp = df.groupby(cat_col)[numeric_cols[0]].sum().sort_values(ascending=False).head(12)
                    fig, ax = plt.subplots(figsize=(9, 4))
                    ax.bar(grp.index.astype(str), grp.values,
                           color=PALETTE[:len(grp)], edgecolor='none')
                    plt.xticks(rotation=35, ha='right', color=TEXT_SUB)
                    ax.set_ylabel(numeric_cols[0], color=TEXT_SUB, fontsize=9)
                    self._style_ax(ax, f'Total {numeric_cols[0]} by {cat_col}')
                else:
                    # Line trend of first 4 numeric cols
                    trend_df = df[numeric_cols[:4]].head(50).apply(
                        pd.to_numeric, errors='coerce').fillna(0)
                    fig, ax = plt.subplots(figsize=(9, 4))
                    for i, col in enumerate(trend_df.columns):
                        ax.plot(trend_df.index, trend_df[col],
                                color=PALETTE[i % len(PALETTE)],
                                linewidth=2.5, label=col,
                                marker='o', markersize=4)
                    ax.set_xlabel('Record Index', color=TEXT_SUB, fontsize=9)
                    ax.legend(fontsize=8, labelcolor=TEXT_MAIN,
                              facecolor=BG_CARD, edgecolor='#2D3748')
                    self._style_ax(ax, 'Trend Analysis Across Records')
                fig.patch.set_facecolor(BG_DARK)
                paths.append(self._save(fig, 'trend'))
            except Exception as e:
                logger.warning(f"Trend/distribution chart failed: {e}")

        return paths


# ─────────────────────────────────────────────────────────────────────────────
# 2.  Grok AI Analyst
# ─────────────────────────────────────────────────────────────────────────────
class GrokAnalyst:
    """Calls Grok API to generate structured professional insights."""

    SYSTEM_PROMPT = """You are an expert Data Scientist and Business Analyst.
You have been given the COMPLETE result set of a database query. Your job is to write a highly specific,
data-driven analysis that focuses entirely on the ACTUAL VALUES present in the provided data.

CRITICAL RULES:
- NEVER write generic statements. Every sentence MUST cite actual column names and real numeric values from the data.
- For each observation, mention the specific value(s) you found (e.g. "AGE is 32", "BMI ranges from 25.4 to 30.5").
- Do not say things like 'data varies' or 'values show patterns' without citing the exact numbers.
- Interpret what the values MEAN in real-world context (e.g. a BMI of 30.5 is borderline obese, BP of 90.3 is normal).
- Write as if you are a doctor/analyst who has studied these specific records.

Your output MUST follow this exact JSON format (no markdown fences):
{
  "report_title": "A specific descriptive title for this data (e.g. 'Patient Health Profile Analysis — Age 32')",
  "executive_summary": "3-4 sentences describing exactly what records were returned, citing real values from the data",
  "key_trends": [
    "Specific trend citing actual column name and value",
    "Another specific trend with actual numbers",
    "Third trend with actual data values"
  ],
  "patterns": [
    "Pattern observed in the actual data with specific values",
    "Another specific pattern"
  ],
  "outliers": [
    "Specific outlier value or unusual reading found in the data",
    "Another specific anomaly"
  ],
  "correlations": [
    "Relationship between specific columns with actual numbers",
    "Another correlation between named columns"
  ],
  "key_observations": [
    "Observation about a specific record/patient/entity with real values",
    "Second critical observation with actual data",
    "Third observation mentioning specific column values"
  ],
  "business_interpretation": "2-3 sentences explaining what these specific values mean in a real-world/medical/business context",
  "conclusion": "2-3 specific sentences about what was found and what actions should follow based on the exact data values"
}
"""

    @staticmethod
    async def analyze(data: List[Dict], query: str, stats: Dict) -> Dict:
        # Send FULL dataset to Grok (up to 100 rows)
        full_data = data[:100]

        # Build a human-readable table string of the actual data for the prompt
        if data:
            cols = list(data[0].keys())
            table_lines = [" | ".join(cols)]
            table_lines.append("-" * (len(table_lines[0])))
            for row in full_data:
                table_lines.append(" | ".join(str(row.get(c, '')) for c in cols))
            table_str = "\n".join(table_lines)
        else:
            table_str = "No data"

        prompt = f"""Analyse the following REAL database query result.

USER QUERY: "{query}"
TOTAL RECORDS RETURNED: {len(data)}

COMPLETE RESULT DATA:
{table_str}

STATISTICAL SUMMARY PER COLUMN:
{json.dumps(stats, indent=2)}

IMPORTANT: Your analysis must be 100% based on the actual values above.
Mention specific rows, values, and column readings — not generic observations.
Generate the complete JSON response now."""

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    json={
                        "model": "grok-beta",
                        "messages": [
                            {"role": "system", "content": GrokAnalyst.SYSTEM_PROMPT},
                            {"role": "user",   "content": prompt}
                        ],
                        "temperature": 0.3
                    },
                    headers={
                        "Authorization": f"Bearer {settings.GROK_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    timeout=60.0
                )
            if resp.status_code == 200:
                raw = resp.json()["choices"][0]["message"]["content"].strip()
                raw = raw.replace("```json", "").replace("```", "").strip()
                start = raw.find('{')
                end   = raw.rfind('}')
                if start != -1 and end != -1:
                    return json.loads(raw[start:end+1])
        except Exception as e:
            logger.warning(f"Grok analysis error: {e}")

        # Fallback — generate basic data-specific insights without AI
        cols = list(data[0].keys()) if data else []
        rows_preview = "; ".join(
            ", ".join(f"{k}={v}" for k, v in row.items())
            for row in data[:3]
        )
        return {
            "report_title": f"Data Analysis Report — {query[:60]}",
            "executive_summary": f"Query '{query}' returned {len(data)} record(s) with columns: {', '.join(cols)}. Sample data: {rows_preview}.",
            "key_trends": [
                f"Dataset contains {len(data)} record(s) across {len(cols)} columns",
                f"Columns present: {', '.join(cols[:5])}",
                f"First record values: {rows_preview[:120]}"
            ],
            "patterns": [
                f"All {len(data)} records follow the same {len(cols)}-column schema",
                "Column types include both numeric and categorical fields"
            ],
            "outliers": [
                "Extreme values may exist at the min/max boundaries per the statistical summary",
                "Records with null values may indicate incomplete data capture"
            ],
            "correlations": [
                "Numeric columns may show inter-dependency based on the domain",
                "Cross-column relationships require further analysis"
            ],
            "key_observations": [
                f"Query: '{query}'",
                f"Sample record: {rows_preview[:150]}",
                f"Total columns returned: {len(cols)}"
            ],
            "business_interpretation": f"The data returned from '{query}' represents {len(data)} operational record(s) relevant to the queried domain. Review the statistical summary for value ranges.",
            "conclusion": f"Analysis of {len(data)} record(s) is complete. The dataset has {len(cols)} dimensions. Refer to the data table and charts for detailed visual breakdowns."
        }


# ─────────────────────────────────────────────────────────────────────────────
# 3.  Statistics Engine
# ─────────────────────────────────────────────────────────────────────────────
def compute_statistics(df: pd.DataFrame) -> Dict:
    stats = {}
    numeric_cols = df.select_dtypes(include='number').columns.tolist()
    for col in numeric_cols:
        s = df[col].dropna()
        if s.empty:
            continue
        stats[col] = {
            "count":  int(s.count()),
            "mean":   round(float(s.mean()), 4),
            "median": round(float(s.median()), 4),
            "min":    round(float(s.min()), 4),
            "max":    round(float(s.max()), 4),
            "std":    round(float(s.std()), 4) if len(s) > 1 else 0.0,
            "sum":    round(float(s.sum()), 4),
            "q25":    round(float(s.quantile(0.25)), 4),
            "q75":    round(float(s.quantile(0.75)), 4),
        }
    return stats


def detect_columns(df: pd.DataFrame) -> Tuple[List[str], Optional[str]]:
    """Returns (numeric_cols, best_categorical_col)."""
    numeric_cols = df.select_dtypes(include='number').columns.tolist()
    cat_candidates = [c for c in df.columns if c not in numeric_cols
                      and len(df[c].dropna().unique()) < max(20, len(df) // 2)]
    cat_col = cat_candidates[0] if cat_candidates else None
    return numeric_cols, cat_col


# ─────────────────────────────────────────────────────────────────────────────
# 4.  PDF Builder
# ─────────────────────────────────────────────────────────────────────────────
def _brand_color(hex_str: str) -> colors.HexColor:
    return colors.HexColor(hex_str)


def build_styles():
    base = getSampleStyleSheet()
    custom = {}

    def add(name, **kw):
        custom[name] = ParagraphStyle(name, parent=base['Normal'], **kw)

    add('CoverTitle',   fontSize=28, leading=36, textColor=_brand_color('#FFFFFF'),
        fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=10)
    add('CoverSub',     fontSize=13, leading=20, textColor=_brand_color(ACCENT2),
        fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=4)
    add('CoverMeta',    fontSize=9,  leading=14, textColor=_brand_color(TEXT_SUB),
        alignment=TA_CENTER, spaceAfter=3)
    add('SectionTitle', fontSize=14, leading=20, textColor=_brand_color('#FFFFFF'),
        fontName='Helvetica-Bold', spaceBefore=18, spaceAfter=8, leftIndent=0)
    add('SubTitle',     fontSize=11, leading=16, textColor=_brand_color(ACCENT2),
        fontName='Helvetica-Bold', spaceBefore=10, spaceAfter=6)
    add('Body',         fontSize=9,  leading=14, textColor=_brand_color(TEXT_MAIN),
        spaceAfter=5, alignment=TA_JUSTIFY)
    add('Bullet',       fontSize=9,  leading=14, textColor=_brand_color(TEXT_MAIN),
        spaceAfter=3, leftIndent=14, bulletIndent=0)
    add('Caption',      fontSize=8,  leading=12, textColor=_brand_color(TEXT_SUB),
        alignment=TA_CENTER, spaceAfter=10)
    add('Footer',       fontSize=7,  leading=10, textColor=_brand_color('#475569'),
        alignment=TA_CENTER)
    add('TableHeader',  fontSize=8,  leading=11, textColor=_brand_color('#FFFFFF'),
        fontName='Helvetica-Bold', alignment=TA_CENTER)
    add('TableCell',    fontSize=8,  leading=11, textColor=_brand_color(TEXT_MAIN))
    return custom


def _section_header(text: str, styles) -> List:
    return [
        HRFlowable(width='100%', thickness=0.5, color=_brand_color(ACCENT)),
        Spacer(1, 6),
        Paragraph(text.upper(), styles['SectionTitle']),
        Spacer(1, 4),
    ]


def _bullet_list(items: List[str], styles) -> List:
    elements = []
    for item in items:
        if item:
            elements.append(Paragraph(f"• {item}", styles['Bullet']))
    return elements


def _stats_table(stats: Dict, styles) -> Table:
    header = ['Column', 'Count', 'Mean', 'Median', 'Min', 'Max', 'Std Dev', 'Sum']
    rows = [header]
    for col, s in stats.items():
        rows.append([
            col,
            str(s['count']),
            f"{s['mean']:,.4f}",
            f"{s['median']:,.4f}",
            f"{s['min']:,.4f}",
            f"{s['max']:,.4f}",
            f"{s['std']:,.4f}",
            f"{s['sum']:,.4f}",
        ])

    col_widths = [120, 45, 65, 65, 65, 65, 65, 65]
    t = Table(rows, colWidths=[w * mm for w in [40, 18, 23, 23, 23, 23, 23, 23]])
    t.setStyle(TableStyle([
        ('BACKGROUND',  (0, 0), (-1, 0),  _brand_color(ACCENT)),
        ('TEXTCOLOR',   (0, 0), (-1, 0),  colors.white),
        ('FONTNAME',    (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',    (0, 0), (-1, -1), 7.5),
        ('ALIGN',       (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN',       (0, 0), (0, -1),  'LEFT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1),
         [_brand_color('#1E293B'), _brand_color('#172033')]),
        ('TEXTCOLOR',   (0, 1), (-1, -1), _brand_color(TEXT_MAIN)),
        ('GRID',        (0, 0), (-1, -1), 0.3, _brand_color('#2D3748')),
        ('ROWHEIGHT',   (0, 0), (-1, -1), 14),
        ('TOPPADDING',  (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING',(0,0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
    ]))
    return t


def _data_preview_table(df: pd.DataFrame, styles) -> Table:
    preview = df.head(40)
    cols = list(preview.columns)
    header = [Paragraph(c, styles['TableHeader']) for c in cols]
    rows = [header]
    for _, row in preview.iterrows():
        rows.append([Paragraph(str(row[c])[:30], styles['TableCell']) for c in cols])

    col_count = len(cols)
    available_w = 170  # mm
    col_w = min(40, available_w // col_count)
    col_widths = [col_w * mm] * col_count

    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',  (0, 0), (-1, 0),  _brand_color(ACCENT)),
        ('TEXTCOLOR',   (0, 0), (-1, 0),  colors.white),
        ('FONTNAME',    (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',    (0, 0), (-1, -1), 7),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1),
         [_brand_color('#1E293B'), _brand_color('#172033')]),
        ('TEXTCOLOR',   (0, 1), (-1, -1), _brand_color(TEXT_MAIN)),
        ('GRID',        (0, 0), (-1, -1), 0.3, _brand_color('#2D3748')),
        ('ROWHEIGHT',   (0, 0), (-1, -1), 13),
        ('TOPPADDING',  (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING',(0, 0),(-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('WORDWRAP',    (0, 0), (-1, -1), True),
    ]))
    return t


def _on_page(canvas, doc, report_id: str, total_pages: int, timestamp: str):
    canvas.saveState()
    canvas.setFillColor(_brand_color('#0A0E1A'))
    canvas.rect(0, 0, A4[0], A4[1], fill=1)
    # Footer bar
    canvas.setFillColor(_brand_color('#111827'))
    canvas.rect(0, 0, A4[0], 22, fill=1, stroke=0)
    canvas.setStrokeColor(_brand_color(ACCENT))
    canvas.setLineWidth(0.5)
    canvas.line(inch * 0.75, 22, A4[0] - inch * 0.75, 22)
    canvas.setFont('Helvetica', 6.5)
    canvas.setFillColor(_brand_color('#475569'))
    canvas.drawString(inch * 0.75, 8,
                      f"Querion AI Report  |  Report ID: {report_id}  |  Generated: {timestamp}")
    canvas.drawRightString(A4[0] - inch * 0.75, 8,
                           f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


def build_pdf(
    data:         List[Dict],
    query:        str,
    insights:     Dict,
    stats:        Dict,
    chart_paths:  List[str],
    report_id:    str,
    timestamp:    str
) -> str:
    output_path = os.path.join(REPORTS_DIR, f"Report_{report_id}.pdf")
    styles = build_styles()
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.85 * inch,
        bottomMargin=0.55 * inch,
    )

    df = pd.DataFrame(data)
    numeric_cols, cat_col = detect_columns(df)
    elements = []

    # ── 1. COVER PAGE ─────────────────────────────────────────────────────────
    report_title = insights.get("report_title", f"Data Analysis — {query[:60]}")
    elements += [
        Spacer(1, 1.2 * inch),
        Paragraph(report_title.upper(), styles['CoverTitle']),
        Spacer(1, 10),
        Paragraph("Powered by Querion AI Engine", styles['CoverSub']),
        Spacer(1, 30),
        HRFlowable(width='60%', thickness=1, color=_brand_color(ACCENT),
                   hAlign='CENTER'),
        Spacer(1, 20),
        Paragraph(f"User Query:", styles['CoverSub']),
        Spacer(1, 6),
        Paragraph(f"\u201c{query}\u201d", ParagraphStyle(
            'QueryText',
            parent=build_styles()['CoverMeta'],
            fontSize=11,
            textColor=_brand_color('#E2E8F0'),
            alignment=TA_CENTER,
            leading=16,
        )),
        Spacer(1, 18),
        Paragraph(f"Generated On: {timestamp}", styles['CoverMeta']),
        Spacer(1, 4),
        Paragraph(f"Report ID: {report_id}", styles['CoverMeta']),
        Spacer(1, 4),
        Paragraph(f"Total Records Analysed: {len(data)}", styles['CoverMeta']),
        Spacer(1, 4),
        Paragraph(f"Organisation: Querion Enterprise", styles['CoverMeta']),
        Spacer(1, 30),
        HRFlowable(width='40%', thickness=0.5, color=_brand_color(ACCENT2),
                   hAlign='CENTER'),
        Spacer(1, 15),
        Paragraph("CONFIDENTIAL \u2014 FOR INTERNAL USE ONLY", styles['CoverMeta']),
        PageBreak(),
    ]


    # ── 2. EXECUTIVE SUMMARY ─────────────────────────────────────────────────
    elements += _section_header("1. Executive Summary", styles)
    elements.append(Paragraph(insights.get("executive_summary", ""), styles['Body']))
    elements.append(Spacer(1, 10))

    # ── 3. DATASET OVERVIEW ──────────────────────────────────────────────────
    elements += _section_header("2. Dataset Overview", styles)
    col_info = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        null_count = int(df[col].isnull().sum())
        unique_count = int(df[col].nunique())
        col_info.append([col, dtype,
                         str(len(df) - null_count),
                         str(null_count),
                         str(unique_count)])

    overview_header = ['Column Name', 'Data Type', 'Non-Null', 'Nulls', 'Unique']
    col_table = Table(
        [overview_header] + col_info,
        colWidths=[55*mm, 35*mm, 28*mm, 22*mm, 28*mm]
    )
    col_table.setStyle(TableStyle([
        ('BACKGROUND',  (0, 0), (-1, 0),  _brand_color(ACCENT)),
        ('TEXTCOLOR',   (0, 0), (-1, 0),  colors.white),
        ('FONTNAME',    (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',    (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1),
         [_brand_color('#1E293B'), _brand_color('#172033')]),
        ('TEXTCOLOR',   (0, 1), (-1, -1), _brand_color(TEXT_MAIN)),
        ('GRID',        (0, 0), (-1, -1), 0.3, _brand_color('#2D3748')),
        ('ROWHEIGHT',   (0, 0), (-1, -1), 14),
        ('TOPPADDING',  (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING',(0,0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(col_table)
    elements.append(Spacer(1, 14))

    # ── 4. STATISTICAL SUMMARY ───────────────────────────────────────────────
    if stats:
        elements += _section_header("3. Statistical Summary", styles)
        elements.append(_stats_table(stats, styles))
        elements.append(Spacer(1, 14))

    # ── 5. CHARTS ────────────────────────────────────────────────────────────
    if chart_paths:
        elements.append(PageBreak())
        elements += _section_header("4. Data Visualisation", styles)
        chart_captions = [
            "Figure 1: Bar Distribution — Categorical breakdown of the primary numeric metric",
            "Figure 2: Trend Analysis — Value progression across all numeric dimensions",
            "Figure 3: Proportional Share — Relative contribution by category (Donut Chart)",
        ]
        for i, cpath in enumerate(chart_paths):
            if os.path.exists(cpath):
                try:
                    img = Image(cpath, width=6.8 * inch, height=3.2 * inch)
                    caption = chart_captions[i] if i < len(chart_captions) else f"Figure {i+1}"
                    elements += [img, Paragraph(caption, styles['Caption']), Spacer(1, 10)]
                except Exception as e:
                    logger.warning(f"Could not embed chart {cpath}: {e}")

    # ── 6. AI INSIGHTS ───────────────────────────────────────────────────────
    elements.append(PageBreak())
    elements += _section_header("5. Detailed AI Insights", styles)

    elements.append(Paragraph("Key Trends", styles['SubTitle']))
    elements += _bullet_list(insights.get("key_trends", []), styles)

    elements.append(Paragraph("Patterns Identified", styles['SubTitle']))
    elements += _bullet_list(insights.get("patterns", []), styles)

    elements.append(Paragraph("Outliers & Anomalies", styles['SubTitle']))
    elements += _bullet_list(insights.get("outliers", []), styles)

    elements.append(Paragraph("Correlations & Relationships", styles['SubTitle']))
    elements += _bullet_list(insights.get("correlations", []), styles)

    elements.append(Paragraph("Key Observations", styles['SubTitle']))
    elements += _bullet_list(insights.get("key_observations", []), styles)

    # ── 7. BUSINESS INTERPRETATION ───────────────────────────────────────────
    elements += _section_header("6. Business Interpretation", styles)
    elements.append(Paragraph(insights.get("business_interpretation", ""), styles['Body']))
    elements.append(Spacer(1, 10))

    # ── 8. DATA TABLE PREVIEW ────────────────────────────────────────────────
    elements.append(PageBreak())
    elements += _section_header(f"7. Data Table Preview (First 40 of {len(data)} records)", styles)
    try:
        elements.append(_data_preview_table(df, styles))
    except Exception as e:
        elements.append(Paragraph(f"Could not render data table: {e}", styles['Body']))
    elements.append(Spacer(1, 14))

    # ── 9. CONCLUSION ────────────────────────────────────────────────────────
    elements += _section_header("8. Conclusion", styles)
    elements.append(Paragraph(insights.get("conclusion", ""), styles['Body']))
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width='100%', thickness=0.5, color=_brand_color('#2D3748')))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(
        "This report was automatically generated by the Querion AI Engine. "
        "All analytics and insights are derived solely from the input dataset. "
        "Classify as: CONFIDENTIAL — INTERNAL USE ONLY.",
        styles['Footer']
    ))

    # Build with page decorations
    doc.build(
        elements,
        onFirstPage=lambda c, d: _on_page(c, d, report_id, 0, timestamp),
        onLaterPages=lambda c, d: _on_page(c, d, report_id, 0, timestamp),
    )
    return output_path


# ─────────────────────────────────────────────────────────────────────────────
# 5.  Public API — used by the route
# ─────────────────────────────────────────────────────────────────────────────
async def generate_ai_report(data: List[Dict], query: str) -> str:
    """
    Main entry point.  Returns the path to the generated PDF.
    """
    if not data:
        raise ValueError("No data provided for report generation.")

    report_id = str(uuid.uuid4())[:8].upper()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    df = pd.DataFrame(data)
    numeric_cols, cat_col = detect_columns(df)
    stats = compute_statistics(df)

    # Generate charts (sync — matplotlib is not async)
    chart_gen = ChartGenerator(report_id)
    chart_paths = chart_gen.generate_all(df, numeric_cols, cat_col)

    # Grok AI analysis (async)
    insights = await GrokAnalyst.analyze(data, query, stats)

    # Build PDF
    pdf_path = build_pdf(data, query, insights, stats, chart_paths, report_id, timestamp)

    logger.info(f"Report generated: {pdf_path}")
    return pdf_path, report_id


# ── Legacy compatibility (used by existing route) ────────────────────────────
class ReportGenerator:
    """Thin wrapper kept for backward-compatibility with existing report_routes.py."""

    def __init__(self, config=None):
        self.default_config = {
            "organization_name": "Querion Enterprise",
            "generated_by": "Querion AI System",
            "output_directory": REPORTS_DIR,
            "output_formats": ["pdf"],
        }
        if config:
            self.default_config.update(config)

    def validate_data(self, data):
        return bool(data and isinstance(data, list))

    def generate_report(self, data, user_query, config=None):
        # Kick off the async generator in a new event loop if needed
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(asyncio.run, generate_ai_report(data, user_query))
                    pdf_path, report_id = future.result()
            else:
                pdf_path, report_id = loop.run_until_complete(generate_ai_report(data, user_query))
        except Exception:
            pdf_path, report_id = asyncio.run(generate_ai_report(data, user_query))
        return [pdf_path], report_id
