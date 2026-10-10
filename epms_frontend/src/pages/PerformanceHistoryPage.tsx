import { useState } from 'react';
import { useGetDepartmentsQuery } from '../features/org/departmentApi';
import { useGetEmployeesQuery } from '../features/employee/employeeapi';
import { useGetPerformanceHistoryByEmployeeQuery, useGetAllPerformanceHistoryQuery } from '../features/continuous/continuousApi';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';

interface MonthData {
  name: string; month: number; year: number;
  praise: number; improvement: number; warning: number; meetings: number;
}

const SentimentChart = ({ history, employeeName, filterType }: { history: any[]; employeeName?: string; filterType: string }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const last6Months: MonthData[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6Months.push({ name: months[d.getMonth()], month: d.getMonth(), year: d.getFullYear(), praise: 0, improvement: 0, warning: 0, meetings: 0 });
  }
  history.forEach(h => {
    const date = new Date(h.createdAt);
    const m = last6Months.find(m => m.month === date.getMonth() && m.year === date.getFullYear());
    if (!m) return;
    if (h.sourceType === 'MEETING') { m.meetings++; return; }
    if (h.sourceType === 'FEEDBACK') {
      if (h.title.toLowerCase().includes('reply')) return;
      const type = h.feedbackType || (h.title.toLowerCase().includes('praise') ? 'PRAISE' : (h.title.toLowerCase().includes('improvement') || h.description.toLowerCase().includes('improvement')) ? 'IMPROVEMENT' : (h.title.toLowerCase().includes('warning') || h.title.toLowerCase().includes('delete')) ? 'WARNING' : null);
      if (type === 'PRAISE') m.praise++;
      else if (type === 'IMPROVEMENT') m.improvement++;
      else if (type === 'WARNING') m.warning++;
      else m.praise++;
    }
  });

  const isMeetingOnly = filterType === 'MEETING';
  const maxValue = isMeetingOnly
    ? Math.max(...last6Months.map(m => m.meetings), 5)
    : Math.max(...last6Months.map(m => m.praise + m.improvement + m.warning), 5);

  return (
    <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
      <div className="flex flex-wrap justify-between items-center gap-3" style={{ marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
            {isMeetingOnly ? 'Meeting Volume' : 'Sentiment Distribution'}
          </p>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
            {isMeetingOnly ? 'Meeting Frequency' : 'Historical Pulse'}{employeeName ? `: ${employeeName}` : ''}
          </h3>
        </div>
        <div className="flex flex-wrap gap-4">
          {!isMeetingOnly ? (
            <>
              {[['#27500A', 'Praise'], ['#633806', 'Improvement'], ['#791F1F', 'Correction']].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1A56DB' }} />
              <span style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Meetings</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', height: 180, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, padding: '0 4px' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <div key={i} style={{ position: 'absolute', width: '100%', borderTop: '0.5px solid #F0F2F6', bottom: `${p * 100}%` }} />
        ))}
        {last6Months.map((m, i) => {
          if (isMeetingOnly) {
            const height = (m.meetings / maxValue) * 100;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', zIndex: 1 }} className="group">
                <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#111827', color: '#FFFFFF', fontSize: 10, padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none', opacity: 0 }} className="group-hover:opacity-100 transition-opacity">
                  {m.meetings} {m.meetings === 1 ? 'Meeting' : 'Meetings'}
                </div>
                <div style={{ width: '100%', maxWidth: 32, height: 140, display: 'flex', flexDirection: 'column-reverse', borderRadius: 6, overflow: 'hidden', background: '#F5F6F8' }}>
                  <div style={{ height: `${height}%`, background: '#1A56DB', transition: 'height 0.4s' }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase' }}>{m.name}</span>
              </div>
            );
          }
          const praiseH = (m.praise / maxValue) * 100;
          const improvementH = (m.improvement / maxValue) * 100;
          const warningH = (m.warning / maxValue) * 100;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', zIndex: 1 }} className="group">
              <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#111827', color: '#FFFFFF', fontSize: 10, padding: '6px 10px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none', opacity: 0 }} className="group-hover:opacity-100 transition-opacity space-y-1">
                <div style={{ display: 'flex', gap: 6 }}><span style={{ color: '#B8DCA0' }}>P:{m.praise}</span> <span style={{ color: '#F0D4A4' }}>I:{m.improvement}</span> <span style={{ color: '#F5BFBF' }}>C:{m.warning}</span></div>
              </div>
              <div style={{ width: '100%', maxWidth: 32, height: 140, display: 'flex', flexDirection: 'column-reverse', borderRadius: 6, overflow: 'hidden', background: '#F5F6F8' }}>
                <div style={{ height: `${praiseH}%`, background: '#27500A', transition: 'height 0.4s' }} />
                <div style={{ height: `${improvementH}%`, background: '#633806', transition: 'height 0.4s' }} />
                <div style={{ height: `${warningH}%`, background: '#791F1F', transition: 'height 0.4s' }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase' }}>{m.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminStats = ({ history }: { history: any[] }) => {
  const initialFeedback = history.filter(h => h.sourceType === 'FEEDBACK' && !h.title.toLowerCase().includes('reply'));
  const praiseCount = initialFeedback.filter(h => {
    const type = h.feedbackType || (h.title.toLowerCase().includes('praise') ? 'PRAISE' : null);
    return type === 'PRAISE';
  }).length;
  const totalFeedback = initialFeedback.length;
  const praisePercentage = totalFeedback > 0 ? Math.round((praiseCount / totalFeedback) * 100) : 0;

  return (
    <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Company-Wide Sentiment</p>
        <p style={{ fontSize: 22, fontWeight: 500, color: '#111827', marginBottom: 4 }}>{praisePercentage}% Praise</p>
        <p style={{ fontSize: 11, color: '#9EA3B0' }}>Real-time organizational health metrics.</p>
      </div>
      <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
        <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r="28" stroke="#E4E6EC" strokeWidth="8" fill="transparent" />
          <circle cx="36" cy="36" r="28" stroke="#1A56DB" strokeWidth="8" fill="transparent"
            strokeDasharray={176} strokeDashoffset={176 - (176 * praisePercentage) / 100} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 500, color: '#1A56DB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pulse</div>
      </div>
    </div>
  );
};

const FEEDBACK_TYPE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  PRAISE:      { bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0' },
  IMPROVEMENT: { bg: '#FAEEDA', text: '#633806', border: '#F0D4A4' },
  WARNING:     { bg: '#FCEBEB', text: '#791F1F', border: '#F5BFBF' },
};
const SOURCE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  FEEDBACK: { bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0' },
  MEETING:  { bg: '#EEF3FD', text: '#0C447C', border: '#B5D4F4' },
};

const selectStyle = { background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%', fontFamily: 'inherit' };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 5 };

export const PerformanceHistoryPage = () => {
  const { user, isAdmin, isHR } = useAuth();
  const isGovernanceMode = isAdmin || isHR;
  const { data: departments, isLoading: isDeptsLoading } = useGetDepartmentsQuery();
  const { data: employeeData, isLoading: isEmpsLoading } = useGetEmployeesQuery({ page: 0, size: 1000 });
  const employees = employeeData?.content || [];

  const [selectedDeptId, setSelectedDeptId] = useState<number | ''>('');
  const [selectedEmpId, setSelectedEmpId] = useState<number | ''>('');
  const [filterType, setFilterType] = useState<'ALL' | 'FEEDBACK' | 'MEETING'>('ALL');

  const { data: employeeHistory, isLoading: isEmpHistoryLoading } = useGetPerformanceHistoryByEmployeeQuery(Number(selectedEmpId), { skip: !selectedEmpId });
  const { data: globalHistory, isLoading: isGlobalHistoryLoading } = useGetAllPerformanceHistoryQuery(undefined, { skip: !isGovernanceMode || !!selectedEmpId });

  const history = selectedEmpId ? employeeHistory : globalHistory;
  const isHistoryLoading = selectedEmpId ? isEmpHistoryLoading : isGlobalHistoryLoading;

  const filteredEmployees = employees.filter(emp => selectedDeptId ? emp.currentDepartmentId === selectedDeptId : false);
  const filteredHistory = history?.filter(record => filterType === 'ALL' ? true : record.sourceType === filterType) || [];
  const selectedEmployeeName = employees.find(e => e.id === selectedEmpId)?.staffName;

  return (
    <div className="space-y-4 pb-8">
      {isGovernanceMode && (
        <div style={{ background: '#111827', color: '#FFFFFF', borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg style={{ width: 14, height: 14, color: '#9EA3B0', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Mode: Content Privacy Enforced</span>
        </div>
      )}

      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>{isGovernanceMode ? 'The Global Pulse' : 'Performance History Tracker'}</h1>
        <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>
          {isGovernanceMode ? 'Real-time organizational performance & feedback health.' : 'View chronological performance activities, feedback, and 1-on-1 meeting records.'}
        </p>
      </div>

      {isGovernanceMode && history && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <AdminStats history={history} />
          </div>
          <div className="lg:col-span-2">
            <SentimentChart history={history} employeeName={selectedEmployeeName} filterType={filterType} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px' }}
        className="flex flex-col sm:flex-row gap-4">
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Select Department</label>
          <select style={selectStyle} value={selectedDeptId} disabled={isDeptsLoading}
            onChange={e => { setSelectedDeptId(e.target.value === '' ? '' : Number(e.target.value)); setSelectedEmpId(''); }}>
            <option value="">All Departments</option>
            {departments?.map(dept => <option key={dept.id} value={dept.id}>{dept.departmentName}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Select Employee</label>
          <select style={selectStyle} value={selectedEmpId}
            disabled={!selectedDeptId || isEmpsLoading || filteredEmployees.length === 0}
            onChange={e => setSelectedEmpId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">{selectedDeptId ? 'Choose an Employee…' : 'Select a Department First'}</option>
            {filteredEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.staffName} ({emp.positionName})</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Activity Type</label>
          <select style={selectStyle} value={filterType} onChange={e => setFilterType(e.target.value as any)}>
            <option value="ALL">All Activities</option>
            <option value="FEEDBACK">Feedback Only</option>
            <option value="MEETING">Meetings Only</option>
          </select>
        </div>
      </div>

      {/* History */}
      {selectedEmpId || isGovernanceMode ? (
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
          <div className="flex flex-wrap justify-between items-center gap-3" style={{ padding: '12px 16px', background: '#FAFBFF', borderBottom: '0.5px solid #E4E6EC' }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isGovernanceMode ? 'Audit Log / Transparent History' : 'Performance Timeline'}
            </p>
            {isGovernanceMode && (
              <button
                type="button"
                onClick={() => {
                  if (!filteredHistory || filteredHistory.length === 0) {
                    alert('No performance history records available to export.');
                    return;
                  }
                  const headers = ['Timestamp', 'Participants', 'Type', 'Content', 'Status'];
                  const rows = filteredHistory.map(r => [
                    `"${(r.timestamp || '').replace(/"/g, '""')}"`,
                    `"${(r.participants || '').replace(/"/g, '""')}"`,
                    `"${(r.tag || r.type || '').replace(/"/g, '""')}"`,
                    `"${(r.content || '').replace(/"/g, '""')}"`,
                    `"${(r.status || '').replace(/"/g, '""')}"`
                  ]);
                  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `performance_history_${new Date().toISOString().split('T')[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                style={{ background: '#F5F6F8', color: '#5A6070', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                className="hover:bg-[#E0E2E8] transition-colors cursor-pointer"
              >
                <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export CSV
              </button>
            )}
          </div>

          <div style={{ padding: '16px 18px' }}>
            {isHistoryLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Analyzing Performance Data…</div>
            ) : filteredHistory && filteredHistory.length > 0 ? (
              isGovernanceMode && !selectedEmpId ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left" style={{ minWidth: 600 }}>
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF' }}>
                        {['Timestamp', 'Participants', 'Tag/Type', 'Content', 'Status'].map((h, i) => (
                          <th key={h} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((record, idx) => (
                        <tr key={record.historyId} style={{ borderBottom: idx < filteredHistory.length - 1 ? '0.5px solid #F0F2F6' : 'none' }} className="hover:bg-[#FAFBFF] transition-colors">
                          <td style={{ padding: '10px 12px' }}>
                            <p style={{ fontSize: 11, fontWeight: 500, color: '#111827' }}>{format(new Date(record.createdAt), 'dd/MM/yyyy, p')}</p>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <p style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{record.performerName}</p>
                            <p style={{ fontSize: 10, color: '#9EA3B0' }}>to {record.employeeName}</p>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div className="flex flex-col gap-1">
                              {(() => {
                                const ss = SOURCE_STYLE[record.sourceType] || SOURCE_STYLE.FEEDBACK;
                                return <span style={{ fontSize: 9, fontWeight: 500, background: ss.bg, color: ss.text, border: `0.5px solid ${ss.border}`, borderRadius: 4, padding: '1px 6px', textTransform: 'uppercase', width: 'fit-content' }}>
                                  {record.sourceType === 'FEEDBACK' ? record.title.split(' ')[0] : 'Meeting'}
                                </span>;
                              })()}
                              {record.feedbackType && (() => {
                                const fs = FEEDBACK_TYPE_STYLE[record.feedbackType] || FEEDBACK_TYPE_STYLE.PRAISE;
                                return <span style={{ fontSize: 8, fontWeight: 500, background: fs.bg, color: fs.text, border: `0.5px solid ${fs.border}`, borderRadius: 4, padding: '1px 5px', textTransform: 'uppercase', width: 'fit-content' }}>{record.feedbackType}</span>;
                              })()}
                              {record.tagName && <span style={{ fontSize: 9, color: '#9EA3B0', fontStyle: 'italic' }}>#{record.tagName}</span>}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: 240 }}>
                            <p style={{ fontSize: 11, color: '#5A6070', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as any, fontStyle: 'italic' }}>"{record.description}"</p>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <span style={{ fontSize: 9, fontWeight: 500, color: '#1A56DB', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A56DB' }} />
                              Published
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ borderLeft: '0.5px solid #E4E6EC', marginLeft: 8, paddingBottom: 8 }} className="space-y-6">
                  {filteredHistory.map(record => {
                    const ss = SOURCE_STYLE[record.sourceType] || SOURCE_STYLE.FEEDBACK;
                    const fs = record.feedbackType ? (FEEDBACK_TYPE_STYLE[record.feedbackType] || FEEDBACK_TYPE_STYLE.PRAISE) : null;
                    return (
                      <div key={record.historyId} style={{ position: 'relative', paddingLeft: 22 }}>
                        <div style={{ position: 'absolute', left: -6, top: 4, width: 12, height: 12, borderRadius: '50%', background: record.sourceType === 'FEEDBACK' ? '#EAF3DE' : '#EEF3FD', border: '2px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: record.sourceType === 'FEEDBACK' ? '#27500A' : '#1A56DB' }} />
                        </div>
                        <div style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 10, padding: '12px 14px' }}>
                          <div className="flex flex-wrap items-start justify-between gap-2" style={{ marginBottom: 8 }}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span style={{ fontSize: 9, fontWeight: 500, background: ss.bg, color: ss.text, border: `0.5px solid ${ss.border}`, borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{record.sourceType}</span>
                              {fs && <span style={{ fontSize: 9, fontWeight: 500, background: fs.bg, color: fs.text, border: `0.5px solid ${fs.border}`, borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{record.feedbackType}</span>}
                              {record.tagName && <span style={{ fontSize: 9, color: '#9EA3B0', background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 4, padding: '2px 6px' }}>#{record.tagName}</span>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: 11, color: '#9EA3B0' }}>{format(new Date(record.createdAt), 'dd/MM/yyyy')}</p>
                              <p style={{ fontSize: 10, color: '#9EA3B0' }}>{format(new Date(record.createdAt), 'p')}</p>
                            </div>
                          </div>
                          <h3 style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 4 }}>{record.title}</h3>
                          <p style={{ fontSize: 11, color: '#9EA3B0', marginBottom: 8 }}>
                            {record.performerId !== (selectedEmpId || user?.id)
                              ? `Recorded by ${record.performerName}`
                              : `Interaction with ${record.employeeId === (selectedEmpId || user?.id) ? record.managerName : record.employeeName}`}
                          </p>
                          <div style={{ background: '#FFFFFF', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#5A6070', lineHeight: 1.5, fontStyle: 'italic' }}>
                            "{record.description}"
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', border: '0.5px dashed #E0E2E8', borderRadius: 10, background: '#FAFBFF' }}>
                <svg style={{ width: 32, height: 32, color: '#E0E2E8', margin: '0 auto 10px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p style={{ fontSize: 12, color: '#9EA3B0', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>No activity found in the logs.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ background: '#EEF3FD', border: '0.5px dashed #B5D4F4', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: '#FFFFFF', border: '0.5px solid #B5D4F4', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg style={{ width: 24, height: 24, color: '#1A56DB' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#0C447C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select an employee to begin analysis</p>
        </div>
      )}
    </div>
  );
};

export default PerformanceHistoryPage;
