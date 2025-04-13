from agents.base_agent import BaseAgent
from typing import Dict, Any, List, Optional, Union
import re
import requests
import json

from utils.settings import ANTHROPIC_API_KEY, CHAT_MODEL
from utils.logger import logger
from utils.token_usage_tracker import track_tokens
from utils.api_client import APIClient
from utils.error_handling import handle_agent_error, ErrorSeverity
from utils.backend_bridge import fetch_schema_for_user_db, health_check
from intent_system import IntentClassifier, IntentType

class ChatAgent(BaseAgent):
    """
    Agent for handling natural language conversations, intent classification,
    and user-friendly explanations of data
    """
    
    def name(self) -> str:
        return "chat_agent"
    
    def _ask_claude(self, prompt: str) -> str:
        """
        Helper method to query Claude API
        """
        try:
            # Use APIClient to make request to Claude
            api_client = APIClient(ANTHROPIC_API_KEY)
            response = api_client.complete(prompt, model=CHAT_MODEL)
            
            # Track token usage for monitoring
            track_tokens(prompt, response, CHAT_MODEL, self.name())
            
            return response
        except Exception as e:
            logger.error(f"Error calling Claude API: {e}")
            return f"I encountered an error while processing your request: {str(e)}"
    
    def _handle_general_conversation(self, task: str) -> Dict[str, Any]:
        """
        Handle general conversation that doesn't relate to database operations
        """
        logger.info(f"💬 ChatAgent handling general conversation")
        
        prompt = f"""
You are a helpful AI assistant focused on databases and data analysis. 
The user is having a conversation with you that isn't specifically about querying a database.

User message: {task}

Respond in a friendly, helpful way. If they're asking about capabilities, explain you can help them query databases,
understand schemas, visualize data, and explain results. If it's casual conversation, be friendly but professional.
"""
        
        reply = self._ask_claude(prompt)
        
        return {
            "success": True,
            "type": "text",
            "agent": self.name(),
            "message": reply.strip()
        }
    
    def _handle_system_question(self, task: str, user_id: str = None) -> Dict[str, Any]:
        """
        Handle questions about the system itself, database connections, etc.
        """
        logger.info(f"💬 ChatAgent handling system question")
        
        # Check if backend is available
        backend_status = "connected" if health_check() else "unavailable"
        
        prompt = f"""
You are a helpful AI assistant focused on helping users with database operations.
The user has asked a system-related question about connections, settings, or capabilities.

User question: {task}

Information about the system:
- Backend status: {backend_status}
- User ID: {user_id if user_id else "Not logged in"}

Respond in a friendly, helpful way focused on answering their system question.
"""
        
        reply = self._ask_claude(prompt)
        
        return {
            "success": True,
            "type": "text",
            "agent": self.name(),
            "message": reply.strip()
        }
    
    def _classify_intent(self, task: str) -> Dict[str, Any]:
        """
        Determine if user's message is a conversation, database query, or system question
        using the enhanced intent classification system
        """
        logger.info(f"🔍 Classifying intent: {task}")
        
        # Use the external intent classifier instead of custom implementation
        intent_result = IntentClassifier.classify_intent(task)
        
        # Log and return result
        logger.info(f"Intent classification: {intent_result['intent_type']} (confidence: {intent_result['confidence']})")
        
        # Add success flag for consistency with previous implementation
        intent_result["success"] = True
        return intent_result

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            task = input_data.get("task", "")
            operation = input_data.get("operation", "")
            
            # Intent classification
            if operation == "classify_intent":
                return self._classify_intent(task)
            
            # System question handling - updated to use IntentType
            if input_data.get("is_system_question", False) or IntentType.SYSTEM_QUESTION.name == self._classify_intent(task).get("intent_type"):
                return self._handle_system_question(task, input_data.get("user_id"))
            
            # General conversation handling - updated to use IntentType
            if input_data.get("is_general_conversation", False) or IntentType.CONVERSATION.name == self._classify_intent(task).get("intent_type"):
                return self._handle_general_conversation(task)
            
            # Data exploration handling - NEW
            if IntentType.DATA_EXPLORATION.name == self._classify_intent(task).get("intent_type"):
                return self._handle_data_exploration(task, input_data.get("user_id"), input_data.get("db_info"))
            
            # Multi-DB query handling - NEW
            if IntentType.MULTI_DB_QUERY.name == self._classify_intent(task).get("intent_type"):
                return self._handle_multi_db_query(task, input_data.get("user_id"))
            
            # Command handling - NEW
            if IntentType.COMMAND.name == self._classify_intent(task).get("intent_type"):
                return self._handle_command(task, input_data.get("user_id"))
                
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

    def _handle_data_exploration(self, task: str, user_id: str = None, db_info: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Handle data exploration requests (schema inspection, table/column discovery)
        """
        logger.info(f"Handling data exploration request: {task}")
        
        if not user_id or not db_info:
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": "To explore your database structure, I need information about which database you want to explore. Please select a database first."
            }
        
        # Try to fetch schema information
        try:
            from utils.backend_bridge import fetch_schema_for_user_db
            schema_result = fetch_schema_for_user_db(db_info, user_id)
            
            if schema_result.get("success", False) and "schema" in schema_result:
                schema = schema_result["schema"]
                
                # Format schema information based on the task
                task_lower = task.lower()
                if "what tables" in task_lower or "list tables" in task_lower or "show tables" in task_lower:
                    tables = schema.get("tables", [])
                    if tables:
                        tables_list = ", ".join(tables)
                        return {
                            "success": True,
                            "type": "text",
                            "agent": self.name(),
                            "message": f"The database contains the following tables: {tables_list}"
                        }
                    else:
                        return {
                            "success": True,
                            "type": "text",
                            "agent": self.name(),
                            "message": "This database doesn't contain any tables yet."
                        }
                
                # Handle column exploration
                elif "columns" in task_lower or "schema" in task_lower or "structure" in task_lower:
                    # If a specific table is mentioned
                    table_match = re.search(r"(in|of|for)\s+(?:the\s+)?(\w+)\s+table", task_lower)
                    if table_match:
                        table_name = table_match.group(2)
                        if table_name in schema.get("columns", {}):
                            columns = schema["columns"][table_name]
                            columns_list = "\n".join([f"- {col['name']} ({col['type']})" for col in columns])
                            return {
                                "success": True,
                                "type": "text",
                                "agent": self.name(),
                                "message": f"The {table_name} table has the following columns:\n\n{columns_list}"
                            }
                        else:
                            return {
                                "success": True,
                                "type": "text",
                                "agent": self.name(),
                                "message": f"I couldn't find a table named '{table_name}' in the database."
                            }
                    else:
                        # Show all tables with their columns
                        tables_info = []
                        for table in schema.get("tables", []):
                            columns = schema.get("columns", {}).get(table, [])
                            if columns:
                                columns_summary = ", ".join([col['name'] for col in columns[:5]])
                                if len(columns) > 5:
                                    columns_summary += f", and {len(columns)-5} more"
                                tables_info.append(f"- {table}: {columns_summary}")
                            else:
                                tables_info.append(f"- {table}")
                        
                        if tables_info:
                            return {
                                "success": True,
                                "type": "text",
                                "agent": self.name(),
                                "message": f"Here's an overview of the database schema:\n\n" + "\n".join(tables_info)
                            }
                        else:
                            return {
                                "success": True,
                                "type": "text",
                                "agent": self.name(),
                                "message": "I couldn't find any table structures in the database."
                            }
                
                # Handle relationships exploration
                elif "relationships" in task_lower or "foreign keys" in task_lower or "joins" in task_lower:
                    # Try to get relationships from backend
                    try:
                        from utils.backend_bridge import fetch_database_relationships
                        relationships_result = fetch_database_relationships(db_info.get("id"), user_id)
                        
                        if relationships_result.get("success", False) and "relationships" in relationships_result:
                            relationships = relationships_result["relationships"]
                            if relationships:
                                rel_list = "\n".join([
                                    f"- {rel.get('table_from')}.{rel.get('column_from')} → {rel.get('table_to')}.{rel.get('column_to')}"
                                    for rel in relationships
                                ])
                                return {
                                    "success": True,
                                    "type": "text",
                                    "agent": self.name(),
                                    "message": f"The database has the following relationships:\n\n{rel_list}"
                                }
                            else:
                                return {
                                    "success": True,
                                    "type": "text",
                                    "agent": self.name(),
                                    "message": "I couldn't find any explicit relationships defined in the database schema."
                                }
                    except Exception as e:
                        logger.error(f"Error fetching relationships: {e}")
                        # Fall through to generic response
                
                # Generic schema response
                return {
                    "success": True,
                    "type": "text",
                    "agent": self.name(),
                    "message": f"I've analyzed the database schema for '{db_info.get('database_name', 'your database')}'. It contains {len(schema.get('tables', []))} tables. You can ask about specific tables or columns for more details."
                }
            else:
                return {
                    "success": True,
                    "type": "text",
                    "agent": self.name(),
                    "message": "I couldn't retrieve the database schema. Please check your database connection."
                }
        except Exception as e:
            logger.error(f"Error exploring database: {e}")
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": f"I encountered an error while exploring the database: {str(e)}"
            }

    def _handle_multi_db_query(self, task: str, user_id: str = None) -> Dict[str, Any]:
        """
        Handle queries that need to be executed across multiple databases
        """
        logger.info(f"Handling multi-database query: {task}")
        
        if not user_id:
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": "To query across multiple databases, I need to know which databases you're connected to. Please make sure you're logged in and have database connections."
            }
        
        # Try to get user's databases
        try:
            from utils.backend_bridge import fetch_user_connections
            
            if not hasattr(fetch_user_connections, '__call__'):
                return {
                    "success": True,
                    "type": "text", 
                    "agent": self.name(),
                    "message": "I'm not able to query across your databases at the moment. This feature requires backend support that isn't available."
                }
            
            connections = fetch_user_connections(user_id)
            
            if not connections or len(connections) < 2:
                return {
                    "success": True,
                    "type": "text",
                    "agent": self.name(),
                    "message": "You need at least two connected databases to perform cross-database queries. I found only " + 
                              (f"{len(connections)} database connection." if connections else "no database connections.")
                }
            
            # Get database IDs
            db_ids = [conn.get('id') for conn in connections if 'id' in conn]
            
            if len(db_ids) < 2:
                return {
                    "success": True,
                    "type": "text",
                    "agent": self.name(),
                    "message": "I couldn't find valid database IDs for multiple databases. Please check your connections."
                }
            
            # Execute the multi-database query
            try:
                from utils.backend_bridge import execute_multi_db_query
                result = execute_multi_db_query(task, db_ids, user_id)
                
                if result.get("success", False):
                    # Format the results
                    output = "Here are the results from querying across your databases:\n\n"
                    
                    if "results" in result:
                        for db_name, db_result in result["results"].items():
                            output += f"From {db_name}:\n"
                            if isinstance(db_result, list) and db_result:
                                output += f"- Found {len(db_result)} records\n"
                            elif isinstance(db_result, dict):
                                for key, value in db_result.items():
                                    output += f"- {key}: {value}\n"
                            else:
                                output += f"- {db_result}\n"
                            output += "\n"
                    
                    return {
                        "success": True,
                        "type": "text",
                        "agent": self.name(),
                        "message": output
                    }
                else:
                    return {
                        "success": True,
                        "type": "text",
                        "agent": self.name(),
                        "message": f"There was a problem executing the cross-database query: {result.get('error', 'Unknown error')}"
                    }
            except Exception as e:
                logger.error(f"Error executing multi-db query: {e}")
                return {
                    "success": True,
                    "type": "text",
                    "agent": self.name(),
                    "message": f"I encountered an error while trying to execute the cross-database query: {str(e)}"
                }
        except Exception as e:
            logger.error(f"Error getting user connections: {e}")
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": f"I encountered an error while trying to access your database connections: {str(e)}"
            }

    def _handle_command(self, task: str, user_id: str = None) -> Dict[str, Any]:
        """
        Handle system commands like switching databases or adjusting settings
        """
        logger.info(f"Handling command: {task}")
        
        if not user_id:
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": "To execute commands, I need to know which user you are. Please make sure you're logged in."
            }
        
        task_lower = task.lower()
        
        # Handle database switching
        if any(phrase in task_lower for phrase in ["switch to", "use", "connect to"]):
            db_name_match = re.search(r"(?:switch|use|connect) to\s+(?:the\s+)?['\"]?([a-zA-Z0-9_\- ]+)['\"]?\s+(?:database|db)", task_lower)
            
            if not db_name_match:
                db_name_match = re.search(r"(?:switch|use|connect) to\s+(?:the\s+)?database\s+['\"]?([a-zA-Z0-9_\- ]+)['\"]?", task_lower)
            
            if db_name_match:
                db_name = db_name_match.group(1).strip()
                
                # Try to find the database in user's connections
                try:
                    from utils.backend_bridge import fetch_user_connections, set_database_context
                    
                    if not hasattr(fetch_user_connections, '__call__') or not hasattr(set_database_context, '__call__'):
                        return {
                            "success": True,
                            "type": "text",
                            "agent": self.name(),
                            "message": "I'm not able to switch databases at the moment. This feature requires backend support that isn't available."
                        }
                    
                    connections = fetch_user_connections(user_id)
                    
                    if not connections:
                        return {
                            "success": True,
                            "type": "text",
                            "agent": self.name(),
                            "message": "You don't have any database connections. Please connect to a database first."
                        }
                    
                    # Find the database by name
                    matching_dbs = [
                        conn for conn in connections 
                        if conn.get('database_name', '').lower() == db_name.lower() or
                           conn.get('connection_name', '').lower() == db_name.lower()
                    ]
                    
                    if matching_dbs:
                        db_id = matching_dbs[0].get('id')
                        result = set_database_context(user_id, db_id)
                        
                        if result.get("success", False):
                            return {
                                "success": True,
                                "type": "text",
                                "agent": self.name(),
                                "message": f"I've switched to the '{matching_dbs[0].get('database_name')}' database. You can now query this database directly."
                            }
                        else:
                            return {
                                "success": True,
                                "type": "text",
                                "agent": self.name(),
                                "message": f"I couldn't switch to the database. Error: {result.get('error', 'Unknown error')}"
                            }
                    else:
                        db_list = ", ".join([
                            conn.get('connection_name') or conn.get('database_name') 
                            for conn in connections
                        ])
                        return {
                            "success": True,
                            "type": "text",
                            "agent": self.name(),
                            "message": f"I couldn't find a database named '{db_name}'. Your available databases are: {db_list}"
                        }
                except Exception as e:
                    logger.error(f"Error switching database: {e}")
                    return {
                        "success": True,
                        "type": "text",
                        "agent": self.name(),
                        "message": f"I encountered an error while trying to switch databases: {str(e)}"
                    }
        
        # Generic command response
        return {
            "success": True,
            "type": "text",
            "agent": self.name(),
            "message": "I understood that you want me to perform a command, but I'm not sure what specific command you want. You can ask me to switch databases or perform other system operations."
        }
