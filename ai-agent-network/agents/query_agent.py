import pika
import openai

RABBITMQ_HOST = "localhost"
QUEUE_NAME = "ai_queries"

openai.api_key = "your-openai-api-key"

def process_query(query: str) -> str:
    """
    Uses OpenAI (or another model) to convert a user query into an SQL statement.
    """
    response = openai.ChatCompletion.create(
        model="gpt-4-turbo",
        messages=[
            {"role": "system", "content": "You are an AI assistant that converts natural language to SQL."},
            {"role": "user", "content": query}
        ]
    )
    return response["choices"][0]["message"]["content"]

def start_agent():
    """
    Listens for queries from RabbitMQ and processes them.
    """
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()
    channel.queue_declare(queue=QUEUE_NAME)

    def callback(ch, method, properties, body):
        query = body.decode()
        print(f" [x] Received Query: {query}")

        sql_response = process_query(query)
        print(f" [✔] Generated SQL: {sql_response}")

    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback, auto_ack=True)
    print(" [*] Query Agent Waiting for Messages...")
    channel.start_consuming()

if __name__ == "__main__":
    start_agent()
