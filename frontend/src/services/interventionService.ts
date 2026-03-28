import { supabase } from '@/lib/supabase';
import { Intervention, InterventionFollowup } from '@/types';

export const interventionService = {
  /**
   * Create new intervention
   */
  async createIntervention(
    studentId: string,
    createdByUserId: string,
    data: {
      intervention_type: 'counselling' | 'tutoring' | 'fee_support' | 'attendance_support' | 'other';
      priority: 'low' | 'medium' | 'high';
      description: string;
      assigned_to_user_id?: string;
      target_completion_date?: string;
    }
  ) {
    const { data: intervention, error } = await supabase
      .from('interventions')
      .insert({
        student_id: studentId,
        created_by_user_id: createdByUserId,
        assigned_to_user_id: data.assigned_to_user_id || null,
        intervention_type: data.intervention_type,
        priority: data.priority,
        description: data.description,
        status: 'open',
        target_completion_date: data.target_completion_date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create intervention: ${error.message}`);
    return intervention as Intervention;
  },

  /**
   * Get all interventions for a student
   */
  async getStudentInterventions(studentId: string) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        created_by:users(user_id, full_name),
        assigned_to:users(user_id, full_name)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch interventions: ${error.message}`);
    return data || [];
  },

  /**
   * Get single intervention by ID
   */
  async getInterventionById(interventionId: number) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        created_by:users(user_id, full_name),
        assigned_to:users(user_id, full_name),
        student:students(student_id, full_name)
      `)
      .eq('intervention_id', interventionId)
      .single();

    if (error) throw new Error(`Failed to fetch intervention: ${error.message}`);
    return data || null;
  },

  /**
   * Get interventions assigned to a user
   */
  async getUserAssignedInterventions(userId: string, status?: string) {
    let query = supabase
      .from('interventions')
      .select(`
        *,
        student:students(student_id, full_name, roll_number, department)
      `)
      .eq('assigned_to_user_id', userId);

    if (status) {
      query = query.eq('status', status);
    } else {
      // Default: get open and in_progress
      query = query.in('status', ['open', 'in_progress']);
    }

    const { data, error } = await query.order('priority', { ascending: false });

    if (error) throw new Error(`Failed to fetch user interventions: ${error.message}`);
    return data || [];
  },

  /**
   * Update intervention status
   */
  async updateInterventionStatus(
    interventionId: number,
    status: 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'escalated'
  ) {
    const { error } = await supabase
      .from('interventions')
      .update({
        status: status,
        completed_date: status === 'resolved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('intervention_id', interventionId);

    if (error) throw new Error(`Failed to update intervention: ${error.message}`);
  },

  /**
   * Assign intervention to a user
   */
  async assignIntervention(interventionId: number, userId: string) {
    const { error } = await supabase
      .from('interventions')
      .update({
        assigned_to_user_id: userId,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('intervention_id', interventionId);

    if (error) throw new Error(`Failed to assign intervention: ${error.message}`);
  },

  /**
   * Add followup note to intervention
   */
  async addFollowup(
    interventionId: number,
    createdByUserId: string,
    data: {
      notes: string;
      action_taken?: string;
      next_followup_date?: string;
    }
  ) {
    const { data: followup, error } = await supabase
      .from('intervention_followups')
      .insert({
        intervention_id: interventionId,
        created_by_user_id: createdByUserId,
        notes: data.notes,
        action_taken: data.action_taken || null,
        next_followup_date: data.next_followup_date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add followup: ${error.message}`);
    return followup as InterventionFollowup;
  },

  /**
   * Get all followups for an intervention
   */
  async getInterventionFollowups(interventionId: number) {
    const { data, error } = await supabase
      .from('intervention_followups')
      .select(`
        *,
        created_by:users(user_id, full_name)
      `)
      .eq('intervention_id', interventionId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch followups: ${error.message}`);
    return data || [];
  },

  /**
   * Get open interventions count
   */
  async getOpenInterventionsCount() {
    const { count, error } = await supabase
      .from('interventions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress']);

    if (error) throw new Error(`Failed to count interventions: ${error.message}`);
    return count || 0;
  },

  /**
   * Get interventions by priority
   */
  async getInterventionsByPriority(priority: 'low' | 'medium' | 'high') {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        student:students(student_id, full_name)
      `)
      .eq('priority', priority)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch priority interventions: ${error.message}`);
    return data || [];
  },

  /**
   * Get intervention effectiveness (resolved vs total for a student)
   */
  async getInterventionEffectiveness(studentId: string) {
    const { data, error } = await supabase
      .from('interventions')
      .select('status')
      .eq('student_id', studentId);

    if (error) throw new Error(`Failed to fetch effectiveness: ${error.message}`);

    const stats = {
      total: data?.length || 0,
      resolved: data?.filter((i: any) => i.status === 'resolved').length || 0,
      open: data?.filter((i: any) => i.status === 'open').length || 0,
      inProgress: data?.filter((i: any) => i.status === 'in_progress').length || 0,
      resolutionRate: 0,
    };

    stats.resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
    return stats;
  },
};
