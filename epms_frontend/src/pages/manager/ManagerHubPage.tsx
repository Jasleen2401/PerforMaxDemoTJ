import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Users,
  Target,
  Award,
  Plus,
  Search,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Check,
  X,
  ShieldCheck,
  RefreshCw,
  FolderOpen,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Download,
  Table as TableIcon,
  LayoutGrid,
  UserPlus,
  CheckCircle2,
  Clock,
  Trash2,
  FolderGit2,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  useGetAssignedMenteesQuery,
  useGetManagerTasksQuery,
  useAssignTaskMutation,
  useUpdateTaskStatusMutation,
  useGetTechnicalParametersQuery,
  useCreateTechnicalParameterMutation,
  useGetTechnicalReviewsQuery,
  useSaveTechnicalReviewsMutation,
  useGetManagerEvidenceQuery,
  useReviewEvidenceDecisionMutation,
  useGiveManagerFeedbackMutation,
  useGetHistoricalReviewsQuery,
} from '../../features/manager/managerApi';
import type { MenteeItem } from '../../features/manager/managerApi';
import { ProjectManagementSection } from './ProjectManagementSection';
import { TalentRadarSection } from './TalentRadarSection';
import { GoalAuditingSection } from './GoalAuditingSection';
import { TechnicalEvaluationWorkspace } from '../../components/manager/TechnicalEvaluationWorkspace';

