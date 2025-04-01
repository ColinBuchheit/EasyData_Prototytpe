import re
import hashlib
import secrets
import logging
from typing import Dict, Any, List, Union, Optional, Tuple, Set
import json

# Configure logging
logger = logging.getLogger("ai-agent-security")

class InputSanitizer:
    """Utility for sanitizing inputs to prevent injection attacks"""
    
    @staticmethod
    def sanitize_sql(input_str: str) -> str:
        """
        Sanitize input for SQL query usage
        This is a basic implementation - in production, use parameterized queries instead
        """
        if not isinstance(input_str, str):
            return str(input_str)
        
        # Remove potentially dangerous patterns
        sanitized = re.sub(r"['\"\\;]", "", input_str)  # Remove quotes and semicolons
        sanitized = re.sub(r"--", "", sanitized)  # Remove SQL comments
        sanitized = re.sub(r"/\*.*?\*/", "", sanitized, flags=re.DOTALL)  # Remove multi-line comments
        
        return sanitized
    
    @staticmethod
    def sanitize_html(input_str: str) -> str:
        """Sanitize input for HTML usage to prevent XSS"""
        if not isinstance(input_str, str):
            return str(input_str)
        
        # Replace HTML special characters with their entities
        replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#x27;",
            "/": "&#x2F;",
        }
        
        for char, replacement in replacements.items():
            input_str = input_str.replace(char, replacement)
        
        return input_str
    
    @staticmethod
    def sanitize_filename(input_str: str) -> str:
        """Sanitize input for use in filenames"""
        if not isinstance(input_str, str):
            return str(input_str)
        
        # Replace potentially dangerous characters
        sanitized = re.sub(r'[\\/*?:"<>|]', "_", input_str)
        
        # Prevent directory traversal attacks
        sanitized = sanitized.replace("..", "_")
        
        # Limit length
        if len(sanitized) > 255:
            sanitized = sanitized[:255]
        
        return sanitized
    
    @staticmethod
    def sanitize_json_input(input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize an entire JSON input object"""
        if not isinstance(input_data, dict):
            return {}
        
        result = {}
        
        for key, value in input_data.items():
            # Sanitize the key
            clean_key = InputSanitizer.sanitize_general(key)
            
            # Recursively sanitize the value based on its type
            if isinstance(value, dict):
                clean_value = InputSanitizer.sanitize_json_input(value)
            elif isinstance(value, list):
                clean_value = [
                    InputSanitizer.sanitize_json_input(item) if isinstance(item, dict)
                    else InputSanitizer.sanitize_general(item)
                    for item in value
                ]
            elif isinstance(value, str):
                clean_value = InputSanitizer.sanitize_general(value)
            else:
                # Numbers, booleans, etc. don't need sanitization
                clean_value = value
            
            result[clean_key] = clean_value
        
        return result
    
    @staticmethod
    def sanitize_general(input_str: Union[str, Any]) -> str:
        """General-purpose input sanitization"""
        if not isinstance(input_str, str):
            return str(input_str)
        
        # Limit length
        if len(input_str) > 10000:  # Reasonable limit for general inputs
            input_str = input_str[:10000]
        
        # Remove control characters
        sanitized = re.sub(r'[\x00-\x1F\x7F]', "", input_str)
        
        return sanitized


class QueryValidator:
    """Validator for database queries to detect and prevent injection attacks"""
    
    # SQL keywords that can modify data or schema
    DANGEROUS_SQL_KEYWORDS = {
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", 
        "CREATE", "GRANT", "REVOKE", "MERGE", "UPSERT", "EXECUTE"
    }
    
    # SQL comment markers
    SQL_COMMENT_MARKERS = {"--", "/*", "#"}
    
    @staticmethod
    def validate_select_query(query: str) -> Tuple[bool, Optional[str]]:
        """
        Validate that a query is a safe SELECT statement
        Returns (is_valid, error_message)
        """
        if not isinstance(query, str):
            return False, "Query must be a string"
        
        # Normalize query
        normalized_query = query.strip().upper()
        
        # Check for SQL comments that might be used to hide malicious code
        for comment_marker in QueryValidator.SQL_COMMENT_MARKERS:
            if comment_marker in query:
                return False, f"Query contains comment marker: {comment_marker}"
        
        # Check if query starts with SELECT
        if not normalized_query.startswith("SELECT"):
            return False, "Query must start with SELECT"
        
        # Check for dangerous operations
        for keyword in QueryValidator.DANGEROUS_SQL_KEYWORDS:
            # Look for the keyword followed by a space or special character
            pattern = r'\b' + keyword + r'\b'
            if re.search(pattern, normalized_query):
                return False, f"Query contains dangerous operation: {keyword}"
        
        # Check for multiple statements (;)
        if ";" in normalized_query[:-1]:  # Allow semicolon at the end
            return False, "Multiple SQL statements are not allowed"
        
        return True, None
    
    @staticmethod
    def validate_nosql_query(query: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate a NoSQL query (like MongoDB) for safety
        Returns (is_valid, error_message)
        """
        if not isinstance(query, dict):
            return False, "NoSQL query must be a dictionary"
        
        # Check for JavaScript execution (MongoDB-specific)
        json_str = json.dumps(query)
        if "$where" in json_str:
            return False, "JavaScript execution in queries is not allowed ($where)"
        
        if "$expr" in json_str and ("$function" in json_str or "function" in json_str):
            return False, "JavaScript function execution in queries is not allowed"
        
        # Check for potential injection in field names or values
        def check_for_injection(obj):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if isinstance(key, str):
                        if key.startswith("$") and key not in {
                            "$eq", "$gt", "$gte", "$in", "$lt", "$lte", "$ne", "$nin",
                            "$and", "$not", "$nor", "$or",
                            "$exists", "$type",
                            "$all", "$elemMatch", "$size",
                            "$mod", "$regex", "$text",
                            "$expr", "$jsonSchema",
                            "$max", "$min", "$avg", "$sum",
                            "$skip", "$limit", "$project", "$match",
                            "$group", "$sort", "$count", "$lookup"
                        }:
                            return False, f"Potentially unsafe operator: {key}"
                    
                    result = check_for_injection(value)
                    if not result[0]:
                        return result
            
            elif isinstance(obj, list):
                for item in obj:
                    result = check_for_injection(item)
                    if not result[0]:
                        return result
            
            return True, None
        
        return check_for_injection(query)
    
    @staticmethod
    def get_tables_from_query(query: str) -> Set[str]:
        """Extract table names from a SQL query"""
        tables = set()
        
        # Normalize query
        query = query.strip()
        
        # Look for table names after FROM clause
        from_match = re.search(r'FROM\s+([A-Za-z0-9_]+)', query, re.IGNORECASE)
        if from_match:
            tables.add(from_match.group(1))
        
        # Look for table names after JOIN clause
        join_matches = re.finditer(r'JOIN\s+([A-Za-z0-9_]+)', query, re.IGNORECASE)
        for match in join_matches:
            tables.add(match.group(1))
        
        return tables


class APIRateLimiter:
    """Rate limiter to prevent abuse of AI API services"""
    
    # In-memory store for rate limits
    _rate_limits: Dict[str, Dict[str, Any]] = {}
    
    @staticmethod
    def check_rate_limit(
        user_id: str,
        api_name: str,
        limit: int,
        window_seconds: int = 60
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if a request should be rate limited
        Returns (allowed, limit_info)
        """
        import time
        
        current_time = time.time()
        key = f"{user_id}:{api_name}"
        
        # Initialize or get rate limit info
        if key not in APIRateLimiter._rate_limits:
            APIRateLimiter._rate_limits[key] = {
                "count": 0,
                "reset_time": current_time + window_seconds,
                "window_seconds": window_seconds,
                "limit": limit
            }
        
        limit_info = APIRateLimiter._rate_limits[key]
        
        # Reset counter if window has expired
        if current_time > limit_info["reset_time"]:
            limit_info["count"] = 0
            limit_info["reset_time"] = current_time + window_seconds
        
        # Check if limit is exceeded
        if limit_info["count"] >= limit:
            logger.warning(f"Rate limit exceeded for {user_id} on {api_name}")
            
            # Add remaining time to info
            limit_info["remaining_seconds"] = max(0, limit_info["reset_time"] - current_time)
            limit_info["allowed"] = False
            
            return False, limit_info
        
        # Increment counter
        limit_info["count"] += 1
        limit_info["allowed"] = True
        limit_info["remaining"] = limit - limit_info["count"]
        limit_info["remaining_seconds"] = max(0, limit_info["reset_time"] - current_time)
        
        return True, limit_info
    
    @staticmethod
    def reset_rate_limit(user_id: str, api_name: str) -> None:
        """Reset rate limit for a user and API"""
        key = f"{user_id}:{api_name}"
        if key in APIRateLimiter._rate_limits:
            del APIRateLimiter._rate_limits[key]


class SecurityAuditor:
    """Security auditing system for tracking security-related events"""
    
    # In-memory list of security events
    _security_events: List[Dict[str, Any]] = []
    
    @staticmethod
    def log_security_event(
        event_type: str,
        severity: str,
        user_id: Optional[str] = None,
        source_ip: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a security event"""
        import time
        
        event = {
            "event_type": event_type,
            "severity": severity,
            "timestamp": time.time(),
            "user_id": user_id,
            "source_ip": source_ip,
            "details": details or {}
        }
        
        # Add to in-memory log
        SecurityAuditor._security_events.append(event)
        
        # Log event
        log_message = f"Security Event: [{severity}] {event_type}"
        if user_id:
            log_message += f" (User: {user_id})"
        if source_ip:
            log_message += f" from {source_ip}"
        
        if severity.upper() == "HIGH" or severity.upper() == "CRITICAL":
            logger.critical(log_message)
        elif severity.upper() == "MEDIUM":
            logger.error(log_message)
        else:
            logger.warning(log_message)
        
        # TODO: In production, send to security monitoring system or database
    
    @staticmethod
    def get_security_events(
        severity: Optional[str] = None,
        event_type: Optional[str] = None,
        user_id: Optional[str] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Get security events filtered by criteria"""
        filtered_events = SecurityAuditor._security_events
        
        if severity:
            filtered_events = [e for e in filtered_events if e["severity"].upper() == severity.upper()]
        
        if event_type:
            filtered_events = [e for e in filtered_events if e["event_type"] == event_type]
        
        if user_id:
            filtered_events = [e for e in filtered_events if e["user_id"] == user_id]
        
        if start_time:
            filtered_events = [e for e in filtered_events if e["timestamp"] >= start_time]
        
        if end_time:
            filtered_events = [e for e in filtered_events if e["timestamp"] <= end_time]
        
        return filtered_events
    
    @staticmethod
    def export_security_events() -> Dict[str, Any]:
        """Export all security events for analysis"""
        return {
            "events": SecurityAuditor._security_events,
            "count": len(SecurityAuditor._security_events),
            "generated_at": time.time()
        }
    
    @staticmethod
    def clear_events() -> None:
        """Clear all security events (for testing)"""
        SecurityAuditor._security_events = []


class SecurityScanner:
    """Vulnerability scanner for agent-generated content"""
    
    @staticmethod
    def scan_code_for_vulnerabilities(
        code: str, 
        language: str
    ) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Scan code for common security vulnerabilities
        Returns (is_safe, issues)
        """
        issues = []
        
        # Convert language to lowercase for case-insensitive matching
        language = language.lower()
        
        # Language-specific vulnerability patterns
        if language in ["python", "py"]:
            # Check for potentially dangerous Python imports
            dangerous_imports = [
                "os.system", "subprocess", "eval", "exec", 
                "__import__", "pickle.loads", "marshal.loads"
            ]
            
            for imp in dangerous_imports:
                if re.search(r'\b' + re.escape(imp) + r'\b', code):
                    issues.append({
                        "severity": "high",
                        "type": "dangerous_function",
                        "description": f"Use of potentially dangerous function: {imp}",
                        "line": None  # Would need to parse code to get line number
                    })
            
            # Check for SQL injection vulnerabilities
            if re.search(r'execute\s*\(\s*[f"]', code) or re.search(r'executemany\s*\(\s*[f"]', code):
                issues.append({
                    "severity": "high",
                    "type": "sql_injection",
                    "description": "Potential SQL injection vulnerability: string formatting in execute statement",
                    "line": None
                })
        
        elif language in ["javascript", "js", "typescript", "ts"]:
            # Check for potentially dangerous JS functions
            dangerous_js = [
                "eval", "Function", "setTimeout\\(\\s*['\"]", "setInterval\\(\\s*['\"]",
                "document\\.write", "\\.innerHTML\\s*=", "\\$\\(", "require\\(['\"]child_process['\"]\\)"
            ]
            
            for func in dangerous_js:
                if re.search(r'\b' + func + r'\b', code):
                    issues.append({
                        "severity": "medium",
                        "type": "dangerous_function",
                        "description": f"Use of potentially dangerous function matching pattern: {func}",
                        "line": None
                    })
        
        # Check for potential secret leakage in any language
        secret_patterns = [
            r'(?i)api[_-]?key\s*=\s*["\'][a-zA-Z0-9_]{16,}["\']',
            r'(?i)password\s*=\s*["\'][^"\']{4,}["\']', 
            r'(?i)secret\s*=\s*["\'][^"\']{4,}["\']',
            r'(?i)token\s*=\s*["\'][a-zA-Z0-9_.-]{16,}["\']',
            r'(?i)BEGIN\s+(?:RSA|DSA|EC|OPENSSH)\s+PRIVATE\s+KEY'
        ]
        
        for pattern in secret_patterns:
            if re.search(pattern, code):
                issues.append({
                    "severity": "critical",
                    "type": "secret_exposure",
                    "description": "Potential exposure of secrets or credentials",
                    "line": None
                })
        
        # Review for any URL or IP hardcoding
        url_patterns = [
            r'https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}'
        ]
        
        for pattern in url_patterns:
            for match in re.finditer(pattern, code):
                # Skip localhost or common testing domains
                if match.group().startswith("http://localhost") or \
                   match.group().startswith("127.0.0.1") or \
                   "example.com" in match.group():
                    continue
                    
                issues.append({
                    "severity": "low",
                    "type": "hardcoded_endpoint",
                    "description": f"Hardcoded URL or IP: {match.group()}",
                    "line": None
                })
        
        # Return results
        is_safe = len(issues) == 0
        return is_safe, issues
    
    @staticmethod
    def scan_query_for_vulnerabilities(
        query: str,
        db_type: str
    ) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Scan a database query for vulnerabilities
        Returns (is_safe, issues)
        """
        issues = []
        
        # Normalize database type
        db_type = db_type.lower()
        
        # SQL database types
        sql_db_types = ["mysql", "postgres", "postgresql", "sqlite", "mssql", "oracle"]
        
        if db_type in sql_db_types:
            # Check if it's a SELECT query
            is_valid, error = QueryValidator.validate_select_query(query)
            if not is_valid:
                issues.append({
                    "severity": "high",
                    "type": "dangerous_query",
                    "description": error,
                    "query": query
                })
            
            # Check for potential SQL injection patterns
            injection_patterns = [
                r"--", r"/\*", r"#",  # Comment markers
                r";\s*\w",  # Multiple statements
                r"UNION\s+ALL\s+SELECT",  # UNION injection
                r"OR\s+[\"']?\d+[\"']?\s*=\s*[\"']?\d+[\"']?"  # OR 1=1 type injection
            ]
            
            for pattern in injection_patterns:
                if re.search(pattern, query, re.IGNORECASE):
                    issues.append({
                        "severity": "high",
                        "type": "sql_injection",
                        "description": f"Potential SQL injection pattern: {pattern}",
                        "query": query
                    })
        
        # NoSQL database types
        elif db_type in ["mongodb", "dynamodb", "firestore", "couchdb"]:
            # For NoSQL, check for JavaScript injection if it's a string
            if isinstance(query, str) and ("$where" in query or "function" in query or "eval" in query):
                issues.append({
                    "severity": "high",
                    "type": "nosql_injection",
                    "description": "Potential NoSQL injection with JavaScript execution",
                    "query": query
                })
            
            # If query is a dict (MongoDB-style), validate it
            elif isinstance(query, dict):
                is_valid, error = QueryValidator.validate_nosql_query(query)
                if not is_valid:
                    issues.append({
                        "severity": "high",
                        "type": "nosql_injection",
                        "description": error,
                        "query": str(query)
                    })
        
        # Return results
        is_safe = len(issues) == 0
        return is_safe, issues
    
    @staticmethod
    def scan_generated_content(
        content: str,
        content_type: str
    ) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Scan generated content for safety issues
        Returns (is_safe, issues)
        """
        issues = []
        
        # Check for possible XSS in HTML content
        if content_type.lower() in ["html", "markdown", "md"]:
            xss_patterns = [
                r"<script", r"javascript:", r"onerror=", r"onload=",
                r"onclick=", r"onmouseover=", r"eval\(", r"document\.cookie"
            ]
            
            for pattern in xss_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    issues.append({
                        "severity": "high",
                        "type": "xss",
                        "description": f"Potential Cross-Site Scripting (XSS) pattern: {pattern}",
                        "content_preview": content[:100] + "..." if len(content) > 100 else content
                    })
        
        # Check for potential personal/sensitive information disclosure
        pii_patterns = [
            r"\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b",  # SSN
            r"\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b",  # Credit card
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"  # Email
        ]
        
        for pattern in pii_patterns:
            if re.search(pattern, content):
                issues.append({
                    "severity": "high",
                    "type": "pii_disclosure",
                    "description": "Potential exposure of personal identifiable information (PII)",
                    "content_preview": "..." # Don't include the PII in the issue
                })
        
        # Return results
        is_safe = len(issues) == 0
        return is_safe, issues


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Example of SQL sanitization
    sql_input = "users'; DROP TABLE users; --"
    safe_sql = InputSanitizer.sanitize_sql(sql_input)
    print(f"Original SQL: {sql_input}")
    print(f"Sanitized SQL: {safe_sql}")
    
    # Example of HTML sanitization
    html_input = "<script>alert('XSS');</script>"
    safe_html = InputSanitizer.sanitize_html(html_input)
    print(f"Original HTML: {html_input}")
    print(f"Sanitized HTML: {safe_html}")
    
    # Example of query validation
    query = "SELECT * FROM users WHERE username = 'admin'; DROP TABLE users; --"
    is_valid, error = QueryValidator.validate_select_query(query)
    print(f"Query validation: {'Valid' if is_valid else 'Invalid'}")
    if not is_valid:
        print(f"Error: {error}")
    
    # Example of rate limiting
    allowed, info = APIRateLimiter.check_rate_limit("user123", "openai", 5, 60)
    print(f"Rate limit check: {'Allowed' if allowed else 'Blocked'}")
    print(f"Limit info: {info}")
    
    # Example of security event logging
    SecurityAuditor.log_security_event(
        "failed_login",
        "medium",
        "user123",
        "192.168.1.1",
        {"attempt": 3, "reason": "Invalid password"}
    )
    
    events = SecurityAuditor.get_security_events(severity="medium")
    print(f"Security events: {len(events)}")
    
    # Example of code scanning
    code = """
    import os
    
    def dangerous_function(user_input):
        # This is unsafe!
        os.system(f"echo {user_input}")
        
        # This is also unsafe
        with open(f"/tmp/{user_input}.txt", "w") as f:
            f.write("Hello")
    """
    
    is_safe, issues = SecurityScanner.scan_code_for_vulnerabilities(code, "python")
    print(f"Code scan: {'Safe' if is_safe else 'Unsafe'}")
    for issue in issues:
        print(f"Issue: {issue['severity']} - {issue['description']}")