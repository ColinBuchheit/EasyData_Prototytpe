import pika

RABBITMQ_HOST = "localhost"
QUEUE_NAME = "ai_queries"

def send_message(query: str) -> str:
    """
    Sends a message (user query) to the RabbitMQ queue and waits for a response.
    """
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()

    # Declare a queue (ensures queue exists)
    channel.queue_declare(queue=QUEUE_NAME)

    # Publish message
    channel.basic_publish(exchange='', routing_key=QUEUE_NAME, body=query)
    print(f" [x] Sent '{query}'")

    connection.close()

    return "Query sent to AI processing queue"
