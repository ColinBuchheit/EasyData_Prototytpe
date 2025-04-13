# utils/prompts.py
INTENT_CLASSIFICATION_PROMPT = """Classify this user message into one of the following intents:

- schema: asking about tables, columns, or database structure
- query: requesting specific data or information
- visualization: requesting a chart, graph, or visual format
- multi-db: comparing or aggregating across databases
- context: referring to previous conversation or chat history
- chat: general or unrelated conversation

User Message:
"{message}"

Respond with ONLY the intent name.
"""

# Add more templates here for prompt consistency
