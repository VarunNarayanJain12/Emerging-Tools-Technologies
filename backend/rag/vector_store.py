"""
vector_store.py

Purpose: ChromaDB vector store initialization, document embedding, and semantic search
         for the Academic Early Warning System's RAG pipeline.

Usage:
    from backend.rag.vector_store import initialize_vector_store, embed_and_store, semantic_search
"""

import hashlib
import logging
import os
from pathlib import Path
from typing import Any

import chromadb
from chromadb.utils import embedding_functions
# No local model imports needed for API-based approach

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────

COLLECTION_NAME: str = "institutional_policies_v3"
EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"

# Persistent storage is always relative to this file, not the caller's CWD
CHROMA_DB_PATH: str = str(Path(__file__).parent / "chroma_db")

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Module-level cache (so models load once)
# ─────────────────────────────────────────────

_client: chromadb.PersistentClient | None = None
_collection: chromadb.Collection | None = None
_embedding_fn: Any | None = None


def _get_embedding_function() -> Any:
    """Load the Hugging Face Inference API embedding function.

    Uses the BAAI/bge-small-en-v1.5 model via API, which ensures 
    ZERO RAM overhead on the server.
    """
    global _embedding_fn
    if _embedding_fn is None:
        hf_token = os.getenv("HF_TOKEN")
        if not hf_token:
            logger.warning("HF_TOKEN missing from .env! RAG will use default mock embeddings (not for production).")
            # Fallback or raise error? For now, we'll return the default EF but log the warning.
            _embedding_fn = embedding_functions.DefaultEmbeddingFunction()
        else:
            logger.info("Initializing Hugging Face Inference API with model: %s", EMBEDDING_MODEL)
            _embedding_fn = embedding_functions.HuggingFaceInferenceAPIEmbeddingFunction(
                api_key=hf_token,
                model_name=EMBEDDING_MODEL
            )
            logger.info("HF API Embedding Function initialized.")
    return _embedding_fn


# ─────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────


def initialize_vector_store() -> chromadb.Collection:
    """Initialize ChromaDB with persistent storage and return the policy collection.

    Creates the chroma_db/ directory if it does not exist. Uses
    get_or_create_collection so the function is safe to call multiple
    times — it will return the existing collection without wiping data.

    The collection uses cosine similarity (HNSW index) which is
    appropriate for semantic similarity search on text embeddings.

    Returns:
        chromadb.Collection: The initialized 'institutional_policies' collection.

    Raises:
        RuntimeError: If ChromaDB fails to initialize for any reason.
    """
    global _client, _collection

    # Return cached collection on subsequent calls
    if _collection is not None:
        logger.debug("Returning cached ChromaDB collection.")
        return _collection

    try:
        logger.info("Initializing ChromaDB persistent store at: %s", CHROMA_DB_PATH)
        os.makedirs(CHROMA_DB_PATH, exist_ok=True)

        _client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        embedding_fn = _get_embedding_function()

        _collection = _client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=embedding_fn,
            metadata={"hnsw:space": "cosine"},
        )

        logger.info(
            "ChromaDB collection '%s' ready. Documents currently stored: %d",
            COLLECTION_NAME,
            _collection.count(),
        )
        return _collection

    except Exception as e:
        logger.error("Failed to initialize ChromaDB: %s", e)
        raise RuntimeError(f"ChromaDB initialization failed: {e}") from e


def embed_and_store(
    text: str,
    policy_type: str,
    title: str,
    source_file: str,
    chunk_id: str | None = None,
) -> str:
    """Embed a policy text chunk and store it in ChromaDB with metadata.

    Uses upsert semantics so calling this function multiple times
    with the same content is safely idempotent — no duplicate entries
    will be created.

    Args:
        text:        The raw text content of the policy chunk to embed.
        policy_type: Category label for the policy, e.g. 'attendance',
                     'academic_probation', 'remedial', 'guardian_notification'.
        title:       Human-readable title shown to the LLM when this chunk is
                     retrieved, e.g. 'Attendance Policy — Section 3'.
        source_file: The filename the chunk was loaded from,
                     e.g. 'attendance_policy.txt'.
        chunk_id:    Optional explicit document ID. If None, a stable ID is
                     auto-generated from the source filename and an MD5 hash
                     of the content so the same text always gets the same ID.

    Returns:
        str: The document ID that was used/created in ChromaDB.

    Raises:
        ValueError:  If text is empty or whitespace-only.
        RuntimeError: If the embedding or storage step fails.
    """
    if not text or not text.strip():
        raise ValueError("Cannot embed an empty or whitespace-only text chunk.")

    # Auto-generate a stable, deterministic chunk ID
    if chunk_id is None:
        content_hash = hashlib.md5(text.encode("utf-8")).hexdigest()[:10]
        # Strip extension for cleaner IDs
        base = Path(source_file).stem
        chunk_id = f"{base}_{content_hash}"

    collection = initialize_vector_store()

    metadata: dict[str, str] = {
        "policy_type": policy_type,
        "title": title,
        "source_file": source_file,
    }

    try:
        collection.upsert(
            ids=[chunk_id],
            documents=[text],
            metadatas=[metadata],
        )
        logger.info(
            "Stored chunk id='%s' | source='%s' | type='%s' | chars=%d",
            chunk_id,
            source_file,
            policy_type,
            len(text),
        )
        return chunk_id

    except Exception as e:
        logger.error("Failed to store document '%s': %s", chunk_id, e)
        raise RuntimeError(f"Failed to embed and store document: {e}") from e


