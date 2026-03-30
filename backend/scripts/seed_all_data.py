"""
seed_all_data.py — Comprehensive seed script for AcademicEWS v1.4.0

Seeds ALL 15 tables with realistic test data covering GREEN / YELLOW / RED risk scenarios.
Run from project root:
    python backend/scripts/seed_all_data.py
    python backend/scripts/seed_all_data.py --reset   # wipe then re-seed

Reads DB credentials from backend/rag/.env (sslmode=require for Supabase).
All inserts use ON CONFLICT DO NOTHING so the script is safely re-runnable.
"""

import argparse
import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / "rag" / ".env")

import psycopg2
from psycopg2.extras import Json

# ─────────────────────────────────────────────
# DB connection
# ─────────────────────────────────────────────

def get_conn():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        dbname=os.getenv("DB_NAME", "postgres"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        port=int(os.getenv("DB_PORT", "5432")),
        sslmode="require",
    )


# ─────────────────────────────────────────────
# Constants / helpers
# ─────────────────────────────────────────────

TODAY = date(2026, 3, 30)

def weeks_ago(n: int) -> date:
    return TODAY - timedelta(weeks=n)

def days_ago(n: int) -> date:
    return TODAY - timedelta(days=n)

def days_from_now(n: int) -> date:
    return TODAY + timedelta(days=n)


# ─────────────────────────────────────────────
# RESET — delete all rows in reverse FK order
# ─────────────────────────────────────────────

# Note: We NO LONGER delete from 'users' as per user request to preserve credentials.
RESET_SQL = """
DELETE FROM counselling_sessions;
DELETE FROM intervention_followups;
DELETE FROM interventions;
DELETE FROM notification_logs;
DELETE FROM risk_profiles;
DELETE FROM fee_records;
DELETE FROM subject_attempts;
DELETE FROM assessment_records;
DELETE FROM attendance_records;
DELETE FROM student_subjects;
DELETE FROM professor_subjects;
DELETE FROM user_students;
DELETE FROM students WHERE student_id LIKE 'STU%';
DELETE FROM risk_evaluation_rules WHERE rule_version = 'v1.0';
DELETE FROM subjects WHERE subject_code IN ('CS101','MATH101','PHY101','ENG101','DS201');
"""


# ─────────────────────────────────────────────
# TABLE 1 – subjects
# ─────────────────────────────────────────────

SUBJECTS = [
    ("CS101",   "Introduction to Programming",      "CS"),
    ("MATH101", "Engineering Mathematics I",         "MATH"),
    ("PHY101",  "Engineering Physics",               "PHY"),
    ("ENG101",  "Technical Communication",           "ENG"),
    ("DS201",   "Data Structures and Algorithms",   "CS"),
]


# ─────────────────────────────────────────────
# TABLE 2 – students
#   STU001–STU003 = GREEN  (risk 0-40)
#   STU004–STU006 = YELLOW (risk 41-70)
#   STU007–STU008 = RED    (risk 71-100)
# ─────────────────────────────────────────────

STUDENTS = [
    # (student_id, roll_number, full_name, class, section, department, enrollment_year)
    # GREEN (5)
    ("STU001", "v14-CS-2022-001", "Priya Sharma",      "3rd Year", "A", "CS",  2022),
    ("STU002", "v14-CS-2022-002", "Arjun Mehta",       "3rd Year", "A", "CS",  2022),
    ("STU003", "v14-ECE-2023-001","Ananya Reddy",       "2nd Year", "B", "ECE", 2023),
    ("STU009", "v14-CS-2022-003", "Rajesh Khanna",     "3rd Year", "A", "CS",  2022),
    ("STU010", "v14-ECE-2023-002","Meera Iyer",        "2nd Year", "B", "ECE", 2023),
    # YELLOW (5)
    ("STU004", "v14-CS-2023-001", "Rohan Gupta",       "2nd Year", "A", "CS",  2023),
    ("STU005", "v14-ECE-2022-001","Sneha Patil",        "3rd Year", "B", "ECE", 2022),
    ("STU006", "v14-MBA-2023-001","Vikram Singh",       "2nd Year", "A", "MBA", 2023),
    ("STU012", "v14-MBA-2022-001","Aisha Khan",        "3rd Year", "A", "MBA", 2022),
    ("STU015", "v14-MBA-2023-002","Kabir Das",         "2nd Year", "A", "MBA", 2023),
    # RED (5)
    ("STU007", "v14-CS-2023-002", "Kiran Verma",       "2nd Year", "A", "CS",  2023),
    ("STU008", "v14-ECE-2022-002","Deepika Nair",       "3rd Year", "B", "ECE", 2022),
    ("STU011", "v14-CS-2023-003", "Siddharth Rao",     "2nd Year", "A", "CS",  2023),
    ("STU013", "v14-CS-2022-004", "Varun Dhawan",      "3rd Year", "A", "CS",  2022),
    ("STU014", "v14-ECE-2023-003", "Ishani Bose",       "2nd Year", "B", "ECE", 2023),
]

