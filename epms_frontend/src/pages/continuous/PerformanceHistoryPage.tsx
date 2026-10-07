import React, { useState } from 'react';
import { useGetDepartmentsQuery } from '../../features/org/departmentApi';
import { useGetEmployeesQuery } from '../../features/employee/employeeapi';
import {
  useGetPerformanceHistoryByEmployeeQuery,
  useGetAllPerformanceHistoryQuery,
  useGetPerformanceHistoryAnalyticsQuery,
  useGetEmployeePerformanceHistoryAnalyticsQuery
} from '../../features/continuous/continuousApi';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

interface MonthData {
  name: string; month: number; year: number;
  praise: number;
  improvement: number;
  warning: number;
  meetings: number;
}

const panelStyle: React.CSSProperties = {
  background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px',
};

const SOURCE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  FEEDBACK: { bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0' },
  MEETING: { bg: '#EEF3FD', text: '#0C447C', border: '#B5D4F4' },
};

const FEEDBACK_TYPE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  PRAISE: { bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0' },
  IMPROVEMENT: { bg: '#FAEEDA', text: '#633806', border: '#F0D4A4' },
  WARNING: { bg: '#FCEBEB', text: '#791F1F', border: '#F5BFBF' },
};

const SentimentChart = ({ history, employeeName, filterType }: { history: any[]; employeeName?: string; filterType: string }) => {
  const [timeRange, setTimeRange] = useState<3 | 6 | 12>(6);
  const [showPraise, setShowPraise] = useState(true);
  const [showImprovement, setShowImprovement] = useState(true);
  const [showCorrection, setShowCorrection] = useState(true);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData: MonthData[] = [];
  const now = new Date();
  for (let i = timeRange - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    chartData.push({ name: months[d.getMonth()], month: d.getMonth(), year: d.getFullYear(), praise: 0, improvement: 0, warning: 0, meetings: 0 });
  }

  history.forEach(h => {
    const date = new Date(h.createdAt);
    const monthData = chartData.find(m => m.month === date.getMonth() && m.year === date.getFullYear());
    if (monthData) {
      if (h.sourceType === 'MEETING') {
        monthData.meetings++;
      } else if (h.sourceType === 'FEEDBACK') {
        const type: string = h.feedbackType || 'PRAISE';
        if (type === 'PRAISE') monthData.praise++;
        else if (type === 'IMPROVEMENT') monthData.improvement++;
        else if (type === 'WARNING') monthData.warning++;
      }
    }
  });

  const isMeetingOnly = filterType === 'MEETING';
  const maxValue = isMeetingOnly
    ? Math.max(...chartData.map(m => m.meetings), 5)
    : Math.max(...chartData.flatMap(m => [
      showPraise ? m.praise : 0,
      showImprovement ? m.improvement : 0,
      showCorrection ? m.warning : 0,
    ]), 5);

  const selectStyle: React.CSSProperties = {
    background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 6,
    padding: '5px 28px 5px 10px', fontSize: 11, fontWeight: 500, color: '#5A6070',
    outline: 'none', cursor: 'pointer', appearance: 'none',
  };

  return (
    <div style={panelStyle} className="space-y-4">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isMeetingOnly ? 'Meeting Volume' : 'Sentiment Distribution'}
          </p>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginTop: 2 }}>
            {isMeetingOnly ? 'Meeting Frequency' : 'Historical Pulse'}{employeeName ? `: ${employeeName}` : ''}
          </h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <select value={timeRange} onChange={(e) => setTimeRange(Number(e.target.value) as 3 | 6 | 12)} style={selectStyle}>
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={12}>Last 12 Months</option>
            </select>
            <svg style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, color: '#9EA3B0', pointerEvents: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10 }}>
            {!isMeetingOnly ? (
              <>
                {[
                  { key: 'praise', show: showPraise, toggle: () => setShowPraise(!showPraise), color: '#27500A', label: 'Praise' },
                  { key: 'improvement', show: showImprovement, toggle: () => setShowImprovement(!showImprovement), color: '#633806', label: 'Improvement' },
                  { key: 'correction', show: showCorrection, toggle: () => setShowCorrection(!showCorrection), color: '#791F1F', label: 'Correction' },
                ].map(item => (
                  <button key={item.key} onClick={item.toggle}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', opacity: item.show ? 1 : 0.35, transition: 'opacity 0.2s' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{item.label}</span>
                  </button>
                ))}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1A56DB' }} />
                <span style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Meetings</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', height: 200, width: '100%' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <div key={i} style={{ position: 'absolute', width: '100%', borderTop: '0.5px solid #F0F2F6', bottom: `${p * 100}%` }}>
            <span style={{ position: 'absolute', left: -28, top: -8, fontSize: 8, fontWeight: 500, color: '#9EA3B0' }}>{Math.round(p * maxValue)}</span>
          </div>
        ))}

        <svg style={{ width: '100%', height: '100%', overflow: 'visible', position: 'relative', zIndex: 10 }} preserveAspectRatio="none" viewBox="0 0 500 200">
          <defs>
            <linearGradient id="phPraiseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#27500A" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#27500A" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="phImproveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#633806" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#633806" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="phWarningGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#791F1F" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#791F1F" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="phMeetingGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A56DB" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1A56DB" stopOpacity="0" />
            </linearGradient>
          </defs>

          {(() => {
            const width = 500; const height = 200;
            const points = chartData.length;
            const dx = width / (points - 1);

            const getPath = (getData: (m: MonthData) => number): string => {
              let path = ''; let prevY = 0;
              chartData.forEach((m, i) => {
                const x = i * dx;
                const y = height - (getData(m) / maxValue) * height;
                if (i === 0) { path = `M ${x} ${y}`; }
                else { const prevX = (i - 1) * dx; const cpX = prevX + (x - prevX) / 2; path += ` C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`; }
                prevY = y;
              });
              return path;
            };

            const fillPath = (path: string) => `${path} L ${width} ${height} L 0 ${height} Z`;

            if (isMeetingOnly) {
              const p = getPath(m => m.meetings);
              return (<><path d={fillPath(p)} fill="url(#phMeetingGrad)" /><path d={p} fill="none" stroke="#1A56DB" strokeWidth="2" strokeLinecap="round" /></>);
            }

            const praiseP = getPath(m => m.praise);
            const improvementP = getPath(m => m.improvement);
            const correctionP = getPath(m => m.warning);

            return (
              <>
                {showPraise && <path d={fillPath(praiseP)} fill="url(#phPraiseGrad)" className="transition-all duration-500" />}
                {showImprovement && <path d={fillPath(improvementP)} fill="url(#phImproveGrad)" className="transition-all duration-500" />}
                {showCorrection && <path d={fillPath(correctionP)} fill="url(#phWarningGrad)" className="transition-all duration-500" />}
                {showPraise && <path d={praiseP} fill="none" stroke="#27500A" strokeWidth="2" strokeLinecap="round" className="transition-all duration-500" />}
                {showImprovement && <path d={improvementP} fill="none" stroke="#633806" strokeWidth="2" strokeLinecap="round" className="transition-all duration-500" />}
                {showCorrection && <path d={correctionP} fill="none" stroke="#791F1F" strokeWidth="2" strokeLinecap="round" className="transition-all duration-500" />}
              </>
            );
          })()}
        </svg>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pointerEvents: 'none', paddingBottom: 0 }}>
          {chartData.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative', pointerEvents: 'auto' }} className="group">
              <div style={{ width: 1, height: 200, background: 'transparent', position: 'relative' }} className="group-hover:bg-[#F0F2F6] transition-colors">
                <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#111827', color: '#FFFFFF', fontSize: 10, fontWeight: 500, padding: '8px 12px', borderRadius: 6, opacity: 0, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 20, marginBottom: 6 }} className="group-hover:opacity-100 transition-opacity">
                  <p style={{ color: '#9EA3B0', marginBottom: 4 }}>{m.name} {m.year}</p>
                  {!isMeetingOnly ? (
                    <>
                      {showPraise && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#27500A', display: 'inline-block' }} />Praise</span><strong>{m.praise}</strong></div>}
                      {showImprovement && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#633806', display: 'inline-block' }} />Improvement</span><strong>{m.improvement}</strong></div>}
                      {showCorrection && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#791F1F', display: 'inline-block' }} />Correction</span><strong>{m.warning}</strong></div>}
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A56DB', display: 'inline-block' }} />Meetings</span><strong>{m.meetings}</strong></div>
                  )}
                  <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '6px solid transparent', borderTopColor: '#111827' }} />
                </div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.3px', background: '#FFFFFF', padding: '0 4px', marginBottom: -20 }}>
                {m.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminStats = ({ history }: { history: any[] }) => {
  const feedbacks = history.filter(h => h.sourceType === 'FEEDBACK');
  const praiseCount = feedbacks.filter(h => h.feedbackType === 'PRAISE').length;
  const totalFeedback = feedbacks.length;
  const praisePercentage = totalFeedback > 0 ? Math.round((praiseCount / totalFeedback) * 100) : 0;

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Company-Wide Sentiment</p>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{praisePercentage}% Praise</h3>
          <p style={{ fontSize: 11, color: '#9EA3B0', marginTop: 2 }}>Real-time organizational health.</p>
        </div>
        <div style={{ position: 'relative', width: 72, height: 72 }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="36" cy="36" r="28" stroke="#E4E6EC" strokeWidth="10" fill="transparent" />
            <circle cx="36" cy="36" r="28" stroke="#1A56DB" strokeWidth="10" fill="transparent"
              strokeDasharray={176} strokeDashoffset={176 - (176 * praisePercentage) / 100} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#1A56DB', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Pulse</div>
        </div>
      </div>
    </div>
  );
};

export const PerformanceHistoryPage = () => {
  const { user, isAdmin, isHR, isManager } = useAuth();
  const isGovernanceMode = isAdmin || isHR;
  const { data: departments, isLoading: isDeptsLoading } = useGetDepartmentsQuery();
  const { data: employeeData, isLoading: isEmpsLoading } = useGetEmployeesQuery({ page: 0, size: 1000, excludeSelf: true });
  const employees = (employeeData?.content || []).filter(emp => emp.id !== user?.id);

  const [selectedDeptId, setSelectedDeptId] = useState<number | ''>('');
  const [selectedEmpId, setSelectedEmpId] = useState<number | ''>('');
  const [filterType, setFilterType] = useState<'ALL' | 'FEEDBACK' | 'MEETING'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [goToPage, setGoToPage] = useState('');
  const isPlainManager = isManager && !isAdmin && !isHR;

  React.useEffect(() => {
    if (isPlainManager && departments && departments.length === 1 && selectedDeptId === '') {
      setSelectedDeptId(departments[0].id);
    }
  }, [isPlainManager, departments, selectedDeptId]);

  const { data: employeeHistoryResponse, isLoading: isEmpHistoryLoading } = useGetPerformanceHistoryByEmployeeQuery(
    { employeeId: selectedEmpId, sourceType: filterType, page: currentPage - 1, size: itemsPerPage },
    { skip: !selectedEmpId }
  );
  const { data: globalHistoryResponse, isLoading: isGlobalHistoryLoading } = useGetAllPerformanceHistoryQuery(
    { sourceType: filterType, page: currentPage - 1, size: itemsPerPage },
    { skip: !isGovernanceMode || !!selectedEmpId }
  );
  const { data: employeeAnalytics } = useGetEmployeePerformanceHistoryAnalyticsQuery(selectedEmpId, { skip: !selectedEmpId });
  const { data: globalAnalytics } = useGetPerformanceHistoryAnalyticsQuery(undefined, { skip: !isGovernanceMode || !!selectedEmpId });

  const historyResponse = selectedEmpId ? employeeHistoryResponse : globalHistoryResponse;
  const isHistoryLoading = selectedEmpId ? isEmpHistoryLoading : isGlobalHistoryLoading;
  const history = historyResponse?.content || [];
  const analyticsData = selectedEmpId ? employeeAnalytics : globalAnalytics;

  const selectedDeptName = departments?.find(d => d.id === selectedDeptId)?.departmentName;
  const filteredEmployees = employees?.filter(emp => !selectedDeptName || emp.currentDepartmentName === selectedDeptName) || [];

  const totalItems = historyResponse?.totalElements || 0;
  const totalPages = historyResponse?.totalPages || 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + history.length;
  const paginatedHistory = history;

  const handlePageChange = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };
  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(goToPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) { setCurrentPage(pageNum); setGoToPage(''); }
  };

  const selectedEmployeeName = employees?.find(e => e.id === selectedEmpId)?.staffName;

  const inputStyle: React.CSSProperties = {
    background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8,
    padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none',
    width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5,
  };
  const btnPageStyle = (active: boolean): React.CSSProperties => ({
    width: 30, height: 30, borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
    background: active ? '#1A56DB' : 'transparent', color: active ? '#FFFFFF' : '#9EA3B0',
  });

  return (
    <div className="space-y-4 pb-8">
      {/* Governance banner */}
      {isGovernanceMode && (
        <div style={{ background: '#111827', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg style={{ width: 14, height: 14, color: '#9EA3B0', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Admin Mode: Content Privacy Enforced</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>
          {isGovernanceMode ? 'The Global Pulse' : 'Performance History Tracker'}
        </h1>
        <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>
          {isGovernanceMode ? 'Real-time organizational performance & feedback health.' : 'View chronological performance activities, feedback, and 1-on-1 meeting records.'}
        </p>
      </div>

      {/* Admin Charts */}
      {isGovernanceMode && analyticsData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <AdminStats history={analyticsData} />
          </div>
          <div className="lg:col-span-2">
            <SentimentChart history={analyticsData} employeeName={selectedEmployeeName} filterType={filterType} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ ...panelStyle, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {!isPlainManager && (
          <div style={{ flex: '1 1 160px', minWidth: 0 }}>
            <label style={labelStyle}>Select Department</label>
            <select style={inputStyle} value={selectedDeptId}
              onChange={(e) => { setSelectedDeptId(e.target.value === '' ? '' : Number(e.target.value)); setSelectedEmpId(''); setCurrentPage(1); }}
              disabled={isDeptsLoading}>
              <option value="">All Departments</option>
              {departments?.map(dept => <option key={dept.id} value={dept.id}>{dept.departmentName}</option>)}
            </select>
          </div>
        )}
        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          <label style={labelStyle}>Select Employee</label>
          <select style={{ ...inputStyle, opacity: isEmpsLoading || employees.length === 0 ? 0.5 : 1 }}
            value={selectedEmpId}
            onChange={(e) => { setSelectedEmpId(e.target.value === '' ? '' : Number(e.target.value)); setCurrentPage(1); }}
            disabled={isEmpsLoading || employees.length === 0}>
            <option value="">{filteredEmployees.length > 0 ? 'Choose an Employee…' : 'No employees found'}</option>
            {filteredEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.staffName} ({emp.positionName})</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 140px', minWidth: 0 }}>
          <label style={labelStyle}>Activity Type</label>
          <select style={inputStyle} value={filterType} onChange={(e) => { setFilterType(e.target.value as any); setCurrentPage(1); }}>
            <option value="ALL">All Activities</option>
            <option value="FEEDBACK">Feedback Only</option>
            <option value="MEETING">Meetings Only</option>
          </select>
        </div>
      </div>

      {/* History Section */}
      {selectedEmpId || isGovernanceMode ? (
        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              {isGovernanceMode ? 'Audit Log / Transparent History' : 'Performance Timeline'}
            </h2>
            {isGovernanceMode && (
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#F5F6F8', color: '#5A6070', border: '0.5px solid #E4E6EC', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export CSV
              </button>
            )}
          </div>

          {isHistoryLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{ width: 24, height: 24, border: '2px solid #E4E6EC', borderTopColor: '#1A56DB', borderRadius: '50%' }} className="animate-spin" />
            </div>
          ) : paginatedHistory && paginatedHistory.length > 0 ? (
            <>
              {isGovernanceMode && !selectedEmpId ? (
                /* Admin Table View */
                <div className="overflow-x-auto">
                  <table style={{ width: '100%', textAlign: 'left', minWidth: 640 }}>
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid #E4E6EC' }}>
                        {['Timestamp', 'Participants', 'Tag / Type', 'Content Metadata', 'Status'].map((h, i) => (
                          <th key={h} style={{ paddingBottom: 10, paddingLeft: 8, paddingRight: 8, fontSize: 10, fontWeight: 600, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedHistory.map((record) => {
                        const srcStyle = SOURCE_STYLE[record.sourceType] || SOURCE_STYLE.FEEDBACK;
                        const ftStyle = record.feedbackType ? (FEEDBACK_TYPE_STYLE[record.feedbackType] || FEEDBACK_TYPE_STYLE.PRAISE) : null;
                        return (
                          <tr key={record.historyId} style={{ borderBottom: '0.5px solid #F0F2F6' }} className="hover:bg-[#FAFBFF] transition-colors">
                            <td style={{ padding: '12px 8px' }}>
                              <p style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>{format(new Date(record.createdAt), 'dd/MM/yyyy, p')}</p>
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{record.performerName}</p>
                              <p style={{ fontSize: 10, color: '#9EA3B0', marginTop: 1 }}>to {record.employeeName}</p>
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ background: srcStyle.bg, color: srcStyle.text, border: `0.5px solid ${srcStyle.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', width: 'fit-content' }}>
                                  {record.sourceType === 'FEEDBACK' ? record.title?.split(' ')[0] : 'Meeting'}
                                </span>
                                {ftStyle && <span style={{ background: ftStyle.bg, color: ftStyle.text, border: `0.5px solid ${ftStyle.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', width: 'fit-content' }}>{record.feedbackType}</span>}
                                {record.tagName && <span style={{ fontSize: 9, fontWeight: 500, color: '#9EA3B0', fontStyle: 'italic' }}>#{record.tagName}</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Personal Timeline View */
                <div style={{ borderLeft: '0.5px solid #E4E6EC', marginLeft: 14, paddingLeft: 0 }} className="space-y-6">
                  {paginatedHistory.map((record) => {
                    const srcStyle = SOURCE_STYLE[record.sourceType] || SOURCE_STYLE.FEEDBACK;
                    const ftStyle = record.feedbackType ? (FEEDBACK_TYPE_STYLE[record.feedbackType] || FEEDBACK_TYPE_STYLE.PRAISE) : null;
                    return (
                      <div key={record.historyId} style={{ position: 'relative', paddingLeft: 28 }}>
                        <div style={{ position: 'absolute', left: -8, top: 6, width: 16, height: 16, borderRadius: '50%', background: srcStyle.bg, border: `0.5px solid ${srcStyle.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: srcStyle.text, display: 'inline-block' }} />
                        </div>
                        <div style={{ background: '#F5F6F8', border: '0.5px solid #E4E6EC', borderRadius: 10, padding: '12px 14px' }} className="hover:border-[#1A56DB] transition-colors">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                            <div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                <span style={{ background: srcStyle.bg, color: srcStyle.text, border: `0.5px solid ${srcStyle.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{record.sourceType}</span>
                                {ftStyle && <span style={{ background: ftStyle.bg, color: ftStyle.text, border: `0.5px solid ${ftStyle.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{record.feedbackType}</span>}
                                {record.tagName && <span style={{ background: '#F5F6F8', border: '0.5px solid #E4E6EC', borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 500, color: '#5A6070' }}>#{record.tagName}</span>}

                              </div>
                              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{record.title}</h3>
                              <p style={{ fontSize: 11, color: '#9EA3B0', marginTop: 2 }}>
                                {record.performerId !== (selectedEmpId || user?.id)
                                  ? `Recorded by ${record.performerName}`
                                  : `Interaction with ${record.employeeId === (selectedEmpId || user?.id) ? record.managerName : record.employeeName}`}
                              </p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <p style={{ fontSize: 11, fontWeight: 600, color: '#5A6070' }}>{format(new Date(record.createdAt), 'dd/MM/yyyy')}</p>
                              <p style={{ fontSize: 10, color: '#9EA3B0' }}>{format(new Date(record.createdAt), 'p')}</p>
                            </div>
                          </div>
                          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 8, padding: '8px 12px', fontStyle: 'italic', fontSize: 13, color: '#5A6070', lineHeight: 1.5 }}>
                            "{record.description}"
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 0 0', marginTop: 12, borderTop: '0.5px solid #E4E6EC' }}>
                  <span style={{ fontSize: 11, color: '#9EA3B0' }}>Showing {startIndex + 1}–{Math.min(endIndex, totalItems)} of {totalItems}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                      style={{ ...btnPageStyle(false), opacity: currentPage === 1 ? 0.3 : 1 }}>
                      <svg style={{ width: 12, height: 12, margin: 'auto' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    {[...Array(totalPages)].map((_, i) => {
                      const p = i + 1;
                      if (totalPages > 5 && p !== 1 && p !== totalPages && (p < currentPage - 1 || p > currentPage + 1)) {
                        if (p === currentPage - 2 || p === currentPage + 2) return <span key={p} style={{ fontSize: 11, color: '#9EA3B0', padding: '0 2px' }}>…</span>;
                        return null;
                      }
                      return <button key={p} onClick={() => handlePageChange(p)} style={btnPageStyle(currentPage === p)}>{p}</button>;
                    })}
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
                      style={{ ...btnPageStyle(false), opacity: currentPage === totalPages ? 0.3 : 1 }}>
                      <svg style={{ width: 12, height: 12, margin: 'auto' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                  <form onSubmit={handleGoToPage} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontSize: 11, color: '#9EA3B0' }}>Go to</label>
                    <input type="text" value={goToPage} onChange={(e) => setGoToPage(e.target.value)} placeholder="…"
                      style={{ width: 48, background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: '#111827', outline: 'none' }} />
                  </form>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '48px 24px', textAlign: 'center', border: '2px dashed #E4E6EC', borderRadius: 8 }}>
              <svg style={{ width: 36, height: 36, color: '#E4E6EC', margin: '0 auto 10px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p style={{ fontSize: 12, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>No activity found in the logs.</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '64px 24px', textAlign: 'center', border: '2px dashed #E4E6EC', borderRadius: 12, background: '#F5F6F8' }}>
          <div style={{ width: 52, height: 52, borderRadius: 10, background: '#EEF3FD', border: '0.5px solid #B5D4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg style={{ width: 24, height: 24, color: '#1A56DB' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <p style={{ fontSize: 12, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Select an employee to begin analysis</p>
        </div>
      )}
    </div>
  );
};

export default PerformanceHistoryPage;
