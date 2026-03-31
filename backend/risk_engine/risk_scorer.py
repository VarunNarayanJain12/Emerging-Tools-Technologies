"""
risk_scorer.py

Purpose: Automated risk scoring engine for the Academic Early Warning System.
          Evaluates student data against active institutional rules and
          persists results to the risk_profiles table.
"""

import logging
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

# Ensure backend modules are resolvable
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.db.db_connection import get_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)


def seed_default_rules() -> None:
    """Check if any active risk evaluation rules exist; if not, insert defaults.
    
    Ensures the system has at least one 'v1.0' rule set to operate against.
    Uses ON CONFLICT to avoid duplicate version errors.
    """
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Check for active rules
        cur.execute("SELECT COUNT(*) FROM risk_evaluation_rules WHERE is_active = TRUE")
        if cur.fetchone()[0] == 0:
            logger.info("No active risk rules found. Seeding default v1.0 rules...")
            
            insert_sql = """
            INSERT INTO risk_evaluation_rules (
                rule_version, rule_name, attendance_threshold,
                performance_threshold, attempt_exhaustion_threshold,
                fee_overdue_threshold, description, is_active,
                updated_by
            ) VALUES (
                'v1.0',
                'Default SIH Rules',
                75, 60.0, 80, 30,
                'Initial rule set based on PS requirements',
                TRUE,
                'system'
            ) ON CONFLICT (rule_version) DO NOTHING
            """
            cur.execute(insert_sql)
            conn.commit()
            logger.info("Default rules seeded successfully.")
        else:
            logger.info("Active risk rules already exist. Skipping seed.")
            
    except Exception as e:
        logger.error("Failed to seed default rules: %s", e)
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()


def load_active_rules() -> Dict[str, Any]:
    """Retrieve the currently active risk evaluation rules from the database.
    
    Returns:
        Dict[str, Any]: A dictionary containing thresholds and rule metadata.
        
    Raises:
        RuntimeError: If no active rules are found.
    """
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        query = """
        SELECT 
            rule_version, 
            attendance_threshold, 
            performance_threshold, 
            attempt_exhaustion_threshold, 
            fee_overdue_threshold
        FROM risk_evaluation_rules 
        WHERE is_active = TRUE 
        LIMIT 1
        """
        cur.execute(query)
        row = cur.fetchone()
        
        if not row:
            raise RuntimeError("No active risk evaluation rules found in the database.")
            
        rules = {
            "rule_version": row[0],
            "attendance_threshold": row[1],
            "performance_threshold": float(row[2]),
            "attempt_exhaustion_threshold": row[3],
            "fee_overdue_threshold": row[4],
        }
        logger.info("Loaded active rules version: %s", rules["rule_version"])
        return rules
        
    except Exception as e:
        logger.error("Error loading active rules: %s", e)
        raise
    finally:
        if conn:
            conn.close()


def get_all_active_students() -> List[str]:
    """Fetch a list of all students currently marked as 'active'.
    
    Returns:
        List[str]: A list of student_id strings.
    """
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT student_id FROM students WHERE status = 'active'")
        students = [row[0] for row in cur.fetchall()]
        logger.info("Found %d active students to evaluate.", len(students))
        return students
    except Exception as e:
        logger.error("Error fetching active students: %s", e)
        return []
    finally:
        if conn:
            conn.close()


def gather_student_data(student_id: str, conn=None) -> Dict[str, Any]:
    """Collect all relevant academic and financial data for a specific student.
    
    Args:
        student_id (str): The identifier for the student.
        conn: Optional shared database connection.
        
    Returns:
        Dict[str, Any]: Aggregated data needed for scoring.
    """
    inner_conn = conn or get_connection()
    data = {"attendance": [], "assessments": [], "attempts": [], "fees": []}
    
    try:
        cur = inner_conn.cursor()
        
        # A: Latest attendance per subject
        cur.execute("""
            SELECT subject_code, attendance_percentage 
            FROM attendance_records 
            WHERE student_id = %s 
            ORDER BY period_end DESC
        """, (student_id,))
        data["attendance"] = [{"subject": r[0], "pct": float(r[1])} for r in cur.fetchall()]
        
        # B: Assessment scores (history)
        cur.execute("""
            SELECT assessment_percentage, assessment_date 
            FROM assessment_records 
            WHERE student_id = %s 
            ORDER BY assessment_date DESC
        """, (student_id,))
        data["assessments"] = [{"pct": float(r[0]), "date": r[1]} for r in cur.fetchall()]
        
        # C: Subject attempts
        cur.execute("""
            SELECT attempts_used, max_attempts_allowed 
            FROM subject_attempts 
            WHERE student_id = %s
        """, (student_id,))
        data["attempts"] = [{"used": r[0], "max": r[1]} for r in cur.fetchall()]
        
        # D: Overdue fees
        cur.execute("""
            SELECT due_date, payment_status 
            FROM fee_records 
            WHERE student_id = %s AND payment_status = 'overdue'
        """, (student_id,))
        data["fees"] = [{"due_date": r[0]} for r in cur.fetchall()]
        
        return data
        
    except Exception as e:
        logger.error("Error gathering data for student %s: %s", student_id, e)
        return data
    finally:
        if conn is None: # Only close if we opened it ourselves
            inner_conn.close()