GREEN_STUS  = ["STU001", "STU002", "STU003", "STU009", "STU010"]
YELLOW_STUS = ["STU004", "STU005", "STU006", "STU012", "STU015"]
RED_STUS    = ["STU007", "STU008", "STU011", "STU013", "STU014"]

# ─────────────────────────────────────────────
# TABLE 3 – users (mentors)
# ─────────────────────────────────────────────

USERS = [
    # (user_id, email, full_name, role, department)
    ("MENTOR001", "prof.kumar@muj.ac.in",    "Dr. Rajesh Kumar",  "mentor", "CS"),
    ("MENTOR002", "prof.sharma@muj.ac.in",   "Dr. Neha Sharma",   "mentor", "ECE"),
    ("MENTOR003", "prof.desai@muj.ac.in",    "Dr. Amit Desai",    "mentor", "MBA"),
    ("MENTOR_TEST","mentor@test.com",         "Test Mentor",       "mentor", "CS"),
]


# ─────────────────────────────────────────────
# TABLE 4 – user_students (mentor → students)
# ─────────────────────────────────────────────

USER_STUDENTS_BASE = [
    # Department mentor assignments
    ("MENTOR001", "STU001"),
    ("MENTOR001", "STU002"),
    ("MENTOR001", "STU004"),
    ("MENTOR001", "STU007"),
    ("MENTOR002", "STU003"),
    ("MENTOR002", "STU005"),
    ("MENTOR002", "STU008"),
    ("MENTOR003", "STU006"),
    # Note: MENTOR_TEST is intentionally excluded here — the mentor@test.com account
    # likely already exists in DB under a different user_id. Use --reset to clean.
    # After seeding, manually link MENTOR_TEST via the Supabase dashboard or update
    # the MENTOR_TEST user_id below to match the existing user_id in the users table.
]


# ─────────────────────────────────────────────
# TABLE 5 – professor_subjects
# ─────────────────────────────────────────────

PROF_SUBJECTS = [
    ("MENTOR001", "CS101"),
    ("MENTOR001", "DS201"),
    ("MENTOR002", "PHY101"),
    ("MENTOR002", "MATH101"),
    ("MENTOR003", "ENG101"),
]


# ─────────────────────────────────────────────
# TABLE 6 – student_subjects
# ─────────────────────────────────────────────

STUDENT_SUBJECTS = []
STUDENT_SUBJECTS_MAP = {}

# Populate mappings for all 15 students
for sid, roll, name, yr, sec, dept, en_yr in STUDENTS:
    subjs = []
    if dept == "CS":
        subjs = ["CS101", "MATH101", "DS201"]
    elif dept == "ECE":
        subjs = ["PHY101", "MATH101", "ENG101"]
    elif dept == "MBA":
        subjs = ["ENG101", "MATH101", "CS101"]
    
    STUDENT_SUBJECTS_MAP[sid] = subjs
    for s in subjs:
        STUDENT_SUBJECTS.append((sid, s))


# ─────────────────────────────────────────────
# TABLE 7 – attendance_records
# Weekly attendance grouped into 3 periods:
#   early semester, mid semester, recent
# GREEN: 88–94% | YELLOW: 68–73% | RED: 50–58%
# ─────────────────────────────────────────────

