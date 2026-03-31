import { apiFetch } from './apiClient';
import { StudentSummary, RiskProfileContext, StudentListItem } from '../types';
import { supabase } from '@/lib/supabase';

export const studentService = {
  /**
   * Get all active students.
   */
  async getAllStudents(): Promise<StudentListItem[]> {
    const response = await apiFetch<{ students: StudentListItem[]; total: number }>('/students');
    return response.students;
  },

  /**
   * Get lightweight student summary for dashboard cards.
   * @param studentId The unique student identifier.
   */
  async getStudentSummary(studentId: string): Promise<StudentSummary> {
    return apiFetch<StudentSummary>(`/students/${studentId}/summary`);
  },

  /**
   * Get full academic context/risk profile for a student.
   * @param studentId The unique student identifier.
   */
  async getStudentRiskProfile(studentId: string): Promise<RiskProfileContext> {
    return apiFetch<RiskProfileContext>(`/risk-profile/${studentId}`);
  },

  /**
   * Resolve the actual student_id for a given Supabase Auth user.id.
   */
  async getStudentIdForUser(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('user_students')
      .select('student_id')
      .eq('user_id', userId)
      .limit(1);
    
    // .single() might error if no results, so we use .limit(1) and check array
    if (error || !data || data.length === 0) return null;
    return data[0].student_id;
  },

  /**
   * Register a new student account.
   * 1. Check if the provided student_id / roll_number exists in students table.
   * 2. Perform Supabase Auth signup.
   * 3. Sync to users table (role: student).
   * 4. Link in user_students table.
   */
  async registerStudent(email: string, password: string, fullName: string, studentId: string): Promise<void> {
    // 1. Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('student_id')
      .eq('student_id', studentId)
      .single();

    if (studentError || !student) {
      throw new Error(`Student ID ${studentId} not found in institutional records.`);
    }

    // 2. Auth Signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'student'
        }
      }
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Registration failed.');
    }

    // 3. Create profile in users table
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        user_id: authData.user.id,
        email,
        full_name: fullName,
        role: 'student'
      }, { onConflict: 'user_id' });

    if (userError) {
      console.error('Error creating/updating user profile:', userError);
      throw new Error(`Profile creation failed: ${userError.message}`);
    }

    // 4. Link to student in user_students table
    const { error: linkError } = await supabase
      .from('user_students')
      .upsert({
        user_id: authData.user.id,
        student_id: studentId
      }, { onConflict: 'user_id, student_id' });

    if (linkError) {
      console.error('Error linking user to student:', linkError);
      throw new Error(`Student linking failed: ${linkError.message}`);
    }
  },

  // Note: Other legacy methods that were direct Supabase calls have been removed
  // as they are no longer the primary data source for student-facing data.
  // Full student list and filtering for teachers should be implemented as API endpoints.

  async searchStudents(query: string): Promise<StudentListItem[]> {
    const students = await this.getAllStudents();
    const q = query.toLowerCase();
    return students.filter(s => 
      s.full_name.toLowerCase().includes(q) || 
      s.student_id.toLowerCase().includes(q) ||
      s.roll_number.toLowerCase().includes(q)
    );
  }
};