def score_student(student_data: Dict[str, Any], rules: Dict[str, Any]) -> Dict[str, Any]:
    """Apply scoring logic to a student's data using active thresholds.
    
    Args:
        student_data (Dict[str, Any]): Data collected via gather_student_data().
        rules (Dict[str, Any]): Thresholds loaded via load_active_rules().
        
    Returns:
        Dict[str, Any]: Calculated risk_score, flags, and justification.
    """
    risk_score = 0
    attendance_risk = False
    performance_risk = False
    attempt_risk = False
    fee_risk = False
    reason_json = {}
    
    # ── 1. Attendance Rule ──────────────────────────────────────────────────
    if student_data["attendance"]:
        avg_att = sum(r["pct"] for r in student_data["attendance"]) / len(student_data["attendance"])
        if avg_att < rules["attendance_threshold"]:
            attendance_risk = True
            if avg_att < 60:
                risk_score += 40
            else:
                risk_score += 25
            reason_json["attendance_risk"] = {
                "value": round(avg_att, 2),
                "threshold": rules["attendance_threshold"],
                "triggered": True
            }
            
    # ── 2. Performance Rule ──────────────────────────────────────────────────
    if student_data["assessments"]:
        scores = [r["pct"] for r in student_data["assessments"]]
        avg_score = sum(scores) / len(scores)
        if avg_score < rules["performance_threshold"]:
            performance_risk = True
            risk_score += 25
            reason_json["performance_risk"] = {
                "value": round(avg_score, 2),
                "threshold": rules["performance_threshold"],
                "triggered": True
            }
            
        # ── 3. Declining Trend Rule ──────────────────────────────────────────
        if len(scores) >= 4:
            mid = len(scores) // 2
            recent = sum(scores[:mid]) / mid
            older = sum(scores[mid:]) / (len(scores) - mid)
            if recent < (older - 15):
                risk_score += 15
                reason_json["declining_trend"] = {
                    "recent_avg": round(recent, 2),
                    "older_avg": round(older, 2),
                    "triggered": True
                }
                
    # ── 4. Attempt Rule ──────────────────────────────────────────────────────
    for attempt in student_data["attempts"]:
        pct = (attempt["used"] / attempt["max"]) * 100
        if pct > rules["attempt_exhaustion_threshold"]:
            attempt_risk = True
            risk_score += 30
            reason_json["attempt_risk"] = {
                "triggered": True,
                "threshold": rules["attempt_exhaustion_threshold"]
            }
            break  # Count once
            
    # ── 5. Fee Rule ──────────────────────────────────────────────────────────
    today = datetime.now().date()
    for fee in student_data["fees"]:
        days_overdue = (today - fee["due_date"]).days
        if days_overdue > rules["fee_overdue_threshold"]:
            fee_risk = True
            risk_score += 15
            reason_json["fee_risk"] = {
                "days_overdue": days_overdue,
                "threshold": rules["fee_overdue_threshold"],
                "triggered": True
            }
            break
            
    # Cap and Classify
    risk_score = min(risk_score, 100)
    category = "GREEN"
    if risk_score > 70:
        category = "RED"
    elif risk_score > 40:
        category = "YELLOW"
        
    return {
        "risk_score": float(risk_score),  # Ensure float for DB
        "risk_category": category,
        "attendance_risk": attendance_risk,
        "performance_risk": performance_risk,
        "attempt_risk": attempt_risk,
        "fee_risk": fee_risk,
        "reason_json": reason_json
    }


