from fastapi import APIRouter, HTTPException, Depends
import logging
from agents.schema_agent import SchemaAgent
from security.auth import require_role

# Secure Logging Setup
logger = logging.getLogger(__name__)

# Initialize API Router
router = APIRouter(prefix="/api/schema", tags=["Schema API"])
schema_agent = SchemaAgent()

@router.get("/")
async def get_schema(user_id: int, db_type: str, current_user=Depends(require_role(["admin", "analyst"]))):
    """
    Securely fetches the database schema for a user.

    Args:
        user_id (int): The user ID requesting the schema.
        db_type (str): The type of database (PostgreSQL, MySQL, etc.).
        current_user (dict): The authenticated user's details.

    Returns:
        dict: Schema metadata or error response.
    """
    logger.info(f"🔍 Schema request by User {user_id} | DB: {db_type}")

    try:
        schema = schema_agent.get_schema(user_id, db_type, current_user["role"])

        if not schema:
            logger.warning(f"⚠️ No schema found for User {user_id} | DB: {db_type}")
            raise HTTPException(status_code=404, detail="No schema found for this database.")

        return {"schema": schema}

    except Exception as e:
        logger.error(f"❌ Internal API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error.")
