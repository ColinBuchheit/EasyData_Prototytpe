# agents/schema_agent.py

from agents.base_agent import BaseAgent
from db_adapters.base_db_adapters import UserDatabase, BaseDBAdapter
from typing import Dict, Any, List
import openai
import json

from utils.settings import OPENAI_API_KEY, SCHEMA_ANALYSIS_MODEL
from utils.logger import logger
from utils.error_handling import handle_agent_error, ErrorSeverity, create_database_error, create_ai_service_error
from utils.backend_bridge import fetch_schema_for_user_db

class SchemaAgent(BaseAgent):
    """
    Enhanced SchemaAgent that:
    1. Fetches and formats table + column metadata from the backend (not direct DB connection)
    2. Analyzes schema to understand database content and purpose
    3. Helps select the most appropriate database for a given query
    4. Detects general conversation vs actual database queries
    """

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # Check which operation to perform
        operation = input_data.get("operation", "fetch_schema")
        
        # Check if this is a general conversation query before doing any operation
        task = input_data.get("task", "")
        if self._is_general_conversation(task):
            return {
                "success": True,
                "is_general_conversation": True,
                "message": "This appears to be a general conversation message, not a database query."
            }
        
        if operation == "analyze_schema":
            return self._analyze_schema(input_data)
        elif operation == "match_database":
            return self._match_database_for_query(input_data)
        else:
            # Default to schema fetching functionality
            return self._fetch_schema(input_data)

    def _fetch_schema(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            # Get necessary info to fetch schema from backend
            user_id = input_data.get("user_id", "")
            db_info = input_data.get("db_info", {})
            
            if not user_id or not db_info:
                logger.warning("⚠️ Missing user_id or db_info for schema fetch")
                return handle_agent_error(
                    self.name(),
                    ValueError("Missing required parameters: user_id or db_info"),
                    ErrorSeverity.MEDIUM
                )
            
            logger.info(f"🔍 SchemaAgent fetching schema from backend for user {user_id}")
            
            # Use backend bridge to fetch schema instead of direct DB connection
            schema_response = fetch_schema_for_user_db(db_info, user_id)
            
            if not schema_response.get("success", False):
                error_msg = schema_response.get("error", "Unknown error fetching schema")
                logger.warning(f"⚠️ Failed to fetch schema from backend: {error_msg}")
                return handle_agent_error(
                    self.name(),
                    ValueError(f"Failed to fetch schema: {error_msg}"),
                    ErrorSeverity.MEDIUM
                )
            
            # Extract schema from response
            schema = schema_response.get("schema", {})
            
            # If schema is empty, return error
            if not schema or not schema.get("tables", []):
                logger.warning("⚠️ No tables found in schema from backend")
                return handle_agent_error(
                    self.name(),
                    ValueError("No tables found in database schema."),
                    ErrorSeverity.MEDIUM
                )
            
            logger.info(f"✅ SchemaAgent completed. Tables: {schema.get('tables', [])}")
            
            # Return the schema
            return {
                "success": True,
                "schema": schema
            }

        except Exception as e:
            logger.exception("❌ SchemaAgent encountered a fatal error.")
            return handle_agent_error(self.name(), e, ErrorSeverity.HIGH)

    def _analyze_schema(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            db_id = input_data.get("dbId")
            db_type = input_data.get("dbType")
            db_name = input_data.get("dbName")
            schema_details = input_data.get("schemaDetails", [])
            
            if not all([db_id, db_type, schema_details]):
                logger.warning("❌ Schema analysis missing required inputs")
                return handle_agent_error(
                    self.name(),
                    ValueError("Missing required schema information"),
                    ErrorSeverity.MEDIUM
                )

            logger.info(f"🔍 Analyzing schema for database {db_name} (ID: {db_id})")
            
            # Format schema for cleaner prompt
            formatted_schema = self._format_schema_for_prompt(schema_details)
            
            # Generate prompt for schema analysis
            prompt = self._build_analysis_prompt(db_type, db_name, formatted_schema)
            
            try:
                # Call API for analysis
                response = openai.ChatCompletion.create(
                    model=SCHEMA_ANALYSIS_MODEL,
                    messages=[
                        {"role": "system", "content": "You are a database expert that analyzes database schemas to identify their content, domain, and purpose."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3
                )
                
                # Parse response
                try:
                    analysis = json.loads(response.choices[0].message.content)
                    
                    required_keys = ["tables", "domainType", "contentDescription", "dataCategory"]
                    if not all(key in analysis for key in required_keys):
                        raise ValueError("Missing required keys in schema analysis")
                    
                    logger.info(f"✅ Schema analysis complete for {db_name}. Domain: {analysis['domainType']}")
                    return {
                        "success": True,
                        **analysis
                    }
                    
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"❌ Failed to parse schema analysis: {str(e)}")
                    return handle_agent_error(
                        self.name(),
                        e,
                        ErrorSeverity.MEDIUM,
                        suggestions=["Check API response format", "Verify schema format"]
                    )
            except openai.error.OpenAIError as e:
                return create_ai_service_error(
                    message=f"OpenAI API error during schema analysis: {str(e)}",
                    service="openai",
                    model=SCHEMA_ANALYSIS_MODEL,
                    source=self.name(),
                    severity=ErrorSeverity.HIGH,
                    original_error=e
                ).to_dict()
            
        except Exception as e:
            logger.exception(f"❌ Schema analysis failed: {str(e)}")
            return handle_agent_error(self.name(), e, ErrorSeverity.HIGH)

    def _match_database_for_query(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            user_id = input_data.get("userId")
            query = input_data.get("query", "")
            databases = input_data.get("databases", [])
            
            if not query or not databases:
                logger.warning("❌ Database matching missing query or databases")
                return handle_agent_error(
                    self.name(),
                    ValueError("Missing query or database information"),
                    ErrorSeverity.MEDIUM
                )

            logger.info(f"🔍 Matching query to database for user {user_id}")
            
            # Generate prompt for database matching
            prompt = self._build_matching_prompt(query, databases)
            
            try:
                # Call API for analysis
                response = openai.ChatCompletion.create(
                    model=SCHEMA_ANALYSIS_MODEL, # Can reuse the same model
                    messages=[
                        {"role": "system", "content": "You are an expert at determining which database contains information relevant to a user's query."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.2
                )
                
                # Parse response
                try:
                    result = json.loads(response.choices[0].message.content)
                    
                    if "selectedDbId" not in result:
                        raise ValueError("Missing required selectedDbId in response")
                    
                    # Validate that selected DB is one of the available DBs
                    selected_db_id = result["selectedDbId"]
                    db_ids = [db["dbId"] for db in databases]
                    
                    if selected_db_id not in db_ids:
                        raise ValueError(f"Selected DB ID {selected_db_id} not in available database IDs: {db_ids}")
                    
                    logger.info(f"✅ Selected database {selected_db_id} for query")
                    
                    return {
                        "success": True,
                        "selectedDbId": selected_db_id,
                        "confidence": result.get("confidence", 0.0),
                        "reasoning": result.get("reasoning", "")
                    }
                    
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"❌ Failed to parse database matching result: {str(e)}")
                    return handle_agent_error(
                        self.name(), 
                        e, 
                        ErrorSeverity.MEDIUM,
                        suggestions=["Check API response format", "Verify database IDs"]
                    )
            
            except openai.error.OpenAIError as e:
                return create_ai_service_error(
                    message=f"OpenAI API error during database matching: {str(e)}",
                    service="openai",
                    model=SCHEMA_ANALYSIS_MODEL,
                    source=self.name(),
                    severity=ErrorSeverity.HIGH,
                    original_error=e
                ).to_dict()
            
        except Exception as e:
            logger.exception(f"❌ Database matching failed: {str(e)}")
            return handle_agent_error(self.name(), e, ErrorSeverity.HIGH)

    def _parse_columns(self, raw: Any, db_type: str) -> List[Dict[str, str]]:
        # Your existing code...
        parsed = []

        if not raw:
            return []

        try:
            if isinstance(raw, list) and isinstance(raw[0], (tuple, list)):
                # SQL-like
                for col in raw:
                    name, dtype = col[0], col[1]
                    parsed.append({"name": name, "type": dtype})

            elif db_type == "sqlite":
                # PRAGMA table_info format
                for col in raw:
                    parsed.append({"name": col[1], "type": col[2]})

            elif isinstance(raw[0], dict):
                # NoSQL / JSON-based schema
                for col in raw:
                    parsed.append({
                        "name": col.get("column_name") or col.get("name"),
                        "type": col.get("data_type") or "unknown"
                    })

            else:
                parsed = [{"name": str(c), "type": "unknown"} for c in raw]

        except Exception as e:
            logger.warning(f"⚠️ Failed to parse columns: {e}")
            parsed = [{"name": "unknown", "type": "unknown"}]

        return parsed

    def _format_schema_for_prompt(self, schema_details: list) -> str:
        """Format schema details into a readable text for the LLM prompt"""
        result = []
        
        for table_info in schema_details:
            table_name = table_info["table"]
            result.append(f"Table: {table_name}")
            
            for column in table_info["columns"]:
                col_name = column["column_name"] if "column_name" in column else column.get("name", "unknown")
                col_type = column["data_type"] if "data_type" in column else column.get("type", "unknown")
                result.append(f"  - {col_name} ({col_type})")
            
            result.append("")  # Empty line between tables
        
        return "\n".join(result)
    
    def _build_analysis_prompt(self, db_type: str, db_name: str, schema: str) -> str:
        return f"""
Analyze this {db_type} database schema for "{db_name}" and provide insights about its content, domain, and purpose.

DATABASE SCHEMA:
{schema}

Provide a comprehensive analysis in this exact JSON format:
{{
  "tables": [
    {{
      "name": "table_name",
      "purpose": "Brief description of what this table stores and its purpose",
      "fields": [
        {{
          "name": "column_name",
          "type": "data_type",
          "description": "What this field represents"
        }}
      ],
      "exampleQueries": [
        "Example of a natural language query someone might ask about this table"
      ]
    }}
  ],
  "domainType": "One of: Business, E-commerce, Healthcare, Finance, Education, Social, Analytics, Other",
  "contentDescription": "Brief description of what kind of data this database contains",
  "dataCategory": ["List", "of", "categories", "this", "database", "covers"]
}}
"""

    def _build_matching_prompt(self, query: str, databases: List[Dict]) -> str:
        # Format database information for the prompt
        db_descriptions = []
        
        for i, db in enumerate(databases):
            tables_info = []
            for table in db.get("tables", []):
                tables_info.append(f"  - {table['name']}: {table['purpose']}")
            
            tables_str = "\n".join(tables_info)
            
            db_descriptions.append(f"""
Database #{i+1}: {db.get('dbName', 'Unknown')} (ID: {db['dbId']})
Type: {db.get('dbType', 'Unknown')}
Domain: {db.get('domainType', 'Unknown')}
Content: {db.get('contentDescription', 'Unknown')}
Categories: {', '.join(db.get('dataCategory', []))}
Tables:
{tables_str}
""")
        
        db_info = "\n".join(db_descriptions)
        
        return f"""
USER QUERY:
"{query}"

AVAILABLE DATABASES:
{db_info}

Based on the user's query and the available databases, determine which database is most likely to contain the information needed to answer the query.

Return your analysis as a JSON object with exactly this structure:
{{
  "selectedDbId": 123,
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this database was selected"
}}

The selectedDbId must be one of the database IDs listed above. The confidence should be between 0 and 1.
"""

    def _is_general_conversation(self, task: str) -> bool:
        """Detect if this is a general conversation rather than a database query"""
        if not task:
            return False
            
        task = task.lower().strip()
        
        # Common conversation starters
        greetings = ["hi", "hello", "hey", "greetings", "howdy", "what's up", "hi there"]
        general_questions = [
            "what can you do", 
            "how does this work", 
            "who are you",
            "what are you",
            "help me",
            "what is this"
        ]
        
        # Check for exact matches with greetings
        if task in greetings:
            return True
            
        # Check for general questions
        for question in general_questions:
            if question in task:
                return True
                
        # If task is very short (less than 4 words) and doesn't contain 
        # database terms, likely conversation
        if len(task.split()) < 4:
            db_terms = ["select", "query", "database", "table", "data", "show", "find", "get", "list"]
            has_db_term = any(term in task for term in db_terms)
            
            if not has_db_term:
                return True
            
        return False