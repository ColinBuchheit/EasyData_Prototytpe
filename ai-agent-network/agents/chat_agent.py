from agents.base_agent import BaseAgent
from typing import Dict, Any
import requests
import json

from utils.settings import ANTHROPIC_API_KEY, CHAT_MODEL
from utils.logger import logger
from utils.token_usage_tracker import track_tokens
from utils.api_client import APIClient
from utils.error_handling import handle_agent_error, ErrorSeverity
from utils.backend_bridge import fetch_schema_for_user_db, health_check

class ChatAgent(BaseAgent):
    """
    Enhanced ChatAgent that:
    1. Correctly determines if a message is a conversation, database query, or system question
    2. Accurately explains the system's capabilities
    3. Knows the backend bridge APIs it can call to get real system information
    4. Properly routes system questions to the appropriate backend calls
    """

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            task = input_data.get("task", "")
            operation = input_data.get("operation", "")
            
            # Intent classification
            if operation == "classify_intent":
                return self._classify_intent(task)
            
            # System question handling
            if input_data.get("is_system_question", False) or self._is_system_question(task):
                return self._handle_system_question(task, input_data.get("user_id"))
            
            # General conversation handling
            if input_data.get("is_general_conversation", False):
                return self._handle_general_conversation(task)
            
            # Regular explanation flow for query results
            raw_output = input_data.get("query_result") or input_data.get("raw_output")
            tone = input_data.get("tone", "friendly")

            if not raw_output:
                logger.warning("⚠️ ChatAgent missing raw_output or query_result")
                return {"success": False, "error": "Missing raw_output for explanation."}

            logger.info(f"💬 ChatAgent summarizing task in tone: {tone}")

            prompt = f"""
Task: {task}

Output to explain:
{raw_output}

Explain this output to a business user in a {tone} tone. Use plain language. Do not include any charts or code.
"""

            reply = self._ask_claude(prompt)

            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": reply.strip()
            }

        except Exception as e:
            logger.exception("❌ ChatAgent failed to run.")
            return handle_agent_error(self.name(), e, ErrorSeverity.MEDIUM)
    
    def _is_system_question(self, task: str) -> bool:
        """Determine if the question is about the system itself or database connections"""
        task_lower = task.lower().strip()
        
        system_patterns = [
            "what database", "which database", "database connected", 
            "what kind of info", "what information", "what data", 
            "what's in the database", "database contain", "connected to",
            "what databases", "show databases", "list databases",
            "connection", "connections", "what connections", "database connections",
            "what system", "what are you", "how do you work",
            "what can you access", "my databases", "my connections"
        ]
        
        return any(pattern in task_lower for pattern in system_patterns)
    
    def _handle_system_question(self, task: str, user_id: str = None) -> Dict[str, Any]:
        """
        Handle questions about the system by using the backend bridge to fetch actual information
        rather than giving generic responses.
        """
        task_lower = task.lower().strip()
        logger.info(f"Handling system question: {task}")
        
        # For questions about database connections
        if any(pattern in task_lower for pattern in [
            "what connection", "which connection", "database connection", 
            "my connection", "list connection", "show connection",
            "what database", "which database", "database access",
            "connected to", "list database", "show database", "my database"
        ]):
            # We need to use the backend bridge to get this information
            # The proper approach is to let the user know we need to request this info from backend
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": """
To see your database connections, you should:

1. Check the connections panel in the user interface
2. Use the backend API's /api/connections endpoint 

I don't have direct access to list your connections, but I can help you query a database if you specify which one you want to use. For example, you can say "Show me the tables in my PostgreSQL database."

