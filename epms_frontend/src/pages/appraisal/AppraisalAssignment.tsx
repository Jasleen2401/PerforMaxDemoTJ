import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  useAssignBulkMutation,
  useGetAppraisalsByCycleQuery,
  useGetAppraisalFormSetsQuery,
  useSyncFormSetsMutation
} from '../../features/appraisal/appraisalApi';
import { useGetAllEmployeesQuery } from '../../features/employee/employeeapi';
import { useGetDepartmentsQuery } from '../../features/org/departmentApi';
import { useGetJobLevelsQuery } from '../../features/org/jobLevelApi';
import { useGetPositionsQuery } from '../../features/org/positionApi';
import { useAuth } from '../../hooks/useAuth';
import {
  Users, CheckCircle2, Search, Filter, ChevronLeft, UserPlus,
  Building2, Mail, Briefcase, Layers, RefreshCw
} from 'lucide-react';

const selectStyle: React.CSSProperties = {
  background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8,
  padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%',
  fontFamily: 'inherit',
};

const AppraisalAssignment: React.FC = () => {
  const navigate = useNavigate();
  const { activeCycleId, activeCycleName, isLoadingCycle: cycleLoading } = useAuth();

  const { data: formSets = [], isLoading: formsLoading } = useGetAppraisalFormSetsQuery(activeCycleId, { skip: !activeCycleId });
  const [syncFormSets, { isLoading: isSyncing }] = useSyncFormSetsMutation();
  const { data: employees = [], isLoading: empsLoading } = useGetAllEmployeesQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();
  const { data: positions = [] } = useGetPositionsQuery();
  const { data: jobLevels = [] } = useGetJobLevelsQuery();
  const [assignBulk, { isLoading: isAssigning }] = useAssignBulkMutation();

  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [selectedFormSetId, setSelectedFormSetId] = useState<string>('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [posFilter, setPosFilter] = useState('');

  React.useEffect(() => {
    if (activeCycleId != null) setSelectedCycleId(activeCycleId.toString());
  }, [activeCycleId]);

  const selectedCycleNumber = selectedCycleId ? Number(selectedCycleId) : undefined;
  const { data: cycleAppraisals = [], isFetching: appraisalsLoading, refetch: refetchCycleAppraisals } =
    useGetAppraisalsByCycleQuery(selectedCycleNumber as number, { skip: !selectedCycleNumber });

  const assignedEmployeeIds = useMemo(() => {
    if (!Array.isArray(cycleAppraisals)) return new Set<number>();
    return new Set(
      cycleAppraisals
        .map((appraisal: any) => appraisal?.employeeId)
        .filter((employeeId: unknown): employeeId is number => typeof employeeId === 'number')
    );
  }, [cycleAppraisals]);

  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return employees.filter(emp => {
      const hasDirectManager = Boolean(emp?.directManagerId);
      const alreadyAssigned = assignedEmployeeIds.has(emp.id);
      const status = String(emp?.status || '').toUpperCase();
      const isActiveEmployee = status ? status === 'ACTIVE' : emp?.isActive !== false;
      const levelRank = Number(emp?.levelRank);
      const hasEligibleLevel = Number.isFinite(levelRank) && levelRank >= 4 && levelRank <= 7;
      const matchesSearch = !normalizedSearch ||
        String(emp?.staffName || '').toLowerCase().includes(normalizedSearch) ||
        String(emp?.email || '').toLowerCase().includes(normalizedSearch) ||
        String(emp?.employeeCode || '').toLowerCase().includes(normalizedSearch);
      const matchesDept = deptFilter === '' || String(emp?.currentDepartmentId || '') === deptFilter;
      const matchesPos = posFilter === '' || String(emp?.positionId || '') === posFilter;
      return isActiveEmployee && hasEligibleLevel && hasDirectManager && !alreadyAssigned && matchesSearch && matchesDept && matchesPos;
    });
  }, [employees, assignedEmployeeIds, searchTerm, deptFilter, posFilter]);

  React.useEffect(() => {
    const visibleEmployeeIds = new Set(filteredEmployees.map(emp => emp.id));
    setSelectedEmployeeIds(prev => prev.filter(id => visibleEmployeeIds.has(id)));
  }, [filteredEmployees]);

  const eligiblePositions = useMemo(() => {
    const eligibleLevelIds = new Set(
      jobLevels
        .filter(level => level.levelRank >= 4 && level.levelRank <= 7)
        .map(level => level.levelId)
    );
    return positions.filter(position => eligibleLevelIds.has(position.levelId));
  }, [jobLevels, positions]);

  const allVisibleSelected = filteredEmployees.length > 0 && selectedEmployeeIds.length === filteredEmployees.length;
  const toggleEmployee = (id: number) => setSelectedEmployeeIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selectAll = () => setSelectedEmployeeIds(allVisibleSelected ? [] : filteredEmployees.map(e => e.id));

  const handleAssign = async () => {
    if (!selectedCycleId) { toast.warning('Please select an appraisal cycle.'); return; }
    if (selectedEmployeeIds.length === 0) { toast.warning('Please select at least one employee.'); return; }
    if (!selectedFormSetId || selectedFormSetId === '0') { toast.warning('Please select a valid Form Set.'); return; }
    try {
      await assignBulk({ cycleId: Number(selectedCycleId), formSetId: Number(selectedFormSetId), employeeIds: selectedEmployeeIds }).unwrap();
      toast.success(`Assigned appraisals to ${selectedEmployeeIds.length} employees!`);
      setSelectedEmployeeIds([]);
      refetchCycleAppraisals();
    } catch (err: any) {
      toast.error('Failed to assign appraisals.');
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #E4E6EC', borderRadius: 8, background: '#FFFFFF', color: '#5A6070' }}
            className="hover:bg-[#F5F6F8] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Appraisal Assignment</h1>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 1 }}>Link employees to a performance review cycle.</p>
          </div>
        </div>
        <button onClick={handleAssign} disabled={isAssigning || selectedEmployeeIds.length === 0}
          className="inline-flex items-center gap-2 transition-colors disabled:opacity-50 self-start sm:self-auto"
          style={{ background: '#1A56DB', color: '#FFFFFF', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none' }}>
          <UserPlus size={14} /> {isAssigning ? 'Processing…' : `Confirm Assignment (${selectedEmployeeIds.length})`}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Assignment Setup</p>
            <div className="space-y-4">
              {/* Active cycle */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>1. Active Cycle</label>
                <div style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={13} style={{ color: cycleLoading ? '#9EA3B0' : '#27500A', flexShrink: 0 }} />
                  {cycleLoading ? 'Finding active cycle…' : activeCycleName}
                </div>
              </div>

              {/* Form set */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>2. Form Set</label>
                <div className="relative">
                  <Layers size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
                  <select style={{ ...selectStyle, paddingLeft: 30 }} value={selectedFormSetId} onChange={e => setSelectedFormSetId(e.target.value)}>
                    <option value="">Select Form Set…</option>
                    {Array.isArray(formSets) && formSets.map((fs: any) => <option key={fs.id} value={fs.id}>{fs.name}</option>)}
                  </select>
                </div>
                {formSets.length === 0 && !formsLoading && (
                  <button onClick={() => syncFormSets().unwrap().then((res: any) => toast.success(res || 'Synced!'))} disabled={isSyncing}
                    className="mt-2 flex items-center gap-1 transition-colors disabled:opacity-50"
                    style={{ fontSize: 12, color: '#1A56DB' }}>
                    <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} /> Sync from Templates
                  </button>
                )}
              </div>

              {/* Department */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>3. Department</label>
                <div className="relative">
                  <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
                  <select style={{ ...selectStyle, paddingLeft: 30 }} value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPosFilter(''); }}>
                    <option value="">All Departments</option>
                    {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.departmentName}</option>)}
                  </select>
                </div>
              </div>

              {/* Position */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>4. Position</label>
                <div className="relative">
                  <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
                  <select style={{ ...selectStyle, paddingLeft: 30 }} value={posFilter} onChange={e => setPosFilter(e.target.value)}>
                    <option value="">All Positions</option>
                    {eligiblePositions.map(pos => <option key={pos.positionId} value={pos.positionId}>{pos.positionName}</option>)}
                  </select>
                </div>
              </div>

              {/* Search */}
              <div style={{ paddingTop: 12, borderTop: '0.5px solid #F0F2F6' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Search</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
                  <input type="text" placeholder="Name or email…" style={{ ...selectStyle, paddingLeft: 30 }}
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: '#111827', border: 'none', borderRadius: 12, padding: '14px 16px' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <Users size={14} style={{ color: '#9EA3B0' }} />
              <p style={{ fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>Quick Summary</p>
            </div>
            <p style={{ fontSize: 12, color: '#9EA3B0', lineHeight: 1.6 }}>
              Assigning appraisals to <strong style={{ color: '#FFFFFF' }}>{selectedEmployeeIds.length}</strong> employees. They and their managers will be notified to begin.
            </p>
          </div>
        </div>

        {/* Employee list */}
        <div className="lg:col-span-3">
          {!cycleLoading && !activeCycleId ? (
            <div style={{ background: '#FFFFFF', border: '0.5px dashed #E0E2E8', borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Filter size={20} style={{ color: '#633806' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 6 }}>No Active Appraisal Cycle</p>
              <p style={{ fontSize: 13, color: '#9EA3B0', marginBottom: 20 }}>Please create or activate a cycle before assigning appraisals.</p>
              <button onClick={() => navigate('/appraisal-cycles')}
                style={{ background: '#111827', color: '#FFFFFF', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none' }}>
                Go to Cycle Management
              </button>
            </div>
          ) : (
            <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
              <div className="flex items-center justify-between" style={{ padding: '10px 18px', borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF' }}>
                <span style={{ fontSize: 12, color: '#9EA3B0' }}>
                  {appraisalsLoading || empsLoading ? 'Loading eligible employees...' : `${filteredEmployees.length} eligible employees found`}
                </span>
                <button onClick={selectAll} disabled={filteredEmployees.length === 0} style={{ fontSize: 12, color: filteredEmployees.length === 0 ? '#9EA3B0' : '#1A56DB' }}>
                  {allVisibleSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {empsLoading ? (
                  <div style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading directory…</div>
                ) : filteredEmployees.length === 0 ? (
                  <div style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>No eligible employee found.</div>
                ) : filteredEmployees.map((emp, idx) => {
                  const selected = selectedEmployeeIds.includes(emp.id);
                  return (
                    <div key={emp.id} onClick={() => toggleEmployee(emp.id)}
                      style={{ padding: '10px 18px', borderBottom: idx < filteredEmployees.length - 1 ? '0.5px solid #F0F2F6' : 'none', cursor: 'pointer', background: selected ? '#EEF3FD' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                      className="hover:bg-[#FAFBFF] transition-colors">
                      <div className="flex items-center gap-3">
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: selected ? '#1A56DB' : '#F5F6F8', color: selected ? '#FFFFFF' : '#5A6070', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {(emp.staffName || 'E').charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{emp.staffName || 'Unknown'}</p>
                          <div className="flex flex-wrap gap-3" style={{ marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: '#9EA3B0', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Mail size={10} /> {emp.email || '—'}
                            </span>
                            <span style={{ fontSize: 11, color: '#9EA3B0', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Building2 size={10} /> {emp.currentDepartmentName || '—'}
                            </span>
                            <span style={{ fontSize: 11, color: '#9EA3B0', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Briefcase size={10} /> {emp.positionName || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `0.5px solid ${selected ? '#1A56DB' : '#E0E2E8'}`, background: selected ? '#1A56DB' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {selected && <CheckCircle2 size={12} style={{ color: '#FFFFFF' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppraisalAssignment;
