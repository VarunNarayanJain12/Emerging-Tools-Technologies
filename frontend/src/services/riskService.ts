import { apiFetch } from './apiClient';
import { 
  RiskEvaluationSummary, 
  ExplainRiskRequest, 
  ExplainRiskResponse 
} from '../types';

export const riskService = {
  /**
   * Trigger a full system-wide risk evaluation for all active students.
   */
  async runRiskEvaluation(): Promise<RiskEvaluationSummary> {
    return apiFetch<RiskEvaluationSummary>('/run-risk-evaluation', {
      method: 'POST',
    });
  },

  /**
   * Get the pre-computed risk evaluation summary (read-only).
   */
  async getRiskSummary(): Promise<RiskEvaluationSummary> {
    return apiFetch<RiskEvaluationSummary>('/risk-evaluation/summary');
  },

  /**
   * Generate an LLM-powered explanation for a student's risk status.
   */
  async explainRisk(payload: ExplainRiskRequest): Promise<ExplainRiskResponse> {
    return apiFetch<ExplainRiskResponse>('/explain-risk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // ── LEGACY WRAPPERS (to satisfy hooks while using new API) ────────────────
  
  async getDashboardStats() {
    const summary = await this.getRiskSummary();
    const total = summary.total_students || (summary.red + summary.yellow + summary.green);
    return {
      totalStudents: total,
      redCount: summary.red,
      yellowCount: summary.yellow,
      greenCount: summary.green,
      redPercentage: total ? (summary.red / total) * 100 : 0,
      yellowPercentage: total ? (summary.yellow / total) * 100 : 0,
      greenPercentage: total ? (summary.green / total) * 100 : 0,
    };
  },

  async getStudentsByRiskCategory(category: 'RED' | 'YELLOW' | 'GREEN'): Promise<any[]> {
    // Note: Ideally the backend should have a /students?risk=RED endpoint,
    // but for now we fetch all and filter to satisfy the hook.
    const response = await apiFetch<{ students: any[] }>('/students');
    return response.students.filter(s => s.risk_category === category);
  },

  async getRedStudents() { return this.getStudentsByRiskCategory('RED'); },
  async getYellowStudents() { return this.getStudentsByRiskCategory('YELLOW'); },
  async getGreenStudents() { return this.getStudentsByRiskCategory('GREEN'); },

  async getRiskProfile(studentId: string) {
    return apiFetch<any>(`/risk-profile/${studentId}`);
  }
};
