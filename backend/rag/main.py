"""
main.py

Purpose: FastAPI application exposing the Academic Early Warning System's
         RAG pipeline as REST endpoints. On startup, embeds all policy
         documents into ChromaDB if not already loaded.

Run:
    python -m backend.rag.main
    — or —
    uvicorn backend.rag.main:app --reload --port 8000
"""

import logging
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── sys.path fix so backend.db resolves regardless of CWD ──────────────────
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# ── Load .env from backend/rag/ before any other imports that read env vars ─
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

from backend.db.db_connection import get_connection          # noqa: E402
from backend.rag.policy_loader import ensure_policies_loaded  # noqa: E402
from backend.rag.rag_engine import (                          # noqa: E402
    explain_student_risk,
    get_student_context,
)
from backend.rag.vector_store import initialize_vector_store  # noqa: E402
from backend.risk_engine.risk_scorer import run_risk_evaluation  # noqa: E402

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────

app = FastAPI(
    title="Academic Early Warning System — RAG API",
    description=(
        "Provides risk explanations for students using Retrieval-Augmented "
        "Generation grounded in institutional policy documents."
    ),
    version="1.0.0",
)

# Dev-mode CORS — allow everything
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────


class ExplainRiskRequest(BaseModel):
    """Request body for POST /explain-risk."""

    student_id: str = Field(..., description="Unique student identifier.")
    question: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Natural language question from the mentor.",
    )


class StudentSummaryFlag(BaseModel):
    """Lightweight risk flags for dashboard cards."""

    avg_attendance: float | None
    avg_assessment_score: float | None
    flags_triggered: list[str]


class StudentSummary(BaseModel):
    """Response for GET /students/{student_id}/summary."""

    student_id: str
    student_name: str
    risk_category: str | None
    risk_score: int | None
    flags_triggered: list[str]
    avg_attendance: float | None


class ExplainRiskResponse(BaseModel):
    """Response for POST /explain-risk."""

    student_id: str
    student_name: str
    risk_category: str
    risk_score: int
    explanation: str
    policies_used: list[str]
    student_summary: dict[str, Any]


class HealthResponse(BaseModel):
    """Response for GET /health."""

    status: str
    chromadb_status: str
    db_status: str
    policies_count: int
    model: str


class RiskEvaluationSummary(BaseModel):
    """Response for POST /run-risk-evaluation."""

    total_students: int
    green: int
    yellow: int
    red: int
    evaluation_run_id: str
    rule_version: str


class StudentListItem(BaseModel):
    """Item for student listing."""

    student_id: str
    full_name: str
    roll_number: str
    department: str
    status: str


class StudentsListResponse(BaseModel):
    """Response for GET /students."""

    students: list[StudentListItem]
    total: int


# ─────────────────────────────────────────────
# Startup event
# ─────────────────────────────────────────────


@app.on_event("startup")
async def startup_event() -> None:
    """Load institutional policies into ChromaDB on application startup.

    Calls ensure_policies_loaded() which only performs embedding if
    ChromaDB is currently empty, making restarts fast. If policy loading
    fails for any reason, the error is logged but the server continues
    running so health checks and other diagnostics remain accessible.
    """
    logger.info("Application startup: initialising policy vector store...")
    try:
        chunks_loaded = ensure_policies_loaded()
        if chunks_loaded > 0:
            logger.info("Startup: loaded %d new policy chunk(s) into ChromaDB.", chunks_loaded)
        else:
            logger.info("Startup: policies already in ChromaDB — skipping re-load.")
    except Exception as e:
        logger.error(
            "Startup: policy loading failed — server will start without policies. "
            "Error: %s",
            e,
        )


