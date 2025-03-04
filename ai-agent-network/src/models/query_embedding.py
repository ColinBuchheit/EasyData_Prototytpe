import openai
import numpy as np
import logging
import hashlib
from config.settings import ENV

# Secure Logging Setup
logger = logging.getLogger(__name__)

class QueryEmbedding:
    """Handles query embedding for AI-driven SQL query optimization."""

    def __init__(self, model=None):
        """Initialize embedding model settings."""
        self.model = model if model else ENV.DEFAULT_EMBEDDING_MODEL  # ✅ Load default model from settings
        self.api_key = ENV.AI_API_KEY
        self.embedding_cache = {}  # ✅ In-memory cache to prevent redundant calls

    def generate_embedding(self, text: str):
        """
        Generates an embedding vector for a given query or SQL statement.

        Args:
            text (str): Input text or SQL query.

        Returns:
            np.ndarray: Query embedding vector.
        """
        query_hash = hashlib.sha256(text.encode()).hexdigest()

        # ✅ Check cache first to avoid redundant API calls
        if query_hash in self.embedding_cache:
            logger.info(f"🔄 Returning cached embedding for query.")
            return self.embedding_cache[query_hash]

        try:
            response = openai.Embedding.create(
                input=text,
                model=self.model,
                api_key=self.api_key
            )
            embedding = np.array(response["data"][0]["embedding"])
            self.embedding_cache[query_hash] = embedding  # ✅ Store in cache
            logger.info(f"✅ Embedding generated for query.")
            return embedding

        except Exception as e:
            logger.error(f"❌ Embedding Generation Failed: {str(e)}")
            return None

    def compare_embeddings(self, query_embedding, stored_embeddings):
        """
        Compares query embedding with stored embeddings for similarity.

        Args:
            query_embedding (np.ndarray): The embedding vector of the new query.
            stored_embeddings (list of np.ndarray): List of stored embeddings.

        Returns:
            float: Similarity score.
        """
        if not stored_embeddings:
            return 0.0  # No stored embeddings to compare

        similarities = [
            np.dot(query_embedding, emb) / (np.linalg.norm(query_embedding) * np.linalg.norm(emb))
            for emb in stored_embeddings
        ]
        max_similarity = max(similarities)
        logger.info(f"🔍 Max Query Similarity: {max_similarity}")
        return max_similarity
