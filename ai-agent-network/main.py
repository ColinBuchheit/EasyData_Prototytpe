from fastapi import FastAPI
import logging
from src.api.schema_api import router as schema_router
from src.api.query_api import router as query_router
from security.auth import verify_api_key
from src.config.logging_config import logger

# ✅ Initialize FastAPI App
app = FastAPI(
    title="AI-Agent Network API",
    version="1.0",
    description="An AI-powered API for SQL generation, validation, and schema handling."
)

# ✅ Register API Routes
app.include_router(schema_router)
app.include_router(query_router)

# ✅ Root Endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to the AI-Agent Network API"}

# ✅ Health Check Endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "AI-Agent system is running."}

# ✅ Global Exception Handling
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled Exception: {str(exc)}")
    return {"error": "Internal server error. Please contact support."}