# ─────────────────────────────────────────────
# ENDPOINT 1 — Health check
# ─────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse, tags=["Monitoring"])
async def health_check() -> HealthResponse:
    """Check the health of all system components.

    Verifies ChromaDB connectivity and policy document count, and
    verifies PostgreSQL connectivity with a lightweight SELECT 1.
    Always returns HTTP 200 — use the 'status' field to detect
    degraded state. This endpoint never throws a 500.

    Returns:
        HealthResponse with status 'ok' or 'degraded' and per-component
        status strings and policy document count.
    """
    chromadb_status = "error"
    db_status = "error"
    policies_count = 0

    # ── Check ChromaDB ─────────────────────────────────────────────────────
    try:
        collection = initialize_vector_store()
        policies_count = collection.count()
        chromadb_status = "ok"
        logger.info("/health: ChromaDB ok, %d document(s) stored.", policies_count)
    except Exception as e:
        logger.error("/health: ChromaDB check failed — %s", e)

    # ── Check PostgreSQL ───────────────────────────────────────────────────
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        db_status = "ok"
        logger.info("/health: PostgreSQL ok.")
    except Exception as e:
        logger.error("/health: PostgreSQL check failed — %s", e)
    finally:
        if conn:
            conn.close()

    overall_status = "ok" if (chromadb_status == "ok" and db_status == "ok") else "degraded"

    return HealthResponse(
        status=overall_status,
        chromadb_status=chromadb_status,
        db_status=db_status,
        policies_count=policies_count,
        model="llama-3.3-70b-versatile",
    )


# ─────────────────────────────────────────────
# ENDPOINT 1.5 — Student Listing
# ─────────────────────────────────────────────


@app.get("/students", response_model=StudentsListResponse, tags=["Students"])
async def list_students() -> StudentsListResponse:
    """Return a list of all active students.

    Fetches student metadata (ID, name, roll number, department) for all
    students with an 'active' status. Used by teachers to populate the
    dashboard student list dynamically.

    Returns:
        StudentsListResponse containing the list of students and total count.

    Raises:
        500: If a database error occurs.
    """
    logger.info("GET /students")
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT student_id, full_name, roll_number, department, status "
            "FROM students WHERE status = 'active'"
        )
        rows = cur.fetchall()
        
        students = [
            StudentListItem(
                student_id=row[0],
                full_name=row[1],
                roll_number=row[2],
                department=row[3],
                status=row[4]
            )
            for row in rows
        ]

        logger.info("GET /students — returned %d student(s).", len(students))
        return StudentsListResponse(students=students, total=len(students))

    except Exception as e:
        logger.error("GET /students — DB error: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch students list. Please try again later.",
        )
    finally:
        if conn:
            conn.close()


# ─────────────────────────────────────────────
# ENDPOINT 2 — Full student context
# ─────────────────────────────────────────────


@app.get("/risk-profile/{student_id}", tags=["Students"])
async def get_risk_profile(student_id: str) -> dict[str, Any]:
    """Return the full academic context for a student.

    Fetches the student's current risk profile, attendance records,
    assessment scores, and subject attempts from PostgreSQL.

    Args:
        student_id: The unique student identifier.

    Returns:
        Full context dict with keys: student, risk_profile, attendance,
        assessments, attempts.

    Raises:
        404: If the student_id does not exist in the students table.
        500: If a database error occurs.
    """
    logger.info("GET /risk-profile/%s", student_id)

    try:
        context = get_student_context(student_id)
    except RuntimeError as e:
        logger.error("/risk-profile/%s — DB error: %s", student_id, e)
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch student profile. Please try again later.",
        )

    if context is None:
        raise HTTPException(
            status_code=404,
            detail=f"Student {student_id} not found.",
        )

    logger.info("/risk-profile/%s — returned successfully.", student_id)
    return context


# ─────────────────────────────────────────────
# ENDPOINT 3 — LLM risk explanation
# ─────────────────────────────────────────────


@app.post("/explain-risk", response_model=ExplainRiskResponse, tags=["RAG"])
async def explain_risk(body: ExplainRiskRequest) -> ExplainRiskResponse:
    """Generate an LLM-powered explanation for a student's risk status.

    Orchestrates the full RAG pipeline:
    1. Fetches student academic context from PostgreSQL.
    2. Retrieves relevant institutional policy chunks from ChromaDB.
    3. Builds a structured prompt combining context + policies + question.
    4. Queries the Groq LLM (llama3-70b-8192) for an explanation.
    5. Returns a structured response with the explanation and metadata.

    Args:
        body: ExplainRiskRequest containing student_id and the mentor's question.

    Returns:
        ExplainRiskResponse with explanation, policies used, and student summary.

    Raises:
        404: If the student_id does not exist.
        500: If any part of the RAG pipeline fails (DB, ChromaDB, or Groq).
    """
    logger.info(
        "POST /explain-risk | student_id='%s' | question='%s'",
        body.student_id,
        body.question[:80],
    )

    try:
        result = explain_student_risk(
            student_id=body.student_id,
            question=body.question,
        )
    except ValueError as e:
        # Student not found
        logger.warning("/explain-risk — student not found: %s", e)
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # LLM, DB, or ChromaDB failure — never expose raw error to client
        logger.error(
            "/explain-risk — pipeline error for student '%s': %s",
            body.student_id,
            e,
        )
        raise HTTPException(
            status_code=500,
            detail="Explanation service temporarily unavailable. Please try again later.",
        )

    logger.info(
        "/explain-risk | student='%s' | category=%s | score=%s | policies_used=%d",
        body.student_id,
        result.get("risk_category"),
        result.get("risk_score"),
        len(result.get("policies_used", [])),
    )
    return ExplainRiskResponse(**result)