def make_attendance(student_id, subjects, conducted, attended_pct_list):
    """Return list of row tuples for 3 periods."""
    rows = []
    period_bounds = [
        (weeks_ago(12), weeks_ago(9)),
        (weeks_ago(9),  weeks_ago(5)),
        (weeks_ago(5),  weeks_ago(1)),
    ]
    for subj in subjects:
        for i, (p_start, p_end) in enumerate(period_bounds):
            pct = attended_pct_list[i]
            attended = round(conducted * pct / 100)
            rows.append((student_id, subj, p_start, p_end, conducted, attended, float(pct)))
    return rows

# Subject mapping is already populated from the loop above

ATTENDANCE_DATA = {}
for sid in GREEN_STUS:
    ATTENDANCE_DATA[sid] = (20, [92, 94, 90])
for sid in YELLOW_STUS:
    ATTENDANCE_DATA[sid] = (20, [73, 70, 68])
for sid in RED_STUS:
    ATTENDANCE_DATA[sid] = (20, [58, 54, 50])


# ─────────────────────────────────────────────
# TABLE 8 – assessment_records
# 3 assessments per student per subject.
# GREEN: 75–88 | YELLOW: 58–63 | RED: 42–54
# RED: assessment 3 is 18+ pts below assessment 1 (declining trend)
# ─────────────────────────────────────────────

ASSESSMENT_CONFIGS = {}
# GREEN: scores ~80%
for sid in GREEN_STUS:
    ASSESSMENT_CONFIGS[sid] = [
        ("Quiz 1",   "quiz",    16, 20, weeks_ago(10)),
        ("Midterm",  "midterm", 44, 50, weeks_ago(6)),
        ("Quiz 2",   "quiz",    17, 20, weeks_ago(3)),
    ]
# YELLOW: scores ~60%
for sid in YELLOW_STUS:
    ASSESSMENT_CONFIGS[sid] = [
        ("Quiz 1",   "quiz",    12, 20, weeks_ago(10)),
        ("Midterm",  "midterm", 30, 50, weeks_ago(6)),
        ("Quiz 2",   "quiz",    12, 20, weeks_ago(3)),
    ]
# RED: scores ~45% with declining trend
for sid in RED_STUS:
    ASSESSMENT_CONFIGS[sid] = [
        ("Quiz 1",   "quiz",    10, 20, weeks_ago(10)),   # 50%
        ("Midterm",  "midterm", 22, 50, weeks_ago(6)),    # 44%
        ("Quiz 2",   "quiz",     6, 20, weeks_ago(3)),    # 30% — declining
    ]


# ─────────────────────────────────────────────
# TABLE 9 – subject_attempts
# RED: 4/5 → ratio 0.8 | Others: 1/5
# ─────────────────────────────────────────────

def make_attempts(student_id, subjects, attempts_used, max_allowed):
    status = "exhausted" if attempts_used >= max_allowed else "ongoing"
    return [(student_id, s, attempts_used, max_allowed, weeks_ago(2), status) for s in subjects]


# ─────────────────────────────────────────────
# TABLE 10 – fee_records
# GREEN: paid, future due | YELLOW: overdue 12d | RED: overdue 38d
# ─────────────────────────────────────────────

FEE_DATA = {}
for sid in GREEN_STUS:
    FEE_DATA[sid] = ("Tuition", 45000, 45000, days_from_now(30), "paid")
for sid in YELLOW_STUS:
    FEE_DATA[sid] = ("Tuition", 45000, 0,     days_ago(12),       "overdue")
for sid in RED_STUS:
    FEE_DATA[sid] = ("Tuition", 45000, 0,     days_ago(38),       "overdue")


# ─────────────────────────────────────────────
# Risk scoring helpers
# ─────────────────────────────────────────────

