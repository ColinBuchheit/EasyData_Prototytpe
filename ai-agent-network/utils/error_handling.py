import time
import logging
import traceback
from typing import Dict, Any, Optional, List, Union, Callable, TypeVar

# Configure logger
logger = logging.getLogger("ai-agent-error")

# Type variables
T = TypeVar('T')

class ErrorSeverity:
    """Enumeration for error severity levels"""
    CRITICAL = "CRITICAL"    # System cannot continue, requires immediate attention
    HIGH = "HIGH"            # Major functionality impacted, requires urgent attention
    MEDIUM = "MEDIUM"        # Functionality impacted but system can continue
    LOW = "LOW"              # Minor issue, system can continue with minimal impact
    INFO = "INFO"            # Informational message, not an error


class ErrorCategory:
    """Enumeration for error categories"""
    DATABASE = "DATABASE"          # Database connection or query errors
    AUTHENTICATION = "AUTH"        # Authentication or permission errors
    VALIDATION = "VALIDATION"      # Input validation errors
    AI_SERVICE = "AI_SERVICE"      # AI service errors (OpenAI, Claude, etc.)
    AGENT = "AGENT"                # Agent-specific errors
    NETWORK = "NETWORK"            # Network communication errors
    SYSTEM = "SYSTEM"              # System-level errors
    SECURITY = "SECURITY"          # Security-related errors
    DATA = "DATA"                  # Data processing errors
    CONFIGURATION = "CONFIG"       # Configuration errors
    UNKNOWN = "UNKNOWN"            # Unclassified errors


class StandardizedError(Exception):
    """Standardized error object for consistent error handling across the agent network"""
    
    def __init__(
        self,
        message: str,
        category: str,
        severity: str = ErrorSeverity.MEDIUM,
        code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        source: Optional[str] = None,
        suggestions: Optional[List[str]] = None,
        original_error: Optional[Exception] = None
    ):
        super().__init__(message)
        self.message = message
        self.category = category
        self.severity = severity
        self.code = code or f"{category}_ERROR"
        self.details = details or {}
        self.source = source or "UNKNOWN"
        self.suggestions = suggestions or []
        self.timestamp = time.time()
        self.original_error = original_error
        
        # Auto-log the error based on severity
        self._log_error()
    
    def _log_error(self) -> None:
        """Log the error with appropriate level based on severity"""
        log_message = f"[{self.code}] {self.message}"
        
        if self.severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message, extra=self._get_log_extra())
        elif self.severity == ErrorSeverity.HIGH:
            logger.error(log_message, extra=self._get_log_extra())
        elif self.severity == ErrorSeverity.MEDIUM:
            logger.warning(log_message, extra=self._get_log_extra())
        elif self.severity == ErrorSeverity.LOW:
            logger.info(log_message, extra=self._get_log_extra())
        else:
            logger.debug(log_message, extra=self._get_log_extra())
    
    def _get_log_extra(self) -> Dict[str, Any]:
        """Get extra information for logging"""
        extra = {
            "error_code": self.code,
            "category": self.category,
            "severity": self.severity,
            "source": self.source,
        }
        
        # Add stack trace if original error is available
        if self.original_error:
            extra["stack_trace"] = "".join(traceback.format_exception(
                type(self.original_error),
                self.original_error,
                self.original_error.__traceback__
            ))
        
        return extra
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary format for API responses"""
        result = {
            "success": False,
            "error": {
                "message": self.message,
                "code": self.code,
                "category": self.category,
                "severity": self.severity,
                "source": self.source
            }
        }
        
        if self.details:
            result["error"]["details"] = self.details
        
        if self.suggestions:
            result["error"]["suggestions"] = self.suggestions
        
        return result
    
    def __str__(self) -> str:
        """String representation of the error"""
        return f"{self.code} ({self.severity}): {self.message}"


def retry_on_failure(func: Callable[[], T], retries: int = 3, delay: int = 2, agent_name: str = "") -> T:
    """
    Retry a function up to `retries` times with exponential backoff.
    Logs all failures. Returns the final exception if all retries fail.
    
    Args:
        func: Function to retry
        retries: Number of retry attempts
        delay: Base delay between retries (will be multiplied by attempt number)
        agent_name: Name of the agent for logging
        
    Returns:
        Result of the function if successful
        
    Raises:
        Exception: The last exception if all retries fail
    """
    for attempt in range(1, retries + 1):
        try:
            return func()
        except Exception as e:
            logging.warning(
                f"[{agent_name or 'system'}] Attempt {attempt}/{retries} failed: {e}"
            )
            if attempt < retries:
                time.sleep(delay * attempt)  # exponential backoff
            else:
                logging.error(f"[{agent_name}] All retries failed.")
                raise


def from_exception(
    exception: Exception,
    category: str = ErrorCategory.UNKNOWN,
    severity: str = ErrorSeverity.MEDIUM,
    source: Optional[str] = None,
    suggestions: Optional[List[str]] = None
) -> StandardizedError:
    """Create a StandardizedError from an exception"""
    # Extract exception details
    error_type = type(exception).__name__
    error_message = str(exception)
    
    # Auto-classify certain errors
    if isinstance(exception, (ConnectionError, TimeoutError)):
        category = ErrorCategory.NETWORK
        suggestions = suggestions or ["Check network connectivity", "Verify service endpoints are accessible"]
    
    elif isinstance(exception, (PermissionError, ValueError)):
        if "password" in error_message.lower() or "authentication" in error_message.lower():
            category = ErrorCategory.AUTHENTICATION
            suggestions = suggestions or ["Verify credentials", "Check permissions"]
        elif "invalid" in error_message.lower():
            category = ErrorCategory.VALIDATION
            suggestions = suggestions or ["Check input format", "Verify parameters"]
    
    # Create standardized error
    return StandardizedError(
        message=error_message,
        category=category,
        severity=severity,
        code=f"{category}_{error_type.upper()}",
        details={"exception_type": error_type},
        source=source,
        suggestions=suggestions,
        original_error=exception
    )


def handle_agent_error(
    agent_name: str,
    error: Union[Exception, StandardizedError],
    severity: Optional[str] = None,
    suggestions: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Handles errors from agents and returns a standardized response.
    
    Args:
        agent_name: Name of the agent
        error: Error that occurred
        severity: Optional severity override
        suggestions: Optional suggestions for resolving the error
        
    Returns:
        Standardized error response dictionary
    """
    # If already a StandardizedError, just update the source
    if isinstance(error, StandardizedError):
        error.source = agent_name
        if severity:
            error.severity = severity
        if suggestions:
            error.suggestions = suggestions
        return error.to_dict()
    
    # Otherwise, create a new StandardizedError from the exception
    standardized_error = from_exception(
        exception=error,
        category=ErrorCategory.AGENT,
        severity=severity or ErrorSeverity.MEDIUM,
        source=agent_name,
        suggestions=suggestions
    )
    
    return standardized_error.to_dict()