# ─────────────────────────────────────────────
# ENDPOINT 4 — Lightweight summary for dashboard
# ─────────────────────────────────────────────


@app.get("/students/{student_id}/summary", response_model=StudentSummary, tags=["Students"])
async def get_student_summary(student_id: str) -> StudentSummary:
    """Return a lightweight student summary for dashboard cards.

    Fetches the same underlying context as /risk-profile but only
    returns the fields needed to render a dashboard card: name,
    risk category, risk score, triggered flags, and attendance average.
    No LLM call is made — this endpoint is fast and cheap.

    Args:
        student_id: The unique student identifier.

    Returns:
        StudentSummary with name, risk_category, risk_score,
        flags_triggered, and avg_attendance.

    Raises:
        404: If the student_id does not exist.
        500: If a database error occurs.
    """
    logger.info("GET /students/%s/summary", student_id)

    try:
        context = get_student_context(student_id)
    except RuntimeError as e:
        logger.error("/students/%s/summary — DB error: %s", student_id, e)
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch student summary. Please try again later.",
        )

    if context is None:
        raise HTTPException(
            status_code=404,
            detail=f"Student {student_id} not found.",
        )

    student = context["student"]
    risk = context["risk_profile"]
    attendance_records = context["attendance"]

    # Compute avg attendance
    avg_attendance: float | None = None
    if attendance_records:
        avg_attendance = round(
            sum(r["attendance_percentage"] for r in attendance_records)
            / len(attendance_records),
            1,
        )

    # Compute triggered flags
    flags_triggered: list[str] = []
    if risk:
        for flag in ("attendance_risk", "performance_risk", "attempt_risk", "fee_risk"):
            if risk.get(flag):
                flags_triggered.append(flag)

    logger.info(
        "/students/%s/summary — returned | category=%s | flags=%s",
        student_id,
        risk["risk_category"] if risk else None,
        flags_triggered,
    )

    return StudentSummary(
        student_id=student["student_id"],
        student_name=student["full_name"],
        risk_category=risk["risk_category"] if risk else None,
        risk_score=risk["risk_score"] if risk else None,
        flags_triggered=flags_triggered,
        avg_attendance=avg_attendance,
    )


# ─────────────────────────────────────────────
# ENDPOINT 5 — Trigger risk evaluation batch
# ─────────────────────────────────────────────


@app.post(
    "/run-risk-evaluation",
    response_model=RiskEvaluationSummary,
    tags=["Risk Engine"],
)
async def trigger_risk_evaluation() -> RiskEvaluationSummary:
    """Trigger a full system-wide risk evaluation for all active students.
    
    This endpoint calls the underlying risk engine to:
    1. Load active thresholds.
    2. Aggregate data for every active student.
    3. Apply multi-factor scoring rules.
    4. Persist result snapshots to PostgreSQL.
    
    Returns:
        RiskEvaluationSummary with counts of GREEN, YELLOW, and RED students.
        
    Raises:
        500: If the evaluation engine fails.
    """
    logger.info("POST /run-risk-evaluation — batch process triggered.")
    try:
        summary = run_risk_evaluation()
        logger.info(
            "/run-risk-evaluation — complete | run_id=%s | total=%d",
            summary["evaluation_run_id"],
            summary["total_students"],
        )
        return RiskEvaluationSummary(**summary)
    except Exception as e:
        logger.error("/run-risk-evaluation — batch failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Risk evaluation engine failed to complete batch process.",
        )


# ─────────────────────────────────────────────
# Uvicorn entry point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.rag.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
