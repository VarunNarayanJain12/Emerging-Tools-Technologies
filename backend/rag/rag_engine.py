"""
rag_engine.py

Purpose: Core RAG pipeline for the Academic Early Warning System.
         Fetches student context from PostgreSQL, retrieves relevant
         institutional policy chunks from ChromaDB, builds a structured
         prompt, calls the Groq LLM, and returns a structured explanation.

Run standalone (smoke test):
    python -m backend.rag.rag_engine <student_id>
"""

import logging
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# ── sys.path fix so this module resolves backend.db regardless of CWD ──────
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.db.db_connection import get_connection  # noqa: E402 (after sys.path)
from backend.rag.vector_store import semantic_search  # noqa: E402

# ─────────────────────────────────────────────
# Environment
# ─────────────────────────────────────────────

# Load .env from the rag/ folder so GROQ_API_KEY is available
_ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────

GROQ_MODEL: str = "llama-3.1-8b-instant"
GROQ_MAX_TOKENS: int = 1024
PROMPT_CHAR_LIMIT: int = 3500

SYSTEM_MESSAGE: str = (
    "You are an academic counsellor assistant for an Indian engineering college. "
    "You explain student risk factors clearly and suggest specific, actionable "
    "interventions grounded in institutional policy. Be direct, empathetic, and practical."
)

# ─────────────────────────────────────────────
# PART A — Student Context from PostgreSQL
# ─────────────────────────────────────────────


