import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  useGetAppraisalsQuery,
  useGetCyclesQuery,
  useGetAppraisalFormsQuery,
  useGetAppraisalsByCycleQuery,
  useActivateCycleMutation,
  useCloseCycleMutation,
  useGetTeamEvaluationsQuery,
  useCreateFormSetMutation,
  useGetAppraisalFormSetsQuery,
  useDeleteAppraisalFormMutation,
  useDeleteFormSetMutation,
  useDeleteCycleMutation,
  useSendCycleRemindersMutation
} from '../../features/appraisal/appraisalApi';
import { useGetDepartmentsQuery } from '../../features/org/departmentApi';
import { format } from 'date-fns';
import {
  Plus,
  Layers,
  ClipboardList,
  Calendar,
  FileText,
  ChevronRight,
  Target,
  Users,
  CheckCircle2,
  Circle,
  Search,
  Mail,
  Trash2,
  Calculator
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Can } from '../../components/Can';

const panelStyle: React.CSSProperties = {
  background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12,
};

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  FINALIZED:    { bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0' },
  PENDING:      { bg: '#FAEEDA', text: '#633806', border: '#F0D4A4' },
  SELF_ASSESSED:{ bg: '#EEF3FD', text: '#0C447C', border: '#B5D4F4' },
  EVALUATED:    { bg: '#EEF3FD', text: '#0C447C', border: '#B5D4F4' },
  HR_APPROVED:  { bg: '#F1EFE8', text: '#444441', border: '#DDDBD2' },
};

const getStatusStyle = (status: string) =>
  STATUS_STYLE[status] ?? { bg: '#F1EFE8', text: '#444441', border: '#DDDBD2' };

const APPRAISAL_STATUS_OPTIONS = [
  'PENDING',
  'SELF_ASSESSED',
  'EVALUATED',
  'HR_APPROVED',
  'FINALIZED',
  'ARCHIVED',
];

