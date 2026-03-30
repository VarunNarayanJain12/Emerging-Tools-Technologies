-- ================================
-- CORE STUDENT & USER MANAGEMENT
-- ================================

CREATE TABLE students (
    student_id VARCHAR(50) PRIMARY KEY,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    class VARCHAR(20) NOT NULL,
    section VARCHAR(10),
    department VARCHAR(50) NOT NULL,
    enrollment_year INT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'withdrawn')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE subjects (
    subject_code VARCHAR(20) PRIMARY KEY,
    subject_name VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance_records (
    attendance_id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id),
    subject_code VARCHAR(20) NOT NULL REFERENCES subjects(subject_code),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    classes_conducted INT NOT NULL CHECK (classes_conducted >= 0),
    classes_attended INT NOT NULL CHECK (classes_attended >= 0 AND classes_attended <= classes_conducted),
    attendance_percentage DECIMAL(5,2) NOT NULL CHECK (attendance_percentage >= 0 AND attendance_percentage <= 100),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE assessment_records (
    assessment_id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id),
    subject_code VARCHAR(20) NOT NULL REFERENCES subjects(subject_code),
    assessment_name VARCHAR(50) NOT NULL,
    assessment_type VARCHAR(30) NOT NULL,
    score_obtained DECIMAL(8,2) NOT NULL CHECK (score_obtained >= 0),
    max_score DECIMAL(8,2) NOT NULL CHECK (max_score > 0),
    assessment_date DATE NOT NULL,
    weightage DECIMAL(5,2) NOT NULL CHECK (weightage >= 0 AND weightage <= 100),
    assessment_percentage DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN max_score > 0 THEN (score_obtained / max_score) * 100 ELSE NULL END) STORED,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT score_not_exceeds_max CHECK (score_obtained <= max_score),
    UNIQUE (student_id, subject_code, assessment_name, assessment_date)
);
CREATE TABLE subject_attempts (
    attempt_id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id),
    subject_code VARCHAR(20) NOT NULL REFERENCES subjects(subject_code),
    attempts_used INT NOT NULL CHECK (attempts_used >= 0),
    max_attempts_allowed INT NOT NULL CHECK (max_attempts_allowed > 0),
    last_attempt_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ongoing', 'exhausted')),
    CONSTRAINT attempts_used_not_exceeds_max CHECK (attempts_used <= max_attempts_allowed),
    UNIQUE (student_id, subject_code)
);
CREATE TABLE fee_records (
    fee_record_id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id),
    fee_type VARCHAR(30) NOT NULL,
    amount_due DECIMAL(12,2) NOT NULL CHECK (amount_due >= 0),
    amount_paid DECIMAL(12,2) NOT NULL CHECK (amount_paid >= 0),
    due_date DATE NOT NULL,
    payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('paid', 'pending', 'overdue')),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT amount_paid_not_exceeds_due CHECK (amount_paid <= amount_due)
);
-- ================================
-- RISK PROFILES & EVALUATION AUDIT
-- ================================

CREATE TABLE risk_evaluation_rules (
    rule_id SERIAL PRIMARY KEY,
    rule_version VARCHAR(20) NOT NULL UNIQUE,
    rule_name VARCHAR(100) NOT NULL,
    attendance_threshold INT CHECK (attendance_threshold >= 0 AND attendance_threshold <= 100),
    performance_threshold DECIMAL(5,2) CHECK (performance_threshold >= 0 AND performance_threshold <= 100),
    attempt_exhaustion_threshold INT CHECK (attempt_exhaustion_threshold >= 0),
    fee_overdue_threshold INT,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE risk_profiles (
    risk_profile_id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id),
    
    -- Individual risk flags
    attendance_risk BOOLEAN DEFAULT FALSE,
    performance_risk BOOLEAN DEFAULT FALSE,
    attempt_risk BOOLEAN DEFAULT FALSE,
    fee_risk BOOLEAN DEFAULT FALSE,
    
    -- Overall assessment
    risk_score INT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_category VARCHAR(10) NOT NULL CHECK (risk_category IN ('GREEN', 'YELLOW', 'RED')),
    
    -- Audit & versioning
    rule_version VARCHAR(20) NOT NULL REFERENCES risk_evaluation_rules(rule_version),
    evaluation_run_id VARCHAR(100) NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,
    reason_json JSON,
    
    last_evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (student_id, evaluation_run_id)
);
CREATE TABLE notification_logs (
    notification_id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id),
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('mentor', 'counsellor', 'guardian')),
    recipient_email_or_phone VARCHAR(100),
    risk_category VARCHAR(10) NOT NULL CHECK (risk_category IN ('GREEN', 'YELLOW', 'RED')),
    notification_channel VARCHAR(20) NOT NULL CHECK (notification_channel IN ('email', 'sms', 'in-app')),
    message_summary TEXT NOT NULL,
    template_id VARCHAR(50),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_status VARCHAR(20) NOT NULL CHECK (delivery_status IN ('sent', 'pending', 'failed', 'bounced')) DEFAULT 'pending',
    provider_response_id VARCHAR(100),
    retry_count INT DEFAULT 0,
    last_retry_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- ================================
