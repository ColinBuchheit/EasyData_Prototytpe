# utils/observability.py

import time
import uuid
import logging
import functools
import json
import os
from typing import Dict, Any, Optional, List, Callable, Union
from contextlib import contextmanager

# Configure logging
logger = logging.getLogger("ai-agent-observability")

class TraceContext:
    """Context manager for tracking execution across components"""
    
    # Thread-local storage for the current trace
    _current_trace = None
    
    def __init__(
        self, 
        name: str, 
        parent_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.name = name
        self.trace_id = trace_id or str(uuid.uuid4())
        self.span_id = str(uuid.uuid4())
        self.parent_id = parent_id
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.metadata = metadata or {}
        self.spans: List[Dict[str, Any]] = []
        self.events: List[Dict[str, Any]] = []
        self.status = "pending"
        
        # Store previous trace context for nesting
        self.previous_trace = TraceContext._current_trace
    
    def __enter__(self):
        # Set this as the current trace
        TraceContext._current_trace = self
        self.add_event("trace.start", {"name": self.name})
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.time()
        
        if exc_type:
            self.status = "error"
            self.add_event("trace.error", {
                "error_type": exc_type.__name__,
                "error_message": str(exc_val)
            })
        else:
            self.status = "success"
        
        self.add_event("trace.end", {"status": self.status})
        
        # Restore previous trace context
        TraceContext._current_trace = self.previous_trace
        
        # Log the trace data
        self._log_trace()
        
        # Optionally export the trace
        self._export_trace()
    
    @staticmethod
    def current() -> Optional['TraceContext']:
        """Get the current trace context"""
        return TraceContext._current_trace
    
    def add_event(self, name: str, attributes: Optional[Dict[str, Any]] = None) -> None:
        """Add an event to the trace"""
        event = {
            "name": name,
            "timestamp": time.time(),
            "attributes": attributes or {}
        }
        self.events.append(event)
    
    @contextmanager
    def create_span(self, name: str, attributes: Optional[Dict[str, Any]] = None) -> 'SpanContext':
        """Create a new span within this trace"""
        span = SpanContext(name, self.trace_id, self.span_id, attributes)
        try:
            yield span
        finally:
            self.spans.append(span.to_dict())
    
    def add_metadata(self, key: str, value: Any) -> None:
        """Add metadata to the trace"""
        self.metadata[key] = value
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert trace to dictionary"""
        return {
            "name": self.name,
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_id": self.parent_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration_ms": (self.end_time - self.start_time) * 1000 if self.end_time else None,
            "metadata": self.metadata,
            "spans": self.spans,
            "events": self.events,
            "status": self.status
        }
    
    def _log_trace(self) -> None:
        """Log the trace information for debugging"""
        duration_ms = (self.end_time - self.start_time) * 1000
        logger.info(
            f"Trace {self.name} completed: status={self.status}, "
            f"duration={duration_ms:.2f}ms, spans={len(self.spans)}"
        )
    
    def _export_trace(self) -> None:
        """Export the trace data for external analysis"""
        # This is a placeholder for integration with external tracing systems
        # In production, you might send this to Jaeger, Zipkin, etc.
        
        # For now, just write to a local file if enabled
        if os.environ.get("ENABLE_TRACE_EXPORT", "false").lower() == "true":
            export_dir = os.environ.get("TRACE_EXPORT_DIR", "traces")
            os.makedirs(export_dir, exist_ok=True)
            
            filename = f"{export_dir}/trace_{self.trace_id}_{int(self.start_time)}.json"
            with open(filename, "w") as f:
                json.dump(self.to_dict(), f, indent=2)


class SpanContext:
    """Context for a span within a trace"""
    
    def __init__(
        self, 
        name: str, 
        trace_id: str,
        parent_id: str,
        attributes: Optional[Dict[str, Any]] = None
    ):
        self.name = name
        self.trace_id = trace_id
        self.span_id = str(uuid.uuid4())
        self.parent_id = parent_id
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.attributes = attributes or {}
        self.events: List[Dict[str, Any]] = []
        self.status = "pending"
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.time()
        
        if exc_type:
            self.status = "error"
            self.add_event("span.error", {
                "error_type": exc_type.__name__,
                "error_message": str(exc_val)
            })
        else:
            self.status = "success"
        
        self.add_event("span.end", {"status": self.status})
    
    def add_event(self, name: str, attributes: Optional[Dict[str, Any]] = None) -> None:
        """Add an event to the span"""
        event = {
            "name": name,
            "timestamp": time.time(),
            "attributes": attributes or {}
        }
        self.events.append(event)
    
    def add_attribute(self, key: str, value: Any) -> None:
        """Add an attribute to the span"""
        self.attributes[key] = value
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert span to dictionary"""
        return {
            "name": self.name,
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_id": self.parent_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration_ms": (self.end_time - self.start_time) * 1000 if self.end_time else None,
            "attributes": self.attributes,
            "events": self.events,
            "status": self.status
        }


class PerformanceMonitor:
    """Utility for monitoring and tracking performance metrics"""
    
    # In-memory storage for metrics
    _metrics: Dict[str, List[Dict[str, Any]]] = {}
    
    @staticmethod
    def record_metric(
        name: str, 
        value: Union[int, float], 
        tags: Optional[Dict[str, str]] = None
    ) -> None:
        """Record a performance metric"""
        metric = {
            "name": name,
            "value": value,
            "timestamp": time.time(),
            "tags": tags or {}
        }
        
        if name not in PerformanceMonitor._metrics:
            PerformanceMonitor._metrics[name] = []
        
        PerformanceMonitor._metrics[name].append(metric)
        
        # Log the metric
        tag_str = ", ".join(f"{k}={v}" for k, v in (tags or {}).items())
        logger.info(f"Metric: {name}={value} {tag_str}")
    
    @staticmethod
    def get_metrics(name: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]]:
        """Get recorded metrics"""
        if name:
            return {name: PerformanceMonitor._metrics.get(name, [])}
        return PerformanceMonitor._metrics
    
    @staticmethod
    def calculate_stats(name: str) -> Dict[str, Any]:
        """Calculate statistics for a metric"""
        metrics = PerformanceMonitor._metrics.get(name, [])
        if not metrics:
            return {
                "name": name,
                "count": 0,
                "min": None,
                "max": None,
                "avg": None,
                "p50": None,
                "p90": None,
                "p95": None,
                "p99": None
            }
        
        values = [metric["value"] for metric in metrics]
        values.sort()
        
        return {
            "name": name,
            "count": len(values),
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "p50": values[int(len(values) * 0.5)],
            "p90": values[int(len(values) * 0.9)],
            "p95": values[int(len(values) * 0.95)],
            "p99": values[int(len(values) * 0.99)]
        }
    
    @staticmethod
    def reset() -> None:
        """Reset all metrics"""
        PerformanceMonitor._metrics = {}


