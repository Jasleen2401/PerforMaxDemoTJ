import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Play, Eye, Loader2, AlertCircle, Lock, FileDown, Mail, Sliders } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useGetCyclesQuery } from '../../features/appraisal/appraisalApi';
import {
  useGetAllSummariesByCycleQuery,
  useListRequestsByCycleQuery,
} from '../../features/feedback360/feedback360Api';
import type {
  FeedbackRequestResponse,
  FeedbackSummaryResponse,
} from '../../features/feedback360/feedback360Types';
import { useGetAllEmployeesQuery } from '../../features/employee/employeeapi';
import CalibrateModal from './components/CalibrateModal';
import ConfirmModal from './components/ConfirmModal';
import CycleDashboardTab from './components/CycleDashboardTab';
import CycleSettings from './components/CycleSettings';
import FeedbackFormSlots from './components/FeedbackFormSlots';
import PaginationControls from './components/PaginationControls';
import PreviewRow from './components/PreviewRow';
import ReassignModal from './components/ReassignModal';
import ScoringPolicyEditor from './components/ScoringPolicyEditor';
import SummaryRow from './components/SummaryRow';
import { inputStyle, panel, primaryBtn, secondaryBtn, sectionTitle } from './constants/styles';
import { useFeedback360Actions } from './hooks/useFeedback360Actions';

