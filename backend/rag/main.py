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
import json
import os
import sys
from datetime import datetime
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
from backend.risk_engine.risk_scorer import (                 # noqa: E402
    calculate_all_risks,
    calculate_and_persist_risk,
)
import asyncio

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
    conversation_history: list[dict] = Field(
        default_factory=list,
        description="Previous turns [{role, content}] for multi-turn context.",
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
    """Unified summary for risk evaluation runs and dashboard stats."""
    total_students: int
    green: int
    yellow: int
    red: int
    evaluation_run_id: str | None = None
    rule_version: str | None = None
    last_updated: datetime | None = None

# Alias for compatibility if needed elsewhere
RiskSummaryDetail = RiskEvaluationSummary


class RiskScoreResponse(BaseModel):
    """Response for risk score calculation."""
    student_id: str
    risk_score: float
    risk_category: str
    last_calculated_at: datetime = Field(default_factory=datetime.now)


class StudentListItem(BaseModel):
    """Item for student listing."""

    student_id: str
    full_name: str
    roll_number: str
    department: str
    status: str
    risk_score: float | None = None
    risk_category: str | None = None


class StudentsListResponse(BaseModel):
    """Response for GET /students."""

    students: list[StudentListItem]
    total: int


@app.api_route("/", methods=["GET", "HEAD"], tags=["Monitoring"])
async def root():
    """Root endpoint for Render health checks."""
    return {
        "status": "ok",
        "message": "Academic Early Warning System API is running.",
        "timestamp": datetime.now().isoformat()
    }


# ─────────────────────────────────────────────
# Startup event
# ─────────────────────────────────────────────


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize system components asynchronously on application startup.

    Defers heavy tasks like policy embedding to background tasks to avoid
    blocking the main event loop and ensuring fast port binding (< 5s).
    """
    logger.info("Application startup: deferred initialization started.")

    async def background_initialization():
        # WAIT for Render to see the port!
        # Giving 12 seconds for port scan and health checks to pass.
        logger.info("Background Startup: waiting 12s before starting heavy model load...")
        await asyncio.sleep(12)
        
        logger.info("Background Startup: starting policy vector store initialization...")
        try:
            chunks_loaded = await asyncio.to_thread(ensure_policies_loaded)
            if chunks_loaded > 0:
                logger.info("Background Startup: loaded %d new policy chunk(s).", chunks_loaded)
            else:
                logger.info("Background Startup: policies already in ChromaDB.")
        except Exception as e:
            logger.error("Background Startup: policy loading failed — %s", e)

    # Fire and forget the heavy lifting
    asyncio.create_task(background_initialization())
    logger.info("Application startup: server ready for requests — port binding should follow.")


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


@app.get("/risk-evaluation/summary", tags=["Admin"])
async def get_risk_evaluation_summary() -> RiskSummaryDetail:
    """Get the current aggregate risk statistics from the pre-computed table."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN risk_category = 'GREEN' THEN 1 ELSE 0 END),
                SUM(CASE WHEN risk_category = 'YELLOW' THEN 1 ELSE 0 END),
                SUM(CASE WHEN risk_category = 'RED' THEN 1 ELSE 0 END),
                MAX(last_calculated_at)
            FROM risk_scores
        """)
        row = cur.fetchone()
        return RiskEvaluationSummary(
            total_students=int(row[0] or 0),
            green=int(row[1] or 0),
            yellow=int(row[2] or 0),
            red=int(row[3] or 0),
            last_updated=row[4]
        )
    finally:
        cur.close()
        conn.close()


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
            "SELECT s.student_id, s.full_name, s.roll_number, s.department, s.status, "
            "       rs.overall_risk_score, rs.risk_category "
            "FROM students s "
            "LEFT JOIN risk_scores rs ON s.student_id = rs.student_id "
            "WHERE s.status = 'active'"
        )
        rows = cur.fetchall()
        
        students = [
            StudentListItem(
                student_id=row[0],
                full_name=row[1],
                roll_number=row[2],
                department=row[3],
                status=row[4],
                risk_score=row[5],
                risk_category=row[6]
            )
            for row in rows
        ]

        logger.info("GET /students — returned %d student(s) with pre-computed risk.", len(students))
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
    # Refactor context to use risk_scores for speed
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT overall_risk_score, risk_category, component_scores, last_calculated_at 
                FROM risk_scores WHERE student_id = %s
            """, (student_id,))
            risk_row = cur.fetchone()
            
            if risk_row:
                risk_data = risk_row[2]
                if isinstance(risk_data, str):
                    try:
                        risk_data = json.loads(risk_data)
                    except:
                        risk_data = {}

                context["risk_profile"] = {
                    "risk_score": risk_row[0],
                    "risk_category": risk_row[1],
                    "updated_at": risk_row[3],
                    "attendance_risk": risk_data.get('attendance_risk', {}).get('triggered', False),
                    "performance_risk": risk_data.get('performance_risk', {}).get('triggered', False),
                    "attempt_risk": risk_data.get('attempt_risk', {}).get('triggered', False),
                    "fee_risk": risk_data.get('fee_risk', {}).get('triggered', False)
                }
    finally:
        conn.close()
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
            conversation_history=body.conversation_history,
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
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT s.full_name, rs.risk_category, rs.overall_risk_score, "
            "       rs.component_scores, rs.last_calculated_at "
            "FROM students s "
            "LEFT JOIN risk_scores rs ON s.student_id = rs.student_id "
            "WHERE s.student_id = %s",
            (student_id,)
        )
        row = cur.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail=f"Student {student_id} not found.")

        # If no risk score yet, return defaults
        name, category, score, component_scores, last_calc = row
        
        # Parse component_scores if it's a string
        if isinstance(component_scores, str):
            try:
                component_scores = json.loads(component_scores)
            except:
                component_scores = {}

        # Calculate flags from component_scores if present
        flags_triggered = []
        if component_scores:
            for flag, data in component_scores.items():
                if isinstance(data, dict) and data.get("triggered"):
                    flags_triggered.append(flag)

        # Get avg attendance from component_scores
        avg_attendance = None
        if component_scores and "attendance_risk" in component_scores:
            avg_attendance = component_scores["attendance_risk"].get("value")

        return StudentSummary(
            student_id=student_id,
            student_name=name,
            risk_category=category,
            risk_score=int(score) if score is not None else None,
            flags_triggered=flags_triggered,
            avg_attendance=avg_attendance,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("/students/%s/summary — error: %s", student_id, e)
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch student summary. Please try again later.",
        )
    finally:
        if 'conn' in locals() and conn:
            conn.close()


