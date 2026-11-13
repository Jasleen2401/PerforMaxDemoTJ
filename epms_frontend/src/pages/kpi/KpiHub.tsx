import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  useGetAllLibrariesQuery,
  useGetDepartmentGoalSetsQuery,
  useGetTeamGoalSetsQuery,
  useGetGoalSetByEmployeeQuery,
  useGetActiveCycleQuery,
} from '../../services/kpiApi';
import { useGetAllEmployeesQuery } from '../../features/employee/employeeapi';
import {
  Target,
  Layers,
  History,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Calendar,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Can } from '../../components/Can';

const KpiHub: React.FC = () => {
  const navigate = useNavigate();
  const { user, isHR, isAdmin, isManager, activeCycleId, activeCycleName } = useAuth();
  const isManagement = isAdmin || isHR || isManager;

  // Active Cycle details
  const { data: activeCycleResp } = useGetActiveCycleQuery();
  const activeCycle = activeCycleResp?.data;

  // Libraries
  const { data: librariesResponse } = useGetAllLibrariesQuery();
  const libraries = librariesResponse?.data || [];

  // Employee scope
  const { data: allEmployees = [], isLoading: loadingEmployees } = useGetAllEmployeesQuery();

  // GoalSets (Organization-wide for HR/Admin, Team for Manager)
  const { data: deptGoalSetsResp, isLoading: loadingDeptGoalSets } = useGetDepartmentGoalSetsQuery(
    { cycleId: activeCycleId! },
    { skip: !activeCycleId || (!isAdmin && !isHR) }
  );
  const { data: teamGoalSetsResp, isLoading: loadingTeamGoalSets } = useGetTeamGoalSetsQuery(
    { managerId: Number(user?.id), cycleId: activeCycleId! },
    { skip: !activeCycleId || isAdmin || isHR || !user?.id }
  );

  const goalSets = (isAdmin || isHR)
    ? (deptGoalSetsResp?.data || [])
    : (teamGoalSetsResp?.data || []);
  const loadingGoalSets = (isAdmin || isHR) ? loadingDeptGoalSets : loadingTeamGoalSets;

  // Derived Coverage Metrics (Verified from real DB)
  const totalEligible = allEmployees.length;
  const activeGoalSets = goalSets.filter((gs) => gs.status !== 'ARCHIVED');
  const assignedCount = activeGoalSets.length;
  const awaitingApprovalCount = activeGoalSets.filter((gs) => gs.status === 'DRAFT').length;
  const approvedCount = activeGoalSets.filter((gs) =>
    ['APPROVED', 'LOCKED', 'SCORED'].includes(gs.status)
  ).length;
  const notAssignedCount = Math.max(0, totalEligible - assignedCount);
  const coveragePercent = totalEligible > 0 ? Math.round((assignedCount / totalEligible) * 100) : 0;

  // Personal Goal Set (for regular employee fallback view)
  const { data: myGoalsResponse, isLoading: loadingMyGoals } = useGetGoalSetByEmployeeQuery(
    { employeeId: user?.id || 0, cycleId: activeCycleId ?? 0 },
    { skip: !user?.id || !activeCycleId || isManagement }
  );
  const myGoals = myGoalsResponse?.data;
  const myItems = myGoals?.items || [];
  const myOverallProgress = myItems.length > 0
    ? Math.floor(
        myItems.reduce(
          (acc, item) =>
            acc + ((item.currentProgress || 0) / (item.targetValue || 100)) * item.weightPercent,
          0
        )
      )
    : 0;

  // Date formatting for actual cycle timeline
  const formatCycleDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const cycleStartFormatted = formatCycleDate(activeCycle?.startDate);
  const cycleEndFormatted = formatCycleDate(activeCycle?.endDate);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            KPI Intelligence Hub
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Executive overview of performance cycle goals, assignment coverage, and template governance.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-xl border border-purple-200/60 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <span>Cycle: {activeCycleName}</span>
          </div>
        </div>
      </div>

      {isManagement ? (
        <>
          {/* Executive KPI Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Goal Assignment Coverage */}
            <div
              onClick={() => navigate('/kpi/manage')}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:border-purple-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Goal Coverage
                </span>
                <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-200/60 group-hover:bg-purple-100 transition-colors">
                  <Target size={14} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {loadingEmployees || loadingGoalSets ? '—' : `${coveragePercent}%`}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {assignedCount}/{totalEligible} assigned
                </span>
              </div>
              <div className="mt-3 w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-600 transition-all duration-500"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
            </div>

            {/* 2. Eligible Workforce */}
            <div
              onClick={() => navigate('/kpi/manage')}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Eligible Workforce
                </span>
                <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200/60">
                  <Users size={14} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {loadingEmployees ? '—' : totalEligible}
                </span>
                <span className="text-xs text-slate-500 font-medium">Active employee profiles</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 truncate">
                {notAssignedCount > 0 ? `${notAssignedCount} awaiting goal allocation` : 'All employees assigned'}
              </p>
            </div>

            {/* 3. Awaiting Approval */}
            <div
              onClick={() => navigate('/kpi/manage')}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:border-amber-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Awaiting Approval
                </span>
                <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200/60">
                  <Clock size={14} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-amber-600">
                  {loadingGoalSets ? '—' : awaitingApprovalCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">Draft goal sets</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 truncate">
                {awaitingApprovalCount > 0 ? 'Requires manager/HR review' : 'Zero pending approvals'}
              </p>
            </div>

            {/* 4. KPI Library Templates */}
            <div
              onClick={() => navigate('/kpi/library')}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:border-purple-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  KPI Library
                </span>
                <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-200/60 group-hover:bg-purple-100 transition-colors">
                  <Layers size={14} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {libraries.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">Standardized templates</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-purple-700 font-semibold group-hover:translate-x-0.5 transition-transform">
                <span>Manage Templates</span>
                <ArrowRight size={12} />
              </div>
            </div>
          </div>

          {/* Main Grid: Cycle Governance + Strategic Navigation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Active Cycle Governance Snapshot */}
            <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-600" />
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                      Active Cycle Governance
                    </h2>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full">
                    {activeCycle?.status || 'Active Cycle'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cycle Name</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1 truncate" title={activeCycleName}>
                      {activeCycleName}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Review Timeline</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {cycleStartFormatted && cycleEndFormatted
                        ? `${cycleStartFormatted} – ${cycleEndFormatted}`
                        : 'Active review period'}
                    </p>
                  </div>
                </div>

                {/* Assignment Status Breakdown */}
                <div className="mt-4 p-4 bg-slate-50/50 border border-slate-200/70 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Allocation Breakdown
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-white border border-slate-200/60 rounded-lg">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">Assigned</p>
                      <p className="text-base font-bold text-slate-900 mt-0.5">{assignedCount}</p>
                    </div>
                    <div className="p-2 bg-white border border-slate-200/60 rounded-lg">
                      <p className="text-[10px] text-emerald-600 font-semibold uppercase">Approved</p>
                      <p className="text-base font-bold text-emerald-700 mt-0.5">{approvedCount}</p>
                    </div>
                    <div className="p-2 bg-white border border-slate-200/60 rounded-lg">
                      <p className="text-[10px] text-amber-600 font-semibold uppercase">Drafts</p>
                      <p className="text-base font-bold text-amber-700 mt-0.5">{awaitingApprovalCount}</p>
                    </div>
                    <div className="p-2 bg-white border border-slate-200/60 rounded-lg">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">Unassigned</p>
                      <p className="text-base font-bold text-slate-600 mt-0.5">{notAssignedCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Operational changes are managed in the Goal Management workspace.
                </span>
                <button
                  onClick={() => navigate('/kpi/manage')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold rounded-lg border border-purple-200/60 transition-colors cursor-pointer"
                >
                  <span>Open Goal Management</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Right Column: Strategic Navigation Shortcuts */}
            <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-2 h-2 rounded-full bg-purple-600" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Strategic KPI Controls
                </h2>
              </div>

              <div className="mt-4 space-y-2.5">
                <Can permission="KPI_CREATE">
                  <button
                    onClick={() => navigate('/kpi/manage')}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <Target size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Goal Management</p>
                        <p className="text-[11px] text-slate-500">Allocate & review goals across departments</p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </Can>

                <Can permission="KPI_LIBRARY_MANAGE">
                  <button
                    onClick={() => navigate('/kpi/library')}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Layers size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">KPI Library & Categories</p>
                        <p className="text-[11px] text-slate-500">Manage standardized templates & metrics</p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </Can>

                <Can permission="KPI_LIBRARY_MANAGE">
                  <button
                    onClick={() => navigate('/kpi/library/new')}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Create KPI Template</p>
                        <p className="text-[11px] text-slate-500">Define new role-specific KPI benchmarks</p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </Can>

                <button
                  onClick={() => navigate('/kpi/org-history')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-700 group-hover:text-white transition-colors">
                      <History size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Performance History</p>
                      <p className="text-[11px] text-slate-500">Review lifecycle audits and phase locks</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Regular Employee View fallback */
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">My Assigned Goals</h2>
              <p className="text-xs text-slate-500 mt-0.5">Track your active cycle progress</p>
            </div>
            <button
              onClick={() => navigate('/kpi/my')}
              className="px-3.5 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 transition-colors"
            >
              Open My Goals Workspace
            </button>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Overall Progress</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">{myOverallProgress}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">Goal Status</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{myGoals?.status || 'Active'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiHub;