const Feedback360AdminPage = () => {
  const navigate = useNavigate();
  const { activeCycleId } = useAuth();
  const { data: cycles = [], isLoading: cyclesLoading } = useGetCyclesQuery();

  const [cycleId, setCycleId] = useState<number>(activeCycleId ?? 0);
  const [previousCycleId, setPreviousCycleId] = useState<string>('');
  const [globalMaxLimit, setGlobalMaxLimit] = useState<number>(5);
  const [excludeLongTermLeave, setExcludeLongTermLeave] = useState<boolean>(true);
  const [showPreview, setShowPreview] = useState(false);

  const [expandedSummary, setExpandedSummary] = useState<number | null>(null);
  const [calibrateTarget, setCalibrateTarget] = useState<FeedbackSummaryResponse | null>(null);
  const [reassignRequestId, setReassignRequestId] = useState<number | null>(null);

  const [hasGenerated, setHasGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'setup' | 'assignments' | 'summaries'>('dashboard');
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentPageSize, setAssignmentPageSize] = useState(10);

  const { data: savedRequests = [] } = useListRequestsByCycleQuery(cycleId, { skip: !cycleId });

  useEffect(() => {
    if (savedRequests.length > 0) setHasGenerated(true);
  }, [savedRequests.length]);

  const { data: summaries, isLoading: summariesLoading } = useGetAllSummariesByCycleQuery(
    cycleId, { skip: !cycleId },
  );

  const { data: allEmployees = [] } = useGetAllEmployeesQuery();
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [filterName, setFilterName] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const cycleLocked = !!(summaries && summaries.length > 0 && summaries.every((s) => s.isFinalized));
  const selectedCycle = cycles.find((c) => c.cycleId === cycleId);

  const {
    confirmModal,
    closeConfirmModal,
    previewData,
    isPreviewing,
    isGenerating,
    isGeneratingSummaries,
    isFinalizing,
    isSendingCycleReminders,
    isSendingIndividualReminder,
    isDownloadingReport,
    isDownloadingPack,
    handleDownloadSummaryReport,
    handleDownloadManagerPack,
    handlePreview,
    handleGenerate,
    handleGenerateSummaries,
    handleFinalize,
    handleRegenerate,
    handleCancel,
    handleSendCycleReminders,
    handleSendIndividualReminder,
  } = useFeedback360Actions({
    cycleId,
    previousCycleId,
    globalMaxLimit,
    excludeLongTermLeave,
    selectedCycle,
    selectedManagerId,
    setShowPreview,
    setHasGenerated,
  });

  useEffect(() => {
    setAssignmentPage(1);
  }, [cycleId, hasGenerated, showPreview, savedRequests.length, previewData?.length, filterDepartment, filterLevel, filterStatus]);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
            360° Feedback Admin Panel
          </h1>
          <p style={{ fontSize: 13, color: '#9EA3B0', marginTop: 4 }}>
            Configure policies, generate requests, and manage summaries.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {cycleId > 0 && (
            <button
              onClick={() => navigate(`/360-feedback/calibration?cycleId=${cycleId}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#EEF3FD', border: '0.5px solid #BFD4F5', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#0C447C', cursor: 'pointer' }}>
              <Sliders size={13} /> Calibration Workbench
            </button>
          )}
          {cycleId > 0 && (
            <button
              onClick={handleDownloadSummaryReport}
              disabled={isDownloadingReport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                background: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                cursor: isDownloadingReport ? 'not-allowed' : 'pointer',
                opacity: isDownloadingReport ? 0.7 : 1,
                boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.15s ease-in-out',
              }}
              onMouseEnter={(e) => {
                if (!isDownloadingReport) {
                  e.currentTarget.style.borderColor = '#9CA3AF';
                  e.currentTarget.style.background = '#F9FAFB';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDownloadingReport) {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.background = '#FFFFFF';
                }
              }}
            >
              <FileDown size={14} />
              {isDownloadingReport ? 'Downloading...' : 'Download Summary PDF'}
            </button>
          )}
          {cycleLocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#ECFDF5', border: '0.5px solid #A7F3D0', borderRadius: 20 }}>
              <Lock size={13} color="#059669" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>Cycle Locked — All summaries finalized</span>
            </div>
          )}
        </div>
      </div>

      <CycleSettings
        cycles={cycles}
        cyclesLoading={cyclesLoading}
        cycleId={cycleId}
        previousCycleId={previousCycleId}
        globalMaxLimit={globalMaxLimit}
        excludeLongTermLeave={excludeLongTermLeave}
        setCycleId={setCycleId}
        setPreviousCycleId={setPreviousCycleId}
        setGlobalMaxLimit={setGlobalMaxLimit}
        setExcludeLongTermLeave={setExcludeLongTermLeave}
      />

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E4E6EC', paddingBottom: 8, marginTop: 10 }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: activeTab === 'dashboard' ? 600 : 500,
            color: activeTab === 'dashboard' ? '#1A56DB' : '#5A6070',
            background: activeTab === 'dashboard' ? '#EEF3FD' : 'transparent',
            border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          Cycle Dashboard
        </button>
        <button
          onClick={() => setActiveTab('setup')}
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: activeTab === 'setup' ? 600 : 500,
            color: activeTab === 'setup' ? '#1A56DB' : '#5A6070',
            background: activeTab === 'setup' ? '#EEF3FD' : 'transparent',
            border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          Form & Policy Setup
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: activeTab === 'assignments' ? 600 : 500,
            color: activeTab === 'assignments' ? '#1A56DB' : '#5A6070',
            background: activeTab === 'assignments' ? '#EEF3FD' : 'transparent',
            border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          Assignments ({savedRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('summaries')}
          style={{
            padding: '8px 16px', fontSize: 13, fontWeight: activeTab === 'summaries' ? 600 : 500,
            color: activeTab === 'summaries' ? '#1A56DB' : '#5A6070',
            background: activeTab === 'summaries' ? '#EEF3FD' : 'transparent',
            border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          Summaries ({summaries?.length ?? 0})
        </button>
      </div>

      {/* Conditionally Render Tab Content */}

      {activeTab === 'dashboard' && (
        <CycleDashboardTab cycleId={cycleId} />
      )}

      {activeTab === 'setup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Feedback Form Slots */}
          {cycleId > 0 && (
            <div style={panel}>
              <FeedbackFormSlots cycleId={cycleId} />
            </div>
          )}

          {/* Scoring Policy Editor */}
          {cycleId > 0 && (
            <div style={panel}>
              <p style={sectionTitle}>Scoring Policy for Cycle {cycleId}</p>
              <ScoringPolicyEditor cycleId={cycleId} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Generate / Preview */}
          <div style={panel}>
            <p style={sectionTitle}>Generate / Preview Requests</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={secondaryBtn} onClick={handlePreview} disabled={isPreviewing || cycleLocked}>
                {isPreviewing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Eye size={14} />}
                Preview
              </button>
              <button style={primaryBtn(isGenerating || cycleLocked)} onClick={handleGenerate} disabled={isGenerating || cycleLocked}>
                {isGenerating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
                {cycleLocked ? 'Locked' : 'Generate'}
              </button>
              {hasGenerated && (
                <button
                  style={{
                    ...secondaryBtn,
                    background: '#FEF3C7',
                    color: '#92400E',
                    borderColor: '#FCD34D',
                  }}
                  onClick={handleSendCycleReminders}
                  disabled={isSendingCycleReminders || !cycleId}
                >
                  {isSendingCycleReminders ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Mail size={14} />
                  )}
                  Send Cycle Reminders
                </button>
              )}
              <button
                style={{ ...secondaryBtn, marginLeft: 'auto' }}
                onClick={handleGenerateSummaries}
                disabled={isGeneratingSummaries || !cycleId}
              >
                {isGeneratingSummaries ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
                Generate All Summaries
              </button>
            </div>
          </div>

          {/* Request table — preview or saved */}
          {(showPreview || hasGenerated) && (() => {
            const rows: FeedbackRequestResponse[] = hasGenerated ? savedRequests : (previewData ?? []);
            
            const filteredRows = rows.filter(r => {
              const matchName = !filterName || 
                r.targetUserName?.toLowerCase().includes(filterName.toLowerCase()) || 
                r.evaluatorName?.toLowerCase().includes(filterName.toLowerCase());
              const matchDept = !filterDepartment || r.targetDepartmentName === filterDepartment;
              const matchLevel = !filterLevel || r.targetLevelCode === filterLevel;
              const matchStatus = !filterStatus || r.status === filterStatus;
              return matchName && matchDept && matchLevel && matchStatus;
            });

            const totalPages = Math.max(1, Math.ceil(filteredRows.length / assignmentPageSize));
            const currentPage = Math.min(assignmentPage, totalPages);
            const pagedRows = filteredRows.slice((currentPage - 1) * assignmentPageSize, currentPage * assignmentPageSize);
            return (
              <div style={panel}>
                <p style={sectionTitle}>{hasGenerated ? 'Generated Assignments' : 'Preview — Assignments'}</p>
                
                {/* Filters */}
                {rows.length > 0 && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <input
                      type="text"
                      placeholder="Search by name..."
                      style={{ ...inputStyle, width: 220 }}
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                    />
                    <select
                      style={{ ...inputStyle, width: 220 }}
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                    >
                      <option value="">All Departments</option>
                      {Array.from(new Set(rows.map(r => r.targetDepartmentName).filter(Boolean))).sort().map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <select
                      style={{ ...inputStyle, width: 220 }}
                      value={filterLevel}
                      onChange={(e) => setFilterLevel(e.target.value)}
                    >
                      <option value="">All Levels</option>
                      {Array.from(new Set(rows.map(r => r.targetLevelCode).filter(Boolean))).sort().map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                    <select
                      style={{ ...inputStyle, width: 220 }}
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">All Status</option>
                      {['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(status => (
                        <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!hasGenerated && rows.length > 0 && (
                  <div style={{ background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400E', marginBottom: 12 }}>
                    Preview mode — click <strong>Generate Requests</strong> to persist these rows. Reassign and Cancel are disabled until then.
                  </div>
                )}
                {isPreviewing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9EA3B0', padding: '12px 0' }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 13 }}>Loading preview…</span>
                  </div>
                ) : rows.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9EA3B0' }}>No assignments to show.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E4E6EC', background: '#FAFBFC' }}>
                          {['Target', 'Evaluator', 'Relationship', 'Status', 'Due Date / Flags', 'Actions'].map((h) => (
                            <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#5A6070', fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRows.map((req, idx) => (
                          <PreviewRow
                            key={req.id ?? `preview-${(currentPage - 1) * assignmentPageSize + idx}`}
                            req={req}
                            cycleLocked={cycleLocked}
                            onRegenerate={() => handleRegenerate(req)}
                            onCancel={() => req.id && handleCancel(req.id)}
                            onReassign={() => req.id && setReassignRequestId(req.id)}
                            onRemind={() => req.id && handleSendIndividualReminder(req.id)}
                            isReminding={isSendingIndividualReminder}
                          />
                        ))}
                      </tbody>
                    </table>
                    <PaginationControls
                      currentPage={currentPage}
                      pageSize={assignmentPageSize}
                      totalItems={filteredRows.length}
                      onPageChange={setAssignmentPage}
                      onPageSizeChange={(nextPageSize) => {
                        setAssignmentPageSize(nextPageSize);
                        setAssignmentPage(1);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'summaries' && (
        /* Summaries */
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <p style={{ ...sectionTitle, margin: 0 }}>Cycle Summaries</p>
            {cycleId > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    background: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1A56DB',
                    cursor: isDownloadingReport ? 'not-allowed' : 'pointer',
                    opacity: isDownloadingReport ? 0.7 : 1,
                    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                  disabled={isDownloadingReport}
                  onClick={handleDownloadSummaryReport}
                >
                  <FileDown size={14} />
                  {isDownloadingReport ? 'Downloading Cycle PDF...' : 'Download Cycle PDF'}
                </button>

                <div style={{ width: '1px', height: '24px', background: '#E4E6EC' }} />

                <select
                  style={{ ...inputStyle, width: 220 }}
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                >
                  <option value="">-- Select Manager for Pack --</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.staffName} (ID: {emp.id})
                    </option>
                  ))}
                </select>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    background: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#374151',
                    cursor: isDownloadingPack || !selectedManagerId ? 'not-allowed' : 'pointer',
                    opacity: isDownloadingPack || !selectedManagerId ? 0.7 : 1,
                    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                  disabled={isDownloadingPack || !selectedManagerId}
                  onClick={handleDownloadManagerPack}
                >
                  <FileDown size={14} />
                  {isDownloadingPack ? 'Downloading Pack...' : 'Download Manager Pack'}
                </button>
              </div>
            )}
          </div>
          {!cycleId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9EA3B0', fontSize: 13 }}>
              <AlertCircle size={15} /> Enter a Cycle ID above to view summaries.
            </div>
          ) : summariesLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9EA3B0', padding: '12px 0' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13 }}>Loading summaries…</span>
            </div>
          ) : !summaries || summaries.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9EA3B0' }}>No summaries found for cycle {cycleId}.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {summaries.map((s) => {
                const key = s.summaryId ?? s.targetUserId;
                return (
                  <SummaryRow
                    key={key}
                    summary={s}
                    isExpanded={expandedSummary === key}
                    cycleLocked={cycleLocked}
                    onToggle={() => setExpandedSummary(expandedSummary === key ? null : key ?? null)}
                    onFinalize={() => s.summaryId && handleFinalize(s.summaryId)}
                    onCalibrate={() => setCalibrateTarget(s)}
                    isFinalizing={isFinalizing}
                    cycleId={cycleId}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {calibrateTarget && (
        <CalibrateModal summary={calibrateTarget} onClose={() => setCalibrateTarget(null)} />
      )}
      {reassignRequestId !== null && (
        <ReassignModal requestId={reassignRequestId} onClose={() => setReassignRequestId(null)} />
      )}
      <ConfirmModal confirmModal={confirmModal} onClose={closeConfirmModal} />
    </div>
  );
};

export default Feedback360AdminPage;