The backend currently supports these database types: PostgreSQL, MySQL, MongoDB, SQLite, MS SQL, Firebase, CouchDB, and DynamoDB.
"""
            }
        
        # For general system health/status questions
        if any(pattern in task_lower for pattern in ["system status", "health", "is working", "online"]):
            try:
                # Use the health_check function from backend_bridge
                health_status = health_check()
                
                if health_status.get("status") == "ok":
                    return {
                        "success": True,
                        "type": "text",
                        "agent": self.name(),
                        "message": "✅ The system is online and working properly. The backend API is responsive."
                    }
                else:
                    return {
                        "success": True,
                        "type": "text",
                        "agent": self.name(),
                        "message": f"⚠️ There seems to be an issue with the system: {health_status.get('message', 'Unknown error')}"
                    }
            except Exception as e:
                logger.error(f"Error checking system health: {e}")
                return {
                    "success": True,
                    "type": "text",
                    "agent": self.name(),
                    "message": "There was an error checking the system status. The backend may be experiencing issues."
                }
        
        # For database content exploration questions
        if any(pattern in task_lower for pattern in ["what kind of info", "what information", "what data", "database contain"]):
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": """
To explore your database contents, you need to specify which database you want to query. Once you do that, I can help with:

1. "Show me all tables in my [database_name] database"
2. "What columns are in the [table_name] table?"
3. "Show me a sample of data from the [table_name] table"
4. "What relationships exist between tables?"

I'll work with the Schema Agent to fetch the structure information from the backend, and then I can help you explore your data.
"""
            }
        
        # General capabilities explanation
        capabilities_explanation = """
I'm part of the AI-Agent-Network that works with the AI-DB-Backend system. Here's what our agent network can do:

1. Connect to multiple database types (PostgreSQL, MySQL, MongoDB, SQLite, MS SQL, Firebase, CouchDB, DynamoDB)
2. Translate your natural language questions into database queries
3. Send those queries to the backend for execution
4. Process the results and provide visualizations
5. Explain the data in conversational language

I coordinate with specialized agents:
- Schema Agent: Gets database structure from the backend
- Query Agent: Converts your question to a database query
- Validation Agent: Checks query safety and correctness
- Visualization Agent: Creates charts from query results

We don't directly access databases - we send all requests through the backend API, which handles the actual database connections and query execution.

What would you like to know about your data?
"""

        return {
            "success": True,
            "type": "text",
            "agent": self.name(),
            "message": capabilities_explanation.strip()
        }

    def _handle_general_conversation(self, task: str) -> Dict[str, Any]:
        """Handle general conversation not related to database queries"""
        task_lower = task.lower().strip()
        
        # Simple greeting responses
        greetings = ["hi", "hello", "hey", "greetings", "howdy", "what's up", "hi there"]
        if task_lower in greetings or any(task_lower.startswith(g) for g in greetings):
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": "Hello! I'm your AI database assistant. I can help you query your databases using natural language and visualize the results. What would you like to know about your data?"
            }
            
        # Help request or what can you do
        if any(phrase in task_lower for phrase in ["help", "what can you do", "how do you work"]):
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": """I can help you access information from your databases using natural language. For example, you can ask me things like:

- Show me the top 10 products by sales
- What are the most recent orders?
- How many users signed up last month?
- Find customers who spent over $1000 last quarter
- What's the average order value by category?

Just describe what you'd like to know, and I'll translate that into a database query, send it to the backend for execution, and explain the results."""
            }
            
        # For other conversational inputs, use Claude
        prompt = f"""
The user has sent a conversational message: "{task}"

This appears to be a general conversation rather than a database query. 
Respond in a helpful, friendly way. If it seems like they might be trying to 
ask about database information but were unclear, gently suggest they can ask 
about specific data if they'd like.

