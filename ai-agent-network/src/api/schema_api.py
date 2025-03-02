from fastapi import FastAPI, HTTPException
from services.schema_introspection import get_schema

app = FastAPI()

@app.get("/schema/{user_id}")
async def get_database_schema(user_id: int):
    """
    API Endpoint: Fetch database schema for the given user.
    """
    schema = await get_schema(user_id)
    if not schema:
        raise HTTPException(status_code=500, detail="Failed to retrieve schema")
    return {"schema": schema}
