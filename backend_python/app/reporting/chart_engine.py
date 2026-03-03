import matplotlib.pyplot as plt
import os
import uuid
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class ChartEngine:
    """
    Engine for generating charts using Matplotlib.
    """
    
    def __init__(self, output_dir: str = "reports/charts"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_charts(self, data: List[Dict[str, Any]], numeric_columns: List[str]) -> List[str]:
        """
        Generates charts for the numeric columns and returns file paths.
        """
        chart_paths = []
        if not data or not numeric_columns:
            return chart_paths

        # Limit data for plotting if too many records to avoid clutter
        plot_data = data[:100]  # Take first 100 for visualization
        
        for col in numeric_columns:
            try:
                # Bar Chart
                bar_path = self._generate_bar_chart(plot_data, col)
                if bar_path:
                    chart_paths.append(bar_path)
                
                # Trend/Line Chart
                trend_path = self._generate_trend_chart(plot_data, col)
                if trend_path:
                    chart_paths.append(trend_path)

                # Distribution Chart
                dist_path = self._generate_distribution_chart(data, col) # Use full data for distribution 
                if dist_path:
                    chart_paths.append(dist_path)
                    
            except Exception as e:
                logger.error(f"Error generating charts for {col}: {e}")

        return chart_paths

    def _generate_bar_chart(self, data: List[Dict[str, Any]], column: str) -> str:
        plt.figure(figsize=(10, 6))
        values = [row.get(column, 0) for row in data]
        labels = [str(i) for i in range(len(values))]
        
        plt.bar(labels, values, color='skyblue')
        plt.title(f"Distribution of {column}")
        plt.xlabel("Records")
        plt.ylabel(column)
        plt.xticks(rotation=45)
        
        filename = f"bar_{column}_{uuid.uuid4().hex[:8]}.png"
        path = os.path.join(self.output_dir, filename)
        plt.tight_layout()
        plt.savefig(path)
        plt.close()
        return path

    def _generate_trend_chart(self, data: List[Dict[str, Any]], column: str) -> str:
        plt.figure(figsize=(10, 6))
        values = [row.get(column, 0) for row in data]
        
        plt.plot(values, marker='o', linestyle='-', color='green')
        plt.title(f"{column} Trend")
        plt.xlabel("Record Index")
        plt.ylabel(column)
        
        filename = f"trend_{column}_{uuid.uuid4().hex[:8]}.png"
        path = os.path.join(self.output_dir, filename)
        plt.tight_layout()
        plt.savefig(path)
        plt.close()
        return path

    def _generate_distribution_chart(self, data: List[Dict[str, Any]], column: str) -> str:
        plt.figure(figsize=(10, 6))
        values = [row.get(column, 0) for row in data if row.get(column) is not None]
        
        plt.hist(values, bins=20, color='orange', edgecolor='black')
        plt.title(f"Frequency Distribution of {column}")
        plt.xlabel(column)
        plt.ylabel("Frequency")
        
        filename = f"dist_{column}_{uuid.uuid4().hex[:8]}.png"
        path = os.path.join(self.output_dir, filename)
        plt.tight_layout()
        plt.savefig(path)
        plt.close()
        return path
