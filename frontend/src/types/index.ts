// ============================================================================
// Database Types - Auto-generated from schema.sql
// ============================================================================

// Students Table
export interface Student {
  student_id: string;
  roll_number: string;
  full_name: string;
  class: string;
  department: string;
  enrollment_year: number;
  guardian_email: string | null;
  guardian_phone: string | null;
  status: 'active' | 'inactive' | 'graduated' | 'withdrawn';
  created_at: string;
  updated_at: string;
}

// Attendance Records
export interface AttendanceRecord {
  attendance_record_id: number;
  student_id: string;
  subject_code: string;
  academic_year: number;
  semester: number;
  attendance_percentage: number; // 0-100
  classes_attended: number;
  classes_conducted: number;
  recorded_at: string;
  created_at: string;
}

// Assessment Records
export interface AssessmentRecord {
  assessment_record_id: number;
  student_id: string;
  subject_code: string;
  academic_year: number;
  semester: number;
  assessment_type: string; // e.g., 'Unit Test', 'Assignment', 'Final Exam'
  max_score: number;
  score_obtained: number;
  assessment_percentage: number; // Generated: (score_obtained / max_score) * 100
  weightage: number; // e.g., 0.15 for 15%
  recorded_at: string;
  created_at: string;
}

// Subject Attempts
export interface SubjectAttempt {
  subject_attempt_id: number;
  student_id: string;
  subject_code: string;
  academic_year: number;
  semester: number;
  attempts_used: number;
  max_attempts_allowed: number;
  recorded_at: string;
  created_at: string;
}

// Fee Records
export interface FeeRecord {
  fee_record_id: number;
  student_id: string;
  academic_year: number;
  semester: number;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  payment_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid';
  payment_method: string | null;
  created_at: string;
  updated_at: string;
}

// Risk Evaluation Rules
export interface RiskEvaluationRule {
  rule_version: number;
  threshold_low_attendance: number; // e.g., 40%
  threshold_low_performance: number; // e.g., 50%
  threshold_max_attempts: number; // e.g., 3
  threshold_overdue_fees: number; // e.g., 5000
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Risk Profiles
export interface RiskProfile {
  risk_profile_id: number;
  student_id: string;
  risk_category: 'GREEN' | 'YELLOW' | 'RED';
  risk_score: number;                    // 0–100 computed score
  attendance_risk: boolean;
  performance_risk: boolean;
  attempt_risk: boolean;
  fee_risk: boolean;
  rule_version: number;
  evaluation_run_id: string;
  is_current: boolean;
  reason_json: {
    triggers: string[];
    scores: {
      attendance?: number;
      performance?: number;
      attempts?: number;
      fees?: number;
    };
    explanation: string;
  };
  created_at: string;
  updated_at: string;
}

// Users
export interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'mentor' | 'counsellor' | 'guardian' | 'principal';
  department: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Interventions
export interface Intervention {
  intervention_id: number;
  student_id: string;
  created_by_user_id: string;
  assigned_to_user_id: string | null;
  intervention_type: 'counselling' | 'tutoring' | 'fee_support' | 'attendance_support' | 'other';
  status: 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'escalated';
  priority: 'low' | 'medium' | 'high';
  description: string;
  target_completion_date: string | null;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
}

// Intervention Followups
export interface InterventionFollowup {
  followup_id: number;
  intervention_id: number;
  created_by_user_id: string;
  notes: string;
  action_taken: string | null;
  next_followup_date: string | null;
  created_at: string;
  updated_at: string;
}

// Counselling Sessions
export interface CounsellingSession {
  session_id: number;
  intervention_id: number | null;
  student_id: string;
  counsellor_user_id: string;
  session_date: string;
  duration_minutes: number;
  topics: string[]; // JSON array
  session_notes: string;
  outcomes: string | null;
  created_at: string;
  updated_at: string;
}

// Notification Logs
export interface NotificationLog {
  notification_id: number;
  student_id: string;
  notification_type: 'risk_alert' | 'intervention_assigned' | 'followup_reminder' | 'fee_reminder';
  channel: 'email' | 'sms' | 'in_app' | 'push';
  recipient_address: string;
  message_body: string;
  delivery_status: 'pending' | 'sent' | 'failed' | 'bounced';
  sent_at: string | null;
  retry_count: number;
  last_retry_at: string | null;
  provider_response_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// Professor-Subject Mapping
export interface ProfessorSubject {
  professor_user_id: string;
  subject_code: string;
  academic_year: number;
  semester: number;
  created_at: string;
}

// Student-Subject Mapping
export interface StudentSubject {
  student_id: string;
  subject_code: string;
  academic_year: number;
  semester: number;
  enrollment_status: 'enrolled' | 'dropped' | 'completed';
  created_at: string;
}

// Subject
export interface Subject {
  subject_code: string;
  subject_name: string;
  department: string;
  credits: number;
  semester: number;
  created_at: string;
}

// User-Student Mapping (for mentors/counsellors)
export interface UserStudent {
  user_id: string;
  student_id: string;
  assignment_type: 'mentor' | 'counsellor' | 'guardian';
  assigned_date: string;
  is_active: boolean;
  created_at: string;
}

/** @deprecated Use StudentSummary for /students/{id}/summary API responses */
export interface UnifiedStudentProfile {
  student_id: string;
  full_name: string;
  roll_number: string;
  department: string;
  class: string;
  current_risk_category: 'GREEN' | 'YELLOW' | 'RED';
  avg_attendance_percentage: number;
  avg_performance_percentage: number;
  total_assessment_count: number;
  avg_assessment_score: number;
  overdue_fees_amount: number;
  total_subject_attempts: number;
  avg_subject_attempts: number;
  total_intervention_count: number;
  open_intervention_count: number;
}

// ============================================================================
// API Response Types - Aligned with backend/rag/main.py
// ============================================================================

export interface StudentSummary {
  student_id: string;
  student_name: string;          // note: backend uses "student_name", not "full_name"
  risk_category: 'GREEN' | 'YELLOW' | 'RED' | null;
  risk_score: number | null;
  flags_triggered: string[];     // e.g. ["attendance_risk", "fee_risk"]
  avg_attendance: number | null;
}

export interface ExplainRiskRequest {
  student_id: string;
  question: string;              // 5–500 chars, from mentor
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>; // multi-turn context
}

export interface ExplainRiskResponse {
  student_id: string;
  student_name: string;
  risk_category: 'GREEN' | 'YELLOW' | 'RED';
  risk_score: number;
  explanation: string;           // LLM-generated explanation text
  policies_used: string[];       // names of policy documents referenced
  student_summary: Record<string, unknown>;  // raw context dict from backend
}

export interface RiskEvaluationSummary {
  total_students: number;
  green: number;
  yellow: number;
  red: number;
  evaluation_run_id: string;
  rule_version: string;
}

export interface RiskProfileContext {
  student: Student;
  risk_profile: RiskProfile | null;
  attendance: AttendanceRecord[];
  assessments: AssessmentRecord[];
  attempts: SubjectAttempt[];
  sessions?: any[];
  notifications?: any[];
}

// Auth types
export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    role?: string;
  };
}

export interface StudentListItem {
  student_id: string;
  full_name: string;
  roll_number: string;
  department: string;
  status: string;
}