# ─────────────────────────────────────────────
# ENDPOINT 5 — Trigger risk evaluation batch
# ─────────────────────────────────────────────


@app.post(
    "/run-risk-evaluation",
    response_model=RiskEvaluationSummary,
    tags=["Risk Engine"],
)
async def trigger_risk_evaluation() -> RiskEvaluationSummary:
    """Trigger a full system-wide risk evaluation for all active students."""
    logger.info("POST /run-risk-evaluation — batch process triggered.")
    try:
        summary = calculate_all_risks(trigger='manual_recalc')
        return RiskEvaluationSummary(
            total_students=summary["total_students"],
            green=summary["green"],
            yellow=summary["yellow"],
            red=summary["red"],
            evaluation_run_id=summary["evaluation_run_id"],
            rule_version=summary["rule_version"],
            last_updated=datetime.now()
        )
    except Exception as e:
        logger.error("/run-risk-evaluation — batch failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Risk evaluation engine failed to complete batch process.",
        )


@app.post(
    "/students/{student_id}/recalculate-risk",
    response_model=RiskScoreResponse,
    tags=["Risk Engine"],
)
async def recalculate_student_risk(student_id: str) -> RiskScoreResponse:
    """Manually trigger a priority risk recalculation for a single student."""
    logger.info("POST /students/%s/recalculate-risk", student_id)
    try:
        result = calculate_and_persist_risk(student_id, trigger='manual_recalc')
        return RiskScoreResponse(
            student_id=student_id,
            risk_score=result["risk_score"],
            risk_category=result["risk_category"]
        )
    except Exception as e:
        logger.error("Recalculate failed for student %s: %s", student_id, e)
        raise HTTPException(status_code=500, detail="Recalculation failed.")


@app.post(
    "/admin/recalculate-all-risks",
    response_model=RiskEvaluationSummary,
    tags=["Risk Engine"],
)
async def bulk_recalculate_risks() -> RiskEvaluationSummary:
    """Manually trigger a priority risk recalculation for ALL students."""
    logger.info("POST /admin/recalculate-all-risks")
    try:
        summary = calculate_all_risks(trigger='manual_recalc')
        return RiskEvaluationSummary(
            total_students=summary["total_students"],
            green=summary["green"],
            yellow=summary["yellow"],
            red=summary["red"],
            evaluation_run_id=summary["evaluation_run_id"],
            rule_version=summary["rule_version"],
            last_updated=datetime.now()
        )
    except Exception as e:
        logger.error("Bulk recalculation failed: %s", e)
        raise HTTPException(status_code=500, detail="Bulk recalculation failed.")


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
