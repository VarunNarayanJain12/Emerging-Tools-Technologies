"""
db_connection.py

Purpose: PostgreSQL connection factory for the Academic Early Warning System.
         Loads all credentials from backend/rag/.env via python-dotenv.
         sslmode=require is mandatory for Supabase connections.
"""

import os

import psycopg2
from dotenv import load_dotenv

# Load .env from backend/rag/ — works regardless of CWD
load_dotenv(
    dotenv_path=os.path.join(os.path.dirname(__file__), "../../backend/rag/.env")
)


def get_connection() -> psycopg2.extensions.connection:
    """Create and return a new PostgreSQL connection using credentials from .env.

    All parameters are read from environment variables set by backend/rag/.env.
    sslmode='require' is mandatory for Supabase connections.

    Returns:
        psycopg2.extensions.connection: An open database connection.

    Raises:
        psycopg2.OperationalError: If the connection cannot be established.
    """
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME", "postgres"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT", "5432"),
        sslmode="require",
    )