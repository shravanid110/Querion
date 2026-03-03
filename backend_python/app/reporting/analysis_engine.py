import polars as pl
from typing import List, Dict, Any, Union
import logging

logger = logging.getLogger(__name__)

class AnalysisEngine:
    """
    Engine for analyzing dataset and extracting insights using Polars.
    """
    
    @staticmethod
    def analyze_data(data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes the data and returns structured metrics and insights.
        """
        if not data:
            return {
                "total_records": 0,
                "numeric_columns": [],
                "metrics": {},
                "insights": ["No data available for analysis."]
            }

        try:
            df = pl.DataFrame(data)
            total_records = len(df)
            
            # Detect numeric columns
            numeric_cols = [col for col in df.columns if df[col].dtype in [pl.Int64, pl.Float64, pl.Int32, pl.Float32]]
            
            metrics = {}
            insights = []

            for col in numeric_cols:
                col_data = df[col]
                metrics[col] = {
                    "count": int(col_data.count()),
                    "sum": float(col_data.sum()) if col_data.sum() is not None else 0,
                    "mean": float(col_data.mean()) if col_data.mean() is not None else 0,
                    "min": float(col_data.min()) if col_data.min() is not None else 0,
                    "max": float(col_data.max()) if col_data.max() is not None else 0
                }
                
                # Basic insights
                try:
                    max_idx = col_data.arg_max()
                    if max_idx is not None:
                        max_val = col_data[max_idx]
                        insights.append(f"Highest {col} recorded is {max_val}.")
                        
                    min_idx = col_data.arg_min()
                    if min_idx is not None:
                        min_val = col_data[min_idx]
                        insights.append(f"Lowest {col} recorded is {min_val}.")
                except Exception as e:
                    logger.error(f"Error generating insights for column {col}: {e}")

            # General insights
            insights.append(f"Total of {total_records} records processed successfully.")
            
            return {
                "total_records": total_records,
                "numeric_columns": numeric_cols,
                "metrics": metrics,
                "insights": insights
            }
        except Exception as e:
            logger.error(f"Error in analyze_data: {e}")
            return {
                "total_records": len(data),
                "numeric_columns": [],
                "metrics": {},
                "insights": [f"Analysis error: {str(e)}"]
            }