def get_student_context(student_id: str) -> dict[str, Any] | None:
    """Fetch all academic data for a student from PostgreSQL.

    Executes 5 queries in a single connection to retrieve the student's
    basic profile, current risk assessment, attendance history, assessment
    scores, and subject attempt records.

    Args:
        student_id: The unique student identifier (matches students.student_id).

    Returns:
        A structured dict with keys:
            - 'student'      : dict with basic student info
            - 'risk_profile' : dict with current risk flags and score, or None
            - 'attendance'   : list of up to 5 recent attendance records
            - 'assessments'  : list of up to 10 recent assessment records
            - 'attempts'     : list of all subject attempt records
            - 'sessions'     : list of up to 3 recent counselling sessions
            - 'notifications': list of up to 5 recent notification logs
        Returns None if the student_id does not exist in the students table.

    Raises:
        RuntimeError: If the database connection or any query fails unexpectedly.
    """
    logger.info("Fetching student context for student_id='%s'", student_id)

    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # ── Query 1: Current risk profile ──────────────────────────────────
        cur.execute(
            """
            SELECT student_id, attendance_risk, performance_risk,
                   attempt_risk, fee_risk, risk_score, risk_category,
                   rule_version, reason_json, last_evaluated_at
            FROM risk_profiles
            WHERE student_id = %s AND is_current = TRUE
            LIMIT 1
            """,
            (student_id,),
        )
        risk_row = cur.fetchone()
        risk_profile: dict[str, Any] | None = None
        if risk_row:
            risk_profile = {
                "student_id": risk_row[0],
                "attendance_risk": risk_row[1],
                "performance_risk": risk_row[2],
                "attempt_risk": risk_row[3],
                "fee_risk": risk_row[4],
                "risk_score": risk_row[5],
                "risk_category": risk_row[6],
                "rule_version": risk_row[7],
                "reason_json": risk_row[8],
                "last_evaluated_at": str(risk_row[9]) if risk_row[9] else None,
            }

        # ── Query 2: Student basic info ────────────────────────────────────
        cur.execute(
            """
            SELECT student_id, full_name, class, section,
                   department, enrollment_year, status
            FROM students
            WHERE student_id = %s
            """,
            (student_id,),
        )
        student_row = cur.fetchone()
        if student_row is None:
            logger.warning("Student '%s' not found in students table.", student_id)
            return None

        student_info: dict[str, Any] = {
            "student_id": student_row[0],
            "full_name": student_row[1],
            "class": student_row[2],
            "section": student_row[3],
            "department": student_row[4],
            "enrollment_year": student_row[5],
            "status": student_row[6],
        }

        # ── Query 3: Latest 5 attendance records ───────────────────────────
        cur.execute(
            """
            SELECT subject_code, attendance_percentage,
                   period_start, period_end
            FROM attendance_records
            WHERE student_id = %s
            ORDER BY period_end DESC LIMIT 5
            """,
            (student_id,),
        )
        attendance: list[dict[str, Any]] = [
            {
                "subject_code": r[0],
                "attendance_percentage": float(r[1]),
                "period_start": str(r[2]),
                "period_end": str(r[3]),
            }
            for r in cur.fetchall()
        ]

        # ── Query 4: Latest 10 assessment records ──────────────────────────
        cur.execute(
            """
            SELECT subject_code, assessment_name, assessment_type,
                   assessment_percentage, assessment_date
            FROM assessment_records
            WHERE student_id = %s
            ORDER BY assessment_date DESC LIMIT 10
            """,
            (student_id,),
        )
        assessments: list[dict[str, Any]] = [
            {
                "subject_code": r[0],
                "assessment_name": r[1],
                "assessment_type": r[2],
                "assessment_percentage": float(r[3]) if r[3] is not None else None,
                "assessment_date": str(r[4]),
            }
            for r in cur.fetchall()
        ]

        # ── Query 5: Subject attempts ──────────────────────────────────────
        cur.execute(
            """
            SELECT subject_code, attempts_used,
                   max_attempts_allowed, status
            FROM subject_attempts
            WHERE student_id = %s
            """,
            (student_id,),
        )
        attempts: list[dict[str, Any]] = [
            {
                "subject_code": r[0],
                "attempts_used": r[1],
                "max_attempts_allowed": r[2],
                "status": r[3],
            }
            for r in cur.fetchall()
        ]

        # ── Query 6: Counselling sessions ──────────────────────────────────
        cur.execute(
            """
            SELECT session_date, session_duration_minutes, session_type, topics_discussed, counsellor_id
            FROM counselling_sessions
            WHERE student_id = %s
            ORDER BY session_date DESC LIMIT 3
            """,
            (student_id,),
        )
        sessions: list[dict[str, Any]] = [
            {
                "session_date": str(r[0]),
                "session_duration_minutes": r[1],
                "session_type": r[2],
                "topics_discussed": r[3],
                "counsellor_id": r[4],
            }
            for r in cur.fetchall()
        ]

        # ── Query 7: Notification logs ─────────────────────────────────────
        cur.execute(
            """
            SELECT message_summary, notification_channel, created_at, risk_category
            FROM notification_logs
            WHERE student_id = %s
            ORDER BY created_at DESC LIMIT 5
            """,
            (student_id,),
        )
        notifications: list[dict[str, Any]] = [
            {
                "message": r[0],
                "channel": r[1],
                "created_at": str(r[2]),
                "risk_category": r[3],
            }
            for r in cur.fetchall()
        ]

        logger.info(
            "Context fetched for '%s': risk=%s | attendance_rows=%d | "
            "assessment_rows=%d | attempt_rows=%d",
            student_id,
            risk_profile["risk_category"] if risk_profile else "N/A",
            len(attendance),
            len(assessments),
            len(attempts),
        )

        return {
            "student": student_info,
            "risk_profile": risk_profile,
            "attendance": attendance,
            "assessments": assessments,
            "attempts": attempts,
            "sessions": sessions,
            "notifications": notifications,
        }

    except Exception as e:
        logger.error("Database error fetching context for '%s': %s", student_id, e)
        raise RuntimeError(f"Failed to fetch student context: {e}") from e

    finally:
        if conn:
            conn.close()
            logger.debug("DB connection closed for student_id='%s'.", student_id)


# ─────────────────────────────────────────────
# PART B — Prompt Builder
# ─────────────────────────────────────────────


