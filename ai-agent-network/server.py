from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API Key for authentication
API_KEY = os.getenv("AI_API_KEY")
if not API_KEY:
    logger.error("❌ Missing AI_API_KEY in environment variables!")
    raise ValueError("AI_API_KEY must be set in the .env file")

# Request model
class QueryRequest(BaseModel):
    user_query: str = Field(..., title="User Query", min_length=5, max_length=500)

# Dependency for API authentication
def authenticate(api_key: str):
    if api_key != API_KEY:
        logger.warning("⚠️ Unauthorized access attempt with incorrect API key.")
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key

@app.get("/")
def read_root():
    return {"message": "AI Agent Manager Running"}

@app.post("/query")
def process_query(request: QueryRequest, api_key: str = Depends(authenticate)):
    """
    Processes the user query securely.
    """
    user_query = request.user_query.strip()

    # ✅ Strengthened SQL Injection Protection
    dangerous_keywords = ["DROP", "DELETE", "ALTER", "--", ";", "TRUNCATE"]
    if any(keyword in user_query.upper() for keyword in dangerous_keywords):
        logger.warning(f"⚠️ Unsafe query attempt: {user_query}")
        raise HTTPException(status_code=400, detail="Unsafe query detected")

    logger.info(f"🔍 Processing AI Query: {user_query}")

    # Simulate AI processing (replace with real AI call)
    sql_response = f"Generated SQL query for: {user_query}"

    logger.info(f"✅ AI Query Processed Successfully: {sql_response}")

    return {"sql_query": sql_response}