def calculate_and_persist_risk(student_id: str, trigger: str = 'manual_recalc', conn=None, rules=None) -> Dict[str, Any]:
    """Calculate risk for a student and persist to both profile and scores table.
    
    Args:
        student_id: The ID of the student to evaluate.
        trigger: The source of the trigger.
        conn: Optional shared connection.
        rules: Optional pre-loaded rules.
    """
    inner_conn = conn or get_connection()
    try:
        # Load rules if not provided
        active_rules = rules or load_active_rules()
        student_data = gather_student_data(student_id, inner_conn)
        result = score_student(student_data, active_rules)
        
        # 1. Save to legacy risk_profiles (Audit)
        save_risk_profile(student_id, result, active_rules["rule_version"], inner_conn)
        
        # 2. Save to new risk_scores (Dashboard)
        from json import dumps
        with inner_conn.cursor() as cur:
            upsert_query = """
            INSERT INTO risk_scores (
                student_id, overall_risk_score, risk_category, 
                component_scores, last_calculated_at, triggered_by
            ) VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, %s)
            ON CONFLICT (student_id) DO UPDATE SET
                overall_risk_score = EXCLUDED.overall_risk_score,
                risk_category = EXCLUDED.risk_category,
                component_scores = EXCLUDED.component_scores,
                last_calculated_at = CURRENT_TIMESTAMP,
                triggered_by = EXCLUDED.triggered_by;
            """
            params = (
                student_id,
                result["risk_score"],
                result["risk_category"],
                dumps(result["reason_json"]),
                trigger
            )
            cur.execute(upsert_query, params)
        inner_conn.commit()
        return result
    except Exception as e:
        logger.error("Failed to calculate/persist risk for student %s: %s", student_id, e)
        if conn is None: inner_conn.rollback()
        raise
    finally:
        if conn is None:
            inner_conn.close()


def calculate_all_risks(trigger: str = 'manual_recalc') -> Dict[str, Any]:
    """Execute the full risk evaluation pipeline for all active students.
    
    Optimized for batch processing by reusing the DB connection and caching rules.
    """
    seed_default_rules()
    rules = load_active_rules()
    student_ids = get_all_active_students()
    
    summary = {
        "total_students": len(student_ids),
        "green": 0, "yellow": 0, "red": 0,
        "evaluation_run_id": datetime.now().strftime("%Y-%m-%d_%H:%M:%S"),
        "rule_version": rules["rule_version"]
    }
    
    conn = get_connection()
    try:
        for sid in student_ids:
            try:
                # Pass connection and rules to avoid redundant re-loads
                result = calculate_and_persist_risk(sid, trigger=trigger, conn=conn, rules=rules)
                cat = result["risk_category"].lower()
                if cat in summary:
                    summary[cat] += 1
            except Exception as e:
                logger.error("Failed to evaluate student %s in batch: %s", sid, e)
                
        logger.info("Bulk evaluation complete: %s", summary)
        return summary
    finally:
        conn.close()

def run_risk_evaluation() -> Dict[str, Any]:
    """Legacy wrapper for backward compatibility."""
    return calculate_all_risks(trigger='manual_recalc')

def save_risk_profile(student_id: str, results: Dict[str, Any], rule_version: str, conn=None) -> None:
    """Persist the calculated risk profile to the audit database."""
    inner_conn = conn or get_connection()
    try:
        cur = inner_conn.cursor()
        
        # 1. Update old profiles
        cur.execute("""
            UPDATE risk_profiles 
            SET is_current = FALSE 
            WHERE student_id = %s AND is_current = TRUE
        """, (student_id,))
        
        # 2. Insert new profile
        from json import dumps
        eval_run_id = datetime.now().strftime("%Y-%m-%d_%H:%M:%S")
        
        query = """
        INSERT INTO risk_profiles (
            student_id, attendance_risk, performance_risk,
            attempt_risk, fee_risk, risk_score, risk_category,
            rule_version, evaluation_run_id, is_current, reason_json
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            student_id,
            results["attendance_risk"],
            results["performance_risk"],
            results["attempt_risk"],
            results["fee_risk"],
            results["risk_score"],
            results["risk_category"],
            rule_version,
            eval_run_id,
            True,
            dumps(results["reason_json"])
        )
        cur.execute(query, params)
        if conn is None: inner_conn.commit()
    except Exception as e:
        logger.error("Failed to save risk profile for student %s: %s", student_id, e)
        if conn is None: inner_conn.rollback()
    finally:
        if conn is None:
            inner_conn.close()

def run_risk_evaluation_deprecated() -> Dict[str, Any]:
    """Execute the full risk evaluation pipeline for all active students."""
    # REDUNDANT: calculate_all_risks is now the primary batch function.
    return calculate_all_risks()


def run_risk_evaluation() -> Dict[str, Any]:
    """Execute the full risk evaluation pipeline for all active students.
    
    This is a wrapper around calculate_all_risks for backward compatibility.
    """
    return calculate_all_risks(trigger='manual_recalc')


if __name__ == "__main__":
    import json
    logger.info("Starting manual risk evaluation...")
    summary = calculate_all_risks(trigger='manual_recalc')
    print("\n" + "="*50)
    print("RISK EVALUATION COMPLETE")
    print("="*50)
    print(json.dumps(summary, indent=2))
    print("="*50 + "\n")
