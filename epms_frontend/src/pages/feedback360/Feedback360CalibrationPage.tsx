import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  useGetAllSummariesByCycleQuery,
  useGetCalibrationDeltasQuery,
  useGetScoreDistributionQuery,
  useFlagSummaryForReviewMutation,
  useAdjustSummaryScoreMutation,
  useApproveSummaryMutation,
  useRevertSummaryMutation,
  useLockCalibrationCycleMutation,
  useCreateCalibrationSessionMutation,
  useAddSummariesToSessionMutation,
  useStartCalibrationSessionMutation,
  useCompleteCalibrationSessionMutation,
  useListCalibrationSessionsQuery,
} from '../../features/feedback360/feedback360Api';
import { useGetDepartmentsQuery } from '../../features/org/departmentApi';
import {
  Flag, CheckCircle2, RotateCcw, Sliders, Lock, BarChart2, List, Plus, ChevronDown, ChevronUp,
  Folder, Users, Play
} from 'lucide-react';
import type { FeedbackSummaryResponse, CalibrationStatus } from '../../features/feedback360/feedback360Types';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  NOT_STARTED:  { bg: '#F5F6F8', text: '#5A6070', border: '#E4E6EC' },
  UNDER_REVIEW: { bg: '#FFF8E6', text: '#633806', border: '#F5D48A' },
  ADJUSTED:     { bg: '#EEF3FD', text: '#0C447C', border: '#BFD4F5' },
  APPROVED:     { bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0' },
  LOCKED:       { bg: '#F0F1F5', text: '#9EA3B0', border: '#D0D3DC' },
};

const SESSION_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PLANNED:     { bg: '#EEF3FD', text: '#0C447C', border: '#BFD4F5' },
  IN_PROGRESS: { bg: '#FFF8E6', text: '#633806', border: '#F5D48A' },
  COMPLETED:   { bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0' },
};

const StatusBadge = ({ status }: { status?: CalibrationStatus | null }) => {
  const s = status ?? 'NOT_STARTED';
  const c = STATUS_COLORS[s] ?? STATUS_COLORS.NOT_STARTED;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: c.bg, color: c.text, border: `0.5px solid ${c.border}`,
      textTransform: 'uppercase', letterSpacing: '0.4px',
    }}>
      {s.replace('_', ' ')}
    </span>
  );
};

interface AdjustModalProps {
  summary: FeedbackSummaryResponse;
  onClose: () => void;
}

const AdjustModal = ({ summary, onClose }: AdjustModalProps) => {
  const [score, setScore] = useState<string>(
    String(summary.calibratedFinalScore ?? summary.totalAverageScore ?? '')
  );
  const [reason, setReason] = useState('');
  const [adjust, { isLoading }] = useAdjustSummaryScoreMutation();

  const handleSave = async () => {
    const parsed = parseFloat(score);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      toast.error('Score must be between 0 and 100'); return;
    }
    if (!reason.trim()) { toast.error('Calibration reason is required'); return; }
    try {
      await adjust({ summaryId: summary.summaryId!, calibratedFinalScore: parsed, calibrationReason: reason.trim() }).unwrap();
      toast.success('Score calibrated');
      onClose();
    } catch (e: any) { toast.error('Failed to adjust score.'); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Calibrate Score</p>
        <p style={{ fontSize: 12, color: '#5A6070', marginBottom: 16 }}>{summary.targetUserName}</p>

        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: '#5A6070', marginBottom: 4 }}>Raw System Score</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {summary.totalAverageScore?.toFixed(2) ?? '—'}
          </p>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#5A6070', display: 'block', marginBottom: 4 }}>
            Calibrated Score (0–100) *
          </label>
          <input
            type="number" step="0.1" min="0" max="100"
            value={score}
            onChange={e => setScore(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E4E6EC', borderRadius: 8, fontSize: 14 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#5A6070', display: 'block', marginBottom: 4 }}>
            Reason * (required)
          </label>
          <textarea
            rows={3} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Explain why the score is being adjusted..."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E4E6EC', borderRadius: 8, fontSize: 13, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #E4E6EC', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={isLoading} style={{ padding: '8px 16px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Saving…' : 'Save Calibration'}
          </button>
        </div>
      </div>
    </div>
  );
};

