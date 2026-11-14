// epms_frontend/src/features/appraisal/appraisalWorkspaceService.ts

export interface PerformanceCycle {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  mirai_stage: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;
  status: 'DRAFT' | 'VALIDATING' | 'ACTIVE' | 'IN_PROGRESS' | 'REVIEW_PERIOD' | 'READY_FOR_HR_REVIEW' | 'FINALIZED' | 'PUBLISHED' | 'CLOSED';
  current_phase: string;
  technical_weight: string;
  behavioral_weight: string;
  rating_scale_max: string;
  japanese_evaluation_mandatory: boolean | null;
  self_assessment_deadline: string | null;
  evidence_deadline: string | null;
  evaluator_deadline: string | null;
  created_by: number | null;
  created_by_name: string;
  goals_count: number;
  participants_count: number;
  created_at: string;
  updated_at: string;
}

export interface CycleParticipant {
  id: string;
  cycle_id: string;
  employee_id: string;
  employee_code: string;
  full_name: string;
  email: string;
  designation: string;
  department_name: string;
  mentor_id: number | null;
  mentor_name: string | null;
  mentor_assigned: boolean;
  added_by_name: string;
  added_at: string;
}

export interface EligibleIntern {
  employee_id: string;
  employee_code: string;
  full_name: string;
  email: string;
  designation: string;
  department_name: string;
  manager_id: number | null;
  manager_name: string | null;
  employment_status: string;
  is_eligible: boolean;
}

export interface CycleReadinessChecklist {
  name_valid: boolean;
  dates_valid: boolean;
  quarter_designated: boolean;
  weights_balanced: boolean;
  scale_valid: boolean;
  deadlines_populated: boolean;
  deadlines_sequence_valid: boolean;
  participants_enrolled: boolean;
  participant_count: number;
  japanese_mandatory_explicit?: boolean;
}

export interface CycleReadiness {
  cycle_id: string;
  cycle_name: string;
  current_status: string;
  is_ready: boolean;
  readiness_errors: string[];
  checklist: CycleReadinessChecklist;
}

export interface BulkEnrollResult {
  cycle_id: string;
  enrolled_count: number;
  skipped_count: number;
  failed_count: number;
  results: {
    employee_id: string;
    employee_name?: string;
    status: 'ENROLLED' | 'SKIPPED' | 'FAILED';
    reason?: string;
    mentor_assigned?: boolean;
    participant_id?: string;
  }[];
}

const getHeaders = () => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const appraisalWorkspaceService = {
  async getCycles(params?: { status?: string; mirai_stage?: string; search?: string }): Promise<PerformanceCycle[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.mirai_stage) query.set('mirai_stage', params.mirai_stage);
    if (params?.search) query.set('search', params.search);

    const url = `/api/performance/cycles/${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch cycles: ${res.statusText}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  },

  async getCycle(id: string): Promise<PerformanceCycle> {
    const res = await fetch(`/api/performance/cycles/${id}/`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch cycle detail: ${res.statusText}`);
    return res.json();
  },

  async createCycle(payload: Partial<PerformanceCycle>): Promise<PerformanceCycle> {
    const res = await fetch('/api/performance/cycles/', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.name?.[0] || err.technical_weight?.[0] || err.behavioral_weight?.[0] || err.detail || 'Failed to create cycle';
      throw new Error(msg);
    }
    return res.json();
  },

  async updateCycle(id: string, payload: Partial<PerformanceCycle>): Promise<PerformanceCycle> {
    const res = await fetch(`/api/performance/cycles/${id}/`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.technical_weight?.[0] || err.behavioral_weight?.[0] || err.detail || 'Failed to update cycle';
      throw new Error(msg);
    }
    return res.json();
  },

  async deleteCycle(id: string): Promise<void> {
    const res = await fetch(`/api/performance/cycles/${id}/`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete cycle');
    }
  },

  async activateCycle(id: string): Promise<{ message: string; status: string; data: PerformanceCycle }> {
    const res = await fetch(`/api/performance/cycles/${id}/activate/`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.readiness_errors?.join('; ') || err.message || err.detail || 'Failed to activate cycle');
    }
    return res.json();
  },

  async getCycleReadiness(id: string): Promise<CycleReadiness> {
    const res = await fetch(`/api/performance/cycles/${id}/readiness/`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch activation readiness');
    return res.json();
  },

  async getCycleParticipants(cycleId: string): Promise<CycleParticipant[]> {
    const res = await fetch(`/api/performance/cycles/${cycleId}/participants/`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch participants');
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  },

  async enrollParticipants(cycleId: string, employeeIds: string[]): Promise<BulkEnrollResult> {
    const res = await fetch(`/api/performance/cycles/${cycleId}/enroll/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ employee_ids: employeeIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to enroll participants');
    }
    return res.json();
  },

  async unenrollParticipant(cycleId: string, participantId: string): Promise<void> {
    const res = await fetch(`/api/performance/cycles/${cycleId}/participants/${participantId}/`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 409) {
        throw new Error(err.detail || 'Cannot unenroll participant: historical appraisal or evaluation records exist.');
      }
      throw new Error(err.detail || 'Failed to unenroll participant');
    }
  },

  async getEligibleInterns(params?: { exclude_cycle_id?: string; search?: string; department?: string }): Promise<EligibleIntern[]> {
    const query = new URLSearchParams();
    if (params?.exclude_cycle_id) query.set('exclude_cycle_id', params.exclude_cycle_id);
    if (params?.search) query.set('search', params.search);
    if (params?.department) query.set('department', params.department);

    const url = `/api/performance/cycles/eligible-interns/${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch eligible interns');
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  },
};