def compute_risk(student_id, attendance_rows, assessment_rows, attempt_rows, fee_row):
    """Apply 5 rules and return (score, category, reason_json dict, flags)."""
    score = 0
    triggers = []
    scores_breakdown = {}

    # Rule 1: Attendance
    if attendance_rows:
        avg_att = sum(r[6] for r in attendance_rows) / len(attendance_rows)
    else:
        avg_att = 100.0

    if avg_att < 60:
        score += 40
        triggers.append("attendance_critical")
        scores_breakdown["attendance"] = 40
    elif avg_att < 75:
        score += 25
        triggers.append("attendance_risk")
        scores_breakdown["attendance"] = 25

    # Rule 2: Assessment avg
    if assessment_rows:
        # score_obtained / max_score * 100 → percentage
        pcts = [(r[4] / r[5]) * 100 for r in assessment_rows]
        avg_score = sum(pcts) / len(pcts)
    else:
        avg_score = 100.0

    if avg_score < 60:
        score += 25
        triggers.append("performance_risk")
        scores_breakdown["performance"] = 25

    # Rule 3: Declining trend (recent scores 15%+ lower than earlier)
    if assessment_rows and len(assessment_rows) >= 3:
        pcts_sorted = [(r[4] / r[5]) * 100 for r in assessment_rows]
        # rows are in insertion order: oldest first (quiz1, midterm, quiz2)
        older_avg = sum(pcts_sorted[:2]) / 2
        recent = pcts_sorted[-1]
        if older_avg - recent >= 15:
            score += 15
            triggers.append("declining_trend")
            scores_breakdown["declining"] = 15

    # Rule 4: Attempt exhaustion > 80%
    exhaustion_triggered = False
    for r in attempt_rows:
        ratio = r[2] / r[3]  # attempts_used / max_allowed
        if ratio > 0.8:
            exhaustion_triggered = True
            break
    if exhaustion_triggered:
        score += 30
        triggers.append("attempt_risk")
        scores_breakdown["attempts"] = 30

    # Rule 5: Fee overdue > 30 days
    fee_risk = False
    fee_overdue_days = 0
    if fee_row:
        due = fee_row[3]  # due_date
        status = fee_row[4]
        if status == "overdue":
            fee_overdue_days = (TODAY - due).days
            if fee_overdue_days > 30:
                fee_risk = True
                score += 15
                triggers.append("fee_risk")
                scores_breakdown["fees"] = 15

    # Cap at 100
    score = min(score, 100)

    if score <= 40:
        category = "GREEN"
    elif score <= 70:
        category = "YELLOW"
    else:
        category = "RED"

    flags = {
        "attendance_risk": "attendance_risk" in triggers or "attendance_critical" in triggers,
        "performance_risk": "performance_risk" in triggers,
        "attempt_risk":     "attempt_risk" in triggers,
        "fee_risk":         "fee_risk" in triggers,
    }

    explanation = (
        f"Student has avg attendance {avg_att:.1f}%, "
        f"avg assessment score {avg_score:.1f}%, "
        f"fee overdue {fee_overdue_days} days. "
        f"Triggers: {', '.join(triggers) if triggers else 'none'}."
    )

    reason_json = {
        "triggers": triggers,
        "scores": scores_breakdown,
        "explanation": explanation,
    }

    return score, category, reason_json, flags


# ─────────────────────────────────────────────
# MAIN SEED
# ─────────────────────────────────────────────

