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
   * Generate an LLM-powered explanation for a student's risk status.
   */
  async explainRisk(payload: ExplainRiskRequest): Promise<ExplainRiskResponse> {
    return apiFetch<ExplainRiskResponse>('/explain-risk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