const AppraisalList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isHR, isManager } = useAuth();
  const isPrivileged = isAdmin || isHR;

  const [activeTab, setActiveTab] = React.useState<'appraisals' | 'team' | 'cycles' | 'forms'>(
    location.state?.activeTab || (isPrivileged ? 'cycles' : (isManager ? 'team' : 'appraisals'))
  );
  const [selectedCycleId, setSelectedCycleId] = React.useState<number | null>(null);
  const [expandedCycle, setExpandedCycle] = React.useState<string | null>(location.state?.expandedCycle || null);
  const [expandedSet, setExpandedSet] = React.useState<string | null>(location.state?.expandedSet || null);
  const [showNewSetModal, setShowNewSetModal] = React.useState(false);
  const [newSetName, setNewSetName] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [departmentFilter, setDepartmentFilter] = React.useState('ALL');
  const [statusFilter, setStatusFilter] = React.useState(location.state?.statusFilter || 'ALL');
  const [participantPage, setParticipantPage] = React.useState(1);
  const participantPageSize = 10;

  const resetParticipantFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('ALL');
    setStatusFilter('ALL');
    setParticipantPage(1);
  };

  const [confirmModal, setConfirmModal] = React.useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const { data: appraisals = [], isLoading: loadingAppraisals, error: errorAppraisals } = useGetAppraisalsQuery();
  const { data: teamEvaluations = [], isLoading: loadingTeam } = useGetTeamEvaluationsQuery(undefined, { skip: !isManager });
  const { data: cycles = [], isLoading: loadingCycles } = useGetCyclesQuery(undefined, { skip: !isPrivileged });
  const { data: forms = [], isLoading: loadingForms } = useGetAppraisalFormsQuery(undefined, { skip: !isPrivileged });
  const { data: departments = [] } = useGetDepartmentsQuery(undefined, { skip: !isPrivileged });
  const { data: appraisalsByCycle = [], isLoading: loadingCycleData } = useGetAppraisalsByCycleQuery(selectedCycleId || 0, { skip: !selectedCycleId || !isPrivileged });
  const [activateCycle, { isLoading: isActivating }] = useActivateCycleMutation();
  const [closeCycle, { isLoading: isClosing }] = useCloseCycleMutation();
  const [createFormSet] = useCreateFormSetMutation();
  const [deleteFormSet] = useDeleteFormSetMutation();
  const [deleteForm] = useDeleteAppraisalFormMutation();
  const [deleteCycle] = useDeleteCycleMutation();
  const [sendReminders, { isLoading: isSendingReminders }] = useSendCycleRemindersMutation();

  const { data: formSets = [] } = useGetAppraisalFormSetsQuery(undefined, { skip: !isPrivileged });

  const isLoading = loadingAppraisals || loadingTeam || (isPrivileged && (loadingCycles || loadingForms || (!!selectedCycleId && loadingCycleData)));

  if (isLoading) return <div className="py-16 text-center" style={{ color: '#9EA3B0', fontSize: 13 }}>Loading…</div>;

  if (errorAppraisals) return (
    <div className="py-8 text-center" style={{ color: '#791F1F', fontSize: 13, background: '#FCEBEB', border: '0.5px solid #F5C2C2', borderRadius: 12, padding: '16px 18px' }}>
      No assessments are assigned.
    </div>
  );

  const safeFormatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try { return format(new Date(dateString), 'dd/MM/yyyy'); } catch { return 'N/A'; }
  };

  const getCycleStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'EVALUATION': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'ARCHIVED': return 'bg-slate-500 text-white border-slate-600';
      default: return 'bg-gray-100 text-gray-400 border-gray-200';
    }
  };

  const isArchivedCycle = (cycle: any) => cycle?.status?.toUpperCase() === 'ARCHIVED';
  const canDeleteCycle = (cycle: any) =>
    isPrivileged && !cycle?.isAssigned && !cycle?.isActive && cycle?.status === 'PLANNING' && !isArchivedCycle(cycle);

  const renderAppraisals = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {appraisals.length > 0 ? appraisals.map((appraisal: any) => {
        const s = getStatusStyle(appraisal.status);
        return (
          <div key={appraisal.appraisalId} style={{ ...panelStyle, padding: '16px 18px', cursor: 'pointer' }}
            className="hover:border-[#1A56DB] transition-colors"
            onClick={() => navigate(`/appraisal/${appraisal.appraisalId}`)}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{appraisal.cycleName}</span>
              <span style={{ fontSize: 11, fontWeight: 500, background: s.bg, color: s.text, border: `0.5px solid ${s.border}`, borderRadius: 20, padding: '2px 8px' }}>
                {appraisal.status.replace('_', ' ')}
              </span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 4 }}>{appraisal.employeeName}</p>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginBottom: 12 }}>Performance Assessment</p>
            <div className="flex items-center justify-between" style={{ paddingTop: 10, borderTop: '0.5px solid #F0F2F6', marginTop: 10 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/appraisal/${appraisal.appraisalId}/score`);
                }}
                style={{ fontSize: 12, color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                className="hover:underline flex items-center gap-1 font-medium"
              >
                <Calculator size={12} /> Preview Score
              </button>
              <ChevronRight size={14} style={{ color: '#9EA3B0' }} />
            </div>
          </div>
        );
      }) : (
        <div className="col-span-full py-16 text-center" style={{ color: '#9EA3B0', fontSize: 13 }}>No assessments assigned.</div>
      )}
    </div>
  );

  const renderTeamEvaluations = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {teamEvaluations.length > 0 ? teamEvaluations.map((appraisal: any) => {
        const s = getStatusStyle(appraisal.status);
        return (
          <div key={appraisal.appraisalId} style={{ ...panelStyle, padding: '16px 18px', cursor: 'pointer' }}
            className="hover:border-[#1A56DB] transition-colors"
            onClick={() => navigate(`/appraisal/${appraisal.appraisalId}`)}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{appraisal.cycleName}</span>
              <span style={{ fontSize: 11, fontWeight: 500, background: s.bg, color: s.text, border: `0.5px solid ${s.border}`, borderRadius: 20, padding: '2px 8px' }}>
                {appraisal.status.replace('_', ' ')}
              </span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 4 }}>{appraisal.employeeName}</p>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginBottom: 12 }}>Team Performance Evaluation</p>
            <div className="flex items-center justify-between" style={{ paddingTop: 10, borderTop: '0.5px solid #F0F2F6' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/appraisal/${appraisal.appraisalId}/score`);
                }}
                style={{ fontSize: 12, color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                className="hover:underline flex items-center gap-1 font-medium"
              >
                <Calculator size={12} /> Preview Score
              </button>
              <ChevronRight size={14} style={{ color: '#9EA3B0' }} />
            </div>
          </div>
        );
      }) : (
        <div className="col-span-full py-16 text-center" style={{ color: '#9EA3B0', fontSize: 13 }}>No team evaluations.</div>
      )}
    </div>
  );

  const renderCycles = () => {
    const getDaysRemaining = (endDate: string) => {
      const diff = new Date(endDate).getTime() - new Date().getTime();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    if (selectedCycleId) {
      const cycle = cycles.find((c: any) => Number(c.cycleId) === Number(selectedCycleId));
      const daysLeft = getDaysRemaining(cycle?.endDate ?? '');
      const total = appraisalsByCycle.length;
      const selfCount = appraisalsByCycle.filter((a: any) => a.status !== 'PENDING').length;
      const managerCount = appraisalsByCycle.filter((a: any) => ['EVALUATED', 'HR_APPROVED', 'FINALIZED'].includes(a.status)).length;
      const finalCount = appraisalsByCycle.filter((a: any) => a.status === 'FINALIZED').length;
      const selfRate = total > 0 ? Math.round((selfCount / total) * 100) : 0;
      const managerRate = total > 0 ? Math.round((managerCount / total) * 100) : 0;
      const finalRate = total > 0 ? Math.round((finalCount / total) * 100) : 0;

      const departmentOptions = departments
        .map((department: any) => String(department.departmentName || '').trim())
        .filter(Boolean)
        .sort((a: string, b: string) => a.localeCompare(b));

      const normalizedSearch = searchTerm.trim().toLowerCase();

      const filteredAppraisalsByCycle = appraisalsByCycle.filter((a: any) => {
        const matchesSearch =
          !normalizedSearch ||
          String(a.employeeName || '').toLowerCase().includes(normalizedSearch) ||
          String(a.managerName || '').toLowerCase().includes(normalizedSearch);

        const matchesDepartment =
          departmentFilter === 'ALL' || String(a.departmentName || '').trim() === departmentFilter;

        const matchesStatus =
          statusFilter === 'ALL' || String(a.status || '').trim() === statusFilter;

        return matchesSearch && matchesDepartment && matchesStatus;
      });

      const isParticipantFilterActive =
        normalizedSearch ||
        departmentFilter !== 'ALL' ||
        statusFilter !== 'ALL';

      const participantTotalPages = Math.max(1, Math.ceil(filteredAppraisalsByCycle.length / participantPageSize));
      const currentParticipantPage = Math.min(participantPage, participantTotalPages);
      const paginatedAppraisalsByCycle = filteredAppraisalsByCycle.slice(
        (currentParticipantPage - 1) * participantPageSize,
        currentParticipantPage * participantPageSize
      );

      return (
        <div className="space-y-4">
          {/* Breadcrumb & actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <button onClick={() => { setSelectedCycleId(null); resetParticipantFilters(); }} className="flex items-center gap-1 transition-colors"
                style={{ fontSize: 12, color: '#1A56DB', marginBottom: 6 }}>
                <ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} /> Back to Cycles
              </button>
              <div className="flex items-center gap-3">
                <h2 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>{cycle?.cycleName}</h2>
                <span style={{ fontSize: 11, fontWeight: 500, background: cycle?.isActive ? '#EAF3DE' : '#F1EFE8', color: cycle?.isActive ? '#27500A' : '#444441', border: `0.5px solid ${cycle?.isActive ? '#B8DCA0' : '#DDDBD2'}`, borderRadius: 20, padding: '2px 8px' }}>
                  {cycle?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>
                {daysLeft > 0 ? `Ends in ${daysLeft} days` : 'Cycle concluded'}
              </p>
            </div>

            <Can permission="APPRAISAL_CYCLE_MANAGE">
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  if (selectedCycleId) {
                    try {
                      await sendReminders(Number(selectedCycleId)).unwrap();
                      toast.success("Reminder notifications sent successfully!");
                    } catch (err: any) {
                      const errorMsg = "Failed to send reminders.";
                      toast.error(`Error: ${errorMsg}`);
                    }
                  }
                }}
                disabled={isSendingReminders}
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Mail className="w-4 h-4" /> {isSendingReminders ? 'Sending...' : 'Send Reminders'}
              </button>
              {canDeleteCycle(cycle) && (
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Delete Appraisal Cycle',
                      message: `Are you sure you want to permanently delete the cycle "${cycle?.cycleName}"? This will delete the cycle itself, all of its linked Form Sets, and all associated templates, categories, and questions. This action is irreversible.`,
                      onConfirm: async () => {
                        try {
                          await deleteCycle(Number(selectedCycleId)).unwrap();
                          toast.success('Appraisal Cycle deleted successfully!');
                          setSelectedCycleId(null);
                          resetParticipantFilters();
                        } catch (err: any) {
                          const errorMsg = 'Failed to delete cycle';
                          toast.error(`Error: ${errorMsg}`);
                        }
                      }
                    });
                  }}
                  className="px-6 py-3 bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete Cycle
                </button>
              )}
              {!cycle?.isActive && cycle?.status !== 'ARCHIVED' ? (
                <button
                  onClick={async () => {
                    try {
                      await activateCycle(Number(selectedCycleId)).unwrap();
                      toast.success('Appraisal Cycle activated successfully!');
                    } catch (err: any) {
                      const errorMsg = 'Failed to activate cycle';
                      toast.error(`Error: ${errorMsg}`);
                    }
                  }}
                  disabled={isActivating}
                  className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isActivating ? 'Activating...' : 'Activate Cycle'}
                </button>
              ) : isPrivileged && cycle?.isActive ? (
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Force Close Cycle (Emergency)',
                      message: `Are you sure you want to FORCE CLOSE "${cycle.cycleName}"? System normally handles this on ${safeFormatDate(cycle.endDate)}. Only use this for emergencies.`,
                      onConfirm: () => {
                        closeCycle(Number(selectedCycleId));
                        setSelectedCycleId(null);
                        resetParticipantFilters();
                      }
                    });
                  }}
                  disabled={isClosing}
                  className="px-6 py-3 bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isClosing ? 'Closing...' : 'Emergency Close'}
                </button>
              ) : cycle?.status === 'ARCHIVED' ? (
                <div className="px-4 py-2 bg-slate-100 text-slate-500 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-2 uppercase tracking-wide">
                  Archived — closed permanently
                </div>
              ) : null}
            </div>
            </Can>
          </div>

          {/* Completion rates */}
          <div style={{ ...panelStyle, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Completion Rates</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Self-Assessments', rate: selfRate, count: selfCount },
                { label: 'Manager Evaluations', rate: managerRate, count: managerCount },
                { label: 'Final Sign-offs', rate: finalRate, count: finalCount },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#5A6070' }}>{stat.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{stat.rate}%</span>
                  </div>
                  <div style={{ height: 4, background: '#F0F2F6', borderRadius: 4, marginBottom: 4 }}>
                    <div style={{ height: '100%', borderRadius: 4, background: '#1A56DB', width: `${stat.rate}%` }} />
                  </div>
                  <p style={{ fontSize: 11, color: '#9EA3B0' }}>{stat.count} of {total}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div style={{ ...panelStyle, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Cycle Timeline</p>
            <div className="space-y-3">
              {[
                { label: 'Cycle Start', date: cycle?.startDate },
                { label: 'Self-Assessment Deadline', date: cycle?.selfAssessmentDeadline },
                { label: 'Manager Reviews Close', date: cycle?.managerEvaluationDeadline },
                { label: 'Finalization', date: cycle?.finalizationDeadline },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A56DB', flexShrink: 0 }} />
                  <div className="flex items-center justify-between flex-1">
                    <span style={{ fontSize: 12, color: '#5A6070' }}>{step.label}</span>
                    <span style={{ fontSize: 12, color: '#111827', fontWeight: 500 }}>{safeFormatDate(step.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Participants table */}
          <div style={{ ...panelStyle, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #E4E6EC' }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
                {isParticipantFilterActive
                  ? `Participants (${filteredAppraisalsByCycle.length} of ${appraisalsByCycle.length})`
                  : `Participants (${appraisalsByCycle.length})`}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
                  <input type="text" placeholder="Search…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '6px 10px 6px 30px', fontSize: 12, color: '#111827', outline: 'none', width: 180 }} />
                </div>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#111827', outline: 'none' }}
                >
                  <option value="ALL">All Departments</option>
                  {departmentOptions.map(dept => (
                    <option key={dept as string} value={dept as string}>{dept as string}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#111827', outline: 'none' }}
                >
                  <option value="ALL">All Statuses</option>
                  {APPRAISAL_STATUS_OPTIONS.map(status => (
                    <option key={status as string} value={status as string}>{(status as string).replace(/_/g, ' ')}</option>
                  ))}
                </select>
                {isParticipantFilterActive && (
                  <button
                    onClick={resetParticipantFilters}
                    style={{ fontSize: 12, color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px' }}
                    className="hover:underline font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 580 }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #E4E6EC' }}>
                    {['Employee', 'Department', 'Manager', 'Status', 'Score', ''].map((h, i) => (
                      <th key={h + i} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAppraisalsByCycle.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>
                        No participants match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedAppraisalsByCycle.map((appraisal: any, idx: number, arr: any[]) => {
                    const s = getStatusStyle(appraisal.status);
                    return (
                      <tr key={appraisal.appraisalId} style={{ borderBottom: idx < arr.length - 1 ? '0.5px solid #F0F2F6' : 'none' }}
                        className="hover:bg-[#FAFBFF] transition-colors">
                        <td style={{ padding: '10px 16px' }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{appraisal.employeeName}</p>
                          <p style={{ fontSize: 11, color: '#9EA3B0', fontFamily: 'monospace' }}>{appraisal.employeeCode}</p>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#5A6070' }}>{appraisal.departmentName || '—'}</td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#5A6070' }}>{appraisal.managerName || '—'}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 500, background: s.bg, color: s.text, border: `0.5px solid ${s.border}`, borderRadius: 20, padding: '2px 8px' }}>
                            {appraisal.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: '#111827' }}>
                          {appraisal.finalScore != null ? `${Number(appraisal.finalScore).toFixed(1)}%` : '—'}
                        </td>
                        <td style={{ padding: '10px 16px', display: 'flex', gap: 12 }}>
                          <button onClick={() => navigate(`/appraisal/${appraisal.appraisalId}`)}
                            style={{ fontSize: 12, color: '#1A56DB' }} className="hover:underline font-medium">Detail</button>
                          <button onClick={() => navigate(`/appraisal/${appraisal.appraisalId}/score`)}
                            style={{ fontSize: 12, color: '#0C447C' }} className="hover:underline font-medium">Preview</button>
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {participantTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#E4E6EC] bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    disabled={currentParticipantPage === 1}
                    onClick={() => setParticipantPage(prev => Math.max(prev - 1, 1))}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentParticipantPage === participantTotalPages}
                    onClick={() => setParticipantPage(prev => Math.min(prev + 1, participantTotalPages))}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-gray-500">
                      Showing <span className="font-semibold text-gray-700">{((currentParticipantPage - 1) * participantPageSize) + 1}</span> to <span className="font-semibold text-gray-700">{Math.min(currentParticipantPage * participantPageSize, filteredAppraisalsByCycle.length)}</span> of{' '}
                      <span className="font-semibold text-gray-700">{filteredAppraisalsByCycle.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
                      <button
                        disabled={currentParticipantPage === 1}
                        onClick={() => setParticipantPage(prev => Math.max(prev - 1, 1))}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronRight size={16} className="rotate-180" />
                      </button>
                      {Array.from({ length: participantTotalPages }).map((_, index) => {
                        const pageNum = index + 1;
                        const isCurrent = pageNum === currentParticipantPage;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setParticipantPage(pageNum)}
                            aria-current={isCurrent ? "page" : undefined}
                            className={`relative inline-flex items-center px-4 py-2 text-xs font-semibold focus:z-20 focus:outline-offset-0 ${
                              isCurrent
                                ? "z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        disabled={currentParticipantPage === participantTotalPages}
                        onClick={() => setParticipantPage(prev => Math.min(prev + 1, participantTotalPages))}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight size={16} />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cycles.length > 0 ? cycles.map((cycle: any) => (
          <div
            key={cycle.cycleId}
            onClick={() => { setSelectedCycleId(cycle.cycleId); resetParticipantFilters(); }}
            className="group bg-white rounded-4xl border border-slate-200 p-8 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col"
          >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-0 group-hover:opacity-10 transition-opacity blur-3xl ${cycle.isActive ? 'bg-indigo-600' : 'bg-slate-400'}`}></div>

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getCycleStatusColor(cycle.status || '')}`}>
                {cycle.status?.replace('_', ' ') || (cycle.isActive ? 'ACTIVE' : 'INACTIVE')}
              </div>
              <div className="flex items-center gap-2">
                <Can permission="APPRAISAL_CYCLE_MANAGE">
                  {canDeleteCycle(cycle) && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setConfirmModal({
                          isOpen: true,
                          title: 'Delete Appraisal Cycle',
                          message: `Are you sure you want to permanently delete the cycle "${cycle.cycleName}"? This will delete the cycle itself, all of its linked Form Sets, and all associated templates, categories, and questions. This action is irreversible.`,
                          onConfirm: async () => {
                            try {
                              await deleteCycle(cycle.cycleId).unwrap();
                              toast.success('Appraisal Cycle deleted successfully!');
                            } catch (err: any) {
                              const errorMsg = 'Failed to delete cycle';
                              toast.error(`Error: ${errorMsg}`);
                            }
                          }
                        });
                      }}
                      className="w-10 h-10 rounded-xl bg-slate-50 text-rose-500 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-all duration-300 relative z-20"
                      title="Delete Cycle"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </Can>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
            </div>
            <p style={{ fontSize: 10, fontWeight: 500, color: '#1A56DB', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{cycle.financialYearTitle || 'Annual Review'}</p>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 4 }}>{cycle.cycleName}</p>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginBottom: 14 }}>{cycle.evaluationPeriod}</p>
            <div className="flex items-center justify-between" style={{ paddingTop: 10, borderTop: '0.5px solid #F0F2F6' }}>
              <span style={{ fontSize: 11, color: '#9EA3B0' }}>Ends {safeFormatDate(cycle.endDate)}</span>
              <ChevronRight size={14} style={{ color: '#9EA3B0' }} />
            </div>
          </div>
        )) : (
          <div className="col-span-full py-16 text-center" style={{ color: '#9EA3B0', fontSize: 13 }}>
            No cycles yet.{' '}
            <button onClick={() => navigate('/appraisal/create-cycle')} style={{ color: '#1A56DB', fontSize: 13 }}>Create one</button>
          </div>
        )}
      </div>
    );
  };

  const renderForms = () => {
    const groupedSets: Record<string, any[]> = {};
    cycles.forEach((c: any) => { groupedSets[c.cycleName] = []; });
    formSets.forEach((set: any) => {
      const cycleName = set.cycleName || 'Unassigned';
      if (!groupedSets[cycleName]) groupedSets[cycleName] = [];
      groupedSets[cycleName].push(set);
    });

    const getSetDetails = (set: any) => ({
      self: forms.find((f: any) => f.formId === set.selfAssessmentFormId),
      manager: forms.find((f: any) => f.formId === set.managerEvaluationFormId),
      id: set.id,
      isAssigned: set.isAssigned,
    });

    const buildSetMap = (cycleName: string) => {
      const setMap = new Map<string, any>();
      (groupedSets[cycleName] || []).forEach((set: any) => setMap.set(set.name, getSetDetails(set)));
      return setMap;
    };

    if (expandedCycle && expandedSet) {
      const cycleData = cycles.find((c: any) => c.cycleName === expandedCycle);
      const setMap = buildSetMap(expandedCycle);
      const thisSet = setMap.get(expandedSet) ?? { self: null, manager: null, id: 0 };

      return (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <nav className="flex items-center gap-1" style={{ fontSize: 11, color: '#9EA3B0', marginBottom: 6 }}>
                <span className="cursor-pointer hover:text-[#1A56DB] transition-colors" onClick={() => { setExpandedCycle(null); setExpandedSet(null); }}>Cycles</span>
                <ChevronRight size={11} />
                <span className="cursor-pointer hover:text-[#1A56DB] transition-colors" onClick={() => setExpandedSet(null)}>{expandedCycle}</span>
                <ChevronRight size={11} />
                <span style={{ color: '#111827' }}>{expandedSet}</span>
              </nav>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Design Form Set</h2>
            </div>
            <button onClick={() => setExpandedSet(null)} className="flex items-center gap-1 transition-colors"
              style={{ fontSize: 12, color: '#5A6070', border: '0.5px solid #E4E6EC', borderRadius: 8, padding: '7px 14px', background: '#FFFFFF' }}>
              <ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} /> Back
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { type: 'SELF_ASSESSMENT', label: 'Self Assessment', icon: ClipboardList, form: thisSet.self },
              { type: 'MANAGER_EVALUATION', label: 'Manager Evaluation', icon: FileText, form: thisSet.manager },
            ].map(({ type, label, icon: Icon, form }) => (
              <div key={type} style={{ ...panelStyle, padding: '16px 18px' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <div className="flex items-center gap-2">
                    <Icon size={15} style={{ color: '#1A56DB' }} />
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{label}</p>
                  </div>
                  {form && <span style={{ fontSize: 11, fontWeight: 500, background: '#EAF3DE', color: '#27500A', border: '0.5px solid #B8DCA0', borderRadius: 20, padding: '2px 8px' }}>Ready</span>}
                </div>
                <div className="space-y-2">
                  {form ? (
                    <>
                      <button onClick={() => navigate(`/appraisal/forms/${form.formId}`)} className="w-full transition-colors"
                        style={{ background: '#F5F6F8', color: '#111827', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500 }}>
                        View Template
                      </button>
                      <Can permission="APPRAISAL_FORM_DESIGN">
                        {!form.isAssigned && (
                          <div className="flex gap-2">
                            <button onClick={() => navigate(`/appraisal/design-form?cycleId=${cycleData?.cycleId}&type=${type}&setName=${encodeURIComponent(expandedSet)}&formId=${form.formId}&edit=true`)}
                              className="flex-1 transition-colors"
                              style={{ background: '#EEF3FD', color: '#0C447C', border: '0.5px solid #B5D4F4', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500 }}>
                              Edit
                            </button>
                            <button onClick={() => setConfirmModal({ isOpen: true, title: 'Delete Template', message: 'Delete this template? This cannot be undone.', onConfirm: async () => { try { await deleteForm(form.formId).unwrap(); toast.success('Deleted'); } catch { toast.error('Failed'); } } })}
                              style={{ background: '#FCEBEB', color: '#791F1F', border: '0.5px solid #F5C2C2', borderRadius: 8, padding: '8px 12px' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </Can>
                    </>
                  ) : (
                    <Can permission="APPRAISAL_FORM_DESIGN">
                      <button onClick={() => navigate(`/appraisal/design-form?cycleId=${cycleData?.cycleId}&type=${type}&setName=${encodeURIComponent(expandedSet)}&formSetId=${thisSet.id}`)}
                        className="w-full transition-colors"
                        style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500 }}>
                        <Plus size={13} style={{ display: 'inline', marginRight: 4 }} /> Design Template
                      </button>
                    </Can>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (expandedCycle) {
      const setMap = buildSetMap(expandedCycle);
      const sets = Array.from(setMap.entries());
      const cycleData = cycles.find((c: any) => c.cycleName === expandedCycle);

      return (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <nav className="flex items-center gap-1" style={{ fontSize: 11, color: '#9EA3B0', marginBottom: 6 }}>
                <span className="cursor-pointer hover:text-[#1A56DB] transition-colors" onClick={() => setExpandedCycle(null)}>Cycles</span>
                <ChevronRight size={11} />
                <span style={{ color: '#111827' }}>{expandedCycle}</span>
              </nav>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Form Sets</h2>
            </div>
            <Can permission="APPRAISAL_FORM_DESIGN">
              <button onClick={() => { setShowNewSetModal(true); setNewSetName(''); }}
                className="inline-flex items-center gap-2 transition-colors self-start sm:self-auto"
                style={{ background: '#1A56DB', color: '#FFFFFF', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, border: 'none' }}>
                <Plus size={14} /> Create Form Set
              </button>
            </Can>
          </div>

          {showNewSetModal && (
            <div style={{ ...panelStyle, padding: '16px 18px' }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 12 }}>New Form Set</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input autoFocus type="text" value={newSetName} onChange={(e) => setNewSetName(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  style={{ flex: 1, background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none' }} />
                <button onClick={async () => {
                  if (cycleData) {
                    try { await createFormSet({ name: newSetName, cycleId: cycleData.cycleId }).unwrap(); setExpandedSet(newSetName); setShowNewSetModal(false); }
                    catch { toast.error('Failed to create form set'); }
                  }
                }} className="transition-colors disabled:opacity-50"
                  style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500 }}>
                  Create
                </button>
                <button onClick={() => setShowNewSetModal(false)} style={{ fontSize: 13, color: '#5A6070' }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.map(([setName, set]) => {
              const isComplete = set.self && set.manager;
              return (
                <div key={setName} onClick={() => setExpandedSet(setName)}
                  style={{ ...panelStyle, padding: '16px 18px', cursor: 'pointer' }}
                  className="hover:border-[#1A56DB] transition-colors">
                  <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                    <Layers size={15} style={{ color: isComplete ? '#27500A' : '#1A56DB' }} />
                    <span style={{ fontSize: 11, fontWeight: 500, background: isComplete ? '#EAF3DE' : '#FAEEDA', color: isComplete ? '#27500A' : '#633806', border: `0.5px solid ${isComplete ? '#B8DCA0' : '#F0D4A4'}`, borderRadius: 20, padding: '2px 8px' }}>
                      {isComplete ? 'Ready' : 'Incomplete'}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 12 }}>{setName}</p>
                  <div className="space-y-2" style={{ paddingTop: 10, borderTop: '0.5px solid #F0F2F6' }}>
                    <div className="flex items-center justify-between" style={{ fontSize: 12, color: set.self ? '#27500A' : '#9EA3B0' }}>
                      <span>Self Assessment</span>
                      {set.self ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                    </div>
                    <div className="flex items-center justify-between" style={{ fontSize: 12, color: set.manager ? '#27500A' : '#9EA3B0' }}>
                      <span>Manager Evaluation</span>
                      {set.manager ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between" style={{ marginTop: 12 }}>
                    <Can permission="APPRAISAL_FORM_DESIGN">
                      {!set.isAssigned ? (
                        <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, title: 'Delete Form Set', message: `Delete "${setName}"?`, onConfirm: async () => { try { await deleteFormSet(set.id).unwrap(); toast.success('Deleted'); } catch (err: any) { toast.error('Delete failed.'); } } }); }}
                          style={{ fontSize: 11, color: '#9EA3B0' }} className="hover:text-danger-text transition-colors">
                          <Trash2 size={13} />
                        </button>
                      ) : <div />}
                    </Can>
                    <ChevronRight size={14} style={{ color: '#9EA3B0' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cycles.map((cycle: any) => {
          const setsCount = formSets.filter((s: any) => s.cycleId === cycle.cycleId).length;
          return (
            <div key={cycle.cycleId} onClick={() => { setExpandedCycle(cycle.cycleName); setExpandedSet(null); }}
              style={{ ...panelStyle, padding: '16px 18px', cursor: 'pointer' }}
              className="hover:border-[#1A56DB] transition-colors">
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 500, background: cycle.isActive ? '#EAF3DE' : '#F1EFE8', color: cycle.isActive ? '#27500A' : '#444441', border: `0.5px solid ${cycle.isActive ? '#B8DCA0' : '#DDDBD2'}`, borderRadius: 20, padding: '2px 8px' }}>
                  {cycle.isActive ? 'Active' : 'Inactive'}
                </span>
                <Layers size={14} style={{ color: '#9EA3B0' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 4 }}>{cycle.cycleName}</p>
              <p style={{ fontSize: 12, color: '#9EA3B0', marginBottom: 14 }}>{setsCount} form set(s)</p>
              <div className="flex items-center justify-between" style={{ paddingTop: 10, borderTop: '0.5px solid #F0F2F6' }}>
                <span style={{ fontSize: 11, color: '#1A56DB' }}>Configure Templates</span>
                <ChevronRight size={14} style={{ color: '#9EA3B0' }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Appraisal Hub</h1>
          <p style={{ fontSize: 13, color: '#9EA3B0', marginTop: 2 }}>Organisation performance & evaluation management</p>
        </div>
        <Can permission="APPRAISAL_CYCLE_MANAGE">
          {isPrivileged && (
            <div className="flex flex-wrap gap-2 self-start sm:self-auto">
              <button onClick={() => navigate('/appraisal/create-cycle')} className="inline-flex items-center gap-2 transition-colors"
                style={{ background: '#FFFFFF', color: '#111827', border: '0.5px solid #E4E6EC', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500 }}>
                <Calendar size={14} style={{ color: '#1A56DB' }} /> New Cycle
              </button>
              <button onClick={() => navigate('/appraisal/assign')} className="inline-flex items-center gap-2 transition-colors"
                style={{ background: '#1A56DB', color: '#FFFFFF', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, border: 'none' }}>
                <Plus size={14} /> Bulk Assign
              </button>
            </div>
          )}
        </Can>
      </div>

      {/* Tab navigation */}
      {(isPrivileged || isManager) && (
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '4px', display: 'inline-flex', flexWrap: 'wrap', gap: 2 }}>
          {[
            { id: 'appraisals', label: 'My Assessments', icon: ClipboardList },
            ...(isManager ? [{ id: 'team', label: 'Team', icon: Users }] : []),
            ...(isPrivileged ? [
              { id: 'cycles', label: 'Cycles', icon: Target },
              { id: 'forms', label: 'Form Templates', icon: Layers },
            ] : []),
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setSelectedCycleId(null); setExpandedCycle(null); setExpandedSet(null); resetParticipantFilters(); }}
                className="flex items-center gap-2 transition-colors"
                style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: activeTab === tab.id ? '#EEF3FD' : 'transparent', color: activeTab === tab.id ? '#1A56DB' : '#5A6070' }}>
                <Icon size={13} /> {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {activeTab === 'appraisals' && renderAppraisals()}
      {activeTab === 'team' && renderTeamEvaluations()}
      {activeTab === 'cycles' && renderCycles()}
      {activeTab === 'forms' && renderForms()}

      {/* Confirm modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.5)' }}>
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '24px', maxWidth: 400, width: '100%' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={16} style={{ color: '#791F1F' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{confirmModal.title}</p>
            </div>
            <p style={{ fontSize: 13, color: '#5A6070', marginBottom: 20 }}>{confirmModal.message}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 transition-colors"
                style={{ background: '#F5F6F8', color: '#111827', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }); }} className="flex-1 transition-colors"
                style={{ background: '#791F1F', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 500 }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppraisalList;
