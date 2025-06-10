from .base_agent import BaseAgent
import pandas as pd

class AnalysisAgent(BaseAgent):
    def __init__(self, name: str, client, model: str):
        super().__init__(name)
        self.client = client
        self.model = model

    def run(self, task: dict) -> dict:
        results = task.get("query_results")
        if not results or not results.get("success"):
            return {"success": False, "error": results.get("error", "No results found.")}

        data = results.get("data", [])
        if not data:
            return {"success": True, "summary": "No results found."}

        df = pd.DataFrame(data)
        summary = f"Result has {len(df)} rows and {len(df.columns)} columns.\n"
        summary += "Top 5 rows:\n"
        summary += df.head(5).to_string(index=False)

        return {"success": True, "summary": summary}
