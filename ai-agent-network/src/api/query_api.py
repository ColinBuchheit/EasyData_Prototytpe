from fastapi import FastAPI, HTTPException
from agents.query_execution_agent import execute_query

app = FastAPI()

@app.post("/query/{user_id}")
async def process_query(user_id: int, query: str):
    """
    API Endpoint: Executes an AI-generated SQL query.
    """
    result = await execute_query(user_id, query)
    if not result:
        raise HTTPException(status_code=500, detail="Query execution failed")
    return {"result": result}
