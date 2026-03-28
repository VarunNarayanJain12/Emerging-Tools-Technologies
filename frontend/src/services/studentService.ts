import { apiFetch } from './apiClient';
import { StudentSummary, RiskProfileContext, StudentListItem } from '../types';

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

  // Note: Other legacy methods that were direct Supabase calls have been removed 
  // as they are no longer the primary data source for student-facing data.
  // Full student list and filtering for teachers should be implemented as API endpoints.
};
