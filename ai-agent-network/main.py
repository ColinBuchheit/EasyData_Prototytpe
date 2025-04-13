# main.py

from crew import build_agent_network
from dotenv import load_dotenv
import sys
import json

load_dotenv()  # Load environment variables from .env

def handle_user_input(user_id: str, message: str, db_info: dict, conversation_id: str, query: str = None):
    orchestrator = build_agent_network()

    task_payload = {
        "user_id": user_id,
        "message": message,
        "db_info": db_info,
        "conversation_id": conversation_id,
    }

    if query:
        task_payload["query"] = query

    result = orchestrator.run(task_payload)
    return result

if __name__ == "__main__":
    # CLI runner (for dev)
    if len(sys.argv) < 5:
        print("Usage: python main.py <user_id> <message> <db_info_json> <conversation_id> [<optional_query>]")
        sys.exit(1)

    user_id = sys.argv[1]
    message = sys.argv[2]
    db_info = json.loads(sys.argv[3])
    conversation_id = sys.argv[4]
    query = sys.argv[5] if len(sys.argv) > 5 else None

    result = handle_user_input(user_id, message, db_info, conversation_id, query)
    print(json.dumps(result, indent=2))