def build_prompt(
    student_context: dict[str, Any],
    mentor_question: str,
    retrieved_policies: list[dict[str, Any]],
) -> str:
    """Build a structured LLM prompt from student context and retrieved policies.

    Formats student academic data into clearly labelled sections and appends
    relevant policy chunks, then closes with the mentor's actual question.
    The total prompt is clamped to PROMPT_CHAR_LIMIT characters to stay
    within the LLM's context budget.

    Args:
        student_context:    The dict returned by get_student_context().
        mentor_question:    The natural language question from the mentor.
        retrieved_policies: List of policy chunk dicts from semantic_search().

    Returns:
        A formatted prompt string ready to pass to query_llm().
    """
    student = student_context["student"]
    risk = student_context["risk_profile"]
    attendance_records = student_context["attendance"]
    assessment_records = student_context["assessments"]
    attempt_records = student_context["attempts"]

    # ── Compute averages and trend ─────────────────────────────────────────

    avg_attendance: float = 0.0
    if attendance_records:
        avg_attendance = round(
            sum(r["attendance_percentage"] for r in attendance_records)
            / len(attendance_records),
            1,
        )

    valid_pct = [
        r["assessment_percentage"]
        for r in assessment_records
        if r["assessment_percentage"] is not None
    ]
    avg_assessment: float = 0.0
    trend_note: str = "insufficient data"
    if valid_pct:
        avg_assessment = round(sum(valid_pct) / len(valid_pct), 1)
        # Compare first half (older) vs second half (recent) — records are DESC
        if len(valid_pct) >= 4:
            mid = len(valid_pct) // 2
            recent_avg = sum(valid_pct[:mid]) / mid          # most recent
            older_avg = sum(valid_pct[mid:]) / (len(valid_pct) - mid)
            diff = recent_avg - older_avg
            if diff < -5:
                trend_note = f"declining (recent avg {round(recent_avg,1)}% vs older {round(older_avg,1)}%)"
            elif diff > 5:
                trend_note = f"improving (recent avg {round(recent_avg,1)}% vs older {round(older_avg,1)}%)"
            else:
                trend_note = f"stable (~{round(recent_avg,1)}%)"
        else:
            trend_note = f"avg {avg_assessment}%"

    exhausted = [a for a in attempt_records if a["status"] == "exhausted"]

    # ── Identify triggered flags ───────────────────────────────────────────
    flags: list[str] = []
    if risk:
        if risk.get("attendance_risk"):
            flags.append("attendance_risk")
        if risk.get("performance_risk"):
            flags.append("performance_risk")
        if risk.get("attempt_risk"):
            flags.append("attempt_risk")
        if risk.get("fee_risk"):
            flags.append("fee_risk")

    # ── Build prompt sections ──────────────────────────────────────────────
    sections: list[str] = []

    # Header
    sections.append(
        f"=== STUDENT PROFILE ===\n"
        f"Name       : {student['full_name']}\n"
        f"ID         : {student['student_id']}\n"
        f"Class      : {student['class']}"
        + (f", Section {student['section']}" if student.get("section") else "")
        + f"\nDepartment : {student['department']}\n"
        f"Enroll Year: {student['enrollment_year']}\n"
        f"Status     : {student['status']}"
    )

    # Risk summary
    if risk:
        reason = risk.get("reason_json") or {}
        explanation_line = reason.get("explanation", "No explanation recorded.")
        sections.append(
            f"\n=== RISK ASSESSMENT ===\n"
            f"Category  : {risk['risk_category']}\n"
            f"Score     : {risk['risk_score']}/100\n"
            f"Flags     : {', '.join(flags) if flags else 'none'}\n"
            f"Summary   : {explanation_line[:300]}"
        )
    else:
        sections.append("\n=== RISK ASSESSMENT ===\nNo risk profile available yet.")

    # Attendance
    sections.append(
        f"\n=== ATTENDANCE ===\n"
        f"Average across recent subjects: {avg_attendance}%\n"
        + "\n".join(
            f"  {r['subject_code']}: {r['attendance_percentage']}% "
            f"({r['period_start']} to {r['period_end']})"
            for r in attendance_records[:3]           # keep prompt tight
        )
    )

    # Assessments
    sections.append(
        f"\n=== ASSESSMENT SCORES ===\n"
        f"Trend: {trend_note}\n"
        + "\n".join(
            f"  {r['subject_code']} | {r['assessment_name']} "
            f"({r['assessment_type']}): {r['assessment_percentage']}% on {r['assessment_date']}"
            for r in assessment_records[:5]
        )
    )

    # Attempts
    if attempt_records:
        sections.append(
            f"\n=== SUBJECT ATTEMPTS ===\n"
            f"Exhausted subjects: {len(exhausted)}\n"
            + "\n".join(
                f"  {a['subject_code']}: {a['attempts_used']}/{a['max_attempts_allowed']} "
                f"({a['status']})"
                for a in attempt_records[:4]
            )
        )

    # Policy chunks
    if retrieved_policies:
        policy_text_parts: list[str] = ["\n=== RELEVANT INSTITUTIONAL POLICIES ==="]
        for pol in retrieved_policies:
            snippet = pol["text"][:350].strip()
            policy_text_parts.append(f"\n[{pol['title']}]\n{snippet}")
        sections.append("\n".join(policy_text_parts))

    # Mentor question
    sections.append(f"\n=== MENTOR QUESTION ===\n{mentor_question}")

    full_prompt = "\n".join(sections)

    # Clamp to character limit
    if len(full_prompt) > PROMPT_CHAR_LIMIT:
        full_prompt = full_prompt[: PROMPT_CHAR_LIMIT - 50] + "\n...[truncated for length]"
        logger.debug("Prompt truncated to %d chars.", PROMPT_CHAR_LIMIT)

    logger.info(
        "Prompt built: %d chars | flags=%s | policies=%d",
        len(full_prompt),
        flags,
        len(retrieved_policies),
    )
    return full_prompt


