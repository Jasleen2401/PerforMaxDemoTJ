import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch } from '../hooks/reduxHooks';
import { api } from '../services/api';
import { useGetHrDashboardQuery } from '../features/dashboard/dashboardApi';

// Subcomponents & Types
import type {
  Intern,
  Mentor,
  Cohort,
  EvaluationCycle,
  Goal,
  Evidence,
  HrInternTask,
  HrDashboardTelemetry,
  AppraisalProgressDataPoint,
  SectionFetchStatus,
  SectionStatusMap,
  SectionErrorMap
} from '../components/dashboard/hr/types';

import { HrWelcomeHeader } from '../components/dashboard/hr/HrWelcomeHeader';
import { HrSummaryKpiTiles } from '../components/dashboard/hr/HrSummaryKpiTiles';
import { HrPrioritiesQueue } from '../components/dashboard/hr/HrPrioritiesQueue';
import { HrPerformanceSnapshot } from '../components/dashboard/hr/HrPerformanceSnapshot';
import { HrAppraisalLifecycleStepper } from '../components/dashboard/hr/HrAppraisalLifecycleStepper';
import { HrInternDeliverablesDesk } from '../components/dashboard/hr/HrInternDeliverablesDesk';
import { HrAssignGoalModal } from '../components/dashboard/hr/HrAssignGoalModal';
import { HrReviewEvidenceModal } from '../components/dashboard/hr/HrReviewEvidenceModal';

// Re-export types for backward compatibility
export type { Intern, Mentor, Cohort, EvaluationCycle, Goal, Evidence, HrInternTask, HrDashboardTelemetry, SectionFetchStatus, SectionStatusMap, SectionErrorMap };

// Raw backend payload interfaces for type safety
interface RawEmployeePayload {
  id: string | number;
  staffName: string;
  email: string;
  employeeCode?: string;
  currentDepartmentName?: string;
  parentDepartmentName?: string;
  positionName?: string;
  directManagerName?: string;
  directManagerId?: string | number;
  roles?: string[];
  status?: string;
  isActive?: boolean;
  joiningDate?: string;
}

interface RawAppraisalPayload {
  employeeId?: string | number;
  employeeName?: string;
  overallScore?: string | number;
  finalScore?: string | number;
  status?: string;
  classification?: string;
}

interface RawCyclePayload {
  uuid?: string;
  id?: string | number;
  cycleId?: string | number;
  cycleName?: string;
  name?: string;
  evaluationPeriod?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  isActive?: boolean;
}

interface RawGoalPayload {
  id: string | number;
  employee_name?: string;
  title: string;
  description?: string;
  due_date?: string;
  completion_percentage?: string | number;
  status?: string;
}

interface RawEvidencePayload {
  id: string | number;
  employee_name?: string;
  title: string;
  goal_title?: string;
  task_title?: string;
  external_url?: string;
  file_attachment?: string | null;
  review_status?: string;
  review_notes?: string;
  created_at?: string;
}

