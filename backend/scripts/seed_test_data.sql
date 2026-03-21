-- ============================================================
-- Seed script: test data for Academic Early Warning System
-- Run with: psql -U postgres -d student_warning_db -f seed_test_data.sql
-- ============================================================

-- 1. Ensure risk_evaluation_rules has at least one active row
-- (referenced by risk_profiles.rule_version FK)
INSERT INTO risk_evaluation_rules
  (rule_version, rule_name, attendance_threshold, performance_threshold,
   attempt_exhaustion_threshold, fee_overdue_threshold, is_active)
VALUES
  ('v1.0', 'Default Rules v1.0', 75, 60.0, 80, 30, TRUE)
ON CONFLICT (rule_version) DO NOTHING;

-- 2. Test student
INSERT INTO students
  (student_id, roll_number, full_name, class, section,
   department, enrollment_year, status)
VALUES
  ('STU20231001', 'CS-2023-001', 'Rahul Kumar',
   '2nd Year', 'A', 'CS', 2023, 'active')
ON CONFLICT (student_id) DO NOTHING;

-- 3. Subject (required for FK on attendance/assessment records)
INSERT INTO subjects (subject_code, subject_name, department)
VALUES ('CS201', 'Data Structures and Algorithms', 'CS')
ON CONFLICT (subject_code) DO NOTHING;

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
       "attendance_score": 25,
       "performance_score": 25,
       "attempt_score": 0,
       "fee_score": 15,
       "total": 75
     },
     "thresholds_used": {
       "attendance_threshold": 75,
       "performance_threshold": 60.0,
       "attempt_exhaustion_threshold": 80,
       "fee_overdue_threshold": 30
     },
     "student_facts": {
       "avg_attendance": 62.0,
       "avg_assessment_percentage": 54.0,
       "attempt_exhaustion_pct": 50.0,
       "fee_overdue_days": 35
     },
     "explanation": "Student has attendance of 62% (below 75% threshold), average assessment score of 54% (below 60% threshold), and fee overdue by 35 days (above 30-day threshold)."
   }')
ON CONFLICT (student_id, evaluation_run_id) DO NOTHING;

-- 5. Attendance record
INSERT INTO attendance_records
  (student_id, subject_code, period_start, period_end,
   classes_conducted, classes_attended, attendance_percentage)
VALUES
  ('STU20231001', 'CS201', '2026-01-01', '2026-03-21', 50, 31, 62.0)
ON CONFLICT (student_id, subject_code, period_start, period_end) DO NOTHING;

-- 6. Assessment records
INSERT INTO assessment_records
  (student_id, subject_code, assessment_name,
   assessment_type, score_obtained, max_score,
   assessment_date, weightage)
VALUES
  ('STU20231001', 'CS201', 'Quiz 1',  'quiz',    16, 20, '2026-01-15', 10),
  ('STU20231001', 'CS201', 'Quiz 2',  'quiz',    14, 20, '2026-02-01', 10),
  ('STU20231001', 'CS201', 'Midterm', 'midterm', 28, 50, '2026-02-20', 30),
  ('STU20231001', 'CS201', 'Quiz 3',  'quiz',    11, 20, '2026-03-10', 10)
ON CONFLICT (student_id, subject_code, assessment_name, assessment_date) DO NOTHING;

-- 7. Subject attempt record
INSERT INTO subject_attempts
  (student_id, subject_code, attempts_used, max_attempts_allowed,
   last_attempt_date, status)
VALUES
  ('STU20231001', 'CS201', 2, 4, '2026-03-10', 'ongoing')
ON CONFLICT (student_id, subject_code) DO NOTHING;

-- Verify
SELECT 'students'           AS tbl, COUNT(*) FROM students          WHERE student_id = 'STU20231001'
UNION ALL
SELECT 'risk_profiles',              COUNT(*) FROM risk_profiles     WHERE student_id = 'STU20231001'
UNION ALL
SELECT 'attendance_records',         COUNT(*) FROM attendance_records WHERE student_id = 'STU20231001'
UNION ALL
SELECT 'assessment_records',         COUNT(*) FROM assessment_records WHERE student_id = 'STU20231001'
UNION ALL
SELECT 'subject_attempts',           COUNT(*) FROM subject_attempts  WHERE student_id = 'STU20231001';