# ─────────────────────────────────────────────
# PART C — Groq LLM Call
# ─────────────────────────────────────────────


def query_llm(prompt: str, conversation_history: list[dict] | None = None) -> str:
    """Send a prompt to the Groq LLM and return the response text.

    Reads GROQ_API_KEY from the .env file in backend/rag/.
    Uses the llama-3.1-8b-instant model with a fixed system message that
    frames the assistant as an academic counsellor for an Indian
    engineering college.

    Args:
        prompt:               The fully constructed prompt string from build_prompt().
        conversation_history: Optional list of prior turns [{role, content}] for
                              multi-turn context. Prepended before the current prompt
                              so the LLM can answer follow-up questions coherently.
                              If empty or None, behaviour is identical to before.

    Returns:
        The LLM's response as a plain string.

    Raises:
        EnvironmentError: If GROQ_API_KEY is not set in .env.
        RuntimeError:     If the Groq API call fails.
    """
    from groq import Groq  # imported here so the module loads even without groq installed

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "GROQ_API_KEY is not set. "
            "Add it to backend/rag/.env — see .env.example for the format."
        )

    # Build messages list: system → prior turns → current prompt
    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_MESSAGE}]

    if conversation_history:
        # Sanitise: only keep role/content, limit to last 10 turns to avoid token overflow
        for turn in conversation_history[-10:]:
            role = turn.get("role", "user")
            content = str(turn.get("content", ""))
            if role in ("user", "assistant") and content.strip():
                messages.append({"role": role, "content": content})
        logger.info(
            "Multi-turn context: %d prior turn(s) prepended.", len(messages) - 1
        )

    messages.append({"role": "user", "content": prompt})

    logger.info("Calling Groq API | model=%s | prompt_chars=%d | messages=%d",
                GROQ_MODEL, len(prompt), len(messages))

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            max_tokens=GROQ_MAX_TOKENS,
            messages=messages,
        )
        content: str = response.choices[0].message.content
        logger.info(
            "Groq response received | tokens_used=%s | response_chars=%d",
            getattr(response.usage, "total_tokens", "unknown"),
            len(content),
        )
        return content

    except Exception as e:
        logger.error("Groq API call failed: %s", e)
        raise RuntimeError(f"LLM query failed: {e}") from e


# ─────────────────────────────────────────────
# PART D — Orchestrator
# ─────────────────────────────────────────────


