"""
policy_loader.py

Purpose: Reads all institutional policy .txt files from the policies/ folder,
         splits them into ~300-word chunks, and loads them into ChromaDB via
         vector_store.py. Designed to run once on first startup and skip
         re-embedding on subsequent restarts.

Run standalone:
    python -m backend.rag.policy_loader
"""

import logging
import os
from pathlib import Path
from dotenv import load_dotenv

# load .env from current directory before importing vector_store
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

from backend.rag.vector_store import embed_and_store, initialize_vector_store

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────

POLICIES_DIR: Path = Path(__file__).parent / "policies"
CHUNK_SIZE_WORDS: int = 300

# Maps exact filenames → policy_type label stored in ChromaDB metadata.
# Add new policy files here when they are created.
FILENAME_TO_POLICY_TYPE: dict[str, str] = {
    "attendance_policy.txt": "attendance",
    "remedial_guidelines.txt": "remedial",
    "guardian_notification_policy.txt": "notification",
    "academic_probation_rules.txt": "probation",
}

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────


def _chunk_text(text: str, chunk_size: int = CHUNK_SIZE_WORDS) -> list[str]:
    """Split a body of text into chunks of approximately `chunk_size` words.

    Splits on whitespace. The last chunk may be shorter than `chunk_size`.
    Empty strings and whitespace-only inputs return an empty list.

    Args:
        text:       The full text content to split.
        chunk_size: Target number of words per chunk. Defaults to 300.

    Returns:
        List of non-empty text chunk strings.
    """
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)

    return chunks


def _derive_title(filename: str) -> str:
    """Convert a filename into a human-readable policy title.

    E.g. 'attendance_policy.txt' → 'Attendance Policy'

    Args:
        filename: The .txt filename (basename only).

    Returns:
        A title-cased string with underscores replaced by spaces.
    """
    stem = Path(filename).stem                      # 'attendance_policy'
    return stem.replace("_", " ").title()           # 'Attendance Policy'


# ─────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────


def is_policies_loaded() -> bool:
    """Check whether the ChromaDB collection already contains embedded policy chunks.

    Used as a guard so load_all_policies() is skipped on restarts when
    data is already persisted — avoids redundant embedding calls and
    unnecessary model inference time.

    Returns:
        True  if the collection has at least one document stored.
        False if the collection is empty (needs to be loaded).

    Raises:
        RuntimeError: If ChromaDB fails to initialize (propagated from
                      initialize_vector_store).
    """
    collection = initialize_vector_store()
    count = collection.count()
    logger.info("ChromaDB collection currently holds %d document(s).", count)
    return count > 0


def load_all_policies() -> int:
    """Read every .txt file in the policies/ folder, chunk it, and embed all chunks.

    Each file is split into chunks of ~300 words. Every chunk is stored
    as a separate document in ChromaDB with the following metadata:
        - policy_type : from FILENAME_TO_POLICY_TYPE (or 'general' as fallback)
        - title       : human-readable title derived from the filename
        - source_file : the original .txt filename

    Chunk IDs follow the pattern: '{stem}_{chunk_index:03}' so that
    re-running the loader does not create duplicate entries (upsert semantics
    in embed_and_store handle this).

    Files not present in FILENAME_TO_POLICY_TYPE are still loaded with
    policy_type='general' so new policy files added to the folder are
    automatically included.

    Returns:
        int: Total number of chunks embedded across all policy files.

    Raises:
        FileNotFoundError: If the policies/ directory does not exist.
        RuntimeError:      If ChromaDB initialization or embedding fails.
    """
    if not POLICIES_DIR.exists():
        raise FileNotFoundError(
            f"Policies directory not found: {POLICIES_DIR}. "
            "Ensure backend/rag/policies/ exists and contains .txt files."
        )

    txt_files = sorted(POLICIES_DIR.glob("*.txt"))

    if not txt_files:
        logger.warning("No .txt files found in %s. Nothing to load.", POLICIES_DIR)
        return 0

    logger.info(
        "Found %d policy file(s) in '%s'. Starting embedding...",
        len(txt_files),
        POLICIES_DIR,
    )

    total_chunks: int = 0

    for txt_path in txt_files:
        filename = txt_path.name
        policy_type = FILENAME_TO_POLICY_TYPE.get(filename, "general")
        title = _derive_title(filename)

        logger.info("Loading '%s' → policy_type='%s'", filename, policy_type)

        try:
            raw_text = txt_path.read_text(encoding="utf-8")
        except OSError as e:
            logger.error("Could not read file '%s': %s — skipping.", filename, e)
            continue

        chunks = _chunk_text(raw_text, chunk_size=CHUNK_SIZE_WORDS)

        if not chunks:
            logger.warning("'%s' produced no chunks after splitting — skipping.", filename)
            continue

        file_chunks_stored: int = 0
        stem = txt_path.stem  # e.g. 'attendance_policy'

        for idx, chunk_text in enumerate(chunks):
            # Deterministic chunk ID: 'attendance_policy_000', '_001', etc.
            chunk_id = f"{stem}_{idx:03}"

            try:
                embed_and_store(
                    text=chunk_text,
                    policy_type=policy_type,
                    title=f"{title} — Part {idx + 1}",
                    source_file=filename,
                    chunk_id=chunk_id,
                )
                file_chunks_stored += 1
            except Exception as e:
                logger.error(
                    "Failed to embed chunk %d of '%s': %s — skipping chunk.",
                    idx,
                    filename,
                    e,
                )

        logger.info(
            "  ✓ '%s' → %d chunk(s) stored (≈%d words total).",
            filename,
            file_chunks_stored,
            len(raw_text.split()),
        )
        total_chunks += file_chunks_stored

    logger.info(
        "Policy loading complete. Total chunks in ChromaDB: %d", total_chunks
    )
    return total_chunks


def ensure_policies_loaded() -> int:
    """Load policies only if the vector store is currently empty.

    This is the recommended entry point to call from main.py on startup.
    It combines the is_policies_loaded() guard with load_all_policies()
    so callers don't need to manage this check themselves.

    Returns:
        int: Number of chunks loaded this call (0 if already loaded).

    Raises:
        RuntimeError: Propagated from load_all_policies or initialize_vector_store.
    """
    if is_policies_loaded():
        logger.info(
            "Policies already embedded in ChromaDB — skipping re-load."
        )
        return 0

    logger.info("Vector store is empty. Loading all policy files now...")
    return load_all_policies()


# ─────────────────────────────────────────────
# Standalone entry point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  Academic Early Warning System — Policy Loader")
    print("=" * 60)

    already_loaded = is_policies_loaded()

    if already_loaded:
        print("\n⚠️  Policies are already loaded in ChromaDB.")
        response = input("Force re-load and overwrite existing data? [y/N]: ").strip().lower()
        if response != "y":
            print("✅ No changes made. Exiting.")
            exit(0)

    print("\n📂 Loading policy files from:", POLICIES_DIR)
    total = load_all_policies()

    print("\n" + "=" * 60)
    if total > 0:
        print(f"✅ Success! {total} chunk(s) loaded into ChromaDB.")
        print(f"   Storage location: {Path(__file__).parent / 'chroma_db'}")
    else:
        print("⚠️  No chunks were loaded. Check that policies/ contains .txt files.")
    print("=" * 60)
