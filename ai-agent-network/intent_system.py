# intent_system.py
from typing import Dict, Any, List, Tuple, Optional
import json
from enum import Enum, auto
import re

from utils.logger import logger
from utils.api_client import APIClient
from utils.settings import ANTHROPIC_API_KEY, CHAT_MODEL
from utils.token_usage_tracker import track_tokens

class IntentType(Enum):
    QUERY = auto()          # Database query
    CONVERSATION = auto()   # General chat
    SYSTEM_QUESTION = auto()  # About system status/capabilities
    MULTI_DB_QUERY = auto() # Query across databases
    DATA_EXPLORATION = auto()  # Exploring schema/structure
    COMMAND = auto()         # System command (e.g., switch database)
    AMBIGUOUS = auto()      # Unclear intent
    
class IntentClassifier:
    """Enhanced intent classification system that combines rules and LLMs"""
    
    # Common phrases that indicate specific intents
    INTENT_PATTERNS = {
        IntentType.QUERY: [
            r"show me .* from", r"what is the .* of", r"how many", r"find all", 
            r"search for", r"select", r"list", r"count", r"average", 
            r"calculate", r"sum", r"where", r"group by"
        ],
        IntentType.CONVERSATION: [
            r"^hi$", r"^hello$", r"^hey$", r"thanks", r"thank you", r"help me",
            r"how are you", r"what can you do", r"who are you"
        ],
        IntentType.SYSTEM_QUESTION: [
            r"what database", r"which database", r"database connected", 
            r"what connections", r"show databases", r"list databases",
            r"system status", r"are you working", r"is the system"
        ],
        IntentType.MULTI_DB_QUERY: [
            r"across all( my)? (database|db)s", r"all databases", r"compare .* across",
            r"join .* from .* and", r"data from .* and .* database"
        ],
        IntentType.DATA_EXPLORATION: [
            r"what tables", r"show me the schema", r"what columns", 
            r"table structure", r"database structure", r"what data types",
            r"what are the relationships", r"describe"
        ],
        IntentType.COMMAND: [
            r"switch to", r"connect to", r"use database", r"change database",
            r"set current database", r"disconnect", r"reconnect"
        ]
    }
    
    @classmethod
    def classify_intent(cls, task: str, user_id: str = None, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Classify user intent using both rule-based and LLM approaches
        
        Args:
            task: The user's input text
            user_id: Optional user ID for context
            context: Optional conversation context
            
        Returns:
            Dict containing intent_type, confidence, and reasoning
        """
        # Apply rule-based classification first (faster)
        rule_result = cls._apply_rules(task)
        
        # If high confidence from rules, return immediately
        if rule_result["confidence"] > 0.85:
            logger.info(f"Rule-based intent classification: {rule_result['intent_type']} "
                      f"(confidence: {rule_result['confidence']})")
            return rule_result
            
        # For medium-confidence or ambiguous intents, use LLM
        llm_result = cls._classify_with_llm(task, context)
        
        # Combine results, favoring LLM for complex queries
        if llm_result["confidence"] > rule_result["confidence"]:
            logger.info(f"LLM intent classification: {llm_result['intent_type']} "
                      f"(confidence: {llm_result['confidence']})")
            return llm_result
        else:
            logger.info(f"Rule-based intent classification: {rule_result['intent_type']} "
                      f"(confidence: {rule_result['confidence']})")
            return rule_result
    
    @classmethod
    def _apply_rules(cls, task: str) -> Dict[str, Any]:
        """Apply rule-based intent classification"""
        task_lower = task.lower().strip()
        
        # Default to ambiguous with low confidence
        best_match = {"intent_type": IntentType.AMBIGUOUS.name, "confidence": 0.3, "reasoning": "No clear pattern match"}
        
        # Check each intent pattern
        for intent_type, patterns in cls.INTENT_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, task_lower, re.IGNORECASE):
                    confidence = 0.7  # Base confidence for pattern match
                    
                    # Adjust confidence based on specificity
                    if len(task_lower.split()) <= 3:  # Very short queries are often greetings
                        confidence = 0.9 if intent_type == IntentType.CONVERSATION else 0.5
                    elif len(re.findall(pattern, task_lower, re.IGNORECASE)) > 1:  # Multiple matches
                        confidence += 0.1
                        
                    # If better than current best, update
                    if confidence > best_match["confidence"]:
                        best_match = {
                            "intent_type": intent_type.name,
                            "confidence": confidence,
                            "reasoning": f"Matched pattern: '{pattern}'"
                        }
        
        return best_match
    
    @classmethod
    def _classify_with_llm(cls, task: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Use Claude to classify intent for complex cases"""
        context_str = ""
        if context:
            # Format recent conversation
            if "recent_messages" in context:
                context_str = "Recent conversation:\n" + "\n".join([
                    f"- User: {msg['input']}\n  Assistant: {msg['response'][:100]}..."
                    for msg in context["recent_messages"][-3:]  # Last 3 messages
                ])
            
            # Add active database context if available
            if "current_db" in context:
                context_str += f"\nCurrent database: {context['current_db']['name']} ({context['current_db']['type']})"
        
        prompt = f"""
Task: Determine if the following user message is requesting:
1. A database query (QUERY)
2. A general conversation (CONVERSATION)
3. Information about system/connections (SYSTEM_QUESTION)
4. A query across multiple databases (MULTI_DB_QUERY)
5. Exploration of database structure (DATA_EXPLORATION)
6. A command to change the system state (COMMAND)
7. Ambiguous/unclear (AMBIGUOUS)

User message: "{task}"

{context_str}

Analyze the message and respond with ONLY a JSON object in the following format:
{{
  "intent_type": "QUERY" or "CONVERSATION" or "SYSTEM_QUESTION" or "MULTI_DB_QUERY" or "DATA_EXPLORATION" or "COMMAND" or "AMBIGUOUS",
  "confidence": [score between 0.0 and 1.0],
  "reasoning": "[brief explanation of your classification]"
}}

The "intent_type" should match one of the 7 categories above. Be very precise in your classification.
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

            # Claude doesn't return token usage - approximate:
            token_guess = len(prompt.split()) + 150
            track_tokens("intent_classifier", CHAT_MODEL, token_guess // 2, token_guess // 2)

            content = response["content"][0]["text"]
            
            try:
                # Parse the JSON response
                intent_data = json.loads(content)
                # Ensure we have the required fields
                if not all(k in intent_data for k in ["intent_type", "confidence", "reasoning"]):
                    raise ValueError("Missing required fields in LLM response")
                    
                return intent_data
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"Failed to parse intent classification response: {e}")
                return {
                    "intent_type": IntentType.AMBIGUOUS.name,
                    "confidence": 0.4,
                    "reasoning": "Failed to parse LLM classification"
                }

        except Exception as e:
            logger.error(f"LLM intent classification failed: {e}")
            # Fallback to ambiguous
            return {
                "intent_type": IntentType.AMBIGUOUS.name,
                "confidence": 0.3,
                "reasoning": f"Error during LLM classification: {str(e)}"
            }