def try_safe(agent_name: str, func: Callable, *args, **kwargs) -> Dict[str, Any]:
    """
    Wraps agent logic to return either a successful result or a structured error.
    
    Args:
        agent_name: Name of the agent
        func: Function to execute
        *args: Arguments for the function
        **kwargs: Keyword arguments for the function
        
    Returns:
        Function result or error response
    """
    try:
        result = func(*args, **kwargs)
        if isinstance(result, dict) and not result.get("success", True):
            return handle_agent_error(agent_name, Exception(result.get("error", "Unknown error")))
        return result
    except Exception as e:
        return handle_agent_error(agent_name, e)


# Helper functions for creating specific error types

def create_validation_error(
    message: str,
    invalid_fields: Optional[List[str]] = None,
    source: Optional[str] = None,
    suggestions: Optional[List[str]] = None
) -> StandardizedError:
    """Helper to create validation errors"""
    details = {}
    if invalid_fields:
        details["invalid_fields"] = invalid_fields
    
    return StandardizedError(
        message=message,
        category=ErrorCategory.VALIDATION,
        severity=ErrorSeverity.MEDIUM,
        code="VALIDATION_ERROR",
        details=details,
        source=source,
        suggestions=suggestions
    )


def create_database_error(
    message: str,
    db_type: Optional[str] = None,
    query: Optional[str] = None,
    operation: Optional[str] = None,
    severity: str = ErrorSeverity.HIGH,
    source: Optional[str] = None,
    suggestions: Optional[List[str]] = None,
    original_error: Optional[Exception] = None
) -> StandardizedError:
    """Helper to create database-related errors"""
    details = {}
    if db_type:
        details["db_type"] = db_type
    if operation:
        details["operation"] = operation
    if query:
        # Truncate long queries for readability
        details["query"] = query[:500] + "..." if len(query) > 500 else query
    
    return StandardizedError(
        message=message,
        category=ErrorCategory.DATABASE,
        severity=severity,
        code=f"DB_{db_type.upper() if db_type else 'GENERAL'}_ERROR",
        details=details,
        source=source,
        suggestions=suggestions or [
            "Check database connection parameters",
            "Verify database server is running",
            "Check database credentials"
        ],
        original_error=original_error
    )


def create_ai_service_error(
    message: str,
    service: str,
    model: Optional[str] = None,
    severity: str = ErrorSeverity.HIGH,
    source: Optional[str] = None,
    suggestions: Optional[List[str]] = None,
    original_error: Optional[Exception] = None
) -> StandardizedError:
    """Helper to create AI service-related errors"""
    details = {"service": service}
    if model:
        details["model"] = model
    
    return StandardizedError(
        message=message,
        category=ErrorCategory.AI_SERVICE,
        severity=severity,
        code=f"AI_{service.upper()}_ERROR",
        details=details,
        source=source,
        suggestions=suggestions or [
            "Check API key and permissions",
            "Verify service availability",
            "Check for rate limiting issues"
        ],
        original_error=original_error
    )


def format_for_user(error: Union[StandardizedError, Dict[str, Any]]) -> str:
    """
    Format an error for user display in a more friendly way.
    Removes technical details but provides helpful suggestions.
    """
    if isinstance(error, StandardizedError):
        error_dict = error.to_dict()
    else:
        error_dict = error
    
    error_info = error_dict.get("error", {})
    message = error_info.get("message", "An unknown error occurred")
    suggestions = error_info.get("suggestions", [])
    
    formatted = f"Error: {message}"
    
    if suggestions:
        formatted += "\n\nSuggestions:\n"
        formatted += "\n".join(f"• {suggestion}" for suggestion in suggestions)
    
    return formatted