Keep your response under 100 words.
"""

        try:
            response = self._ask_claude(prompt)
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": response.strip()
            }
        except Exception as e:
            logger.error(f"Error generating conversation response: {e}")
            # Fallback response
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": "I'm your database assistant. I can help you query your databases using natural language. What would you like to know about your data?"
            }

    def _classify_intent(self, task: str) -> Dict[str, Any]:
        """Determine if user's message is a conversation, database query, or system question"""
        logger.info(f"🔍 Classifying intent: {task}")
        
        task_lower = task.lower().strip()
        
        # Handle system questions separately - check this first
        if self._is_system_question(task_lower):
            return {
                "success": True,
                "intent_type": "system_question",  # New intent type specifically for system questions
                "confidence": 0.9,
                "reasoning": "System information or database connection question detected"
            }
        
        # Check for obvious greetings
        greetings = ["hi", "hello", "hey", "greetings", "howdy", "what's up", "hi there"]
        if task_lower in greetings or any(task_lower.startswith(g) for g in greetings):
            return {
                "success": True,
                "intent_type": "conversation",
                "confidence": 0.95,
                "reasoning": "Clear greeting pattern detected"
            }
            
        # Check for obvious help requests
        help_patterns = ["help", "what can you do", "how do you work", "what is this"]
        if any(pattern in task_lower for pattern in help_patterns):
            return {
                "success": True,
                "intent_type": "conversation",
                "confidence": 0.9,
                "reasoning": "Help or information request detected"
            }
            
        # Check for clear database query indicators
        db_terms = ["select", "query", "table", "find", "show me", "search for", 
               "list", "count", "report", "analyze", "data", "records", "rows", 
               "where", "how many", "average", "sum", "minimum", "maximum"]
        
        if any(term in task_lower for term in db_terms):
            return {
                "success": True,
                "intent_type": "query",
                "confidence": 0.85,
                "reasoning": "Contains database query terminology"
            }
        
        # For more complex or ambiguous inputs, use Claude to classify
        prompt = f"""
Task: Determine if the following user message is requesting database information, asking about system/connection information, or just having a general conversation.

User message: "{task}"

Analyze the message and respond with ONLY a JSON object in the following format:
{{
  "intent_type": "query" or "system_question" or "conversation" or "ambiguous",
  "confidence": [score between 0.0 and 1.0],
  "reasoning": "[brief explanation of your classification]"
}}

The "intent_type" should be:
- "query" if the user is clearly asking for information FROM a database (like querying data)
- "system_question" if the user is asking ABOUT connections, database systems, or what databases are available
- "conversation" if the user is clearly just having a general conversation
- "ambiguous" if it's unclear what the user wants

Be very conservative with classification - only use a category when you're confident.
"""

        try:
            # Use the APIClient utility for retries and timeouts
            response = APIClient.call_anthropic_api(
                endpoint="messages",
                payload={
                    "model": CHAT_MODEL,
                    "max_tokens": 512,
                    "temperature": 0.2,
                    "system": "You are an expert at determining user intent in conversations with database systems.",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                },
                api_key=ANTHROPIC_API_KEY,
                retries=2,
                timeout=10
            )

            # Claude doesn't return token usage yet — approximate:
            token_guess = len(prompt.split()) + 150
            track_tokens("chat_agent", CHAT_MODEL, token_guess // 2, token_guess // 2)

            content = response["content"][0]["text"]
            
            try:
                # Parse the JSON response
                intent_data = json.loads(content)
                logger.info(f"Intent classification: {intent_data['intent_type']} (confidence: {intent_data['confidence']})")
                
                # Add success flag for consistency
                intent_data["success"] = True
                return intent_data
            except json.JSONDecodeError:
                # Fallback if not valid JSON
                logger.error(f"Failed to parse intent classification response: {content}")
                return {
                    "success": True,
                    "intent_type": "ambiguous",
                    "confidence": 0.5,
                    "reasoning": "Failed to parse intent classification"
                }

        except Exception as e:
            logger.error(f"❌ Intent classification failed: {e}")
            # Fallback to ambiguous
            return {
                "success": True,
                "intent_type": "ambiguous",
                "confidence": 0.5,
                "reasoning": f"Error during classification: {str(e)}"
            }

    def _ask_claude(self, prompt: str) -> str:
        """Call Claude API with improved error handling and retries"""
        payload = {
            "model": CHAT_MODEL,
            "max_tokens": 512,
            "temperature": 0.5,
            "system": "You are a helpful database assistant that explains technical outputs to business users and helps with database-related questions.",
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }

        try:
            # Use the APIClient utility for retries and timeouts
            response = APIClient.call_anthropic_api(
                endpoint="messages",
                payload=payload,
                api_key=ANTHROPIC_API_KEY,
                retries=3,
                timeout=30
            )

            # Claude doesn't return token usage yet — approximate:
            token_guess = len(prompt.split()) + 150
            track_tokens("chat_agent", CHAT_MODEL, token_guess // 2, token_guess // 2)

            content = response["content"][0]["text"]
            return content

        except Exception as e:
            logger.error(f"❌ Claude call failed in ChatAgent: {e}")
            return "The assistant was unable to generate a response."