-- USER MANAGEMENT & ACCESS CONTROL
-- ================================

CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'mentor', 'counsellor', 'guardian', 'principal', 'student')),
    department VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_students (
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id),
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, student_id)
);
-- CREATE TABLE subjects (
--     subject_code VARCHAR(20) PRIMARY KEY,
--     subject_name VARCHAR(100) NOT NULL,
--     department VARCHAR(50)
-- );
CREATE TABLE professor_subjects (
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id),
    subject_code VARCHAR(20) NOT NULL REFERENCES subjects(subject_code),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, subject_code)
);

CREATE TABLE student_subjects (
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id),
    subject_code VARCHAR(20) NOT NULL REFERENCES subjects(subject_code),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, subject_code)
);
-- ================================
-- INTERVENTION & CASE MANAGEMENT
-- ================================

CREATE TABLE interventions (
    intervention_id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id),
    initiated_by_user_id VARCHAR(50) NOT NULL REFERENCES users(user_id),
    risk_profile_id INT REFERENCES risk_profiles(risk_profile_id),
    
    intervention_type VARCHAR(50) NOT NULL CHECK (intervention_type IN ('counselling', 'remedial_class', 'guardian_meeting', 'academic_probation', 'tutoring', 'other')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'in_progress', 'on_hold', 'resolved', 'escalated')) DEFAULT 'open',
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    
    description TEXT,
    expected_outcome TEXT,
    actual_outcome TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE intervention_followups (
    followup_id SERIAL PRIMARY KEY,
    intervention_id INT NOT NULL REFERENCES interventions(intervention_id),
    recorded_by_user_id VARCHAR(50) NOT NULL REFERENCES users(user_id),
    
    followup_date DATE NOT NULL,
    notes TEXT NOT NULL,
    status_update VARCHAR(50),
    next_followup_date DATE,
    
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE counselling_sessions (
    session_id SERIAL PRIMARY KEY,
    intervention_id INT REFERENCES interventions(intervention_id),
    student_id VARCHAR(50) NOT NULL REFERENCES students(student_id),
    counsellor_id VARCHAR(50) NOT NULL REFERENCES users(user_id),
    
    session_date DATE NOT NULL,
    session_duration_minutes INT CHECK (session_duration_minutes > 0),
    session_type VARCHAR(30) CHECK (session_type IN ('individual', 'group', 'virtual')),
    
    topics_discussed TEXT,
    student_feedback TEXT,
    counsellor_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- UNIQUE CONSTRAINTS FOR DATA QUALITY
-- ================================

ALTER TABLE attendance_records
ADD CONSTRAINT unique_attendance_entry
UNIQUE (student_id, subject_code, period_start, period_end);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Student & academic data lookups
CREATE INDEX idx_students_department ON students(department);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_enrollment_year ON students(enrollment_year);

-- Attendance & assessment records
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_attendance_subject ON attendance_records(subject_code);
CREATE INDEX idx_attendance_period ON attendance_records(period_start, period_end);

CREATE INDEX idx_assessment_student ON assessment_records(student_id);
CREATE INDEX idx_assessment_subject ON assessment_records(subject_code);
CREATE INDEX idx_assessment_date ON assessment_records(assessment_date);

-- Subject attempts
CREATE INDEX idx_attempts_student ON subject_attempts(student_id);
CREATE INDEX idx_attempts_subject ON subject_attempts(subject_code);

-- Risk profiles
CREATE INDEX idx_risk_student ON risk_profiles(student_id);
CREATE INDEX idx_risk_category ON risk_profiles(risk_category);
CREATE INDEX idx_risk_current ON risk_profiles(is_current);
CREATE INDEX idx_risk_evaluation_run ON risk_profiles(evaluation_run_id);

-- Notification logs
CREATE INDEX idx_notification_student ON notification_logs(student_id);
CREATE INDEX idx_notification_status ON notification_logs(delivery_status);
CREATE INDEX idx_notification_sent ON notification_logs(sent_at);

-- User relationships
CREATE INDEX idx_user_students_user ON user_students(user_id);
CREATE INDEX idx_user_students_student ON user_students(student_id);

-- Interventions
CREATE INDEX idx_intervention_student ON interventions(student_id);
CREATE INDEX idx_intervention_status ON interventions(status);
CREATE INDEX idx_intervention_priority ON interventions(priority);

-- ================================
-- IMPROVED UNIFIED STUDENT PROFILE VIEW (AVOIDING JOIN FANOUT)
-- ================================

CREATE OR REPLACE VIEW unified_student_profile AS
WITH attendance_agg AS (
    SELECT 
        student_id,
        ROUND(AVG(attendance_percentage)::NUMERIC, 2) AS avg_attendance_percentage,
        MIN(attendance_percentage) AS min_attendance_percentage,
        MAX(attendance_percentage) AS max_attendance_percentage
    FROM attendance_records
    GROUP BY student_id
),
assessment_agg AS (
    SELECT 
        student_id,
        COUNT(*) AS total_assessments,
        ROUND(AVG(assessment_percentage)::NUMERIC, 2) AS avg_assessment_percentage,
        MIN(assessment_percentage) AS min_assessment_percentage,
        MAX(assessment_percentage) AS max_assessment_percentage
    FROM assessment_records
    GROUP BY student_id
),
attempt_agg AS (
    SELECT 
        student_id,
        MAX(attempts_used) AS max_attempts_used,
        COUNT(CASE WHEN status = 'exhausted' THEN 1 END) AS exhausted_subjects_count,
        COUNT(*) AS total_subjects_enrolled
    FROM subject_attempts
    GROUP BY student_id
)
SELECT
    s.student_id,
    s.roll_number,
    s.full_name,
    s.department,
    s.class,
    s.section,
    s.enrollment_year,
    s.status,
    
    -- Attendance aggregation (safe NULLs, no join fanout)
    COALESCE(a_agg.avg_attendance_percentage, 0) AS avg_attendance_percentage,
    COALESCE(a_agg.min_attendance_percentage, 0) AS min_attendance_percentage,
    COALESCE(a_agg.max_attendance_percentage, 0) AS max_attendance_percentage,
    
    -- Assessment aggregation (safe NULLs, pre-computed percentages)
    COALESCE(ass_agg.total_assessments, 0) AS total_assessments,
    COALESCE(ass_agg.avg_assessment_percentage, 0) AS avg_assessment_percentage,
    COALESCE(ass_agg.min_assessment_percentage, 0) AS min_assessment_percentage,
    COALESCE(ass_agg.max_assessment_percentage, 0) AS max_assessment_percentage,
    
    -- Attempt aggregation
    COALESCE(att_agg.max_attempts_used, 0) AS max_attempts_used,
    COALESCE(att_agg.exhausted_subjects_count, 0) AS exhausted_subjects_count,
    COALESCE(att_agg.total_subjects_enrolled, 0) AS total_subjects_enrolled,
    
    s.created_at,
    s.updated_at
    
FROM students s
LEFT JOIN attendance_agg a_agg ON s.student_id = a_agg.student_id
LEFT JOIN assessment_agg ass_agg ON s.student_id = ass_agg.student_id
LEFT JOIN attempt_agg att_agg ON s.student_id = att_agg.student_id;
