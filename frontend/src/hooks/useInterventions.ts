import { useState, useEffect } from 'react';
import { Intervention, InterventionFollowup } from '@/types';
import { interventionService } from '@/services/interventionService';

export const useInterventions = (studentId?: string, userId?: string) => {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchInterventions = async () => {
      try {
        setLoading(true);
        setError(null);

        let data;
        if (studentId) {
          data = await interventionService.getStudentInterventions(studentId);
        } else if (userId) {
          data = await interventionService.getUserAssignedInterventions(userId);
        } else {
          return;
        }

        setInterventions(data as Intervention[]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch interventions'));
      } finally {
        setLoading(false);
      }
    };

    fetchInterventions();
  }, [studentId, userId]);

  const createIntervention = async (
    studentId: string,
    userId: string,
    data: {
      intervention_type: 'counselling' | 'tutoring' | 'fee_support' | 'attendance_support' | 'other';
      priority: 'low' | 'medium' | 'high';
      description: string;
      assigned_to_user_id?: string;
      target_completion_date?: string;
    }
  ) => {
    try {
      const newIntervention = await interventionService.createIntervention(studentId, userId, data);
      setInterventions([newIntervention, ...interventions]);
      return newIntervention;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create intervention'));
      throw err;
    }
  };

  const updateStatus = async (
    interventionId: number,
    status: 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'escalated'
  ) => {
    try {
      await interventionService.updateInterventionStatus(interventionId, status);
      setInterventions(
        interventions.map((i) => (i.intervention_id === interventionId ? { ...i, status } : i))
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update intervention'));
      throw err;
    }
  };

  const addFollowup = async (
    interventionId: number,
    userId: string,
    data: {
      notes: string;
      action_taken?: string;
      next_followup_date?: string;
    }
  ) => {
    try {
      const followup = await interventionService.addFollowup(interventionId, userId, data);
      return followup as InterventionFollowup;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add followup'));
      throw err;
    }
  };

  const getFollowups = async (interventionId: number) => {
    try {
      return await interventionService.getInterventionFollowups(interventionId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch followups'));
      return [];
    }
  };

  const refetch = async () => {
    try {
      setLoading(true);
      let data;
      if (studentId) {
        data = await interventionService.getStudentInterventions(studentId);
      } else if (userId) {
        data = await interventionService.getUserAssignedInterventions(userId);
      } else {
        return;
      }
      setInterventions(data as Intervention[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch interventions'));
    } finally {
      setLoading(false);
    }
  };

  return {
    interventions,
    loading,
    error,
    createIntervention,
    updateStatus,
    addFollowup,
    getFollowups,
    refetch,
  };
};