def semantic_search(
    query: str,
    top_k: int = 3,
    policy_type_filter: str | None = None,
) -> list[dict[str, Any]]:
    """Search for the most semantically relevant policy chunks for a given query.

    The query is embedded using the same model as the stored documents,
    and ChromaDB performs an approximate nearest-neighbour search using
    cosine similarity.

    Args:
        query:               Natural language query string, e.g.
                             'student missed 30% of classes last semester'.
        top_k:               Maximum number of results to return. Defaults to 3.
                             Automatically clamped to the number of stored documents.
        policy_type_filter:  Optional. If provided, restricts results to chunks
                             whose 'policy_type' metadata field matches this value
                             exactly (e.g. 'attendance').

    Returns:
        List of dicts, ordered from most to least relevant. Each dict contains:
            - 'text'        (str):   The matching policy chunk text.
            - 'policy_type' (str):   The policy category label.
            - 'title'       (str):   Human-readable document title.
            - 'source_file' (str):   Source filename.
            - 'distance'    (float): Cosine distance score, 0.0–2.0.
                                     Lower = more semantically similar.

    Raises:
        ValueError:  If query is empty or whitespace-only.
        RuntimeError: If the search operation fails.
    """
    if not query or not query.strip():
        raise ValueError("Search query must not be empty.")

    collection = initialize_vector_store()

    if collection.count() == 0:
        logger.warning(
            "Vector store is empty. Run policy_loader.py first to populate it."
        )
        return []

    # Build optional metadata filter for ChromaDB's where clause
    where_filter: dict[str, str] | None = (
        {"policy_type": policy_type_filter} if policy_type_filter else None
    )

    # ChromaDB raises if n_results > number of documents in collection
    effective_top_k = min(top_k, collection.count())

    try:
        results = collection.query(
            query_texts=[query],
            n_results=effective_top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        documents: list[str] = results.get("documents", [[]])[0]
        metadatas: list[dict] = results.get("metadatas", [[]])[0]
        distances: list[float] = results.get("distances", [[]])[0]

        chunks: list[dict[str, Any]] = []
        for doc, meta, dist in zip(documents, metadatas, distances):
            chunks.append(
                {
                    "text": doc,
                    "policy_type": meta.get("policy_type", "unknown"),
                    "title": meta.get("title", "Unknown Policy"),
                    "source_file": meta.get("source_file", ""),
                    "distance": round(dist, 4),
                }
            )

        logger.info(
            "Semantic search returned %d results for query: '%s'",
            len(chunks),
            query[:70],
        )
        return chunks

    except Exception as e:
        logger.error("Semantic search failed for query '%s': %s", query[:70], e)
        raise RuntimeError(f"Semantic search failed: {e}") from e


# ─────────────────────────────────────────────
# Quick smoke-test when run directly
# ─────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("Running vector_store.py smoke test...")

    col = initialize_vector_store()
    logger.info("Collection count before test: %d", col.count())

    # Store a single test chunk
    test_id = embed_and_store(
        text="Students must maintain 75% attendance in each subject.",
        policy_type="attendance",
        title="Attendance Policy — Quick Test",
        source_file="smoke_test",
    )
    logger.info("Stored test chunk with id: %s", test_id)

    # Search for it
    hits = semantic_search("what is the minimum attendance required?", top_k=1)
    for hit in hits:
        logger.info(
            "Search result — title: '%s' | distance: %s | text: '%s'",
            hit["title"],
            hit["distance"],
            hit["text"][:80],
        )

    logger.info("Smoke test complete.")
