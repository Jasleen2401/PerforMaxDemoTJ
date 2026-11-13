import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useGetAllEmployeesQuery } from '../../features/employee/employeeapi';
import { useGetDepartmentsQuery } from '../../features/org/departmentApi';
import { useGetPositionsQuery } from '../../features/org/positionApi';
import { useGetCyclesQuery } from '../../features/appraisal/appraisalApi';
import { useAuth } from '../../hooks/useAuth';
import { Search, ClipboardList, CheckCircle2, XCircle, Eye, Pencil, UserPlus, Archive, Calendar } from 'lucide-react';
import BulkAssignModal from '../../components/kpi/BulkAssignModal';
import KpiSummaryReportButton from '../../components/kpi/KpiSummaryReportButton';
import KpiActualsReportButton from '../../components/kpi/KpiActualsReportButton';
import { useGetDepartmentGoalSetsQuery, useGetTeamGoalSetsQuery } from '../../services/kpiApi';
import React from 'react';
import { KPI_STATUS_STYLE, KPI_STATUS_FALLBACK } from '../../utils/kpiStatusStyles';
import { MidcycleChangeModal } from '../../components/kpi/MidcycleChangeModal';

import { isKpiEligible } from '../../utils/kpiLevelFilter';

const GoalManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isHR, activeCycleId, activeCycleName: authCycleName, hasCycle: authHasCycle, cycleError } = useAuth();
  const hasActiveCycle = authHasCycle && !cycleError;
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const isAdminOrHr = isAdmin || isHR;

  const [selectedIds, setSelectedIds] = useState<any[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isMidcycleOpen, setIsMidcycleOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: any; staffName: string } | null>(null);

  const { data: allEmployees = [], isLoading: loadingEmployees } = useGetAllEmployeesQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();
  const { data: positions = [] } = useGetPositionsQuery();
  const { data: cyclesResponse } = useGetCyclesQuery();
  const cycles = Array.isArray(cyclesResponse) ? cyclesResponse : ((cyclesResponse as any)?.data || []);
  // Use only activeCycleId as truth — never trust status/isActive flags, which can match stale cycles
  const activeCycles = cycles.filter((c: any) => (c.cycleId || c.id) === activeCycleId);
  const inactiveCycles = cycles.filter((c: any) => (c.cycleId || c.id) !== activeCycleId);
  const getCycleStatusLabel = (c: any) => {
    if (!c.status) return '';
    return ` (${c.status.charAt(0).toUpperCase() + c.status.slice(1).toLowerCase()})`;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [selectedCycle, setSelectedCycle] = useState('All');
  const effectiveCycleId = selectedCycle === 'All' ? activeCycleId : Number(selectedCycle);

  const selectedCycleObj = cycles.find((c: any) => (c.cycleId || c.id) === effectiveCycleId);
  const isArchivedCycle = selectedCycleObj?.status?.toUpperCase() === 'ARCHIVED';
  const isHistorical = !activeCycleId || isArchivedCycle || (selectedCycle !== 'All' && Number(selectedCycle) !== activeCycleId);

  // Use cycle name from the active-cycle API (via useAuth), not from cycle list lookup
  const activeCycleName = hasActiveCycle ? authCycleName : undefined;
  const { data: deptGoalSetsResponse } = useGetDepartmentGoalSetsQuery(
    { cycleId: effectiveCycleId! }, { skip: !effectiveCycleId || !isAdminOrHr }
  );
  const { data: teamGoalSetsResponse } = useGetTeamGoalSetsQuery(
    { managerId: Number(user?.id), cycleId: effectiveCycleId! },
    { skip: !effectiveCycleId || isAdminOrHr || !user?.id }
  );
  const goalSets = isAdminOrHr ? (deptGoalSetsResponse?.data || []) : (teamGoalSetsResponse?.data || []);
  const goalStatusMap = new Map<string, string>(goalSets.map(gs => [String(gs.employeeId), gs.status]));

  React.useEffect(() => {
    setPage(0);
  }, [searchTerm, selectedDepartment, selectedPosition]);

  // Verified workforce eligibility & inclusion rule:
  // All 88 active employees in the organization are eligible for KPI goal tracking.
  // Previously, non-admin HR accounts were excluded via !isAdmin && emp.id === user.id,
  // causing an 87 vs 88 discrepancy across dashboard pages.
  // When managing organization-wide goals (HR & Admin), all eligible workforce members
  // are included in the 88 headcount. Managers managing direct reports filter to their team.
  const eligibleEmployees = allEmployees.filter(emp => {
    if (!isAdminOrHr && String(emp.id) === String(user?.id)) return false;
    return isKpiEligible(emp);
  });

  const filteredEmployees = eligibleEmployees.filter(emp => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term ||
      emp.staffName?.toLowerCase().includes(term) ||
      emp.employeeCode?.toLowerCase().includes(term) ||
      emp.email?.toLowerCase().includes(term);
    const matchesDept = selectedDepartment === 'All' || emp.currentDepartmentName === selectedDepartment || emp.parentDepartmentName === selectedDepartment;
    const matchesPos = selectedPosition === 'All' || emp.positionName === selectedPosition;
    return matchesSearch && matchesDept && matchesPos;
  });

  const totalElements = filteredEmployees.length;
  const totalPages = Math.ceil(totalElements / size) || 1;
  const pagedEmployees = filteredEmployees.slice(page * size, (page + 1) * size);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? pagedEmployees.map(m => m.id) : []);
  };

  const selectStyle: React.CSSProperties = {
    background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8,
    padding: '7px 12px', fontSize: 13, color: '#0F172A', outline: 'none', appearance: 'none' as any,
  };

  // --- Coverage stats (derived from existing data, no new API calls) ---
  const totalEmployees = eligibleEmployees.length;
  const activeGoalSets = goalSets.filter(gs => gs.status !== 'ARCHIVED');
  const assignedCount = activeGoalSets.length;
  const awaitingApprovalCount = activeGoalSets.filter(gs => gs.status === 'DRAFT').length;
  const notAssignedCount = Math.max(0, totalEmployees - assignedCount);
  const coveragePercent = totalEmployees > 0 ? Math.round((assignedCount / totalEmployees) * 100) : 0;
  const coverageDisplay = loadingEmployees ? '—' : `${coveragePercent}%`;
  const assignedDisplay = loadingEmployees ? '—' : `${assignedCount}/${totalEmployees}`;
  const awaitingApprovalDisplay = loadingEmployees ? '—' : awaitingApprovalCount;
  const notAssignedDisplay = loadingEmployees ? '—' : notAssignedCount;
  const coverageBarWidth = loadingEmployees ? 0 : coveragePercent;

  const getActionIcon = (status: string | undefined, empId: number | string) => {
    const base: React.CSSProperties = { cursor: 'pointer', padding: 6, borderRadius: 6 };
    
    if (isArchivedCycle) {
      return status ? (
        <span title="View (archived)" style={{ ...base, color: '#9EA3B0', cursor: 'pointer', display: 'inline-flex' }}
          onClick={e => { e.stopPropagation(); navigate(`/kpi/goals/${empId}?cycleId=${effectiveCycleId}`); }}>
          <Eye size={14} />
        </span>
      ) : (
        <span title="No goals in archived cycle" style={{ ...base, color: '#E0E2E8', cursor: 'default', display: 'inline-flex' }}>
          <Archive size={14} />
        </span>
      );
    }

    if (!status) {
      return (
        <button title="Assign KPI" style={{ ...base, color: '#7C3AED', background: '#F5F3FF' }}
          onClick={e => { e.stopPropagation(); navigate(`/kpi/assign/${empId}?cycleId=${effectiveCycleId}`); }}>
          <UserPlus size={14} />
        </button>
      );
    }
    if (status === 'DRAFT') return (
      <button title="Edit Goals" style={{ ...base, color: '#D97706', background: '#FEF3C7' }}
        onClick={e => { e.stopPropagation(); navigate(`/kpi/assign/${empId}?cycleId=${effectiveCycleId}`); }}>
        <Pencil size={14} />
      </button>
    );
    if (['APPROVED','LOCKED','SCORED'].includes(status)) return (
      <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
        <button title="View Goals" style={{ ...base, color: '#7C3AED', background: '#F5F3FF' }}
          onClick={e => { e.stopPropagation(); navigate(`/kpi/goals/${empId}?cycleId=${effectiveCycleId}`); }}>
          <Eye size={14} />
        </button>
        {status !== 'SCORED' && (
          <button title="Midcycle Change" style={{ ...base, color: '#6D28D9', background: '#EDE9FE' }}
            onClick={e => { 
              e.stopPropagation(); 
              setSelectedEmployee({ id: empId, staffName: filteredEmployees.find(emp => String(emp.id) === String(empId))?.staffName || '' });
              setIsMidcycleOpen(true);
            }}>
            <Calendar size={14} />
          </button>
        )}
      </div>
    );
    if (status === 'ARCHIVED') return (
      <span title="Archived" style={{ ...base, color: '#9EA3B0', cursor: 'default', display: 'inline-flex' }}>
        <Archive size={14} />
      </span>
    );
    return null;
  };

  return (<div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A' }}>Organization-wide Goal Assignment</h1>
          <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Manage and track performance cycle milestones across all departments.</p>
        </div>
        <div className="flex items-center gap-3">
          {hasActiveCycle && activeCycleName && (
            <div className="px-3 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full uppercase tracking-wider border border-purple-200/60 flex items-center gap-1.5 shadow-2xs">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></div>
              {activeCycleName}
            </div>
          )}
          <button
            disabled={isHistorical || selectedIds.length === 0}
            onClick={() => { if (selectedIds.length === 0) { toast.warning('Select at least one employee'); return; } setIsBulkModalOpen(true); }}
            className="inline-flex items-center gap-2 transition-colors self-start sm:self-auto"
            style={{
              background: !isHistorical && selectedIds.length > 0 ? '#7C3AED' : '#F8FAFC',
              color: !isHistorical && selectedIds.length > 0 ? '#FFFFFF' : '#94A3B8',
              border: `1px solid ${!isHistorical && selectedIds.length > 0 ? '#7C3AED' : '#E2E8F0'}`,
              borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600,
              cursor: !isHistorical && selectedIds.length > 0 ? 'pointer' : 'not-allowed',
              opacity: isHistorical || selectedIds.length === 0 ? 0.6 : 1,
            }}>
            <ClipboardList size={14} />
            Bulk Assign Templates {selectedIds.length > 0 && `(${selectedIds.length})`}
          </button>
          <KpiActualsReportButton />
          <KpiSummaryReportButton />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Coverage</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>{coverageDisplay}</span>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>· {assignedDisplay}</span>
          </div>
          <div style={{ marginTop: 8, width: '100%', height: 6, borderRadius: 4, background: '#F1F5F9' }}>
            <div style={{ width: `${coverageBarWidth}%`, height: '100%', borderRadius: 4, background: '#7C3AED', transition: 'width 0.3s ease' }} />
          </div>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Awaiting Approval</div>
          <div style={{ marginTop: 10, fontSize: 26, fontWeight: 800, color: '#D97706' }}>{awaitingApprovalDisplay}</div>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Not Assigned</div>
          <div style={{ marginTop: 10, fontSize: 26, fontWeight: 800, color: '#E11D48' }}>{notAssignedDisplay}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '12px 14px' }}
        className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
          <input type="text" placeholder="Search by name or employee code…"
            style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '7px 12px 7px 30px', fontSize: 13, color: '#111827', outline: 'none', width: '100%' }}
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select style={selectStyle} value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)}>
          <option value="All">Dept: All</option>
          {departments.map((d, i) => <option key={`${d.id}-${i}`} value={d.departmentName}>{d.departmentName}</option>)}
        </select>
        <select style={selectStyle} value={selectedPosition} onChange={e => setSelectedPosition(e.target.value)}>
          <option value="All">Position: All</option>
          {positions.map((p, i) => <option key={`${p.positionId}-${i}`} value={p.positionName}>{p.positionName}</option>)}
        </select>
        <select style={selectStyle} value={selectedCycle} onChange={e => { setSelectedCycle(e.target.value); setSelectedIds([]); }}>
          <option value="All">Cycle: {hasActiveCycle ? 'Active' : 'All'}</option>
          {activeCycles.length > 0 && (
            <optgroup label="Active Cycle">
              {activeCycles.map((c: any, i: number) => (
                <option key={`${c.cycleId || c.id}-${i}`} value={c.cycleId || c.id}>
                  {(c.cycleName || c.name) + getCycleStatusLabel(c)}
                </option>
              ))}
            </optgroup>
          )}
          {inactiveCycles.length > 0 && (
            <optgroup label="Historical / Other Cycles">
              {inactiveCycles.map((c: any, i: number) => (
                <option key={`${c.cycleId || c.id}-${i}`} value={c.cycleId || c.id}>
                  {(c.cycleName || c.name) + getCycleStatusLabel(c)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {isHistorical && (
        <div style={{
          background: '#FFFBEB',
          border: '0.5px solid #FCD34D',
          borderRadius: 12,
          padding: '10px 14px',
          color: '#B45309',
          fontSize: 13,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#B45309' }}></span>
          Viewing historical cycle — no assignments can be made
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                {!isHistorical && (
                  <th style={{ padding: '10px 16px', width: 40 }}>
                    <input type="checkbox" style={{ accentColor: '#7C3AED' }}
                      checked={selectedIds.length === pagedEmployees.length && pagedEmployees.length > 0}
                      onChange={handleSelectAll} />
                  </th>
                )}
              {['Employee','Department','Position','Goal Status','Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h === 'Actions' ? 'center' : 'left', width: h === 'Actions' ? 80 : 'auto' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingEmployees && (
                <tr><td colSpan={isHistorical ? 4 : 6} style={{ padding: '32px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>Loading employees…</td></tr>
              )}
              {!loadingEmployees && pagedEmployees.map((emp, idx) => {
                const status = goalStatusMap.get(String(emp.id));
                return (
                  <tr key={emp.id}
                    style={{ borderBottom: idx < pagedEmployees.length - 1 ? '1px solid #F1F5F9' : 'none', background: !isHistorical && selectedIds.includes(emp.id) ? '#FAF5FF' : '#FFFFFF', cursor: ((isArchivedCycle && status) || (isHistorical && status) || (!isHistorical && status !== 'ARCHIVED') || (!isHistorical && !status)) ? 'pointer' : 'default' }}
                    className="hover:bg-[#FAF5FF]/50 transition-colors"
                    onClick={() => {
                      if (isArchivedCycle) {
                        if (status) {
                          navigate(`/kpi/goals/${emp.id}?cycleId=${effectiveCycleId}`);
                        }
                        return;
                      }
                      if (isHistorical) {
                        if (status) {
                          navigate(`/kpi/goals/${emp.id}?cycleId=${effectiveCycleId}`);
                        }
                        return;
                      }
                      if (status === 'ARCHIVED') return;
                      if (status === 'APPROVED' || status === 'LOCKED' || status === 'SCORED') {
                        navigate(`/kpi/goals/${emp.id}?cycleId=${effectiveCycleId}`);
                      } else {
                        navigate(`/kpi/assign/${emp.id}?cycleId=${effectiveCycleId}`);
                      }
                    }}>
                    {!isHistorical && (
                      <td style={{ padding: '10px 16px' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" style={{ accentColor: '#7C3AED' }}
                          checked={selectedIds.includes(emp.id)}
                          onChange={() => setSelectedIds(prev => prev.includes(emp.id) ? prev.filter(i => i !== emp.id) : [...prev, emp.id])} />
                      </td>
                    )}
                    <td style={{ padding: '10px 16px' }}>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F5F3FF', color: '#7C3AED', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '1px solid #EDE9FE' }}>
                          {emp.profileImage && emp.profileImage !== 'default.jpg' ? (
                            <img src={`http://localhost:8000${emp.profileImage}`} alt={emp.staffName}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            emp.staffName ? emp.staffName.charAt(0) : '?'
                          )}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{emp.staffName}</p>
                          <p style={{ fontSize: 11, color: '#94A3B8' }}>{emp.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#475569' }}>{emp.currentDepartmentName || emp.parentDepartmentName || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#475569' }}>{emp.positionName || '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      {status ? (
                        (() => {
                          const safeSs = KPI_STATUS_STYLE[status] ?? { ...KPI_STATUS_FALLBACK, label: status };
                          return (
                            <span style={{ fontSize: 10, fontWeight: 600, background: safeSs.bg, color: safeSs.text, border: `0.5px solid ${safeSs.border}`, borderRadius: 20, padding: '2px 8px' }}>
                              {safeSs.label}
                            </span>
                          );
                        })()
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <XCircle size={13} style={{ color: '#94A3B8' }} />
                          <span style={{ fontSize: 10, color: '#94A3B8' }}>Not Assigned</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      {!isHistorical && getActionIcon(status, emp.id)}
                    </td>
                  </tr>
                );
              })}
              {filteredEmployees.length === 0 && !loadingEmployees && (
                <tr><td colSpan={isHistorical ? 4 : 6} style={{ padding: '32px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No employees found matching criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3"
          style={{ padding: '10px 16px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>
            Showing <strong style={{ color: '#0F172A' }}>{totalElements > 0 ? page * size + 1 : 0}–{Math.min((page + 1) * size, totalElements)}</strong> of <strong style={{ color: '#0F172A' }}>{totalElements}</strong>
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(p - 1, 0))} disabled={page === 0}
              style={{ background: '#FFFFFF', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 500 }}
              className="disabled:opacity-50 transition-colors hover:bg-slate-100 cursor-pointer">
              Previous
            </button>
            <button onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))} disabled={page >= totalPages - 1 || totalPages === 0}
              style={{ background: '#7C3AED', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}
              className="disabled:opacity-50 transition-colors hover:bg-purple-700 cursor-pointer">
              Next
            </button>
          </div>
        </div>
      </div>

      {isBulkModalOpen && (
        <BulkAssignModal selectedEmployeeIds={selectedIds}
          effectiveCycleId={effectiveCycleId}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={() => { setIsBulkModalOpen(false); setSelectedIds([]); }} />
      )}

      {isMidcycleOpen && selectedEmployee && selectedCycleObj && (
        <MidcycleChangeModal
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.staffName}
          cycleId={effectiveCycleId!}
          cycleName={selectedCycleObj.cycleName || selectedCycleObj.name}
          cycleStartDate={selectedCycleObj.startDate}
          cycleEndDate={selectedCycleObj.endDate}
          summary={null}
          onClose={() => {
            setIsMidcycleOpen(false);
            setSelectedEmployee(null);
          }}
          onSuccess={() => {
            setIsMidcycleOpen(false);
            setSelectedEmployee(null);
          }}
        />
      )}

      <div style={{ display: 'none' }}><CheckCircle2 /></div>
    </div>
  );
};

export default GoalManagement;