interface RawTaskPayload {
  id: string | number;
  title: string;
  description?: string;
  internName?: string;
  employee_name?: string;
  internEmail?: string;
  goalTitle?: string;
  goal_title?: string;
  dueDate?: string;
  due_date?: string;
  priority?: string;
  status?: string;
  isCompleted?: boolean;
  isSelfCreated?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

// ----------------------------------------------------
// MAIN HR EXECUTIVE DASHBOARD ORCHESTRATOR
// ----------------------------------------------------

const HrDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, accessToken } = useAuth();
  const { data: hrTelemetryData, refetch: refetchTelemetry, isFetching: isTelemetryFetching } = useGetHrDashboardQuery();

  // Personalized Authenticated HR User Greeting
  const userObj = user as Record<string, unknown> | null;
  const userProfile = userObj?.profile as Record<string, unknown> | undefined;
  const hrName =
    (user?.staffName && !["administrator", "admin", "superadmin"].includes(user.staffName.toLowerCase()))
      ? user.staffName
      : (userProfile?.full_name as string) ||
        (userObj?.firstName as string) ||
        (userObj?.first_name as string) ||
        (userObj?.username as string) ||
        "HR Partner";

  // Loading, refreshing, and error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Granular Section Fetch Status and Error Maps
  const [sectionStatus, setSectionStatus] = useState<SectionStatusMap>({
    employees: 'loading',
    appraisals: 'loading',
    cycles: 'loading',
    goals: 'loading',
    evidence: 'loading',
    tasks: 'loading',
    telemetry: 'loading',
  });
  const [sectionErrors, setSectionErrors] = useState<SectionErrorMap>({});

  // Genuine Data States
  const [interns, setInterns] = useState<Intern[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cycles, setCycles] = useState<EvaluationCycle[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [telemetry, setTelemetry] = useState<HrDashboardTelemetry | null>(null);

  // Intern Tasks & Desk State
  const [hrTasks, setHrTasks] = useState<HrInternTask[]>([]);
  const [activeDeskTab, setActiveDeskTab] = useState<'tasks' | 'evidence' | 'goals'>('tasks');
  const [filterTaskIntern, setFilterTaskIntern] = useState<string>('ALL');
  const [filterTaskStatus, setFilterTaskStatus] = useState<string>('ALL');

  // Assign Goal Modal State
  const [isAssignGoalModalOpen, setIsAssignGoalModalOpen] = useState(false);
  const [selectedInternId, setSelectedInternId] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalCategory, setGoalCategory] = useState('TECHNICAL');
  const [goalPriority, setGoalPriority] = useState('HIGH');
  const [goalDueDate, setGoalDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [goalTargetValue, setGoalTargetValue] = useState(100);
  const [goalWeightage, setGoalWeightage] = useState(25);
  const [isAssigningGoal, setIsAssigningGoal] = useState(false);

  // Review Evidence Modal State
  const [selectedReviewEvidence, setSelectedReviewEvidence] = useState<Evidence | null>(null);
  const [reviewStatusChoice, setReviewStatusChoice] = useState<'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED'>('APPROVED');
  const [reviewNotesInput, setReviewNotesInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // People & Performance Snapshot View Mode ('overview' | 'timeline')
  const [activeSnapshotView, setActiveSnapshotView] = useState<'overview' | 'timeline'>('overview');

  // Interactive Appraisal Cycle Stepper State (Hover & Click/Touch inspection)
  const [hoveredStageId, setHoveredStageId] = useState<number | null>(null);
  const [pinnedStageId, setPinnedStageId] = useState<number | null>(null);

  // Synchronize telemetry from RTK Query endpoint
  useEffect(() => {
    if (hrTelemetryData) {
      const animId = requestAnimationFrame(() => {
        setTelemetry(prev => ({
          ...prev,
          ...hrTelemetryData
        }));
      });
      return () => cancelAnimationFrame(animId);
    }
  }, [hrTelemetryData]);

  // Helper for authenticated requests
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set('ngrok-skip-browser-warning', 'true');
    const token = accessToken || localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(url, { ...options, headers });
  }, [accessToken]);

  // ----------------------------------------------------
  // GRANULAR SECTION FETCHERS & RESILIENCE HELPERS
  // ----------------------------------------------------

  const executeEndpointFetch = useCallback(async (url: string, sectionName: string) => {
    try {
      const res = await authFetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          return {
            status: 'unavailable' as SectionFetchStatus,
            error: `${sectionName} endpoint (${url}) is not available (HTTP 404).`
          };
        }
        if (res.status === 401 || res.status === 403) {
          return {
            status: 'error' as SectionFetchStatus,
            error: `Authentication or permission required for ${sectionName} (HTTP ${res.status}).`
          };
        }
        if (res.status >= 500) {
          return {
            status: 'error' as SectionFetchStatus,
            error: `Server error while fetching ${sectionName} (HTTP ${res.status}).`
          };
        }
        return {
          status: 'error' as SectionFetchStatus,
          error: `Request failed for ${sectionName} (HTTP ${res.status}).`
        };
      }
      try {
        const json = await res.json();
        return {
          status: 'success' as SectionFetchStatus,
          data: json
        };
      } catch {
        return {
          status: 'error' as SectionFetchStatus,
          error: `Malformed JSON response received for ${sectionName}.`
        };
      }
    } catch (netErr: unknown) {
      return {
        status: 'error' as SectionFetchStatus,
        error: `Network error reaching ${sectionName}: ${netErr instanceof Error ? netErr.message : 'Check connectivity'}`
      };
    }
  }, [authFetch]);

  // 1. Employees & Workforce Directory
  const fetchEmployeesData = useCallback(async () => {
    const res = await executeEndpointFetch('/emp/all', 'Workforce Directory');
    if (res.status !== 'success' || !res.data) {
      return { status: res.status, error: res.error };
    }
    const empJson = res.data as { data?: RawEmployeePayload[] };
    const empList = (empJson.data || (Array.isArray(empJson) ? empJson : [])) as RawEmployeePayload[];
    if (!Array.isArray(empList)) {
      return { status: 'error' as SectionFetchStatus, error: 'Invalid workforce directory data format' };
    }
    const rawInterns = empList.filter((e: RawEmployeePayload) => {
      const roles: string[] = Array.isArray(e.roles) ? e.roles : [];
      const isManager = roles.includes('MANAGER');
      const isHR = roles.includes('HR');
      const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
      return !isManager && !isHR && !isAdmin && (roles.includes('INTERN') || roles.includes('EMPLOYEE'));
    });

    const rawMentors = empList.filter((e: RawEmployeePayload) => {
      const roles: string[] = Array.isArray(e.roles) ? e.roles : [];
      return roles.includes('MANAGER') || roles.includes('MENTOR');
    });

    const mappedInterns: Intern[] = rawInterns.map((emp: RawEmployeePayload) => {
      const bName = emp.currentDepartmentName || 'Batch A';
      let sbName = 'A1';
      const match = (emp.positionName || emp.employeeCode || '').match(/([ABCD][12])/i);
      if (match) sbName = match[1].toUpperCase();

      return {
        id: String(emp.id),
        name: emp.staffName,
        email: emp.email,
        code: emp.employeeCode || '',
        cohort: emp.parentDepartmentName || 'MIRAI Cohort 1',
        batch: bName,
        subBatch: sbName,
        section: 'Engineering',
        subSection: 'Backend',
        mentor: emp.directManagerName || 'Unassigned',
        evaluator: emp.directManagerName || 'Unassigned',
        score: null,
        classification: null,
        status: (emp.status === 'ACTIVE' || emp.isActive !== false) ? 'ACTIVE' : 'DEACTIVATED',
        published: false,
        joiningDate: emp.joiningDate || '2026-09-26'
      };
    });

    const mappedMentors: Mentor[] = rawMentors.map((m: RawEmployeePayload) => ({
      id: String(m.id),
      name: m.staffName,
      email: m.email,
      department: m.currentDepartmentName || 'Engineering',
      specialization: m.positionName || 'Technical Mentor',
      menteeCount: rawInterns.filter((i: RawEmployeePayload) => i.directManagerId === m.id).length,
      maxCapacity: 4
    }));

    const uniqueCohorts = Array.from(new Set(rawInterns.map((i: RawEmployeePayload) => i.parentDepartmentName || 'MIRAI Cohort 1')));
    const mappedCohorts: Cohort[] = uniqueCohorts.map((c, idx) => ({
      id: `c-${idx + 1}`,
      name: c,
      period: 'Sep 26 – Dec 26',
      cycleName: 'MIRAI Cohort 1 Evaluation',
      count: rawInterns.filter((i: RawEmployeePayload) => (i.parentDepartmentName || 'MIRAI Cohort 1') === c).length
    }));

    return {
      status: 'success' as SectionFetchStatus,
      interns: mappedInterns,
      mentors: mappedMentors,
      cohorts: mappedCohorts
    };
  }, [executeEndpointFetch]);

  // 2. Appraisals (Detect HTTP 404 without crashing; gracefully mark unavailable)
  const fetchAppraisalsData = useCallback(async () => {
    const res = await executeEndpointFetch('/appraisals/', 'Appraisal Scorecards');
    if (res.status === 'unavailable') {
      return {
        status: 'unavailable' as SectionFetchStatus,
        error: 'Scorecard synchronization endpoint (/appraisals/) is pending backend routing.'
      };
    }
    if (res.status !== 'success' || !res.data) {
      return { status: res.status, error: res.error };
    }
    const appJson = res.data as { data?: RawAppraisalPayload[] };
    const appList = (appJson.data || (Array.isArray(appJson) ? appJson : [])) as RawAppraisalPayload[];
    return {
      status: 'success' as SectionFetchStatus,
      data: Array.isArray(appList) ? appList : []
    };
  }, [executeEndpointFetch]);

  // 3. Evaluation Cycles
  const fetchCyclesData = useCallback(async () => {
    const res = await executeEndpointFetch('/appraisal-cycles', 'Evaluation Cycles');
    if (res.status !== 'success' || !res.data) {
      return { status: res.status, error: res.error };
    }
    const cycleJson = res.data as { data?: RawCyclePayload[] };
    const cycleList = (cycleJson.data || (Array.isArray(cycleJson) ? cycleJson : [])) as RawCyclePayload[];
    if (!Array.isArray(cycleList)) {
      return { status: 'error' as SectionFetchStatus, error: 'Invalid cycles data format' };
    }
    const mappedCycles: EvaluationCycle[] = cycleList.map((cy: RawCyclePayload) => ({
      id: String(cy.uuid || cy.id || cy.cycleId),
      name: cy.cycleName || cy.name || 'Cycle',
      quarter: cy.evaluationPeriod || 'Q2 2026',
      startDate: cy.startDate || '2026-04-01',
      endDate: cy.endDate || '2026-06-30',
      status: (cy.status === 'ACTIVE' || cy.isActive) ? 'ACTIVE' : (cy.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT')
    }));
    return {
      status: 'success' as SectionFetchStatus,
      data: mappedCycles
    };
  }, [executeEndpointFetch]);

  // 4. Performance Goals
  const fetchGoalsData = useCallback(async () => {
    const res = await executeEndpointFetch('/api/goals/', 'Performance Goals');
    if (res.status !== 'success' || !res.data) {
      return { status: res.status, error: res.error };
    }
    const goalJson = res.data as { results?: RawGoalPayload[]; data?: RawGoalPayload[] };
    const goalList = (goalJson.results || goalJson.data || (Array.isArray(goalJson) ? goalJson : [])) as RawGoalPayload[];
    if (!Array.isArray(goalList)) {
      return { status: 'error' as SectionFetchStatus, error: 'Invalid goals data format' };
    }
    const mappedGoals: Goal[] = goalList.map((g: RawGoalPayload) => ({
      id: String(g.id),
      internName: g.employee_name || 'Intern',
      title: g.title,
      category: g.description || 'Technical Goal',
      section: 'Engineering',
      dueDate: g.due_date || '2026-03-31',
      progress: Math.round(parseFloat(String(g.completion_percentage || 0))),
      status: g.status === 'COMPLETED' ? 'Completed' : (g.status === 'IN_PROGRESS' ? 'In Progress' : 'Not Started')
    }));
    return {
      status: 'success' as SectionFetchStatus,
      data: mappedGoals
    };
  }, [executeEndpointFetch]);

  // 5. Evidence Deliverables
  const fetchEvidenceData = useCallback(async () => {
    const res = await executeEndpointFetch('/api/evidence/', 'Evidence Deliverables');
    if (res.status !== 'success' || !res.data) {
      return { status: res.status, error: res.error };
    }
    const evJson = res.data as { results?: RawEvidencePayload[]; data?: RawEvidencePayload[] };
    const evList = (evJson.results || evJson.data || (Array.isArray(evJson) ? evJson : [])) as RawEvidencePayload[];
    if (!Array.isArray(evList)) {
      return { status: 'error' as SectionFetchStatus, error: 'Invalid evidence data format' };
    }
    const mappedEv: Evidence[] = evList.map((ev: RawEvidencePayload) => ({
      id: String(ev.id),
      internName: ev.employee_name || 'Intern',
      title: ev.title,
      goalTitle: ev.goal_title || ev.task_title || 'Project Goal',
      link: ev.external_url || '',
      fileAttachment: ev.file_attachment || null,
      type: ev.external_url ? 'External Link' : 'Attachment',
      status: ev.review_status === 'APPROVED' ? 'APPROVED' : (ev.review_status === 'REJECTED' ? 'NEEDS_CHANGES' : 'PENDING'),
      note: ev.review_notes || '',
      createdAt: ev.created_at ? new Date(ev.created_at).toLocaleDateString() : ''
    }));
    return {
      status: 'success' as SectionFetchStatus,
      data: mappedEv
    };
  }, [executeEndpointFetch]);

  // 6. Intern Tasks
  const fetchTasksData = useCallback(async () => {
    const res = await executeEndpointFetch('/api/hr/intern-tasks/', 'Intern Tasks');
    if (res.status !== 'success' || !res.data) {
      return { status: res.status, error: res.error };
    }
    const tasksJson = res.data as { data?: RawTaskPayload[] };
    const tasksList = (tasksJson.data || (Array.isArray(tasksJson) ? tasksJson : [])) as RawTaskPayload[];
    if (!Array.isArray(tasksList)) {
      return { status: 'error' as SectionFetchStatus, error: 'Invalid intern tasks data format' };
    }
    const mappedTasks: HrInternTask[] = tasksList.map((t: RawTaskPayload) => ({
      id: String(t.id),
      title: t.title,
      description: t.description || '',
      internName: t.internName || t.employee_name || 'Intern',
      internEmail: t.internEmail || '',
      goalTitle: t.goalTitle || t.goal_title || null,
      dueDate: t.dueDate || t.due_date || '',
      priority: t.priority || 'MEDIUM',
      status: t.status || (t.isCompleted ? 'COMPLETED' : 'IN_PROGRESS'),
      isSelfCreated: t.isSelfCreated ?? true,
      createdAt: t.createdAt || t.created_at || '',
      updatedAt: t.updatedAt || t.updated_at || ''
    }));
    return {
      status: 'success' as SectionFetchStatus,
      data: mappedTasks
    };
  }, [executeEndpointFetch]);

  // 7. Telemetry Endpoint
  const fetchTelemetryData = useCallback(async () => {
    const res = await executeEndpointFetch('/dashboard/hr', 'Dashboard Telemetry');
    if (res.status !== 'success' || !res.data) {
      return { status: res.status, error: res.error };
    }
    const dataObj = res.data as { data?: HrDashboardTelemetry };
    return {
      status: 'success' as SectionFetchStatus,
      data: dataObj?.data || null
    };
  }, [executeEndpointFetch]);

  // ----------------------------------------------------
  // PARALLEL ORCHESTRATED DATA SYNCHRONIZATION
  // ----------------------------------------------------
  const loadDashboardData = useCallback(async () => {
    setLoadError(null);
    setSectionStatus(prev => ({
      ...prev,
      employees: 'loading',
      appraisals: 'loading',
      cycles: 'loading',
      goals: 'loading',
      evidence: 'loading',
      tasks: 'loading',
      telemetry: 'loading',
    }));

    // Parallel fetch of all independent sections via Promise.allSettled
    const [empRes, appRes, cycRes, goalRes, evRes, taskRes, telRes] = await Promise.allSettled([
      fetchEmployeesData(),
      fetchAppraisalsData(),
      fetchCyclesData(),
      fetchGoalsData(),
      fetchEvidenceData(),
      fetchTasksData(),
      fetchTelemetryData()
    ]);

    const newStatuses: Partial<SectionStatusMap> = {};
    const newErrors: Partial<SectionErrorMap> = {};
    let mappedInternsList: Intern[] = [];

    // 1. Employees & Directory
    if (empRes.status === 'fulfilled') {
      newStatuses.employees = empRes.value.status;
      if (empRes.value.status === 'success' && empRes.value.interns) {
        mappedInternsList = empRes.value.interns;
        setMentors(empRes.value.mentors || []);
        setCohorts(empRes.value.cohorts || []);
      } else if (empRes.value.error) {
        newErrors.employees = empRes.value.error;
      }
    } else {
      newStatuses.employees = 'error';
      newErrors.employees = 'Failed to load employees';
    }

    // 2. Appraisals (Handle 404 cleanly without crashing; merge scores if available)
    if (appRes.status === 'fulfilled') {
      newStatuses.appraisals = appRes.value.status;
      if (appRes.value.status === 'success' && appRes.value.data && mappedInternsList.length > 0) {
        const appList = appRes.value.data as RawAppraisalPayload[];
        appList.forEach((app: RawAppraisalPayload) => {
          const idx = mappedInternsList.findIndex(i =>
            String(i.id) === String(app.employeeId) ||
            i.name.toLowerCase() === (app.employeeName || '').toLowerCase()
          );
          if (idx >= 0) {
            const rawScore = app.overallScore !== undefined ? app.overallScore : (app.finalScore !== undefined ? app.finalScore : null);
            if (rawScore !== null && rawScore !== undefined && rawScore !== '') {
              const s = parseFloat(String(rawScore));
              if (!isNaN(s)) {
                mappedInternsList[idx].score = s;
                mappedInternsList[idx].published = app.status === 'PUBLISHED';
                mappedInternsList[idx].classification = (app.classification || (s >= 85 ? 'Achieved' : s >= 70 ? 'Progressing' : 'Focus Required')) as Intern['classification'];
              }
            }
          }
        });
      } else if (appRes.value.error) {
        newErrors.appraisals = appRes.value.error;
      }
    } else {
      newStatuses.appraisals = 'error';
      newErrors.appraisals = 'Failed to load appraisals';
    }

    // Update interns state
    if (mappedInternsList.length > 0) {
      setInterns(mappedInternsList);
    }

    // 3. Evaluation Cycles
    if (cycRes.status === 'fulfilled') {
      newStatuses.cycles = cycRes.value.status;
      if (cycRes.value.status === 'success' && cycRes.value.data) {
        setCycles(cycRes.value.data);
      } else if (cycRes.value.error) {
        newErrors.cycles = cycRes.value.error;
      }
    } else {
      newStatuses.cycles = 'error';
      newErrors.cycles = 'Failed to load cycles';
    }

    // 4. Goals
    if (goalRes.status === 'fulfilled') {
      newStatuses.goals = goalRes.value.status;
      if (goalRes.value.status === 'success' && goalRes.value.data) {
        setGoals(goalRes.value.data);
      } else if (goalRes.value.error) {
        newErrors.goals = goalRes.value.error;
      }
    } else {
      newStatuses.goals = 'error';
      newErrors.goals = 'Failed to load goals';
    }

    // 5. Evidence
    if (evRes.status === 'fulfilled') {
      newStatuses.evidence = evRes.value.status;
      if (evRes.value.status === 'success' && evRes.value.data) {
        setEvidenceList(evRes.value.data);
      } else if (evRes.value.error) {
        newErrors.evidence = evRes.value.error;
      }
    } else {
      newStatuses.evidence = 'error';
      newErrors.evidence = 'Failed to load evidence';
    }

    // 6. Intern Tasks
    if (taskRes.status === 'fulfilled') {
      newStatuses.tasks = taskRes.value.status;
      if (taskRes.value.status === 'success' && taskRes.value.data) {
        setHrTasks(taskRes.value.data);
      } else if (taskRes.value.error) {
        newErrors.tasks = taskRes.value.error;
      }
    } else {
      newStatuses.tasks = 'error';
      newErrors.tasks = 'Failed to load tasks';
    }

    // 7. Telemetry
    if (telRes.status === 'fulfilled') {
      newStatuses.telemetry = telRes.value.status;
      if (telRes.value.status === 'success' && telRes.value.data) {
        setTelemetry(telRes.value.data);
      }
    } else {
      newStatuses.telemetry = 'error';
    }

    setSectionStatus(prev => ({ ...prev, ...newStatuses }));
    setSectionErrors(prev => ({ ...prev, ...newErrors }));

    // Check if initial critical load failed
    if (newStatuses.employees === 'error' && interns.length === 0) {
      setLoadError('Failed to synchronize with workforce database. Please check connectivity.');
    }

    setIsLoading(false);
    setIsRefreshing(false);

    return {
      errorsCount: Object.values(newStatuses).filter(s => s === 'error').length,
      appraisalsUnavailable: newStatuses.appraisals === 'unavailable'
    };
  }, [
    fetchEmployeesData,
    fetchAppraisalsData,
    fetchCyclesData,
    fetchGoalsData,
    fetchEvidenceData,
    fetchTasksData,
    fetchTelemetryData,
    interns.length
  ]);

  // Section-specific targeted retry loader
  const loadSpecificSection = useCallback(async (section: 'tasks' | 'evidence' | 'goals' | 'appraisals' | 'cycles') => {
    setSectionStatus(prev => ({ ...prev, [section]: 'loading' }));
    setSectionErrors(prev => ({ ...prev, [section]: null }));

    if (section === 'tasks') {
      const res = await fetchTasksData();
      setSectionStatus(prev => ({ ...prev, tasks: res.status }));
      if (res.status === 'success' && res.data) {
        setHrTasks(res.data);
        toast.success('Intern tasks reloaded successfully');
      } else if (res.error) {
        setSectionErrors(prev => ({ ...prev, tasks: res.error }));
        toast.error(`Tasks reload failed: ${res.error}`);
      }
    } else if (section === 'evidence') {
      const res = await fetchEvidenceData();
      setSectionStatus(prev => ({ ...prev, evidence: res.status }));
      if (res.status === 'success' && res.data) {
        setEvidenceList(res.data);
        toast.success('Evidence deliverables reloaded successfully');
      } else if (res.error) {
        setSectionErrors(prev => ({ ...prev, evidence: res.error }));
        toast.error(`Evidence reload failed: ${res.error}`);
      }
    } else if (section === 'goals') {
      const res = await fetchGoalsData();
      setSectionStatus(prev => ({ ...prev, goals: res.status }));
      if (res.status === 'success' && res.data) {
        setGoals(res.data);
        toast.success('Assigned goals reloaded successfully');
      } else if (res.error) {
        setSectionErrors(prev => ({ ...prev, goals: res.error }));
        toast.error(`Goals reload failed: ${res.error}`);
      }
    } else if (section === 'appraisals') {
      const res = await fetchAppraisalsData();
      setSectionStatus(prev => ({ ...prev, appraisals: res.status }));
      if (res.status === 'success' && res.data) {
        const appList = res.data as RawAppraisalPayload[];
        setInterns(prev => prev.map(i => {
          const app = appList.find((a: RawAppraisalPayload) => String(a.employeeId) === String(i.id) || (a.employeeName || '').toLowerCase() === i.name.toLowerCase());
          if (app) {
            const rawScore = app.overallScore !== undefined ? app.overallScore : (app.finalScore !== undefined ? app.finalScore : null);
            if (rawScore !== null && rawScore !== undefined && rawScore !== '') {
              const s = parseFloat(String(rawScore));
              if (!isNaN(s)) {
                return {
                  ...i,
                  score: s,
                  published: app.status === 'PUBLISHED',
                  classification: (app.classification || (s >= 85 ? 'Achieved' : s >= 70 ? 'Progressing' : 'Focus Required')) as Intern['classification']
                };
              }
            }
          }
          return i;
        }));
        toast.success('Appraisal scores updated successfully');
      } else if (res.status === 'unavailable') {
        toast.info('Scorecard endpoint is currently awaiting backend route activation.');
      } else if (res.error) {
        setSectionErrors(prev => ({ ...prev, appraisals: res.error }));
        toast.error(`Appraisals reload failed: ${res.error}`);
      }
    }
  }, [fetchTasksData, fetchEvidenceData, fetchGoalsData, fetchAppraisalsData]);

  // Connected Refresh Handler
  const handleRefresh = useCallback(async () => {
    if (isRefreshing || isTelemetryFetching) return;
    setIsRefreshing(true);
    try {
      dispatch(api.util.invalidateTags([
        'Appraisal',
        'Cycle',
        'Employee',
        'GoalSet',
        'AuditTrail',
        'Department',
        'Score',
        'FinalScore'
      ]));

      const [, dashboardResult] = await Promise.allSettled([
        refetchTelemetry().unwrap().catch(() => null),
        loadDashboardData()
      ]);

      if (dashboardResult.status === 'fulfilled') {
        const outcome = dashboardResult.value;
        if (outcome && outcome.errorsCount > 0) {
          toast.warn(`Dashboard refreshed with ${outcome.errorsCount} warning(s). Existing metrics preserved.`);
        } else if (outcome && outcome.appraisalsUnavailable) {
          toast.info('Dashboard refreshed. Note: Scorecard synchronization is currently pending.');
        } else {
          toast.success('Dashboard metrics successfully refreshed');
        }
      } else {
        toast.error('Failed to refresh dashboard. Existing metrics preserved.');
      }
    } catch (err: unknown) {
      console.error('Refresh failed:', err);
      toast.error('Failed to refresh some dashboard data. Existing metrics preserved.');
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch, refetchTelemetry, loadDashboardData, isRefreshing, isTelemetryFetching]);

  const handleAssignGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInternId) {
      toast.error('Please select an intern from the employee list.');
      return;
    }
    if (!goalTitle.trim()) {
      toast.error('Goal title is required.');
      return;
    }
    try {
      setIsAssigningGoal(true);
      const res = await authFetch('/api/goals/', {
        method: 'POST',
        body: JSON.stringify({
          employee: selectedInternId,
          title: goalTitle.trim(),
          description: goalDescription.trim(),
          category: goalCategory,
          priority: goalPriority,
          due_date: goalDueDate,
          target_value: Number(goalTargetValue) || 100,
          weightage: Number(goalWeightage) || 20,
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Failed to assign goal.');
      }

      toast.success('Goal successfully assigned to intern!');
      setIsAssignGoalModalOpen(false);
      setGoalTitle('');
      setGoalDescription('');
      dispatch(api.util.invalidateTags(['GoalSet', 'Profile', 'Appraisal']));
      await loadDashboardData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error assigning goal to intern.');
    } finally {
      setIsAssigningGoal(false);
    }
  };

  const handleReviewEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewEvidence) return;
    try {
      setIsSubmittingReview(true);
      const res = await authFetch(`/api/evidence/${selectedReviewEvidence.id}/review/`, {
        method: 'POST',
        body: JSON.stringify({
          review_status: reviewStatusChoice,
          review_notes: reviewNotesInput.trim(),
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Failed to update review status.');
      }

      toast.success(`Evidence marked as ${reviewStatusChoice.replace(/_/g, ' ')}!`);
      setSelectedReviewEvidence(null);
      await loadDashboardData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error reviewing evidence submission.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadDashboardData();
    }
    return () => {
      isMounted = false;
    };
  }, [loadDashboardData]);

  // Genuine Metric Computations
  const totalCount = interns.length;
  const activeCount = interns.filter(i => i.status === 'ACTIVE').length;
  const publishedCount = interns.filter(i => i.published).length;

  // Evaluated interns breakdown (strictly excluding ungraded interns)
  const evaluatedInterns = useMemo(() => {
    return interns.filter(i => i.score !== null && i.score !== undefined);
  }, [interns]);
  const achievedCount = evaluatedInterns.filter(i => i.classification === 'Achieved').length;
  const progressingCount = evaluatedInterns.filter(i => i.classification === 'Progressing').length;
  const focusCount = evaluatedInterns.filter(i => i.classification === 'Focus Required').length;
  const ungradedCount = interns.length - evaluatedInterns.length;

  // Queue Items requiring HR Attention
  const pendingPublishInterns = useMemo(() => {
    return interns.filter(i => !i.published);
  }, [interns]);

  const pendingEvidenceList = useMemo(() => {
    return evidenceList.filter(e => e.status === 'PENDING');
  }, [evidenceList]);

  const totalQueueItems = pendingPublishInterns.length + pendingEvidenceList.length;

  // Active Cycle
  const activeCycle = cycles.find(c => c.status === 'ACTIVE') || cycles[0];

  // Genuine Appraisal Progress Trend Data (derived from verified active cycle)
  const appraisalProgressData = useMemo(() => {
    const dataPoints: AppraisalProgressDataPoint[] = [];

    // Current active evaluation cycle
    if (activeCycle && totalCount > 0) {
      const evalRate = Math.round((evaluatedInterns.length / totalCount) * 100);
      const pubRate = Math.round((publishedCount / totalCount) * 100);
      dataPoints.push({
        period: activeCycle.quarter || activeCycle.name,
        evaluatedCount: evaluatedInterns.length,
        totalEligible: totalCount,
        completionRate: evalRate,
        publishedCount: publishedCount,
        publishedRate: pubRate,
      });
    }

    return dataPoints;
  }, [totalCount, evaluatedInterns.length, publishedCount, activeCycle]);

  // Initial Loading Skeleton State
  if (isLoading && interns.length === 0 && sectionStatus.employees === 'loading') {
    return (
      <div className="py-24 text-center space-y-4 max-w-xl mx-auto">
        <div className="w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-base font-semibold text-slate-800">Initializing Performax HR Dashboard</h2>
        <p className="text-xs text-slate-500">
          Loading live employees, appraisal cycles, rubric criteria, and evaluation queues from backend...
        </p>
      </div>
    );
  }

  // Load Error State with Retry
  if (loadError && interns.length === 0 && sectionStatus.employees === 'error') {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-base font-bold text-slate-900">Connection Error</h2>
        <p className="text-xs text-slate-500">{loadError}</p>
        <button
          onClick={() => loadDashboardData()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
        >
          <RefreshCw size={14} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-slate-800 max-w-7xl mx-auto px-2 md:px-3">
      {/* 1. Welcome Header & Actions Bar */}
      <HrWelcomeHeader
        hrName={hrName}
        interns={interns}
        selectedInternId={selectedInternId}
        setSelectedInternId={setSelectedInternId}
        onOpenAssignGoal={() => setIsAssignGoalModalOpen(true)}
        isRefreshing={isRefreshing}
        isTelemetryFetching={isTelemetryFetching}
        onRefresh={handleRefresh}
      />

      {/* 2. Summary KPI Metric Tiles */}
      <HrSummaryKpiTiles
        totalCount={totalCount}
        activeCount={activeCount}
        activeCycle={activeCycle}
        telemetry={telemetry}
        totalQueueItems={totalQueueItems}
        pendingPublishCount={pendingPublishInterns.length}
        pendingEvidenceCount={pendingEvidenceList.length}
        publishedCount={publishedCount}
        mentorsCount={mentors.length}
        cohortsCount={cohorts.length}
        employeesStatus={sectionStatus.employees}
        appraisalsStatus={sectionStatus.appraisals}
        cyclesStatus={sectionStatus.cycles}
        evidenceStatus={sectionStatus.evidence}
      />

      {/* 3. Two-Column Workspace: Priorities & Performance Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <HrPrioritiesQueue
          totalQueueItems={totalQueueItems}
          pendingPublishInterns={pendingPublishInterns}
          pendingEvidenceList={pendingEvidenceList}
          activeCycle={activeCycle}
          telemetry={telemetry}
          appraisalsStatus={sectionStatus.appraisals}
          evidenceStatus={sectionStatus.evidence}
          onRetryEvidence={() => loadSpecificSection('evidence')}
        />

        <HrPerformanceSnapshot
          totalCount={totalCount}
          evaluatedInterns={evaluatedInterns}
          publishedCount={publishedCount}
          achievedCount={achievedCount}
          progressingCount={progressingCount}
          focusCount={focusCount}
          ungradedCount={ungradedCount}
          activeSnapshotView={activeSnapshotView}
          setActiveSnapshotView={setActiveSnapshotView}
          appraisalProgressData={appraisalProgressData}
          appraisalsStatus={sectionStatus.appraisals}
          onRetryAppraisals={() => loadSpecificSection('appraisals')}
        />
      </div>

      {/* 4. Appraisal Cycle Overview Stepper */}
      <HrAppraisalLifecycleStepper
        activeCycle={activeCycle}
        telemetry={telemetry}
        goals={goals}
        totalCount={totalCount}
        evaluatedInterns={evaluatedInterns}
        publishedCount={publishedCount}
        hoveredStageId={hoveredStageId}
        setHoveredStageId={setHoveredStageId}
        pinnedStageId={pinnedStageId}
        setPinnedStageId={setPinnedStageId}
        appraisalsStatus={sectionStatus.appraisals}
      />

      {/* 6. Intern Deliverables, Tasks & Evidence Desk */}
      <HrInternDeliverablesDesk
        activeDeskTab={activeDeskTab}
        setActiveDeskTab={setActiveDeskTab}
        hrTasks={hrTasks}
        evidenceList={evidenceList}
        goals={goals}
        interns={interns}
        filterTaskIntern={filterTaskIntern}
        setFilterTaskIntern={setFilterTaskIntern}
        filterTaskStatus={filterTaskStatus}
        setFilterTaskStatus={setFilterTaskStatus}
        tasksStatus={sectionStatus.tasks}
        evidenceStatus={sectionStatus.evidence}
        goalsStatus={sectionStatus.goals}
        tasksError={sectionErrors.tasks}
        evidenceError={sectionErrors.evidence}
        goalsError={sectionErrors.goals}
        onRetryTab={(tab) => loadSpecificSection(tab)}
        onOpenAssignGoal={() => {
          if (interns.length > 0 && !selectedInternId) {
            setSelectedInternId(interns[0].id);
          }
          setIsAssignGoalModalOpen(true);
        }}
        onSelectReviewEvidence={(ev) => {
          setSelectedReviewEvidence(ev);
          setReviewStatusChoice(ev.status === 'APPROVED' ? 'APPROVED' : 'APPROVED');
          setReviewNotesInput(ev.note || '');
        }}
      />

      {/* 7. Assign Goal Modal Dialog */}
      <HrAssignGoalModal
        isOpen={isAssignGoalModalOpen}
        onClose={() => setIsAssignGoalModalOpen(false)}
        interns={interns}
        selectedInternId={selectedInternId}
        setSelectedInternId={setSelectedInternId}
        goalTitle={goalTitle}
        setGoalTitle={setGoalTitle}
        goalDescription={goalDescription}
        setGoalDescription={setGoalDescription}
        goalCategory={goalCategory}
        setGoalCategory={setGoalCategory}
        goalPriority={goalPriority}
        setGoalPriority={setGoalPriority}
        goalDueDate={goalDueDate}
        setGoalDueDate={setGoalDueDate}
        goalTargetValue={goalTargetValue}
        setGoalTargetValue={setGoalTargetValue}
        goalWeightage={goalWeightage}
        setGoalWeightage={setGoalWeightage}
        isAssigningGoal={isAssigningGoal}
        onSubmit={handleAssignGoal}
      />

      {/* 8. Review Evidence Modal Dialog */}
      <HrReviewEvidenceModal
        evidence={selectedReviewEvidence}
        onClose={() => setSelectedReviewEvidence(null)}
        reviewStatusChoice={reviewStatusChoice}
        setReviewStatusChoice={setReviewStatusChoice}
        reviewNotesInput={reviewNotesInput}
        setReviewNotesInput={setReviewNotesInput}
        isSubmittingReview={isSubmittingReview}
        onSubmit={handleReviewEvidence}
      />
    </div>
  );
};

export default HrDashboard;