# Decorator for performance monitoring
def monitor_performance(
    metric_name: Optional[str] = None,
    include_args: bool = False,
    include_result: bool = False
):
    """Decorator to monitor function performance"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Generate metric name if not provided
            name = metric_name or f"{func.__module__}.{func.__name__}"
            
            # Start timing
            start_time = time.time()
            
            # Create tags
            tags = {"function": func.__name__, "module": func.__module__}
            
            # Include arguments if requested (be careful with sensitive data)
            if include_args:
                # Only include simple types and limit size
                safe_args = []
                for arg in args:
                    if isinstance(arg, (int, float, str, bool)):
                        safe_args.append(str(arg)[:50])  # Truncate long strings
                    else:
                        safe_args.append(f"{type(arg).__name__}")
                
                safe_kwargs = {}
                for key, value in kwargs.items():
                    if isinstance(value, (int, float, str, bool)):
                        safe_kwargs[key] = str(value)[:50]  # Truncate long strings
                    else:
                        safe_kwargs[key] = f"{type(value).__name__}"
                
                tags["args"] = str(safe_args)
                tags["kwargs"] = str(safe_kwargs)
            
            # Get current trace context if available
            current_trace = TraceContext.current()
            if current_trace:
                tags["trace_id"] = current_trace.trace_id
            
            try:
                # Call the function
                with TraceContext(name, trace_id=current_trace.trace_id if current_trace else None) as trace:
                    result = func(*args, **kwargs)
                
                # Record success
                tags["status"] = "success"
                
                # Include result if requested (be careful with sensitive data)
                if include_result and isinstance(result, (int, float, str, bool)):
                    tags["result"] = str(result)[:50]  # Truncate long strings
                
                return result
            except Exception as e:
                # Record failure
                tags["status"] = "error"
                tags["error"] = type(e).__name__
                raise
            finally:
                # Calculate duration
                duration_ms = (time.time() - start_time) * 1000
                
                # Record metric
                PerformanceMonitor.record_metric(f"{name}.duration_ms", duration_ms, tags)
        
        return wrapper
    return decorator


# Simplified distributed tracing function
def trace_request(request_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None):
    """Decorator to trace a request across multiple components"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            function_name = func.__name__
            trace_name = f"{func.__module__}.{function_name}"
            
            # Get trace_id from request_id or create new
            trace_id = request_id or str(uuid.uuid4())
            
            # Create the trace context
            with TraceContext(trace_name, trace_id=trace_id, metadata=metadata) as trace:
                # Add useful metadata
                trace.add_metadata("function", function_name)
                trace.add_metadata("module", func.__module__)
                
                # Execute the function
                return func(*args, **kwargs)
        
        return wrapper
    return decorator


# Example usage
if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Example of using performance monitoring
    @monitor_performance(include_args=True)
    def example_function(x, y):
        """Example function to demonstrate monitoring"""
        time.sleep(0.1)  # Simulate work
        return x + y
    
    # Example of using tracing
    @trace_request(metadata={"example": "metadata"})
    def traced_function():
        """Example function to demonstrate tracing"""
        with TraceContext.current().create_span("subprocess_1") as span:
            span.add_attribute("detail", "Processing step 1")
            time.sleep(0.05)  # Simulate work
        
        with TraceContext.current().create_span("subprocess_2") as span:
            span.add_attribute("detail", "Processing step 2")
            time.sleep(0.05)  # Simulate work
        
        return "success"
    
    # Run examples
    result = example_function(10, 20)
    print(f"Example function result: {result}")
    
    result = traced_function()
    print(f"Traced function result: {result}")
    
    # Print metrics
    metrics = PerformanceMonitor.get_metrics()
    for name, values in metrics.items():
        stats = PerformanceMonitor.calculate_stats(name)
        print(f"Metric {name}: count={stats['count']}, avg={stats['avg']:.2f}ms")