def seed(conn):
    cur = conn.cursor()
    counters = {k: 0 for k in [
        "subjects","students","users","user_students","professor_subjects",
        "student_subjects","attendance_records","assessment_records",
        "subject_attempts","fee_records","risk_evaluation_rules",
        "risk_profiles","notification_logs","interventions",
        "intervention_followups","counselling_sessions",
    ]}

    def run(sql, params=None, table=None):
        cur.execute(sql, params)
        if table and cur.rowcount > 0:
            counters[table] += cur.rowcount

    print("▶ Resolving mentor credentials...")
    # Resolve mentor@test.com user_id to avoid FK issues while preserving credentials
    cur.execute("SELECT user_id FROM users WHERE email=%s", ("mentor@test.com",))
    row = cur.fetchone()
    if not row:
        print("  ⚠️ mentor@test.com not found, creating default...")
        test_uid = "MENTOR_TEST"
        cur.execute(
            "INSERT INTO users (user_id, email, full_name, role, department) "
            "VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
            (test_uid, "mentor@test.com", "Test Mentor", "mentor", "CS")
        )
        cur.execute("SELECT user_id FROM users WHERE email=%s", ("mentor@test.com",))
        test_uid = cur.fetchone()[0]
    else:
        test_uid = row[0]
    print(f"  ✅ Using mentor user_id: {test_uid}")

    print("▶ Seeding subjects...")
    for code, name, dept in SUBJECTS:
        cur.execute(
            "INSERT INTO subjects (subject_code, subject_name, department) VALUES (%s,%s,%s) "
            "ON CONFLICT (subject_code) DO NOTHING",
            (code, name, dept),
        )
        if cur.rowcount: counters["subjects"] += 1

    print("▶ Seeding students...")
    for row in STUDENTS:
        cur.execute(
            "INSERT INTO students (student_id, roll_number, full_name, class, section, department, enrollment_year, status) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,'active') ON CONFLICT DO NOTHING",
            row,
        )
        if cur.rowcount: counters["students"] += 1

    print("▶ Seeding users (mentors)...")
    for uid, email, name, role, dept in USERS:
        # Skip mentor@test.com as we already resolved/inserted it
        if email == "mentor@test.com": continue
        cur.execute(
            "INSERT INTO users (user_id, email, full_name, role, department) "
            "VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            (uid, email, name, role, dept),
        )
        if cur.rowcount: counters["users"] += 1

    print("▶ Seeding user_students...")
    # 1. Base department mappings
    for uid, sid in USER_STUDENTS_BASE:
        cur.execute(
            "INSERT INTO user_students (user_id, student_id) VALUES (%s,%s) "
            "ON CONFLICT (user_id, student_id) DO NOTHING",
            (uid, sid),
        )
        if cur.rowcount: counters["user_students"] += 1
    
    # 2. Map ALL students to test_uid so they appear for mentor@test.com
    for row in STUDENTS:
        sid = row[0]
        cur.execute(
            "INSERT INTO user_students (user_id, student_id) VALUES (%s,%s) "
            "ON CONFLICT (user_id, student_id) DO NOTHING",
            (test_uid, sid),
        )
        if cur.rowcount: counters["user_students"] += 1

    print("▶ Seeding professor_subjects...")
    # Seed for designated mentors
    for uid, code in PROF_SUBJECTS:
        cur.execute(
            "INSERT INTO professor_subjects (user_id, subject_code) VALUES (%s,%s) "
            "ON CONFLICT (user_id, subject_code) DO NOTHING",
            (uid, code),
        )
        if cur.rowcount: counters["professor_subjects"] += 1
    
    # Seed for test mentor
    for code, name, dept in SUBJECTS:
        cur.execute(
            "INSERT INTO professor_subjects (user_id, subject_code) VALUES (%s,%s) "
            "ON CONFLICT (user_id, subject_code) DO NOTHING",
            (test_uid, code),
        )
        if cur.rowcount: counters["professor_subjects"] += 1

    print("▶ Seeding student_subjects...")
    for sid, code in STUDENT_SUBJECTS:
        cur.execute(
            "INSERT INTO student_subjects (student_id, subject_code) VALUES (%s,%s) "
            "ON CONFLICT (student_id, subject_code) DO NOTHING",
            (sid, code),
        )
        if cur.rowcount: counters["student_subjects"] += 1

    print("▶ Seeding attendance_records...")
    # Keep attendance rows in memory for risk scoring
    all_attendance: dict[str, list] = {}
    for sid, (conducted, pcts) in ATTENDANCE_DATA.items():
        rows = make_attendance(sid, STUDENT_SUBJECTS_MAP[sid], conducted, pcts)
        all_attendance[sid] = rows
        for r in rows:
            cur.execute(
                "INSERT INTO attendance_records "
                "(student_id, subject_code, period_start, period_end, classes_conducted, classes_attended, attendance_percentage) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s) "
                "ON CONFLICT (student_id, subject_code, period_start, period_end) DO NOTHING",
                r,
            )
            if cur.rowcount: counters["attendance_records"] += 1

    print("▶ Seeding assessment_records...")
    all_assessments: dict[str, list] = {}
    for sid, assessments in ASSESSMENT_CONFIGS.items():
        subjs = STUDENT_SUBJECTS_MAP[sid]
        rows = []
        for subj in subjs:
            for name, atype, score, max_score, adate in assessments:
                rows.append((sid, subj, name, atype, score, max_score, adate, 10.0))
                cur.execute(
                    "INSERT INTO assessment_records "
                    "(student_id, subject_code, assessment_name, assessment_type, "
                    "score_obtained, max_score, assessment_date, weightage) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s) "
                    "ON CONFLICT (student_id, subject_code, assessment_name, assessment_date) DO NOTHING",
                    rows[-1],
                )
                if cur.rowcount: counters["assessment_records"] += 1
        all_assessments[sid] = rows

    print("▶ Seeding subject_attempts...")
    all_attempts: dict[str, list] = {}
    for sid in [r[0] for r in STUDENTS]:
        subjs = STUDENT_SUBJECTS_MAP[sid]
        if sid in RED_STUS:
            rows = make_attempts(sid, subjs, 4, 5)
        elif sid in YELLOW_STUS:
            rows = make_attempts(sid, subjs, 2, 5)
        else:
            rows = make_attempts(sid, subjs, 1, 5)
        all_attempts[sid] = rows
        for r in rows:
            cur.execute(
                "INSERT INTO subject_attempts "
                "(student_id, subject_code, attempts_used, max_attempts_allowed, last_attempt_date, status) "
                "VALUES (%s,%s,%s,%s,%s,%s) "
                "ON CONFLICT (student_id, subject_code) DO NOTHING",
                r,
            )
            if cur.rowcount: counters["subject_attempts"] += 1

    print("▶ Seeding fee_records...")
    all_fees: dict[str, tuple] = {}
    for sid, fdata in FEE_DATA.items():
        all_fees[sid] = fdata
        cur.execute(
            "INSERT INTO fee_records (student_id, fee_type, amount_due, amount_paid, due_date, payment_status) "
            "VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            (sid,) + fdata,
        )
        if cur.rowcount: counters["fee_records"] += 1

    print("▶ Seeding risk_evaluation_rules...")
    cur.execute(
        """
        INSERT INTO risk_evaluation_rules
          (rule_version, rule_name, attendance_threshold, performance_threshold,
           attempt_exhaustion_threshold, fee_overdue_threshold, description, is_active)
        VALUES ('v1.0', 'Default Rules v1.0', 75, 60.0, 80, 30,
          'Rule 1a: att<75%→25pts, 1b: att<60%→40pts, 2: avg_score<60%→25pts, '
          '3: declining_trend→15pts, 4: attempts>80%→30pts, 5: fee_overdue>30d→15pts',
          TRUE)
        ON CONFLICT (rule_version) DO NOTHING
        """,
    )
    if cur.rowcount: counters["risk_evaluation_rules"] += 1

    print("▶ Computing and seeding risk_profiles...")
    run_id = f"v1.4.0_seed_{TODAY.isoformat()}"
    risk_profile_ids: dict[str, int] = {}
    for sid in [r[0] for r in STUDENTS]:
        score, category, reason, flags = compute_risk(
            sid,
            all_attendance.get(sid, []),
            all_assessments.get(sid, []),
            all_attempts.get(sid, []),
            all_fees.get(sid),
        )
        cur.execute(
            """
            INSERT INTO risk_profiles
              (student_id, attendance_risk, performance_risk, attempt_risk, fee_risk,
               risk_score, risk_category, rule_version, evaluation_run_id, is_current, reason_json)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'v1.0', %s, TRUE, %s)
            ON CONFLICT (student_id, evaluation_run_id) DO NOTHING
            RETURNING risk_profile_id
            """,
            (
                sid,
                flags["attendance_risk"],
                flags["performance_risk"],
                flags["attempt_risk"],
                flags["fee_risk"],
                score, category,
                run_id,
                Json(reason),
            ),
        )
        row = cur.fetchone()
        if row:
            risk_profile_ids[sid] = row[0]
            counters["risk_profiles"] += 1
        else:
            # fetch existing for FK use
            cur.execute(
                "SELECT risk_profile_id FROM risk_profiles WHERE student_id = %s AND evaluation_run_id = %s",
                (sid, run_id),
            )
            existing = cur.fetchone()
            if existing:
                risk_profile_ids[sid] = existing[0]

    print("▶ Seeding notification_logs (RED students)...")
    for sid in RED_STUS:
        cur.execute(
            """
            INSERT INTO notification_logs
              (student_id, recipient_type, recipient_email_or_phone,
               risk_category, notification_channel, message_summary, delivery_status)
            VALUES (%s, 'guardian', 'guardian@example.com', 'RED', 'email',
              'Your ward has been flagged as HIGH RISK. Immediate attention required.', 'sent')
            ON CONFLICT DO NOTHING
            """,
            (sid,),
        )
        if cur.rowcount: counters["notification_logs"] += 1

    print("▶ Seeding interventions...")
    intervention_ids: dict[str, int] = {}
    # Intervene for all RED students + 2 YELLOW students
    for sid in RED_STUS + YELLOW_STUS[:2]:
        priority = "high" if sid in RED_STUS else "medium"
        rp_id = risk_profile_ids.get(sid)
        cur.execute(
            """
            INSERT INTO interventions
              (student_id, initiated_by_user_id, risk_profile_id,
               intervention_type, status, priority, description)
            VALUES (%s, %s, %s, 'counselling', 'open', %s,
              'Urgent counselling session required due to multiple academic risk factors.')
            RETURNING intervention_id
            """,
            (sid, test_uid, rp_id, priority),
        )
        row = cur.fetchone()
        if row:
            intervention_ids[sid] = row[0]
            counters["interventions"] += 1

    print("▶ Seeding intervention_followups...")
    for sid, iid in intervention_ids.items():
        cur.execute(
            """
            INSERT INTO intervention_followups
              (intervention_id, recorded_by_user_id, followup_date, notes,
               status_update, next_followup_date)
            VALUES (%s, %s, %s,
              'Initial check-in completed. Student acknowledged the issues. Follow-up scheduled.',
              'in_progress', %s)
            """,
            (iid, test_uid, days_ago(3), days_from_now(7)),
        )
        if cur.rowcount: counters["intervention_followups"] += 1

    print("▶ Seeding counselling_sessions...")
    for sid in RED_STUS[:3]: # Only for some RED students
        iid = intervention_ids.get(sid)
        if not iid: continue
        cur.execute(
            """
            INSERT INTO counselling_sessions
              (intervention_id, student_id, counsellor_id, session_date,
               session_duration_minutes, session_type, topics_discussed, counsellor_notes)
            VALUES (%s, %s, %s, %s, 45, 'individual',
              'Academic performance decline, attendance issues, financial stress',
              'Student is struggling with multiple issues. Recommended remedial classes and fee waiver application.')
            """,
            (iid, sid, test_uid, days_ago(5)),
        )
        if cur.rowcount: counters["counselling_sessions"] += 1

    conn.commit()
    cur.close()
    return counters


# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Seed AcademicEWS database with test data")
    parser.add_argument("--reset", action="store_true",
                        help="Delete all seed rows before inserting (clean rerun)")
    args = parser.parse_args()

    print("Connecting to database...")
    try:
        conn = get_conn()
        print("✅ Connected!\n")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)

    if args.reset:
        print("⚠️  --reset flag detected. Deleting existing seed rows...\n")
        cur = conn.cursor()
        cur.execute(RESET_SQL)
        conn.commit()
        cur.close()
        print("✅ Reset complete.\n")

    print("=" * 50)
    print("  Seeding all 15 tables...")
    print("=" * 50)

    try:
        counters = seed(conn)
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Seed failed: {e}")
        import traceback; traceback.print_exc()
        conn.close()
        sys.exit(1)

    conn.close()

    print("\n" + "=" * 50)
    print("  ✅ Seed summary")
    print("=" * 50)
    for table, count in counters.items():
        mark = "✅" if count > 0 else "⏭️ "
        print(f"  {mark}  {table}: {count} new row(s)")

    print(f"\n✅ Seeded {counters['students']} students, "
          f"{counters['risk_profiles']} risk profiles, "
          f"{counters['attendance_records']} attendance records, "
          f"{counters['assessment_records']} assessment records.")


if __name__ == "__main__":
    main()
