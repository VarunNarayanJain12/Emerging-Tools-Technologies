import { useState, useEffect } from 'react';
import { RiskProfile } from '@/types';
import { riskService } from '@/services/riskService';

interface RiskStats {
  totalStudents: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  redPercentage: number;
  yellowPercentage: number;
  greenPercentage: number;
}

export const useRiskProfiles = () => {
  const [risks, setRisks] = useState<RiskProfile[]>([]);
  const [stats, setStats] = useState<RiskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRisks = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current risk profiles
        const redStudents = await riskService.getRedStudents();
        const yellowStudents = await riskService.getYellowStudents();
        const greenStudents = await riskService.getGreenStudents();

        const allRisks = [...redStudents, ...yellowStudents, ...greenStudents];
        setRisks(allRisks as RiskProfile[]);

        // Get stats
        const statsData = await riskService.getDashboardStats();
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch risk profiles'));
      } finally {
        setLoading(false);
      }
    };

    fetchRisks();
  }, []);

  const getByCategory = async (category: 'RED' | 'YELLOW' | 'GREEN') => {
    try {
      const data = await riskService.getStudentsByRiskCategory(category);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to filter risks'));
      return [];
    }
  };

  const getStudentRisk = async (studentId: string) => {
    try {
      const data = await riskService.getRiskProfile(studentId);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch student risk'));
      return null;
    }
  };

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);

      const redStudents = await riskService.getRedStudents();
      const yellowStudents = await riskService.getYellowStudents();
      const greenStudents = await riskService.getGreenStudents();

      const allRisks = [...redStudents, ...yellowStudents, ...greenStudents];
      setRisks(allRisks as RiskProfile[]);

      const statsData = await riskService.getDashboardStats();
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch risk profiles'));
    } finally {
      setLoading(false);
    }
  };

  return {
    risks,
    stats,
    loading,
    error,
    getByCategory,
    getStudentRisk,
    refetch,
  };
};
