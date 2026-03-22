"""
seed_test_data.py — One-shot script to seed PostgreSQL with test data.
Run from project root: python backend/scripts/seed_test_data.py
Reads DB credentials from backend/rag/.env
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / "rag" / ".env")

import psycopg2

conn = psycopg2.connect(
    host=os.getenv("DB_HOST", "localhost"),
    dbname=os.getenv("DB_NAME", "student_warning_db"),
    user=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD"),
    port=5432,
)
cur = conn.cursor()

SQL = """
-- 1. Active rule set (risk_profiles FK requires this)
INSERT INTO risk_evaluation_rules
  (rule_version, rule_name, attendance_threshold, performance_threshold,
   attempt_exhaustion_threshold, fee_overdue_threshold, is_active)
VALUES
  ('v1.0', 'Default Rules v1.0', 75, 60.0, 80, 30, TRUE)
ON CONFLICT (rule_version) DO NOTHING;

-- 1.5 Cleanup test student data
DELETE FROM attendance_records WHERE student_id = 'STU20231001';
DELETE FROM assessment_records WHERE student_id = 'STU20231001';
DELETE FROM subject_attempts WHERE student_id = 'STU20231001';
DELETE FROM fee_records WHERE student_id = 'STU20231001';
DELETE FROM risk_profiles WHERE student_id = 'STU20231001';
DELETE FROM students WHERE student_id = 'STU20231001';

-- 2. Subject
INSERT INTO subjects (subject_code, subject_name, department)
VALUES ('CS201', 'Data Structures and Algorithms', 'CS')
ON CONFLICT (subject_code) DO NOTHING;

-- 3. Student
INSERT INTO students
  (student_id, roll_number, full_name, class, section,
   department, enrollment_year, status)
VALUES
  ('STU20231001', 'CS-2023-001', 'Rahul Kumar',
   '2nd Year', 'A', 'CS', 2023, 'active')
ON CONFLICT (student_id) DO NOTHING;

-- 4. Risk profile
INSERT INTO risk_profiles
  (student_id, attendance_risk, performance_risk,
   attempt_risk, fee_risk, risk_score, risk_category,
   rule_version, evaluation_run_id, is_current, reason_json)
VALUES
  ('STU20231001', TRUE, TRUE, FALSE, TRUE, 75, 'RED',
   'v1.0', '2026-03-21_10:00:00', TRUE,
   '{
     "triggers": ["attendance_risk", "performance_risk", "fee_risk"],
     "scores": {
       "attendance_score": 25, "performance_score": 25,
       "attempt_score": 0, "fee_score": 15, "total": 75
     },
     "thresholds_used": {
       "attendance_threshold": 75, "performance_threshold": 60.0,
       "attempt_exhaustion_threshold": 80, "fee_overdue_threshold": 30
     },
     "student_facts": {
       "avg_attendance": 62.0, "avg_assessment_percentage": 54.0,
       "attempt_exhaustion_pct": 50.0, "fee_overdue_days": 35
     },
     "explanation": "Student has attendance of 62% (below 75% threshold), average assessment score of 54% (below 60% threshold), and fee overdue by 35 days (above 30-day threshold)."
   }')
ON CONFLICT (student_id, evaluation_run_id) DO NOTHING;

-- 5. Attendance
INSERT INTO attendance_records
  (student_id, subject_code, period_start, period_end,
   classes_conducted, classes_attended, attendance_percentage)
VALUES
  ('STU20231001', 'CS201', '2026-01-01', '2026-03-21', 50, 31, 62.0)
ON CONFLICT (student_id, subject_code, period_start, period_end) DO NOTHING;

-- 6. Assessments
INSERT INTO assessment_records
  (student_id, subject_code, assessment_name,
   assessment_type, score_obtained, max_score,
   assessment_date, weightage)
VALUES
  ('STU20231001', 'CS201', 'Quiz 1',  'quiz',    16, 20, '2026-01-15', 10),
  ('STU20231001', 'CS201', 'Quiz 2',  'quiz',    14, 20, '2026-02-01', 10),
  ('STU20231001', 'CS201', 'Midterm', 'midterm', 15, 50, '2026-02-20', 30),
  ('STU20231001', 'CS201', 'Quiz 3',  'quiz',    11, 20, '2026-03-10', 10)
ON CONFLICT (student_id, subject_code, assessment_name, assessment_date) DO NOTHING;

-- 7. Subject attempts
INSERT INTO subject_attempts
  (student_id, subject_code, attempts_used, max_attempts_allowed,
   last_attempt_date, status)
VALUES
  ('STU20231001', 'CS201', 2, 4, '2026-03-10', 'ongoing')
ON CONFLICT (student_id, subject_code) DO NOTHING;

-- 8. Fee records (overdue > 30 days)
INSERT INTO fee_records
  (student_id, fee_type, amount_due, amount_paid,
   due_date, payment_status)
VALUES
  ('STU20231001', 'Tuition', 5000, 0, '2026-02-15', 'overdue')
ON CONFLICT DO NOTHING;
"""

print("Executing seed SQL...")
cur.execute(SQL)
conn.commit()

# Verify each table
CHECKS = [
    ("students",          "SELECT COUNT(*) FROM students WHERE student_id='STU20231001'"),
    ("risk_profiles",     "SELECT COUNT(*) FROM risk_profiles WHERE student_id='STU20231001'"),
    ("attendance_records","SELECT COUNT(*) FROM attendance_records WHERE student_id='STU20231001'"),
    ("assessment_records","SELECT COUNT(*) FROM assessment_records WHERE student_id='STU20231001'"),
    ("subject_attempts",  "SELECT COUNT(*) FROM subject_attempts WHERE student_id='STU20231001'"),
    ("fee_records",       "SELECT COUNT(*) FROM fee_records WHERE student_id='STU20231001'"),
]

print("\n--- Verification ---")
all_ok = True
for table, query in CHECKS:
    cur.execute(query)
    count = cur.fetchone()[0]
    status = "✅" if count > 0 else "❌"
    print(f"  {status}  {table}: {count} row(s)")
    if count == 0:
        all_ok = False

cur.close()
conn.close()

if all_ok:
    print("\n✅ All test data seeded successfully.")
else:
    print("\n❌ Some tables have 0 rows — check for errors above.")
    sys.exit(1)