def explain_student_risk(
    student_id: str,
    question: str,
    conversation_history: list[dict] | None = None,
) -> dict[str, Any]:
    """Full RAG pipeline: fetch → retrieve policies → build prompt → LLM → return.

    Runs two semantic searches against ChromaDB:
        1. The mentor's literal question (what they're asking about).
        2. A generated intervention query based on the student's risk category
           (surfaces general intervention guidance even if the question is narrow).

    Both result sets are deduplicated by chunk title and merged before
    building the prompt.

    Args:
        student_id: The student's unique ID.
        question:   The mentor's natural language question, e.g.
                    "Why is this student at risk and what should we do?"

    Returns:
        A structured dict with:
            - 'student_id'      (str):   The queried student ID.
            - 'student_name'    (str):   Full name from the students table.
            - 'risk_category'   (str):   'GREEN', 'YELLOW', or 'RED'.
            - 'risk_score'      (int):   0–100.
            - 'explanation'     (str):   LLM-generated response.
            - 'policies_used'   (list):  Titles of policy chunks used in the prompt.
            - 'student_summary' (dict):  avg_attendance, avg_assessment_score,
                                         flags_triggered.

    Raises:
        ValueError:   If student_id does not exist in the database.
        RuntimeError: If any downstream step (DB, ChromaDB, Groq) fails.
    """
    logger.info(
        "explain_student_risk called | student_id='%s' | question='%s'",
        student_id,
        question[:80],
    )

    # ── Step 1: Fetch student context from PostgreSQL ──────────────────────
    context = get_student_context(student_id)
    if context is None:
        raise ValueError(
            f"Student '{student_id}' not found in the database. "
            "Ensure the student_id is correct and the student is enrolled."
        )

    risk_profile = context["risk_profile"]
    risk_category: str = risk_profile["risk_category"] if risk_profile else "UNKNOWN"
    risk_score: int = risk_profile["risk_score"] if risk_profile else 0

    # ── Step 2: Dual semantic search ──────────────────────────────────────
    logger.info("Running semantic search 1: mentor question")
    results_question: list[dict[str, Any]] = semantic_search(
        query=question, top_k=3
    )

    intervention_query = f"intervention for {risk_category} risk student"
    logger.info("Running semantic search 2: '%s'", intervention_query)
    results_intervention: list[dict[str, Any]] = semantic_search(
        query=intervention_query, top_k=2
    )

    # ── Step 3: Deduplicate by title ───────────────────────────────────────
    seen_titles: set[str] = set()
    combined_policies: list[dict[str, Any]] = []
    for chunk in results_question + results_intervention:
        title_key = chunk.get("title", "")
        if title_key not in seen_titles:
            seen_titles.add(title_key)
            combined_policies.append(chunk)

    logger.info(
        "Policies after deduplication: %d unique chunk(s)", len(combined_policies)
    )

    # ── Step 4: Build prompt ───────────────────────────────────────────────
    prompt = build_prompt(
        student_context=context,
        mentor_question=question,
        retrieved_policies=combined_policies,
    )

    # ── Step 5: Call LLM (with optional multi-turn context) ───────────────
    explanation = query_llm(prompt, conversation_history=conversation_history or [])

    # ── Step 6: Compute summary stats for the response ────────────────────
    attendance_records = context["attendance"]
    assessment_records = context["assessments"]

    avg_attendance: float = 0.0
    if attendance_records:
        avg_attendance = round(
            sum(r["attendance_percentage"] for r in attendance_records)
            / len(attendance_records),
            1,
        )

    valid_pct = [
        r["assessment_percentage"]
        for r in assessment_records
        if r["assessment_percentage"] is not None
    ]
    avg_assessment: float = round(sum(valid_pct) / len(valid_pct), 1) if valid_pct else 0.0

    flags_triggered: list[str] = []
    if risk_profile:
        for flag in ("attendance_risk", "performance_risk", "attempt_risk", "fee_risk"):
            if risk_profile.get(flag):
                flags_triggered.append(flag)

    return {
        "student_id": student_id,
        "student_name": context["student"]["full_name"],
        "risk_category": risk_category,
        "risk_score": risk_score,
        "explanation": explanation,
        "policies_used": [p["title"] for p in combined_policies],
        "student_summary": {
            "avg_attendance": avg_attendance,
            "avg_assessment_score": avg_assessment,
            "flags_triggered": flags_triggered,
        },
    }


# ─────────────────────────────────────────────
# Standalone smoke test
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import json

    if len(sys.argv) < 2:
        print("Usage: python -m backend.rag.rag_engine <student_id>")
        sys.exit(1)

    test_student_id = sys.argv[1]
    test_question = (
        sys.argv[2]
        if len(sys.argv) > 2
        else "Why is this student at risk and what interventions do you recommend?"
    )

    print(f"\n{'='*60}")
    print(f"  RAG Engine Smoke Test — student_id: {test_student_id}")
    print(f"{'='*60}\n")

    try:
        result = explain_student_risk(test_student_id, test_question)
        print(json.dumps(result, indent=2, default=str))
    except ValueError as e:
        print(f"❌ Student not found: {e}")
    except RuntimeError as e:
        print(f"❌ Pipeline error: {e}")
