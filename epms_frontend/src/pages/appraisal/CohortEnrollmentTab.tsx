// epms_frontend/src/pages/appraisal/CohortEnrollmentTab.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, UserPlus, UserMinus, Search, Filter, AlertCircle,
  CheckCircle2, RefreshCw, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAppraisalWorkspace } from './AppraisalWorkspaceContext';
import { appraisalWorkspaceService } from '../../features/appraisal/appraisalWorkspaceService';
import type {
  EligibleIntern,
  BulkEnrollResult
} from '../../features/appraisal/appraisalWorkspaceService';

export const CohortEnrollmentTab: React.FC = () => {
  const { activeCycle, participants, refreshParticipants, refreshActiveCycle } = useAppraisalWorkspace();

  // State for eligible interns directory
  const [eligibleInterns, setEligibleInterns] = useState<EligibleIntern[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentResult, setEnrollmentResult] = useState<BulkEnrollResult | null>(null);

  // Load selectable eligible interns
  const loadEligible = useCallback(async () => {
    if (!activeCycle?.id) return;
    try {
      setLoadingEligible(true);
      const data = await appraisalWorkspaceService.getEligibleInterns({
        exclude_cycle_id: activeCycle.id,
        search: activeSearchTerm || undefined,
        department: selectedDept || undefined,
      });
      setEligibleInterns(data);
    } catch (err: unknown) {
      console.warn('Failed to load eligible interns:', err);
    } finally {
      setLoadingEligible(false);
    }
  }, [activeCycle?.id, activeSearchTerm, selectedDept]);

  useEffect(() => {
    loadEligible();
  }, [loadEligible]);

  // Handle Search Debounce / Trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearchTerm(searchTerm);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (!val) {
      setActiveSearchTerm('');
    }
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.length === eligibleInterns.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleInterns.map((i) => i.employee_id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Enroll Action
  const handleEnrollSelected = async () => {
    if (!activeCycle?.id || selectedIds.length === 0) return;
    try {
      setEnrolling(true);
      const res = await appraisalWorkspaceService.enrollParticipants(activeCycle.id, selectedIds);
      setEnrollmentResult(res);
      toast.success(`Enrolled ${res.enrolled_count} interns into ${activeCycle.name}`);
      setSelectedIds([]);
      await Promise.all([refreshParticipants(), refreshActiveCycle(), loadEligible()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to enroll participants';
      toast.error(message);
    } finally {
      setEnrolling(false);
    }
  };

  // Safe Unenroll Action
  const handleUnenroll = async (participantId: string, internName: string) => {
    if (!activeCycle?.id) return;
    const confirmed = window.confirm(`Are you sure you want to remove "${internName}" from this evaluation cycle?`);
    if (!confirmed) return;

    try {
      await appraisalWorkspaceService.unenrollParticipant(activeCycle.id, participantId);
      toast.success(`Removed "${internName}" from cycle.`);
      await Promise.all([refreshParticipants(), refreshActiveCycle(), loadEligible()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to unenroll participant';
      toast.error(message);
    }
  };

  // Extract unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    eligibleInterns.forEach((i) => {
      if (i.department_name) set.add(i.department_name);
    });
    participants.forEach((p) => {
      if (p.department_name) set.add(p.department_name);
    });
    return Array.from(set);
  }, [eligibleInterns, participants]);

  if (!activeCycle) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-xs">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No Cycle Selected</h3>
        <p className="text-xs text-slate-500 mt-1">
          Select or create an appraisal cycle first to manage participant cohort enrollment.
        </p>
      </div>
    );
  }

  const isCycleLocked = activeCycle.status === 'ACTIVE' || activeCycle.status === 'CLOSED' || activeCycle.status === 'PUBLISHED';

  return (
    <div className="space-y-6">
      {/* Top Summary Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Cohort Enrollment Desk: {activeCycle.name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add eligible interns to this evaluation cycle. Interns without an existing manager can be enrolled and assigned a mentor later.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-indigo-50 text-indigo-800 rounded-xl text-xs font-bold border border-indigo-100">
            {participants.length} Interns Enrolled
          </div>
          <button
            onClick={() => { refreshParticipants(); loadEligible(); }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Refresh cohort data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Itemized Enrollment Result Modal / Alert (if present) */}
      {enrollmentResult && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm border border-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Batch Enrollment Summary
            </div>
            <button
              onClick={() => setEnrollmentResult(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Dismiss
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300">
              <div className="font-bold text-base">{enrollmentResult.enrolled_count}</div>
              <div className="text-[10px] uppercase font-semibold">Enrolled</div>
            </div>
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
              <div className="font-bold text-base">{enrollmentResult.skipped_count}</div>
              <div className="text-[10px] uppercase font-semibold">Skipped (Duplicate)</div>
            </div>
            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300">
              <div className="font-bold text-base">{enrollmentResult.failed_count}</div>
              <div className="text-[10px] uppercase font-semibold">Failed</div>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Enrolled Participants Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Enrolled Participants in this Cycle ({participants.length})
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              These interns will receive appraisal forms and participate in evaluations for this cycle.
            </p>
          </div>
        </div>

        {participants.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No interns enrolled yet. Select interns from the directory below to populate the cohort.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-6 font-bold">Employee</th>
                  <th className="py-3 px-4 font-bold">Code</th>
                  <th className="py-3 px-4 font-bold">Department</th>
                  <th className="py-3 px-4 font-bold">Assigned Mentor</th>
                  <th className="py-3 px-6 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-6">
                      <div className="font-bold text-slate-800">{p.full_name}</div>
                      <div className="text-[11px] text-slate-400">{p.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {p.employee_code}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.department_name || 'General'}
                    </td>
                    <td className="py-3 px-4">
                      {p.mentor_assigned ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" />
                          {p.mentor_name || 'Assigned'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200" title="Designate mentor during evaluator configuration">
                          <AlertTriangle className="w-3 h-3" />
                          Mentor Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={() => handleUnenroll(p.id, p.full_name)}
                        disabled={isCycleLocked}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title={isCycleLocked ? 'Cannot unenroll from an active cycle' : 'Remove intern from cycle'}
                      >
                        <UserMinus className="w-3.5 h-3.5" /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Eligible Intern Directory (Add to Cohort) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Available Intern Directory ({eligibleInterns.length} Eligible)
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Active interns not yet enrolled in this cycle. Interns without a manager are fully eligible.
            </p>
          </div>

          <button
            onClick={handleEnrollSelected}
            disabled={enrolling || selectedIds.length === 0 || isCycleLocked}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer ${
              selectedIds.length > 0 && !isCycleLocked
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {enrolling ? 'Enrolling...' : `Enroll Selected (${selectedIds.length})`}
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by intern name, code, or email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </form>

          {departments.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="py-1.5 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Eligible Interns List */}
        {loadingEligible ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading intern directory...</div>
        ) : eligibleInterns.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            All eligible active interns are already enrolled in this cycle!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-6 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === eligibleInterns.length && eligibleInterns.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="py-3 px-4 font-bold">Employee</th>
                  <th className="py-3 px-4 font-bold">Code</th>
                  <th className="py-3 px-4 font-bold">Department</th>
                  <th className="py-3 px-4 font-bold">Manager Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eligibleInterns.map((emp) => {
                  const isSelected = selectedIds.includes(emp.employee_id);
                  return (
                    <tr
                      key={emp.employee_id}
                      onClick={() => toggleSelectOne(emp.employee_id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="py-3 px-6" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(emp.employee_id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{emp.full_name}</div>
                        <div className="text-[11px] text-slate-400">{emp.email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {emp.employee_code}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {emp.department_name || 'General'}
                      </td>
                      <td className="py-3 px-4">
                        {emp.manager_name ? (
                          <span className="text-[11px] text-slate-700">{emp.manager_name}</span>
                        ) : (
                          <span className="text-[11px] text-amber-600 italic">No direct manager assigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
