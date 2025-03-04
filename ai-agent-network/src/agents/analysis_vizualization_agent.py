from crewai import Agent
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import logging

# Secure Logging Setup
logger = logging.getLogger(__name__)

class AnalysisVisualizationAgent(Agent):
    """AI-powered agent for analyzing query results and generating visualizations."""

    def __init__(self):
        """Initialize the agent with AI-powered analysis capabilities."""
        self.name = "Analysis & Visualization Agent"
        self.role = "Data Analyst"
        self.description = "Interprets SQL query results, identifies trends, and generates visualizations."

    def preprocess_data(self, query_result: list):
        """Prepares dataset for both analysis and visualization."""
        if not query_result:
            return None, "⚠️ No data available."

        df = pd.DataFrame(query_result)
        df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]

        # ✅ Handle missing values
        missing_summary = df.isnull().sum()
        missing_values_info = missing_summary[missing_summary > 0]
        
        # ✅ Detect numeric & categorical columns
        numeric_columns = df.select_dtypes(include=['number']).columns.tolist()
        categorical_columns = df.select_dtypes(include=['object']).columns.tolist()

        return df, numeric_columns, categorical_columns, missing_values_info

    def analyze_results(self, query_result: list) -> str:
        """Generates AI-powered analysis of query results."""
        df, numeric_columns, categorical_columns, missing_values_info = self.preprocess_data(query_result)

        if df is None:
            return "⚠️ No data available for analysis."

        analysis = ""

        if not missing_values_info.empty:
            analysis += f"⚠️ **Missing Data:**\n{missing_values_info.to_string()}\n\n"

        if numeric_columns:
            analysis += f"📊 **Numerical Overview:**\n{df[numeric_columns].describe()}\n\n"

            # ✅ Outlier detection using IQR
            outlier_summary = {}
            for col in numeric_columns:
                Q1, Q3 = df[col].quantile([0.25, 0.75])
                IQR = Q3 - Q1
                outliers = df[(df[col] < (Q1 - 1.5 * IQR)) | (df[col] > (Q3 + 1.5 * IQR))]
                if not outliers.empty:
                    outlier_summary[col] = len(outliers)

            if outlier_summary:
                analysis += f"🚨 **Outliers Detected:**\n{outlier_summary}\n\n"

        if categorical_columns:
            for col in categorical_columns:
                top_values = df[col].value_counts().head(5)
                analysis += f"🔹 **Top `{col}` Values:**\n{top_values.to_string()}\n\n"

        return analysis or "✅ No significant insights found."

    def generate_visualization(self, query_result: list) -> str:
        """Generates a base64-encoded visualization from query results."""
        df, numeric_columns, categorical_columns, _ = self.preprocess_data(query_result)

        if df is None:
            return "⚠️ No data available for visualization."

        plt.figure(figsize=(8, 6))

        if len(numeric_columns) >= 2:
            sns.heatmap(df[numeric_columns].corr(), annot=True, cmap="coolwarm", fmt=".2f")
            plt.title("📊 Data Correlation Heatmap")
        elif len(numeric_columns) == 1:
            sns.histplot(df[numeric_columns[0]], bins=20, kde=True)
            plt.title(f"📈 Distribution of `{numeric_columns[0]}`")
        elif categorical_columns:
            top_cat_col = categorical_columns[0]
            sns.countplot(y=df[top_cat_col], order=df[top_cat_col].value_counts().index[:5])
            plt.title(f"🔹 Top Categories in `{top_cat_col}`")
        else:
            return "⚠️ No suitable data found for visualization."

        # ✅ Convert plot to base64
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format="png")
        plt.close()
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_base64}"
