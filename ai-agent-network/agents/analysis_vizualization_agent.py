from agents.base_agent import BaseAgent
from typing import Dict, Any
import openai
import os
import json
import requests

from utils.settings import (
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
    CLAUDE_MODEL,
    GPT_MODEL_FOR_CHARTS
)
from utils.logger import logger
from utils.token_usage_tracker import track_tokens

openai.api_key = OPENAI_API_KEY


class AnalysisVisualizationAgent(BaseAgent):
    """
    Uses Claude to recommend a chart type and summarize data,
    then uses GPT-4 to generate Python matplotlib code for visualization.
    """

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            task = input_data.get("task", "")
            query_result = input_data.get("query_result")
            visual_type_override = input_data.get("visual_type", None)

            if not query_result:
                logger.warning("❌ Visualization agent called without query_result")
                return {"success": False, "error": "Missing query_result for visualization."}

            logger.info(f"📊 Running visualization for task: {task}")

            # Step 1: Ask Claude for chart suggestion + insight
            chart_info = self._ask_claude_for_chart(task, query_result)
            visual_type = visual_type_override or chart_info.get("visual_type", "bar")

            # Step 2: Use GPT for Python matplotlib code
            chart_code = self._ask_gpt_for_chart_code(visual_type, query_result)

            logger.info(f"✅ Visualization complete: {visual_type}")

            return {
                "success": True,
                "visual_type": visual_type,
                "summary": chart_info.get("summary", ""),
                "chart_code": chart_code,
                "language": "python"
            }

        except Exception as e:
            logger.exception("❌ Visualization agent failed")
            return {"success": False, "error": str(e)}

    def _ask_claude_for_chart(self, task: str, raw_data: str) -> Dict[str, str]:
        headers = {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

        prompt = f"""
You are a data visualization assistant. A user has given you this task and result data:

Task: {task}

Data:
{raw_data}

Respond ONLY in this JSON format:

{{
  "visual_type": "bar",
  "summary": "This bar chart compares product sales across regions."
}}
        """

        payload = {
            "model": CLAUDE_MODEL,
            "max_tokens": 512,
            "temperature": 0.4,
            "system": "You are a helpful data visualization assistant.",
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }

        try:
            response = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            response.raise_for_status()

            # Estimate tokens (approx. for Claude)
            tokens = len(prompt.split()) + 150
            track_tokens("analysis_visualization_agent", CLAUDE_MODEL, tokens // 2, tokens // 2)

            content = response.json()["content"][0]["text"]
            return json.loads(content)

        except Exception as e:
            logger.warning(f"⚠️ Claude failed, using fallback: {e}")
            return {
                "visual_type": "bar",
                "summary": str(e)
            }

    def _ask_gpt_for_chart_code(self, chart_type: str, raw_data: str) -> str:
        prompt = (
            f"Generate Python code using matplotlib to create a {chart_type} chart "
            f"based on this data:\n\n{raw_data}\n\n"
            "Use sample variables if needed. Return ONLY valid Python code."
        )

        try:
            response = openai.ChatCompletion.create(
                model=GPT_MODEL_FOR_CHARTS,
                messages=[
                    {"role": "system", "content": "You are an expert data visualizer using Python."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )

            usage = response["usage"]
            track_tokens("analysis_visualization_agent", GPT_MODEL_FOR_CHARTS,
                         usage["prompt_tokens"], usage["completion_tokens"])

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"❌ GPT failed to generate chart code: {e}")
            return "# GPT failed to generate code."
