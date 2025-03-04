from crewai import Agent
import re
import logging
from models.llm_integration import LLMIntegration

# Secure Logging Setup
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

class ValidationSecurityAgent(Agent):
    """Validates AI-generated SQL queries and prevents security risks."""

    def __init__(self):
        """Initialize the agent with enhanced security validation rules."""
        self.name = "Validation & Security Agent"
        self.role = "SQL Validator & Security Enforcer"
        self.description = "Ensures AI-generated SQL queries are valid, secure, and match the database schema."
        self.max_query_length = 1000  # ✅ Limit max query size (prevent denial-of-service)
        self.max_nested_levels = 3  # ✅ Restrict nested subqueries
        self.llm = LLMIntegration()  # ✅ AI-Based Validation for Complex Cases

        # ✅ Compile Regex Patterns for SQL Injection Prevention
        self.sql_injection_patterns = [
            re.compile(r"--|\#|\/\*"),  # Inline comments
            re.compile(r"\bUNION\b\s+SELECT\s", re.IGNORECASE),  # UNION-based injection
            re.compile(r"\bSLEEP\(\d+\)\b", re.IGNORECASE),  # Time-based injection
            re.compile(r"\bWAITFOR\s+DELAY\b", re.IGNORECASE),  # Time-delay attack
            re.compile(r"\bOR\s+1=1\b", re.IGNORECASE),  # Boolean-based injection
            re.compile(r"\b;--\b|\b;\s*DROP\s+TABLE\b", re.IGNORECASE),  # Command chaining
        ]

    def validate_sql(self, sql_query: str, schema: dict) -> bool:
        """
        Validates an AI-generated SQL query to ensure correctness and security.

        Args:
            sql_query (str): The SQL query generated by the AI.
            schema (dict): Database schema metadata.

        Returns:
            bool: True if the query is valid, False otherwise.
        """

        logger.info(f"🔍 Validating SQL Query:\n{sql_query}")

        # ✅ 1. Enforce SELECT-Only Queries
        if not sql_query.strip().upper().startswith("SELECT"):
            self.log_security_incident(sql_query, "Only SELECT statements are allowed.")
            return False

        # ✅ 2. Prevent Dangerous SQL Commands
        blocked_keywords = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "TRUNCATE", "EXEC"]
        for keyword in blocked_keywords:
            if re.search(rf"\b{keyword}\b", sql_query, re.IGNORECASE):
                self.log_security_incident(sql_query, f"Contains forbidden keyword '{keyword}'")
                return False

        # ✅ 3. Detect SQL Injection Patterns
        for pattern in self.sql_injection_patterns:
            if pattern.search(sql_query):
                self.log_security_incident(sql_query, "SQL Injection pattern detected.")
                return False

        # ✅ 4. Enforce Query Length Limits (Prevent DOS Attacks)
        if len(sql_query) > self.max_query_length:
            self.log_security_incident(sql_query, f"Exceeds max length of {self.max_query_length} characters.")
            return False

        # ✅ 5. Restrict Nested Subqueries
        nested_subqueries = sql_query.upper().count("(SELECT")
        if nested_subqueries > self.max_nested_levels:
            self.log_security_incident(sql_query, f"Exceeds max nested subqueries ({self.max_nested_levels}).")
            return False

        # ✅ 6. Ensure Table Names Exist in Schema
        tables_in_schema = {table.lower() for table in schema.keys()}
        used_tables = set(re.findall(r"FROM\s+(\w+)", sql_query, re.IGNORECASE))

        for table in used_tables:
            if table.lower() not in tables_in_schema:
                self.log_security_incident(sql_query, f"Table '{table}' does not exist in the schema.")
                return False

        # ✅ 7. Ensure Column Names Exist in Schema
        column_check_passed = self.validate_columns(sql_query, schema)
        if not column_check_passed:
            return False

        # ✅ 8. Use AI-Based Validation for Edge Cases
        if not self.llm.validate_sql(sql_query):
            self.log_security_incident(sql_query, "AI validation rejected the query.")
            return False

        logger.info("✅ Query validation passed!")
        return True

    def validate_columns(self, sql_query: str, schema: dict) -> bool:
        """
        Checks if all referenced columns exist in the schema.

        Args:
            sql_query (str): The SQL query to validate.
            schema (dict): The database schema metadata.

        Returns:
            bool: True if column names are valid, False otherwise.
        """
        for table, columns in schema.items():
            for column in re.findall(r"SELECT\s+(.*?)\s+FROM", sql_query, re.IGNORECASE):
                column_names = [col.strip().lower() for col in column.split(",")]
                for col in column_names:
                    if col != "*" and col not in columns:
                        self.log_security_incident(sql_query, f"Column '{col}' not found in table '{table}'.")
                        return False
        return True

    def log_security_incident(self, sql_query: str, reason: str):
        """
        Logs a security incident when a query is rejected.

        Args:
            sql_query (str): The rejected SQL query.
            reason (str): The reason for rejection.
        """
        with open("logs/security.log", "a") as log_file:
            log_file.write(f"\n🚨 SECURITY ALERT: {reason}\nQuery: {sql_query}\n---\n")

        logger.warning(f"❌ Query rejected: {reason}")