export const ManagerHubPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const { user, accessToken, isHR, isAdmin } = useAuth();

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
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const finalUrl = (baseUrl && !url.startsWith('http'))
      ? `${baseUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
      : url;
    return fetch(finalUrl, { ...options, headers });
  }, [accessToken]);

  const getTabFromLocation = (): string => {
    if (location.pathname === '/manager/technical-capabilities') return 'capabilities';
    if (location.pathname === '/manager/tasks') return 'tasks';
    if (location.pathname === '/manager/evidence') return 'evidence';
    const tabParam = searchParams.get('tab');
    if (['batches', 'tasks', 'capabilities', 'evidence', 'projects', 'radar', 'verification', 'history'].includes(tabParam || '')) {
      return tabParam as string;
    }
    return 'mentees';
  };

  const [activeTab, setActiveTab] = useState<string>(getTabFromLocation);

  useEffect(() => {
    setActiveTab(getTabFromLocation());
  }, [location.pathname, searchParams]);

  // View Mode for Mentees Directory: Cards vs Table
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Search & Filter state for Mentees & Cohorts
  const [menteeSearch, setMenteeSearch] = useState(location.state?.search || '');
  const [statusFilter, setStatusFilter] = useState(location.state?.status || '');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [selectedSubBatch, setSelectedSubBatch] = useState<string>('ALL');
  const [menteePage, setMenteePage] = useState(0);
  const menteePageSize = 12;

  useEffect(() => {
    setMenteePage(0);
  }, [menteeSearch, statusFilter, selectedBatch, selectedSubBatch]);

  // Modals state
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [isGiveFeedbackOpen, setIsGiveFeedbackOpen] = useState(false);
  const [isAddParamOpen, setIsAddParamOpen] = useState(false);
  const [isReviewEvidenceOpen, setIsReviewEvidenceOpen] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  // Additional HR / Manager modals
  const [isAddInternOpen, setIsAddInternOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAddCycleOpen, setIsAddCycleOpen] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);

  // CSV file state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<Array<{ name: string; email: string; cohort: string; batch: string; subBatch: string }>>([]);

  // Batches & Goals data state
  const [cycles, setCycles] = useState<any[]>([]);
  const [projectGoals, setProjectGoals] = useState<any[]>([]);

  // Add Intern Form State
  const [newInternForm, setNewInternForm] = useState({
    name: '',
    email: '',
    cohort: 'MIRAI Cohort 1',
    batch: 'Batch A',
    subBatch: 'A1',
    mentor: '',
  });

  // Launch Cycle Form State
  const [cycleForm, setCycleForm] = useState({
    name: '',
    quarter: 'Q2 2026',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
  });

  // Assign Project Goal Form State
  const [projectGoalForm, setProjectGoalForm] = useState({
    internId: '',
    title: '',
    category: 'Technical Goal',
    dueDate: '2026-06-30',
  });

  // Assign Task Form State
  const [taskForm, setTaskForm] = useState({
    employee_id: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    due_date: '',
    target_value: 100,
    unit: '%',
  });

  // Give Feedback Form State
  const [feedbackForm, setFeedbackForm] = useState({
    employee_id: '',
    feedback_type: 'POSITIVE',
    message: '',
    visibility: 'PUBLIC',
  });

  // New Technical Parameter Form State (Scale 1 to 10)
  const [paramForm, setParamForm] = useState({
    name: '',
    category: 'Software Engineering',
    description: '',
    benchmark_score: 7.5,
    weight: 20.0,
  });

  // Evidence Review Form State
  const [evidenceDecision, setEvidenceDecision] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED',
    remarks: '',
  });

  // Load Batches & Goals data from backend
  const loadBatchesData = useCallback(async () => {
    try {
      let cRes = await authFetch('/api/performance/cycles/');
      if (!cRes.ok) {
        cRes = await authFetch('/appraisal-cycles/');
      }
      if (cRes.ok) {
        const cJson = await cRes.json();
        const cList = cJson.results || cJson.data || (Array.isArray(cJson) ? cJson : []);
        setCycles(cList);
      }
    } catch {}

    try {
      let gRes = await authFetch('/api/goals/');
      if (!gRes.ok) {
        gRes = await authFetch('/api/manager/tasks/');
      }
      if (gRes.ok) {
        const gJson = await gRes.json();
        const gList = gJson.results || gJson.data || (Array.isArray(gJson) ? gJson : []);
        setProjectGoals(gList);
      }
    } catch {}
  }, [authFetch]);

  useEffect(() => {
    loadBatchesData();
  }, [loadBatchesData]);

  // Queries
  const { data: mentees = [], isLoading: menteesLoading, refetch: refetchMentees } = useGetAssignedMenteesQuery({
    search: menteeSearch,
    status: statusFilter,
  });

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useGetManagerTasksQuery();
  const { refetch: refetchParams } = useGetTechnicalParametersQuery();
  const { data: evidenceList = [], refetch: refetchEvidence } = useGetManagerEvidenceQuery();

  // Selected Mentee for Technical Review & History Tab
  const [techReviewMenteeId, setTechReviewMenteeId] = useState<string>('');
  const activeTechMenteeId = techReviewMenteeId || (mentees.length > 0 ? mentees[0].id : '');
  const { data: techDossier, refetch: refetchTechReviews } = useGetTechnicalReviewsQuery(activeTechMenteeId, {
    skip: !activeTechMenteeId,
  });
  const { data: historicalReviews = [], isLoading: isHistoryLoading, refetch: refetchHistory } = useGetHistoricalReviewsQuery(activeTechMenteeId, {
    skip: !activeTechMenteeId,
  });

  // Technical Review Scores State
  const [techScores, setTechScores] = useState<Record<string, { score: number; assessment: string; evidenceUrl: string }>>({});

  // Mutations
  const [assignTask, { isLoading: isAssigningTask }] = useAssignTaskMutation();
  const [updateTaskStatus] = useUpdateTaskStatusMutation();
  const [createParam, { isLoading: isCreatingParam }] = useCreateTechnicalParameterMutation();
  const [saveTechnicalReviews, { isLoading: isSavingTechReview }] = useSaveTechnicalReviewsMutation();
  const [reviewEvidence, { isLoading: isReviewingEvidence }] = useReviewEvidenceDecisionMutation();
  const [giveFeedback, { isLoading: isSendingFeedback }] = useGiveManagerFeedbackMutation();

  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    if (tabKey === 'capabilities') {
      navigate('/manager/technical-capabilities');
    } else if (tabKey === 'tasks') {
      navigate('/manager/tasks');
    } else if (tabKey === 'evidence') {
      navigate('/manager/evidence');
    } else if (tabKey === 'mentees') {
      navigate('/manager/mentees');
    } else {
      navigate(`/manager/hub?tab=${tabKey}`);
    }
  };

  // Add Intern Handler
  const handleAddInternSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInternForm.name) {
      toast.warning('Please enter the intern / student name.');
      return;
    }
    const internEmail = newInternForm.email || `${newInternForm.name.toLowerCase().replace(/\s+/g, '')}@college.edu`;
    try {
      const payload = {
        staffName: newInternForm.name,
        name: newInternForm.name,
        email: internEmail,
        currentDepartmentName: newInternForm.batch,
        batch: newInternForm.batch,
        subBatch: newInternForm.subBatch,
        positionName: `Software Intern (${newInternForm.subBatch})`,
        cohort: newInternForm.cohort,
        universityCohort: newInternForm.cohort,
        roles: ['INTERN', 'EMPLOYEE'],
        status: 'ACTIVE'
      };

      let res = await authFetch('/api/manager/mentees/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        res = await authFetch('/emp/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast.success(`Intern "${newInternForm.name}" created and saved to database!`);
        setIsAddInternOpen(false);
        setNewInternForm({ name: '', email: '', cohort: 'MIRAI Cohort 1', batch: 'Batch A', subBatch: 'A1', mentor: '' });
        refetchMentees();
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.message || errJson.detail || 'Failed to create intern in database.');
      }
    } catch {
      toast.error('Failed to create intern in backend.');
    }
  };

  // CSV Import Handlers
  const handleSampleCsv = () => {
    const csv = "data:text/csv;charset=utf-8,Name,Email,Cohort,Batch,SubBatch\n" +
      "Devon Miller,devon@college.edu,MIRAI Cohort 1,Batch A,A1\n" +
      "Maya Lin,maya@college.edu,MIRAI Cohort 1,Batch B,B1\n";
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "sample_mirai_interns.csv";
    link.click();
    toast.success("Sample CSV template downloaded!");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        toast.warning('CSV file appears empty or has only headers.');
        return;
      }
      const parsed: Array<{ name: string; email: string; cohort: string; batch: string; subBatch: string }> = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2 && parts[0]) {
          parsed.push({
            name: parts[0],
            email: parts[1] || `${parts[0].toLowerCase().replace(/\s+/g, '')}@college.edu`,
            cohort: parts[2] || 'MIRAI Cohort 1',
            batch: parts[3] || 'Batch A',
            subBatch: parts[4] || 'A1'
          });
        }
      }
      setCsvPreviewRows(parsed);
      toast.info(`Detected ${parsed.length} intern(s) in CSV file.`);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    const internsToImport = csvPreviewRows.length > 0 ? csvPreviewRows : [
      { name: 'Devon Miller', email: 'devon@college.edu', cohort: 'MIRAI Cohort 1', batch: 'Batch A', subBatch: 'A1' },
      { name: 'Maya Lin', email: 'maya@college.edu', cohort: 'MIRAI Cohort 1', batch: 'Batch B', subBatch: 'B1' }
    ];

    try {
      const payload = internsToImport.map(c => ({
        staffName: c.name,
        name: c.name,
        email: c.email,
        currentDepartmentName: c.batch,
        batch: c.batch,
        subBatch: c.subBatch,
        positionName: `Software Intern (${c.subBatch})`,
        cohort: c.cohort,
        universityCohort: c.cohort,
        roles: ['INTERN', 'EMPLOYEE'],
        status: 'ACTIVE'
      }));

      let res = await authFetch('/api/manager/mentees/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        res = await authFetch('/emp/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast.success(`Imported ${internsToImport.length} interns via CSV and saved to database!`);
        setIsCsvModalOpen(false);
        setCsvFile(null);
        setCsvPreviewRows([]);
        refetchMentees();
      } else {
        toast.error('Failed to import interns to database.');
      }
    } catch {
      toast.error('Error uploading CSV to backend.');
    }
  };

  // Launch Cycle Handler
  const handleCreateCycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleForm.name) return;
    try {
      const payload = {
        name: cycleForm.name,
        cycleName: cycleForm.name,
        start_date: cycleForm.startDate,
        startDate: cycleForm.startDate,
        end_date: cycleForm.endDate,
        endDate: cycleForm.endDate,
        evaluationPeriod: cycleForm.quarter,
        status: 'ACTIVE'
      };

      let res = await authFetch('/api/performance/cycles/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        res = await authFetch('/appraisal-cycles/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast.success(`Appraisal cycle "${cycleForm.name}" launched and active!`);
        setIsAddCycleOpen(false);
        setCycleForm({ name: '', quarter: 'Q2 2026', startDate: '2026-04-01', endDate: '2026-06-30' });
        loadBatchesData();
      } else {
        toast.error('Failed to launch evaluation cycle.');
      }
    } catch {
      toast.error('Failed to create cycle.');
    }
  };

  // Assign Project Goal Handler
  const handleCreateGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectGoalForm.title) return;
    const targetId = projectGoalForm.internId || mentees[0]?.id;
    if (!targetId) {
      toast.warning('Please select an intern to assign the goal.');
      return;
    }
    try {
      const activeCycle = cycles.find((c: any) => c.status === 'ACTIVE' || c.isActive) || cycles[0];
      const cycleId = activeCycle?.uuid || activeCycle?.id;

      let res = await authFetch('/api/manager/tasks/assign/', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: targetId,
          title: projectGoalForm.title,
          description: projectGoalForm.category,
          due_date: projectGoalForm.dueDate,
          priority: 'HIGH',
          expected_evidence_type: 'CODE_PR',
          linked_competency: projectGoalForm.category,
          cycle: cycleId
        })
      });

      if (!res.ok) {
        res = await authFetch('/api/goals/', {
          method: 'POST',
          body: JSON.stringify({
            employee: targetId,
            title: projectGoalForm.title,
            description: projectGoalForm.category,
            due_date: projectGoalForm.dueDate,
            priority: 'HIGH',
            status: 'NOT_STARTED',
            cycle: cycleId
          })
        });
      }

      if (res.ok) {
        toast.success(`Goal "${projectGoalForm.title}" assigned successfully!`);
        setIsAddGoalOpen(false);
        setProjectGoalForm({ internId: '', title: '', category: 'Technical Goal', dueDate: '2026-06-30' });
        loadBatchesData();
        refetchTasks();
      } else {
        toast.error('Failed to assign project goal.');
      }
    } catch {
      toast.error('Failed to assign project goal.');
    }
  };

  // Sync tech scores when techDossier arrives
  React.useEffect(() => {
    if (techDossier?.parameters) {
      const initial: Record<string, { score: number; assessment: string; evidenceUrl: string }> = {};
      techDossier.parameters.forEach((p) => {
        initial[p.parameterId] = {
          score: p.review.score || p.benchmarkScore || 4.0,
          assessment: p.review.mentorAssessment || '',
          evidenceUrl: p.review.evidenceUrl || '',
        };
      });
      setTechScores(initial);
    }
  }, [techDossier]);

  // Handlers
  const handleAssignTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.employee_id || !taskForm.title) {
      toast.warning('Please select an intern and enter a task title.');
      return;
    }
    try {
      await assignTask(taskForm).unwrap();
      toast.success('Task successfully assigned to intern!');
      setIsAssignTaskOpen(false);
      setTaskForm({
        employee_id: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
        due_date: '',
        target_value: 100,
        unit: '%',
      });
      refetchTasks();
      refetchMentees();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to assign task.');
    }
  };

  const handleGiveFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.employee_id || !feedbackForm.message) {
      toast.warning('Please select an intern and enter feedback.');
      return;
    }
    try {
      await giveFeedback(feedbackForm).unwrap();
      toast.success('Feedback recorded and delivered!');
      setIsGiveFeedbackOpen(false);
      setFeedbackForm({
        employee_id: '',
        feedback_type: 'POSITIVE',
        message: '',
        visibility: 'PUBLIC',
      });
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to send feedback.');
    }
  };

  const handleCreateParamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paramForm.name) {
      toast.warning('Parameter name is required.');
      return;
    }
    try {
      await createParam(paramForm).unwrap();
      toast.success('Technical parameter configured successfully!');
      setIsAddParamOpen(false);
      setParamForm({
        name: '',
        category: 'Software Engineering',
        description: '',
        benchmark_score: 5.0,
        weight: 20.0,
      });
      refetchParams();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to add parameter.');
    }
  };

  const handleSaveTechReviews = async (reviewStatus: 'DRAFT' | 'SUBMITTED') => {
    if (!activeTechMenteeId) return;
    const reviewsPayload = Object.entries(techScores).map(([paramId, data]) => ({
      parameter_id: paramId,
      score: data.score,
      mentor_assessment: data.assessment,
      evidence_url: data.evidenceUrl,
    }));

    try {
      await saveTechnicalReviews({
        employee_id: activeTechMenteeId,
        status: reviewStatus,
        reviews: reviewsPayload,
      }).unwrap();
      toast.success(
        reviewStatus === 'SUBMITTED'
          ? 'Technical capability review finalized and submitted!'
          : 'Technical evaluation draft saved!'
      );
      refetchTechReviews();
      refetchMentees();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save technical review.');
    }
  };

  const handleReviewEvidenceSubmit = async () => {
    if (!selectedEvidenceId) return;
    try {
      await reviewEvidence({
        id: selectedEvidenceId,
        status: evidenceDecision.status,
        remarks: evidenceDecision.remarks,
      }).unwrap();
      toast.success(`Evidence marked as ${evidenceDecision.status.toLowerCase().replace('_', ' ')}.`);
      setIsReviewEvidenceOpen(false);
      setSelectedEvidenceId(null);
      setEvidenceDecision({ status: 'APPROVED', remarks: '' });
      refetchEvidence();
      refetchMentees();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to submit evidence decision.');
    }
  };

  // Filter mentees by search, status, batch and sub-batch
  const filteredMentees = useMemo(() => {
    return mentees.filter((m) => {
      if (menteeSearch) {
        const query = menteeSearch.toLowerCase();
        const fullName = (m.fullName || `${m.firstName || ''} ${m.lastName || ''}`).toLowerCase();
        const code = (m.employeeCode || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        if (!fullName.includes(query) && !code.includes(query) && !email.includes(query)) {
          return false;
        }
      }
      if (statusFilter && m.employmentStatus !== statusFilter) {
        return false;
      }
      if (selectedBatch !== 'ALL') {
        const text = `${m.department || ''} ${m.designation || ''}`.toLowerCase();
        if (!text.includes(selectedBatch.toLowerCase())) return false;
      }
      if (selectedSubBatch !== 'ALL') {
        const text = `${m.designation || ''} ${m.employeeCode || ''}`.toLowerCase();
        if (!text.includes(selectedSubBatch.toLowerCase())) return false;
      }
      return true;
    });
  }, [mentees, menteeSearch, statusFilter, selectedBatch, selectedSubBatch]);

  // Metrics summary
  const totalMentees = mentees.length;
  const filteredCount = filteredMentees.length;
  const totalMenteePages = Math.ceil(filteredCount / menteePageSize) || 1;
  const pagedMentees = filteredMentees.slice(menteePage * menteePageSize, (menteePage + 1) * menteePageSize);
  const totalActiveTasks = tasks.filter((t) => t.status !== 'COMPLETED').length;
  const totalPendingEvidence = evidenceList.filter((e) => e.reviewStatus === 'PENDING').length;
  const pendingAppraisals = mentees.filter((m) => m.activeAppraisal?.status === 'SUBMITTED' || m.activeAppraisal?.status === 'UNDER_REVIEW').length;

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner - Compact Performax Purple/Lavender Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-purple-100/90 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-400" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-200/60">
                <ShieldCheck size={12} className="text-purple-600" />
                Manager Workspace
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Assigned Mentees
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-2xl">
              Manage your interns, track deliverables, review evidence, and support performance growth.
            </p>
          </div>

          {/* Compact Action Group */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAddInternOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <UserPlus size={14} />
              <span>Add Intern</span>
            </button>
            <button
              onClick={() => {
                setTaskForm((prev) => ({ ...prev, employee_id: mentees[0]?.id || '' }));
                setIsAssignTaskOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 hover:border-purple-200 font-bold text-xs transition-all cursor-pointer active:scale-95"
            >
              <Plus size={14} className="text-purple-600" />
              <span>Assign Task</span>
            </button>
            <button
              onClick={() => {
                setFeedbackForm((prev) => ({ ...prev, employee_id: mentees[0]?.userId || '' }));
                setIsGiveFeedbackOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 hover:border-purple-200 font-bold text-xs transition-all cursor-pointer active:scale-95"
            >
              <MessageSquare size={14} className="text-purple-600" />
              <span>Give Feedback</span>
            </button>
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 hover:border-purple-200 font-bold text-xs transition-all cursor-pointer active:scale-95"
            >
              <UploadCloud size={14} className="text-purple-600" />
              <span>Upload CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Assigned Interns */}
        <div
          onClick={() => handleTabChange('mentees')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTabChange('mentees'); } }}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer group ${
            activeTab === 'mentees'
              ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-purple-200 hover:bg-purple-50/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Assigned Interns</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {menteesLoading ? '—' : totalMentees}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>Direct reports</span>
            <span className="opacity-0 group-hover:opacity-100 text-purple-600 transition-opacity font-bold">→</span>
          </div>
        </div>

        {/* Card 2: Active Tasks */}
        <div
          onClick={() => handleTabChange('tasks')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTabChange('tasks'); } }}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer group ${
            activeTab === 'tasks'
              ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-purple-200 hover:bg-purple-50/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Tasks</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Target size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {tasksLoading ? '—' : totalActiveTasks}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>In-flight deliverables</span>
            <span className="opacity-0 group-hover:opacity-100 text-purple-600 transition-opacity font-bold">→</span>
          </div>
        </div>

        {/* Card 3: Pending Evidence */}
        <div
          onClick={() => handleTabChange('evidence')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTabChange('evidence'); } }}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer group ${
            activeTab === 'evidence'
              ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-purple-200 hover:bg-purple-50/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Evidence</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FolderOpen size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalPendingEvidence}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>Submissions awaiting review</span>
            <span className="opacity-0 group-hover:opacity-100 text-purple-600 transition-opacity font-bold">→</span>
          </div>
        </div>

        {/* Card 4: Pending Appraisals */}
        <div
          onClick={() => navigate('/appraisal')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/appraisal'); } }}
          className="p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer group bg-white border-slate-200/80 hover:border-purple-200 hover:bg-purple-50/30 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Appraisals</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Award size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {pendingAppraisals}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
            <span>View evaluations</span>
            <span className="opacity-0 group-hover:opacity-100 text-purple-600 transition-opacity font-bold">→</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Single-Row Responsive System */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-1.5 flex-wrap">
        {[
          { key: 'mentees', label: 'Directory', icon: Users },
          { key: 'projects', label: 'Projects & Milestones', icon: FolderGit2 },
          { key: 'tasks', label: 'Tasks', icon: Target },
          { key: 'verification', label: 'Goal Auditing', icon: CheckCircle2 },
          { key: 'capabilities', label: 'Technical Skills', icon: Sparkles },
          { key: 'evidence', label: 'Evidence Review', icon: FolderOpen },
          { key: 'batches', label: 'Batches & Terms', icon: Layers },
          { key: 'radar', label: 'Talent Radar & PPO', icon: TrendingUp },
          { key: 'history', label: 'Review History', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/60'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'mentees' && (
        <div className="space-y-4">
          {/* Filters & Actions Bar - Compact Single Row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative min-w-[200px] flex-1">
                <Search size={15} className="absolute left-3.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student name, code, or email..."
                  value={menteeSearch}
                  onChange={(e) => setMenteeSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>

              <select
                value={selectedBatch}
                onChange={(e) => {
                  const b = e.target.value;
                  setSelectedBatch(b);
                  if (b !== 'ALL' && selectedSubBatch !== 'ALL') {
                    const validSubs: Record<string, string[]> = {
                      'Batch A': ['A1', 'A2'],
                      'Batch B': ['B1', 'B2'],
                      'Batch C': ['C1', 'C2'],
                      'Batch D': ['D1', 'D2'],
                    };
                    if (validSubs[b] && !validSubs[b].includes(selectedSubBatch)) {
                      setSelectedSubBatch('ALL');
                    }
                  }
                }}
                className="px-2.5 py-1.5 bg-purple-50/50 border border-purple-200/80 rounded-xl text-xs text-purple-900 font-semibold focus:outline-hidden"
              >
                <option value="ALL">All Batches (A-D)</option>
                <option value="Batch A">Batch A</option>
                <option value="Batch B">Batch B</option>
                <option value="Batch C">Batch C</option>
                <option value="Batch D">Batch D</option>
              </select>

              <select
                value={selectedSubBatch}
                onChange={(e) => setSelectedSubBatch(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden"
              >
                <option value="ALL">All Sub-Batches</option>
                <option value="A1">Sub-Batch A1</option>
                <option value="A2">Sub-Batch A2</option>
                <option value="B1">Sub-Batch B1</option>
                <option value="B2">Sub-Batch B2</option>
                <option value="C1">Sub-Batch C1</option>
                <option value="C2">Sub-Batch C2</option>
                <option value="D1">Sub-Batch D1</option>
                <option value="D2">Sub-Batch D2</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PROBATION">Probation</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* View Switcher: Cards vs Table */}
              <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                    viewMode === 'cards' ? 'bg-white text-purple-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                    viewMode === 'table' ? 'bg-white text-purple-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Directory Table View"
                >
                  <TableIcon size={14} />
                </button>
              </div>

              <button
                onClick={() => refetchMentees()}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                title="Refresh Directory"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Mentees Rendering */}
          {menteesLoading ? (
            <div className="py-20 text-center text-xs text-slate-400">Loading assigned interns directory...</div>
          ) : filteredMentees.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <Users size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Interns Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No interns match your current search filters or batch criteria.
              </p>
            </div>
          ) : viewMode === 'table' ? (
            /* Directory Table View */
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Intern / Student</th>
                      <th className="py-3 px-3">Batch & Sub-Batch</th>
                      <th className="py-3 px-3">Department & Designation</th>
                      <th className="py-3 px-3">Performance Metrics</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedMentees.map((mentee) => {
                      const batchMatch = (mentee.department || mentee.designation || '').match(/Batch\s*([ABCD])/i);
                      const bName = batchMatch ? `Batch ${batchMatch[1].toUpperCase()}` : null;
                      const subMatch = (mentee.designation || mentee.employeeCode || '').match(/([ABCD][12])/i);
                      const sbName = subMatch ? subMatch[1].toUpperCase() : null;
                      const hasGoals = (mentee.metrics?.totalGoals || 0) > 0;
                      const techScore = mentee.metrics?.technicalCapabilityAvg;
                      const pendingEv = mentee.metrics?.pendingEvidence || 0;

                      return (
                        <tr key={mentee.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{mentee.fullName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{mentee.employeeCode} • {mentee.email}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              {bName && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-100">
                                  {bName}
                                </span>
                              )}
                              {sbName && (
                                <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100">
                                  {sbName}
                                </span>
                              )}
                              {!bName && !sbName && (
                                <span className="text-[11px] text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            <div className="font-medium text-slate-800">{mentee.designation || 'Intern'}</div>
                            <div className="text-[11px] text-slate-400">{mentee.department || 'Engineering'}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-slate-800 font-semibold">
                              Tech: {techScore ? `${techScore}/5` : <span className="text-slate-400 font-normal">Not assessed</span>}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Goals: {hasGoals ? `${mentee.metrics.completedGoals}/${mentee.metrics.totalGoals}` : 'None'} • {pendingEv > 0 ? `${pendingEv} Pending Ev.` : '0 Pending'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                mentee.employmentStatus === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {mentee.employmentStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setTaskForm((prev) => ({ ...prev, employee_id: mentee.id }));
                                  setIsAssignTaskOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors active:scale-95"
                              >
                                Assign Task
                              </button>
                              <button
                                onClick={() => {
                                  setTechReviewMenteeId(mentee.id);
                                  handleTabChange('capabilities');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60 text-[11px] font-bold cursor-pointer transition-colors active:scale-95"
                              >
                                Rate Skills
                              </button>
                              <button
                                onClick={() => {
                                  const targetId = mentee.activeAppraisal?.id || mentee.id;
                                  navigate(`/appraisal/${targetId}/manager-evaluation`);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs active:scale-95"
                              >
                                Appraisal
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {pagedMentees.map((mentee) => {
                  const batchMatch = (mentee.department || mentee.designation || '').match(/Batch\s*([ABCD])/i);
                  const bName = batchMatch ? `Batch ${batchMatch[1].toUpperCase()}` : null;
                  const subMatch = (mentee.designation || mentee.employeeCode || '').match(/([ABCD][12])/i);
                  const sbName = subMatch ? subMatch[1].toUpperCase() : null;
                  const hasGoals = (mentee.metrics?.totalGoals || 0) > 0;
                  const completedGoals = mentee.metrics?.completedGoals || 0;
                  const totalGoals = mentee.metrics?.totalGoals || 0;
                  const techScore = mentee.metrics?.technicalCapabilityAvg;
                  const pendingEv = mentee.metrics?.pendingEvidence || 0;

                  return (
                    <div
                      key={mentee.id}
                      className="bg-white rounded-2xl border border-slate-200/90 hover:border-purple-300 transition-all p-4.5 shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Row: Avatar & Status */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center font-bold text-purple-700 text-xs shrink-0 shadow-2xs">
                              {mentee.firstName?.[0]}
                              {mentee.lastName?.[0]}
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-slate-900 leading-snug">{mentee.fullName}</h3>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-slate-400 text-[11px] font-mono">{mentee.employeeCode}</span>
                                {bName && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-100">
                                    {bName}
                                  </span>
                                )}
                                {sbName && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100">
                                    {sbName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                              mentee.employmentStatus === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {mentee.employmentStatus}
                          </span>
                        </div>

                        {/* Designation & Email */}
                        <div className="mt-2.5 text-xs text-slate-500 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Layers size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{mentee.designation || 'Intern'} • {mentee.department || 'Engineering'}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate pl-4.5">{mentee.email}</div>
                        </div>

                        {/* Performance Telemetry Mini-Strip - Accurate & Clean Handling */}
                        <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t border-slate-100 text-center">
                          <div className="bg-slate-50/70 rounded-xl p-1.5 border border-slate-100">
                            <div className="text-[10px] font-semibold text-slate-400">Goals</div>
                            <div className={`text-xs font-bold mt-0.5 ${
                              hasGoals
                                ? (completedGoals === totalGoals ? 'text-emerald-700' : 'text-slate-800')
                                : 'text-slate-400 font-medium'
                            }`}>
                              {hasGoals ? `${completedGoals}/${totalGoals}` : 'None'}
                            </div>
                          </div>

                          <div className="bg-slate-50/70 rounded-xl p-1.5 border border-slate-100">
                            <div className="text-[10px] font-semibold text-slate-400">Tech Score</div>
                            <div className={`text-xs font-bold mt-0.5 ${
                              techScore ? 'text-purple-700' : 'text-slate-400 font-medium text-[11px]'
                            }`}>
                              {techScore ? `${techScore}/5` : 'Not assessed'}
                            </div>
                          </div>

                          <div className="bg-slate-50/70 rounded-xl p-1.5 border border-slate-100">
                            <div className="text-[10px] font-semibold text-slate-400">Evidence</div>
                            <div className={`text-xs font-bold mt-0.5 ${
                              pendingEv > 0 ? 'text-amber-600' : 'text-slate-400 font-medium'
                            }`}>
                              {pendingEv > 0 ? `${pendingEv} Pending` : '0 Pending'}
                            </div>
                          </div>
                        </div>

                        {/* Active Appraisal Indicator */}
                        {mentee.activeAppraisal && (
                          <div className="mt-2.5 bg-purple-50/50 rounded-xl p-2 border border-purple-100/80 flex items-center justify-between text-xs">
                            <div className="truncate mr-2">
                              <span className="font-bold text-purple-950 block text-[11px] truncate">
                                {mentee.activeAppraisal.cycleName}
                              </span>
                              <span className="text-[10px] text-purple-600 font-medium">
                                Status: {mentee.activeAppraisal.statusDisplay || mentee.activeAppraisal.status}
                              </span>
                            </div>
                            {mentee.activeAppraisal.overallScore && (
                              <span className="font-black text-xs text-purple-900 px-2 py-0.5 bg-white rounded-lg shadow-2xs border border-purple-100 shrink-0">
                                {mentee.activeAppraisal.overallScore}/100
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quick Action Matrix */}
                      <div className="mt-3.5 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => {
                            setTaskForm((prev) => ({ ...prev, employee_id: mentee.id }));
                            setIsAssignTaskOpen(true);
                          }}
                          className="px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all text-center cursor-pointer active:scale-95"
                        >
                          Assign Task
                        </button>
                        <button
                          onClick={() => {
                            setTechReviewMenteeId(mentee.id);
                            handleTabChange('capabilities');
                          }}
                          className="px-2 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60 text-[11px] font-bold transition-all text-center cursor-pointer active:scale-95"
                        >
                          Rate Skills
                        </button>
                        <button
                          onClick={() => {
                            const targetId = mentee.activeAppraisal?.id || mentee.id;
                            navigate(`/appraisal/${targetId}/manager-evaluation`);
                          }}
                          className="px-2 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-all text-center shadow-2xs cursor-pointer active:scale-95"
                        >
                          Appraisal
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCount > menteePageSize && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/90 mt-4 shadow-2xs">
                  <span className="text-xs text-slate-500">
                    Showing <strong className="text-slate-800">{menteePage * menteePageSize + 1}–{Math.min((menteePage + 1) * menteePageSize, filteredCount)}</strong> of <strong className="text-slate-800">{filteredCount}</strong> students
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMenteePage((p) => Math.max(0, p - 1))}
                      disabled={menteePage === 0}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                    >
                      <ChevronLeft size={14} />
                      Previous
                    </button>
                    <span className="text-xs font-bold text-slate-600 px-2">
                      Page {menteePage + 1} of {totalMenteePages}
                    </span>
                    <button
                      onClick={() => setMenteePage((p) => Math.min(totalMenteePages - 1, p + 1))}
                      disabled={menteePage >= totalMenteePages - 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: BATCHES & GOALS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          {/* Evaluation Cycles List */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Appraisal & Evaluation Terms</h3>
                <p className="text-xs text-slate-500 mt-0.5">Appraisal cycles and evaluation terms configured for cohorts.</p>
              </div>
              <button
                onClick={() => setIsAddCycleOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-all shadow-xs cursor-pointer self-start sm:self-auto active:scale-95"
              >
                <Plus size={14} />
                <span>Launch Evaluation Term</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cycles.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  No evaluation cycles currently configured.
                </div>
              ) : (
                cycles.map((cy: any) => (
                  <div key={cy.id || cy.cycleId} className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2 hover:border-purple-200 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs truncate" title={cy.name || cy.cycleName}>
                        {cy.name || cy.cycleName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (cy.status === 'ACTIVE' || cy.isActive)
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {(cy.status === 'ACTIVE' || cy.isActive) ? 'ACTIVE' : (cy.status || 'PLANNING')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Period: <strong className="text-slate-700">{cy.quarter || cy.evaluationPeriod || 'Q2 2026'}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {cy.start_date || cy.startDate || '—'} – {cy.end_date || cy.endDate || '—'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cohort Batch Breakdown */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <h3 className="text-base font-bold text-slate-900">Interns Batch Breakdown</h3>
            <p className="text-xs text-slate-500">Distribution of enrolled mentees across cohorts and sub-batches.</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {['Batch A', 'Batch B', 'Batch C', 'Batch D'].map((batchName) => {
                const count = mentees.filter(m => (m.department || m.designation || '').toLowerCase().includes(batchName.toLowerCase())).length;
                return (
                  <div
                    key={batchName}
                    onClick={() => { setSelectedBatch(batchName); setActiveTab('mentees'); }}
                    className="p-3.5 bg-purple-50/40 rounded-2xl border border-purple-100/90 hover:border-purple-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-950">{batchName}</span>
                      <span className="text-[10px] font-semibold text-purple-700 bg-white px-2 py-0.5 rounded-full shadow-2xs border border-purple-100">Sub: 1 & 2</span>
                    </div>
                    <div className="text-2xl font-black text-purple-950 mt-2">
                      {count}
                    </div>
                    <div className="text-[11px] text-purple-600 mt-1 flex items-center justify-between">
                      <span>View interns</span>
                      <span className="group-hover:translate-x-0.5 transition-transform font-bold">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assigned Project Goals Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Assigned Project Goals</h3>
                <p className="text-xs text-slate-500 mt-0.5">Track milestone progress, completion percentages, and due dates.</p>
              </div>
              <button
                onClick={() => setIsAddGoalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-all shadow-xs cursor-pointer self-start sm:self-auto active:scale-95"
              >
                <Plus size={14} />
                <span>Assign Goal</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-3">Goal Title</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Progress</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectGoals.length === 0 && tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                        No assigned project goals found.
                      </td>
                    </tr>
                  ) : (
                    (projectGoals.length > 0 ? projectGoals : tasks.map(t => ({
                      id: t.id,
                      employee_name: t.employeeName,
                      title: t.title,
                      description: t.description || 'Sprint Deliverable',
                      completion_percentage: t.completionPercentage,
                      status: t.status,
                      due_date: t.dueDate || '—',
                    }))).map((goal: any) => (
                      <tr key={goal.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {goal.employee_name || goal.internName || 'Assigned Student'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{goal.title}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {goal.description || goal.category || 'Technical Goal'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-purple-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, goal.completion_percentage || 0)}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-700">{goal.completion_percentage || 0}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            goal.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            goal.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {goal.status || 'In Progress'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {goal.due_date || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TASKS */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">Assigned Tasks & Deliverables</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Create new tasks, adjust milestone completion, and track student/intern progress.
              </p>
            </div>
            <button
              onClick={() => {
                setTaskForm((prev) => ({ ...prev, employee_id: mentees[0]?.id || '' }));
                setIsAssignTaskOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>Assign New Task</span>
            </button>
          </div>

          {tasksLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <Target size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Tasks Assigned Yet</h3>
              <p className="text-xs text-slate-500 mt-1">Assign deliverables to students/interns to start tracking progress.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl p-4.5 border border-slate-200/90 hover:border-purple-200 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{task.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.priority === 'CRITICAL'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : task.priority === 'HIGH'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {task.priority}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {task.statusDisplay}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1">
                      <span>
                        Student: <strong className="text-slate-700 font-semibold">{task.employeeName}</strong>
                      </span>
                      <span>
                        Due: <strong className="text-slate-700 font-semibold">{task.dueDate || 'No due date'}</strong>
                      </span>
                      <span>
                        Assigned by: <strong className="text-slate-700 font-semibold">{task.assignedByName}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Progress & Quick Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                    <div className="w-36 space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Progress</span>
                        <span>{task.completionPercentage}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full transition-all"
                          style={{ width: `${task.completionPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {task.status !== 'COMPLETED' && (
                        <button
                          onClick={async () => {
                            await updateTaskStatus({
                              id: task.id,
                              status: 'COMPLETED',
                              completion_percentage: 100,
                              comment: 'Verified and marked completed by mentor.',
                            });
                            toast.success(`Task "${task.title}" marked as Completed!`);
                            refetchTasks();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Check size={14} />
                          Approve
                        </button>
                      )}
                      {task.status === 'NOT_STARTED' && (
                        <button
                          onClick={async () => {
                            await updateTaskStatus({
                              id: task.id,
                              status: 'IN_PROGRESS',
                              completion_percentage: 25,
                              comment: 'Task initiated.',
                            });
                            toast.success('Task marked In Progress!');
                            refetchTasks();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs transition-all cursor-pointer border border-purple-200/60 active:scale-95"
                        >
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TECHNICAL SKILLS */}
      {/* ========================================================================= */}
      {activeTab === 'capabilities' && (
        <TechnicalEvaluationWorkspace />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: EVIDENCE REVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Intern Evidence & Deliverables</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review submitted test automation suites, PR artifacts, and documentation.
              </p>
            </div>
            <button
              onClick={() => refetchEvidence()}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              title="Refresh Evidence"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {evidenceList.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <FolderOpen size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Evidence Submissions Found</h3>
              <p className="text-xs text-slate-500 mt-1">Direct reports have not submitted evidence for review yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {evidenceList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4.5 border border-slate-200/90 hover:border-purple-200 transition-all shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                        <div className="text-xs text-slate-500">
                          Submitted by: <strong className="text-slate-800 font-semibold">{item.employeeName}</strong>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.reviewStatus === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.reviewStatus === 'REVISION_REQUESTED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : item.reviewStatus === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {item.reviewStatusDisplay}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">{item.description}</p>

                    <div className="text-[11px] text-slate-400">
                      Goal/Task: <span className="font-semibold text-slate-700">{item.goalTitle}</span>
                    </div>

                    {item.externalUrl && (
                      <a
                        href={item.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-purple-600 hover:bg-slate-100 transition-colors"
                      >
                        <ExternalLink size={13} />
                        View Attached Artifact / PR
                      </a>
                    )}

                    {item.reviewNotes && (
                      <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-700 border border-slate-100">
                        <span className="font-bold block text-[10px] text-slate-400 uppercase">Mentor Review Remarks:</span>
                        {item.reviewNotes}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">{item.createdAt}</span>
                    <button
                      onClick={() => {
                        setSelectedEvidenceId(item.id);
                        setEvidenceDecision({ status: 'APPROVED', remarks: item.reviewNotes || '' });
                        setIsReviewEvidenceOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      Conduct Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: PROJECTS & MILESTONES */}
      {/* ========================================================================= */}
      {activeTab === 'projects' && (
        <ProjectManagementSection
          onAssignTaskForProject={(projectId) => {
            setTaskForm((prev) => ({ ...prev, description: `Target Project ID: ${projectId}` }));
            setIsAssignTaskOpen(true);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB: GOAL AUDITING & VERIFICATION */}
      {/* ========================================================================= */}
      {activeTab === 'verification' && (
        <GoalAuditingSection onRefetchData={refetchTasks} />
      )}

      {/* ========================================================================= */}
      {/* TAB: TALENT RADAR & PPO VERDICT */}
      {/* ========================================================================= */}
      {activeTab === 'radar' && (
        <TalentRadarSection mentees={mentees} />
      )}

      {/* ========================================================================= */}
      {/* TAB: REVIEW HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          {/* Header & Intern Selector */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Clock className="text-purple-600" size={18} />
                Historical Performance Evaluations
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Inspect finalized appraisal dossiers, criteria ratings, and mentor/self reflections.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Select Intern:</label>
              <select
                value={activeTechMenteeId}
                onChange={(e) => setTechReviewMenteeId(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {mentees.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.employeeCode})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => refetchHistory()}
                className="p-2 text-slate-500 hover:text-purple-600 bg-slate-50 hover:bg-purple-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                title="Refresh History"
              >
                <RefreshCw size={14} className={isHistoryLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Historical Reviews List */}
          {isHistoryLoading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 text-slate-400">
              <RefreshCw className="animate-spin mb-3" size={24} />
              <p className="text-xs font-semibold">Loading appraisal history...</p>
            </div>
          ) : historicalReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 text-center">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-3">
                <Clock size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Historical Reviews Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Completed appraisal cycles and audited evaluations for this intern will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {historicalReviews.map((review: any) => (
                <div
                  key={review.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 space-y-4 transition-all hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{review.cycleName}</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {review.statusDisplay || review.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Cycle Period: {review.cycleStartDate || 'N/A'} - {review.cycleEndDate || 'N/A'} • Candidate: {review.employeeName} ({review.employeeCode})
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Overall Score</div>
                        <div className="text-base font-black text-purple-600">
                          {review.overallScore !== null && review.overallScore !== undefined
                            ? `${Number(review.overallScore).toFixed(1)} / 10`
                            : 'Pending'}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/appraisals/${review.id}/evaluate`)}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <ExternalLink size={13} />
                        View Evaluation
                      </button>
                    </div>
                  </div>

                  {/* Comments & Reflections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Mentor Reflection ({review.reviewerName || 'Supervisor'})
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed italic">
                        "{review.reviewerComments || 'No reviewer comments recorded.'}"
                      </p>
                    </div>

                    <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100/60 space-y-1">
                      <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider">
                        Mentee Self Reflection
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed italic">
                        "{review.selfComments || 'No self comments recorded.'}"
                      </p>
                    </div>
                  </div>

                  {/* Criteria Ratings Breakdown */}
                  {review.criteriaRatings && review.criteriaRatings.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-[11px] font-bold text-slate-700">Competency Breakdown</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {review.criteriaRatings.map((crit: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-semibold text-slate-800">{crit.criterionName}</div>
                              <div className="text-[10px] text-slate-400">Weight: {crit.weight}%</div>
                            </div>
                            <div className="text-xs font-black text-purple-600 px-2 py-1 bg-white rounded-lg border border-slate-200">
                              {crit.score} / 10
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN TASK */}
      {/* ========================================================================= */}
      {isAssignTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Assign New Task</h3>
              <button onClick={() => setIsAssignTaskOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignTaskSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Student / Intern *</label>
                <select
                  required
                  value={taskForm.employee_id}
                  onChange={(e) => setTaskForm({ ...taskForm, employee_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="">-- Choose Student / Intern --</option>
                  {mentees.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.employeeCode}) {m.department ? `• ${m.department}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement API Test Suite for Auth"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description & Deliverables</label>
                <textarea
                  rows={3}
                  placeholder="Detailed instructions, acceptance criteria, or target repository..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignTaskOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigningTask}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  {isAssigningTask ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GIVE FEEDBACK */}
      {/* ========================================================================= */}
      {isGiveFeedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Provide Student Feedback</h3>
              <button onClick={() => setIsGiveFeedbackOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGiveFeedbackSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Student / Intern *</label>
                <select
                  required
                  value={feedbackForm.employee_id}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, employee_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="">-- Choose Student / Intern --</option>
                  {mentees.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName} ({m.employeeCode}) {m.department ? `• ${m.department}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Feedback Category</label>
                <select
                  value={feedbackForm.feedback_type}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback_type: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="POSITIVE">Positive Praise</option>
                  <option value="COACHING">Coaching & Guidance</option>
                  <option value="CONSTRUCTIVE">Constructive Feedback</option>
                  <option value="TRAINING">Training & Skill Need</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Feedback Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Share constructive observations or acknowledge outstanding velocity..."
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGiveFeedbackOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingFeedback}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  {isSendingFeedback ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD TECHNICAL PARAMETER */}
      {/* ========================================================================= */}
      {isAddParamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Configure Technical Parameter</h3>
              <button onClick={() => setIsAddParamOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateParamSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Parameter Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microservices & Distributed Architecture"
                  value={paramForm.name}
                  onChange={(e) => setParamForm({ ...paramForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={paramForm.category}
                  onChange={(e) => setParamForm({ ...paramForm, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Criteria evaluated under this technical parameter..."
                  value={paramForm.description}
                  onChange={(e) => setParamForm({ ...paramForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Benchmark Score (Max 5)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="5"
                    value={paramForm.benchmark_score}
                    onChange={(e) => setParamForm({ ...paramForm, benchmark_score: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Weight (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={paramForm.weight}
                    onChange={(e) => setParamForm({ ...paramForm, weight: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddParamOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingParam}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  {isCreatingParam ? 'Configuring...' : 'Save Parameter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REVIEW EVIDENCE DECISION */}
      {/* ========================================================================= */}
      {isReviewEvidenceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Evidence Review Decision</h3>
              <button onClick={() => setIsReviewEvidenceOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Decision</label>
                <select
                  value={evidenceDecision.status}
                  onChange={(e) =>
                    setEvidenceDecision({
                      ...evidenceDecision,
                      status: e.target.value as any,
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="APPROVED">Approve Evidence</option>
                  <option value="REVISION_REQUESTED">Request Revision</option>
                  <option value="REJECTED">Reject Evidence</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mentor Remarks / Feedback</label>
                <textarea
                  rows={3}
                  placeholder="Notes on code coverage, test quality, or required fixes..."
                  value={evidenceDecision.remarks}
                  onChange={(e) => setEvidenceDecision({ ...evidenceDecision, remarks: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReviewEvidenceOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isReviewingEvidence}
                  onClick={handleReviewEvidenceSubmit}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  {isReviewingEvidence ? 'Saving...' : 'Submit Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD INTERN / STUDENT */}
      {/* ========================================================================= */}
      {isAddInternOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <UserPlus size={16} />
                </div>
                <h3 className="font-bold text-base text-slate-900">Add New Intern / Student</h3>
              </div>
              <button onClick={() => setIsAddInternOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddInternSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newInternForm.name}
                  onChange={(e) => setNewInternForm({ ...newInternForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. john@college.edu"
                  value={newInternForm.email}
                  onChange={(e) => setNewInternForm({ ...newInternForm, email: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cohort</label>
                <input
                  type="text"
                  value={newInternForm.cohort}
                  onChange={(e) => setNewInternForm({ ...newInternForm, cohort: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batch</label>
                  <select
                    value={newInternForm.batch}
                    onChange={(e) => setNewInternForm({ ...newInternForm, batch: e.target.value, subBatch: `${e.target.value.slice(-1)}1` })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="Batch A">Batch A</option>
                    <option value="Batch B">Batch B</option>
                    <option value="Batch C">Batch C</option>
                    <option value="Batch D">Batch D</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sub-Batch</label>
                  <select
                    value={newInternForm.subBatch}
                    onChange={(e) => setNewInternForm({ ...newInternForm, subBatch: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                    <option value="D1">D1</option>
                    <option value="D2">D2</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddInternOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  Save Intern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UPLOAD CSV */}
      {/* ========================================================================= */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <UploadCloud size={16} />
                </div>
                <h3 className="font-bold text-base text-slate-900">Upload Interns via CSV</h3>
              </div>
              <button onClick={() => setIsCsvModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <p className="text-slate-500">
                Import multiple interns with batch, sub-batch, and cohort assignments directly into the system.
              </p>

              <button
                type="button"
                onClick={handleSampleCsv}
                className="w-full py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-xl border border-purple-200 cursor-pointer flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={14} />
                <span>Download Sample CSV Template</span>
              </button>

              <div className="border-2 border-dashed border-purple-200 rounded-2xl p-6 text-center space-y-2 bg-purple-50/20">
                <UploadCloud size={32} className="mx-auto text-purple-600" />
                <div className="font-bold text-slate-800">Select or Drag CSV file here</div>
                <input type="file" accept=".csv" className="text-xs text-slate-500 mx-auto block" />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCsvImport}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  Import Interns
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LAUNCH QUARTER CYCLE */}
      {/* ========================================================================= */}
      {isAddCycleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Calendar size={16} />
                </div>
                <h3 className="font-bold text-base text-slate-900">Launch Appraisal Quarter Term</h3>
              </div>
              <button onClick={() => setIsAddCycleOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCycleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cycle Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MIRAI Q3 2026 Appraisal"
                  value={cycleForm.name}
                  onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Evaluation Quarter</label>
                <input
                  type="text"
                  placeholder="e.g. Q3 2026"
                  value={cycleForm.quarter}
                  onChange={(e) => setCycleForm({ ...cycleForm, quarter: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={cycleForm.startDate}
                    onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={cycleForm.endDate}
                    onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCycleOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  Launch Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN PROJECT GOAL */}
      {/* ========================================================================= */}
      {isAddGoalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Target size={16} />
                </div>
                <h3 className="font-bold text-base text-slate-900">Assign Project Goal</h3>
              </div>
              <button onClick={() => setIsAddGoalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGoalSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Student / Intern *</label>
                <select
                  value={projectGoalForm.internId}
                  onChange={(e) => setProjectGoalForm({ ...projectGoalForm, internId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  <option value="">Select Student...</option>
                  {mentees.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.employeeCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Goal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement Payment Gateway Integration"
                  value={projectGoalForm.title}
                  onChange={(e) => setProjectGoalForm({ ...projectGoalForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={projectGoalForm.category}
                  onChange={(e) => setProjectGoalForm({ ...projectGoalForm, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  <option value="Technical Goal">Technical Goal</option>
                  <option value="Design Goal">Design Goal</option>
                  <option value="Quality Goal">Quality Goal</option>
                  <option value="Soft Skills">Soft Skills</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={projectGoalForm.dueDate}
                  onChange={(e) => setProjectGoalForm({ ...projectGoalForm, dueDate: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddGoalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  Assign Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerHubPage;