const BUCKET_ORDER = ['0-60', '60-70', '70-80', '80-90', '90-100'];
const BUCKET_COLORS = ['#FCEBEB', '#FAEEDA', '#EEF3FD', '#EAF3DE', '#D4EDDA'];

const DistributionChart = ({ cycleId }: { cycleId: number }) => {
  const { data: raw } = useGetScoreDistributionQuery({ cycleId, calibrated: false });
  const { data: cal } = useGetScoreDistributionQuery({ cycleId, calibrated: true });
  const maxVal = useMemo(() => {
    if (!raw) return 1;
    return Math.max(...BUCKET_ORDER.map(b => raw.rawBuckets[b] ?? 0), 1);
  }, [raw]);

  return (
    <div style={{ background: '#fff', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <BarChart2 size={14} style={{ color: '#1A56DB' }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Score Distribution</p>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9EA3B0' }}>
          Avg raw: {raw?.rawAverage?.toFixed(1) ?? '—'} | calibrated: {cal?.calibratedAverage?.toFixed(1) ?? '—'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
        {BUCKET_ORDER.map((b, i) => {
          const r = raw?.rawBuckets[b] ?? 0;
          const h = (r / maxVal) * 72;
          return (
            <div key={b} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 10, color: '#5A6070' }}>{r}</span>
              <div style={{ width: '100%', height: h, background: BUCKET_COLORS[i], border: `0.5px solid ${BUCKET_COLORS[i]}`, borderRadius: 4, minHeight: 4 }} />
              <span style={{ fontSize: 9, color: '#9EA3B0' }}>{b}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SummaryRow = ({
  summary, onAdjust, disabled
}: {
  summary: FeedbackSummaryResponse;
  onAdjust: (s: FeedbackSummaryResponse) => void;
  disabled?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [flag, { isLoading: isFlagging }] = useFlagSummaryForReviewMutation();
  const [approve, { isLoading: isApproving }] = useApproveSummaryMutation();
  const [revert, { isLoading: isReverting }] = useRevertSummaryMutation();
  const isLocked = summary.calibrationStatus === 'LOCKED';
  const isActionDisabled = isLocked || disabled;
  const displayScore = summary.calibratedFinalScore ?? summary.totalAverageScore;

  const handleFlag = async () => {
    if (!summary.summaryId) return;
    try { await flag(summary.summaryId).unwrap(); toast.success('Flagged for review'); }
    catch (e: any) { toast.error('Failed to flag for review.'); }
  };
  const handleApprove = async () => {
    if (!summary.summaryId) return;
    try { await approve({ summaryId: summary.summaryId }).unwrap(); toast.success('Approved'); }
    catch (e: any) { toast.error('Failed to approve.'); }
  };
  const handleRevert = async () => {
    if (!summary.summaryId) return;
    try { await revert(summary.summaryId).unwrap(); toast.success('Reverted'); }
    catch (e: any) { toast.error('Failed to revert.'); }
  };

  return (
    <>
      <tr style={{ borderBottom: '0.5px solid #F0F2F6' }} className="hover:bg-[#FAFBFF] transition-colors">
        <td style={{ padding: '10px 18px', fontSize: 13, color: '#111827', fontWeight: 500 }}>
          <button onClick={() => setExpanded(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {summary.targetUserName}
          </button>
        </td>
        <td style={{ padding: '10px 18px', textAlign: 'center', fontSize: 12, color: '#5A6070' }}>
          {summary.totalAverageScore?.toFixed(2) ?? '—'}
        </td>
        <td style={{ padding: '10px 18px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: summary.calibratedFinalScore != null ? '#1A56DB' : '#5A6070' }}>
          {typeof displayScore === 'number' ? displayScore.toFixed(2) : '—'}
          {summary.calibratedFinalScore != null && (
            <span style={{ marginLeft: 4, fontSize: 10, color: '#9EA3B0' }}>
              (Δ {(summary.calibratedFinalScore - summary.totalAverageScore).toFixed(2)})
            </span>
          )}
        </td>
        <td style={{ padding: '10px 18px', textAlign: 'center' }}>
          <StatusBadge status={summary.calibrationStatus} />
        </td>
        <td style={{ padding: '10px 18px', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {!isActionDisabled && summary.calibrationStatus !== 'UNDER_REVIEW' && summary.calibrationStatus !== 'ADJUSTED' && summary.calibrationStatus !== 'APPROVED' && (
              <button onClick={handleFlag} disabled={isFlagging} title="Flag for Review"
                style={{ padding: '4px 10px', fontSize: 11, border: '0.5px solid #F5D48A', background: '#FFF8E6', color: '#633806', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Flag size={10} /> Flag
              </button>
            )}
            {!isActionDisabled && (summary.calibrationStatus === 'UNDER_REVIEW' || summary.calibrationStatus === 'ADJUSTED' || summary.calibrationStatus === 'APPROVED') && (
              <button onClick={() => onAdjust(summary)} title="Adjust Score"
                style={{ padding: '4px 10px', fontSize: 11, border: '0.5px solid #BFD4F5', background: '#EEF3FD', color: '#0C447C', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Sliders size={10} /> Adjust
              </button>
            )}
            {!isActionDisabled && summary.calibrationStatus === 'UNDER_REVIEW' && (
              <button onClick={() => onAdjust(summary)} title="Set Score"
                style={{ padding: '4px 10px', fontSize: 11, border: '0.5px solid #BFD4F5', background: '#EEF3FD', color: '#0C447C', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Sliders size={10} /> Set Score
              </button>
            )}
            {!isActionDisabled && summary.calibrationStatus === 'ADJUSTED' && (
              <>
                <button onClick={handleApprove} disabled={isApproving} title="Approve"
                  style={{ padding: '4px 10px', fontSize: 11, border: '0.5px solid #B8DCA0', background: '#EAF3DE', color: '#27500A', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <CheckCircle2 size={10} /> Approve
                </button>
                <button onClick={handleRevert} disabled={isReverting} title="Revert"
                  style={{ padding: '4px 10px', fontSize: 11, border: '0.5px solid #E4E6EC', background: '#F5F6F8', color: '#5A6070', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <RotateCcw size={10} /> Revert
                </button>
              </>
            )}
            {!isActionDisabled && summary.calibrationStatus === 'UNDER_REVIEW' && (
              <button onClick={handleApprove} disabled={isApproving} title="No change needed"
                style={{ padding: '4px 10px', fontSize: 11, border: '0.5px solid #B8DCA0', background: '#EAF3DE', color: '#27500A', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                <CheckCircle2 size={10} /> No Change
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: '#FAFBFF' }}>
          <td colSpan={5} style={{ padding: '10px 28px 14px' }}>
            <div style={{ fontSize: 12, color: '#5A6070' }}>
              {summary.calibrationReason && (
                <p><strong>Reason:</strong> {summary.calibrationReason}</p>
              )}
              {summary.managerSummary && (
                <p style={{ marginTop: 4 }}><strong>Manager summary:</strong> {summary.managerSummary}</p>
              )}
              <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
                {summary.managerScores && summary.managerScores.length > 0 && (
                  <span>Manager avg: <strong>{(summary.managerScores.reduce((a, b) => a + b.averageScore, 0) / summary.managerScores.length).toFixed(1)}%</strong></span>
                )}
                {summary.peerScores && summary.peerScores.length > 0 && (
                  <span>Peer avg: <strong>{(summary.peerScores.reduce((a, b) => a + b.averageScore, 0) / summary.peerScores.length).toFixed(1)}%</strong></span>
                )}
                {summary.subordinateScores && summary.subordinateScores.length > 0 && (
                  <span>Subordinate avg: <strong>{(summary.subordinateScores.reduce((a, b) => a + b.averageScore, 0) / summary.subordinateScores.length).toFixed(1)}%</strong></span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

interface CreateSessionModalProps {
  cycleId: number;
  onClose: () => void;
}

const CreateSessionModal = ({ cycleId, onClose }: CreateSessionModalProps) => {
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [facilitator, setFacilitator] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');

  const { data: departments = [] } = useGetDepartmentsQuery();
  const [createSession, { isLoading }] = useCreateCalibrationSessionMutation();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Session name is required');
      return;
    }
    try {
      await createSession({
        cycleId,
        departmentId: departmentId ? Number(departmentId) : undefined,
        name: name.trim(),
        facilitator: facilitator.trim() || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
      }).unwrap();
      toast.success('Calibration Session created successfully');
      onClose();
    } catch (e: any) {
      toast.error('Failed to create session.');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Create Calibration Session</p>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#5A6070', display: 'block', marginBottom: 4 }}>Session Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Q1 2026 - Engineering"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E4E6EC', borderRadius: 8, fontSize: 14 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#5A6070', display: 'block', marginBottom: 4 }}>Department (Optional)</label>
          <select
            value={departmentId}
            onChange={e => setDepartmentId(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E4E6EC', borderRadius: 8, fontSize: 14, background: '#fff' }}
          >
            <option value="">All Departments / Cycle-wide</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.departmentName}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#5A6070', display: 'block', marginBottom: 4 }}>Facilitator Name</label>
          <input
            type="text"
            value={facilitator}
            onChange={e => setFacilitator(e.target.value)}
            placeholder="e.g. John Doe"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E4E6EC', borderRadius: 8, fontSize: 14 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#5A6070', display: 'block', marginBottom: 4 }}>Scheduled Date & Time</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E4E6EC', borderRadius: 8, fontSize: 14 }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#5A6070', display: 'block', marginBottom: 4 }}>Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add discussion guidelines, bell-curve targets, etc."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E4E6EC', borderRadius: 8, fontSize: 13, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #E4E6EC', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={isLoading} style={{ padding: '8px 16px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Creating…' : 'Create Session'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface AddSummariesModalProps {
  session: any;
  summaries: FeedbackSummaryResponse[];
  onClose: () => void;
}

const AddSummariesModal = ({ session, summaries, onClose }: AddSummariesModalProps) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [addSummaries, { isLoading }] = useAddSummariesToSessionMutation();

  const availableSummaries = useMemo(() => {
    return summaries.filter(s => {
      if (!s.summaryId) return false;
      const isAlreadyAdded = session.summaryIds?.includes(s.summaryId);
      return !isAlreadyAdded;
    });
  }, [summaries, session]);

  const handleToggle = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === availableSummaries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(availableSummaries.map(s => s.summaryId!).filter(Boolean));
    }
  };

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one employee');
      return;
    }
    try {
      await addSummaries({ sessionId: session.id, summaryIds: selectedIds }).unwrap();
      toast.success('Employees successfully added to session');
      onClose();
    } catch (e: any) {
      toast.error('Failed to add summaries.');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Add Employees to Calibration Session</p>
        <p style={{ fontSize: 12, color: '#5A6070', marginBottom: 16 }}>{session.name} {session.departmentName ? `(${session.departmentName})` : ''}</p>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #E4E6EC', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          {availableSummaries.length > 0 ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid #F0F2F6', marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.length === availableSummaries.length && availableSummaries.length > 0}
                  onChange={handleSelectAll}
                  style={{ marginRight: 10, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', cursor: 'pointer' }} onClick={handleSelectAll}>
                  Select All ({availableSummaries.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {availableSummaries.map(s => (
                  <label key={s.summaryId} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }} className="hover:bg-[#FAFBFF]">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.summaryId!)}
                      onChange={() => handleToggle(s.summaryId!)}
                      style={{ marginRight: 10 }}
                    />
                    <div style={{ fontSize: 13, color: '#111827' }}>
                      <span style={{ fontWeight: 500 }}>{s.targetUserName}</span>
                      <span style={{ fontSize: 11, color: '#9EA3B0', marginLeft: 8 }}>
                        Raw score: {s.totalAverageScore?.toFixed(2) ?? '—'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>
              No available summaries in this cycle to add.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #E4E6EC', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={isLoading || selectedIds.length === 0} style={{ padding: '8px 16px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', opacity: isLoading || selectedIds.length === 0 ? 0.7 : 1 }}>
            {isLoading ? 'Adding…' : `Add ${selectedIds.length} Selected`}
          </button>
        </div>
      </div>
    </div>
  );
};

const Feedback360CalibrationPage = () => {
  const [searchParams] = useSearchParams();
  const cycleId = Number(searchParams.get('cycleId'));

  const { data: summaries = [], isLoading } = useGetAllSummariesByCycleQuery(cycleId, { skip: !cycleId });
  const { data: deltas = [] } = useGetCalibrationDeltasQuery(cycleId, { skip: !cycleId });
  const { data: sessions = [] } = useListCalibrationSessionsQuery(cycleId, { skip: !cycleId });

  const [lockCycle, { isLoading: isLocking }] = useLockCalibrationCycleMutation();
  const [startSession, { isLoading: isStartingSession }] = useStartCalibrationSessionMutation();
  const [completeSession, { isLoading: isCompletingSession }] = useCompleteCalibrationSessionMutation();

  const [adjustTarget, setAdjustTarget] = useState<FeedbackSummaryResponse | null>(null);
  const [view, setView] = useState<'table' | 'deltas'>('table');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showLockConfirm, setShowLockConfirm] = useState(false);

  const [selectedSessionId, setSelectedSessionId] = useState<number | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddSummariesModal, setShowAddSummariesModal] = useState(false);

  const selectedSession = useMemo(() => {
    if (selectedSessionId === 'ALL') return null;
    return sessions.find(s => s.id === selectedSessionId);
  }, [sessions, selectedSessionId]);

  const sessionSummaries = useMemo(() => {
    if (selectedSessionId === 'ALL') return summaries;
    const summaryIds = selectedSession?.summaryIds ?? [];
    return summaries.filter(s => s.summaryId && summaryIds.includes(s.summaryId));
  }, [summaries, selectedSessionId, selectedSession]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { NOT_STARTED: 0, UNDER_REVIEW: 0, ADJUSTED: 0, APPROVED: 0, LOCKED: 0 };
    sessionSummaries.forEach(s => { const k = s.calibrationStatus ?? 'NOT_STARTED'; counts[k] = (counts[k] ?? 0) + 1; });
    return counts;
  }, [sessionSummaries]);

  const filtered = useMemo(() =>
    filterStatus === 'ALL' ? sessionSummaries
      : sessionSummaries.filter(s => (s.calibrationStatus ?? 'NOT_STARTED') === filterStatus),
    [sessionSummaries, filterStatus]);

  const isSessionActionDisabled = useMemo(() => {
    if (!selectedSession) return false;
    return selectedSession.status === 'PLANNED' || selectedSession.status === 'COMPLETED';
  }, [selectedSession]);

  const handleStartSession = async () => {
    if (selectedSessionId === 'ALL') return;
    try {
      await startSession(selectedSessionId).unwrap();
      toast.success('Calibration Session started!');
    } catch (e: any) {
      toast.error('Failed to start session.');
    }
  };

  const handleCompleteSession = async () => {
    if (selectedSessionId === 'ALL') return;
    try {
      await completeSession(selectedSessionId).unwrap();
      toast.success('Calibration Session completed and locked!');
    } catch (e: any) {
      toast.error('Failed to complete session.');
    }
  };

  const handleLock = async () => {
    try { await lockCycle(cycleId).unwrap(); toast.success('Cycle locked — all summaries finalized'); setShowLockConfirm(false); }
    catch (e: any) { toast.error('Lock failed.'); }
  };

  if (!cycleId) return <div style={{ padding: 24, fontSize: 13, color: '#791F1F' }}>No cycleId in URL. Add ?cycleId=X</div>;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Calibration Workbench</p>
          <p style={{ fontSize: 12, color: '#9EA3B0' }}>Cycle ID: {cycleId}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView(v => v === 'table' ? 'deltas' : 'table')}
            style={{ padding: '7px 14px', fontSize: 12, border: '0.5px solid #E4E6EC', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {view === 'table' ? <><BarChart2 size={13} /> View Deltas</> : <><List size={13} /> View Table</>}
          </button>
          <button onClick={() => setShowLockConfirm(true)} disabled={isLocking}
            style={{ padding: '7px 14px', fontSize: 12, border: 'none', borderRadius: 8, background: '#111827', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: isLocking ? 0.7 : 1 }}>
            <Lock size={13} /> Lock Cycle
          </button>
        </div>
      </div>

      {/* Main Dual Pane Layout */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }} className="flex-col lg:flex-row">
        
        {/* Left pane: Sessions Sidebar */}
        <div style={{ flex: '0 0 300px', width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#fff', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Folder size={14} style={{ color: '#1A56DB' }} /> Calibration Sessions
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{ background: 'none', border: 'none', color: '#1A56DB', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                title="Create New Session"
              >
                <Plus size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Option: All Cycle Summaries */}
              <button
                onClick={() => { setSelectedSessionId('ALL'); setFilterStatus('ALL'); }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: selectedSessionId === 'ALL' ? '1px solid #1A56DB' : '1px solid #E4E6EC',
                  background: selectedSessionId === 'ALL' ? '#EEF3FD' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: selectedSessionId === 'ALL' ? '#0C447C' : '#111827' }}>
                    All Cycle Summaries
                  </span>
                  <span style={{ fontSize: 11, background: '#F5F6F8', padding: '2px 6px', borderRadius: 10, color: '#5A6070', fontWeight: 600 }}>
                    {summaries.length}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: '#9EA3B0', marginTop: 4 }}>Full cycle overview</p>
              </button>

              {/* List of Sessions */}
              {sessions.map(s => {
                const isSelected = selectedSessionId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSessionId(s.id); setFilterStatus('ALL'); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: isSelected ? '1px solid #1A56DB' : '1px solid #E4E6EC',
                      background: isSelected ? '#EEF3FD' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#0C447C' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }} title={s.name}>
                        {s.name}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                        background: SESSION_STATUS_COLORS[s.status]?.bg || '#F5F6F8',
                        color: SESSION_STATUS_COLORS[s.status]?.text || '#5A6070',
                        border: `0.5px solid ${SESSION_STATUS_COLORS[s.status]?.border || '#E4E6EC'}`
                      }}>
                        {s.status}
                      </span>
                    </div>
                    {s.facilitator && (
                      <p style={{ fontSize: 11, color: '#5A6070', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={10} /> Facilitator: {s.facilitator}
                      </p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 10, color: '#9EA3B0' }}>
                      <span>{s.departmentName || 'Cycle-wide'}</span>
                      <span style={{ background: '#F0F1F5', padding: '1px 4px', borderRadius: 4, fontWeight: 600 }}>
                        {s.summaryIds?.length ?? 0} employees
                      </span>
                    </div>
                  </button>
                );
              })}
              {sessions.length === 0 && (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 11, color: '#9EA3B0' }}>
                  No calibration sessions created yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right pane: Workbench content */}
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Active Session Info Card */}
          {selectedSession && (
            <div style={{ background: '#fff', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{selectedSession.name}</p>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      background: SESSION_STATUS_COLORS[selectedSession.status]?.bg || '#F5F6F8',
                      color: SESSION_STATUS_COLORS[selectedSession.status]?.text || '#5A6070',
                      border: `0.5px solid ${SESSION_STATUS_COLORS[selectedSession.status]?.border || '#E4E6EC'}`
                    }}>
                      {selectedSession.status}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#5A6070', marginTop: 4 }}>
                    Department: <strong>{selectedSession.departmentName || 'Cycle-wide'}</strong>
                  </p>
                </div>

                {/* Session controls */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {selectedSession.status === 'PLANNED' && (
                    <button
                      onClick={handleStartSession}
                      disabled={isStartingSession}
                      style={{ padding: '6px 12px', fontSize: 12, background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Play size={12} /> Start Session
                    </button>
                  )}
                  {selectedSession.status === 'IN_PROGRESS' && (
                    <button
                      onClick={handleCompleteSession}
                      disabled={isCompletingSession}
                      style={{ padding: '6px 12px', fontSize: 12, background: '#16A34A', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <CheckCircle2 size={12} /> Complete Session
                    </button>
                  )}
                  {(selectedSession.status === 'PLANNED' || selectedSession.status === 'IN_PROGRESS') && (
                    <button
                      onClick={() => setShowAddSummariesModal(true)}
                      style={{ padding: '6px 12px', fontSize: 12, background: '#fff', border: '1px solid #E4E6EC', color: '#111827', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Plus size={12} /> Add Employees
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', borderTop: '0.5px solid #F0F2F6', paddingTop: 12, fontSize: 12, color: '#5A6070' }}>
                {selectedSession.facilitator && (
                  <span>Facilitator: <strong>{selectedSession.facilitator}</strong></span>
                )}
                {selectedSession.scheduledAt && (
                  <span>Scheduled: <strong>{new Date(selectedSession.scheduledAt).toLocaleString()}</strong></span>
                )}
                {selectedSession.notes && (
                  <span style={{ width: '100%', marginTop: 4 }}>Notes: <em style={{ color: '#9EA3B0' }}>{selectedSession.notes}</em></span>
                )}
              </div>
            </div>
          )}

          {/* Status counters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['ALL', 'NOT_STARTED', 'UNDER_REVIEW', 'ADJUSTED', 'APPROVED', 'LOCKED'] as const).map(s => {
              const count = s === 'ALL' ? sessionSummaries.length : (statusCounts[s] ?? 0);
              const c = s === 'ALL' ? { bg: '#F5F6F8', text: '#111827', border: '#E4E6EC' } : STATUS_COLORS[s];
              return (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: `0.5px solid ${filterStatus === s ? c.text : c.border}`, background: filterStatus === s ? c.bg : '#fff', color: c.text, fontSize: 12, cursor: 'pointer', fontWeight: filterStatus === s ? 600 : 400 }}>
                  {s.replace('_', ' ')} <strong>({count})</strong>
                </button>
              );
            })}
          </div>

          {/* Distribution chart */}
          <DistributionChart cycleId={cycleId} />

          {/* Table / Deltas content */}
          {view === 'table' ? (
            <div style={{ background: '#fff', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sliders size={14} style={{ color: '#1A56DB' }} />
                <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>Summary Calibration ({filtered.length})</p>
              </div>
              {isLoading ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading…</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left" style={{ minWidth: 600 }}>
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid #E4E6EC' }}>
                        {['Employee', 'Raw Score', 'Effective Score', 'Status', 'Actions'].map((h, i) => (
                          <th key={h} style={{ padding: '10px 18px', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: i > 0 ? 'center' : 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(s => (
                        <SummaryRow key={s.summaryId ?? s.targetUserId} summary={s} onAdjust={setAdjustTarget} disabled={isSessionActionDisabled} />
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>No summaries match the filter.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#fff', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart2 size={14} style={{ color: '#1A56DB' }} />
                <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>Calibration Deltas</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid #E4E6EC' }}>
                      {['Employee', 'Department', 'Raw Score', 'Calibrated', 'Δ Delta', 'Status', 'Reason'].map((h, i) => (
                        <th key={h} style={{ padding: '10px 18px', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: i > 0 ? 'center' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deltas.map(d => (
                      <tr key={d.summaryId} style={{ borderBottom: '0.5px solid #F0F2F6' }}>
                        <td style={{ padding: '10px 18px', fontSize: 13, color: '#111827', fontWeight: 500 }}>{d.employeeName}</td>
                        <td style={{ padding: '10px 18px', textAlign: 'center', fontSize: 12, color: '#5A6070' }}>{d.departmentName}</td>
                        <td style={{ padding: '10px 18px', textAlign: 'center', fontSize: 12, color: '#5A6070' }}>{d.rawFinalScore?.toFixed(2) ?? '—'}</td>
                        <td style={{ padding: '10px 18px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: d.calibratedFinalScore != null ? '#1A56DB' : '#5A6070' }}>{d.calibratedFinalScore?.toFixed(2) ?? '—'}</td>
                        <td style={{ padding: '10px 18px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: d.delta != null ? (d.delta > 0 ? '#27500A' : d.delta < 0 ? '#791F1F' : '#5A6070') : '#5A6070' }}>
                          {d.delta != null ? (d.delta > 0 ? '+' : '') + d.delta.toFixed(2) : '—'}
                        </td>
                        <td style={{ padding: '10px 18px', textAlign: 'center' }}><StatusBadge status={d.calibrationStatus} /></td>
                        <td style={{ padding: '10px 18px', fontSize: 11, color: '#5A6070', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.calibrationReason ?? ''}>{d.calibrationReason ?? '—'}</td>
                      </tr>
                    ))}
                    {deltas.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>No calibration adjustments yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {adjustTarget && <AdjustModal summary={adjustTarget} onClose={() => setAdjustTarget(null)} />}
      
      {showCreateModal && <CreateSessionModal cycleId={cycleId} onClose={() => { setShowCreateModal(false); }} />}
      
      {showAddSummariesModal && selectedSession && (
        <AddSummariesModal session={selectedSession} summaries={summaries} onClose={() => { setShowAddSummariesModal(false); }} />
      )}

      {/* Lock confirm dialog */}
      {showLockConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Lock Calibration Cycle?</p>
            <p style={{ fontSize: 13, color: '#5A6070', marginBottom: 20 }}>
              All summaries will be set to LOCKED and cannot be edited. Any summary still UNDER_REVIEW or ADJUSTED must be approved or reverted first.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowLockConfirm(false)} style={{ padding: '8px 16px', border: '1px solid #E4E6EC', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleLock} disabled={isLocking} style={{ padding: '8px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', opacity: isLocking ? 0.7 : 1 }}>
                {isLocking ? 'Locking…' : 'Confirm Lock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feedback360CalibrationPage;
