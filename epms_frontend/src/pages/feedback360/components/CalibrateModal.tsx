import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAdjustSummaryScoreMutation, usePostManagerSummaryMutation } from '../../../features/feedback360/feedback360Api';
import type { FeedbackSummaryResponse } from '../../../features/feedback360/feedback360Types';
import { CalibrationStatus } from '../../../features/feedback360/feedback360Types';
import { inputStyle, labelStyle, primaryBtn, smBtn } from '../constants/styles';

interface CalibrateModalProps {
  summary: FeedbackSummaryResponse;
  onClose: () => void;
}

const CAL_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  NOT_STARTED:  { bg: '#F5F6F8', text: '#5A6070', border: '#E4E6EC' },
  UNDER_REVIEW: { bg: '#FFF8E6', text: '#633806', border: '#F5D48A' },
  ADJUSTED:     { bg: '#EEF3FD', text: '#0C447C', border: '#BFD4F5' },
  APPROVED:     { bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0' },
  LOCKED:       { bg: '#F0F1F5', text: '#9EA3B0', border: '#D0D3DC' },
};

const CalStatusBadge = ({ status }: { status?: CalibrationStatus | null }) => {
  if (!status) return null;
  const c = CAL_STATUS_COLORS[status] ?? CAL_STATUS_COLORS.NOT_STARTED;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: c.bg, color: c.text, border: `0.5px solid ${c.border}`, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {status.replace('_', ' ')}
    </span>
  );
};

const CalibrateModal = ({ summary, onClose }: CalibrateModalProps) => {
  const [calibratedScore, setCalibratedScore] = useState<string>(
    summary.calibratedFinalScore != null ? String(summary.calibratedFinalScore) : '',
  );
  const [managerSummaryText, setManagerSummaryText] = useState(summary.managerSummary ?? '');
  const [reason, setReason] = useState(summary.calibrationReason ?? '');
  const [postManagerSummary, { isLoading: isSavingManagerSummary }] = usePostManagerSummaryMutation();
  const [adjustScore, { isLoading: isAdjusting }] = useAdjustSummaryScoreMutation();
  const isLoading = isSavingManagerSummary || isAdjusting;

  const handleSave = async () => {
    if (!summary.summaryId) return;
    const hasScore = calibratedScore !== '';
    const parsed = hasScore ? parseFloat(calibratedScore) : NaN;
    if (hasScore && (isNaN(parsed) || parsed < 0 || parsed > 100)) {
      toast.error('Score must be between 0 and 100'); return;
    }
    if (hasScore && !reason.trim()) {
      toast.error('Calibration reason is required when setting a score'); return;
    }
    try {
      if (hasScore) {
        await adjustScore({ summaryId: summary.summaryId, calibratedFinalScore: parsed, calibrationReason: reason.trim() }).unwrap();
      }
      if (managerSummaryText !== (summary.managerSummary ?? '')) {
        await postManagerSummary({ summaryId: summary.summaryId, managerSummary: managerSummaryText }).unwrap();
      }
      toast.success('Calibration saved.');
      onClose();
    } catch (e: any) {
      toast.error('Failed to save calibration.');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#FFFFFF', borderRadius: 14, width: '100%', maxWidth: 520,
        border: '0.5px solid #E4E6EC', boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #E4E6EC' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>
            Calibrate — {summary.targetUserName}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9EA3B0' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginBottom: 4 }}>
              System Score (pre-calibration)
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
              {summary.totalAverageScore.toFixed(2)}
            </p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Calibrated Final Score (0–100, optional)</label>
            <input
              type="number" min={0} max={100} step={0.01}
              value={calibratedScore}
              onChange={(e) => setCalibratedScore(e.target.value)}
              placeholder="e.g. 82.50"
              style={inputStyle}
            />
          </div>
          {calibratedScore !== '' && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Calibration Reason *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Explain why the score is being adjusted…"
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Manager Summary</label>
            <textarea
              value={managerSummaryText}
              onChange={(e) => setManagerSummaryText(e.target.value)}
              rows={4}
              placeholder="Overall narrative for this employee's 360° results…"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '0.5px solid #E4E6EC' }}>
          <button style={{ ...smBtn('neutral'), padding: '7px 14px', fontSize: 13 }} onClick={onClose}>Cancel</button>
          <button style={primaryBtn(isLoading)} onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            Save Calibration
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Summary row ────────────────────────────────────────────────────────────────

export default CalibrateModal;
export { CalStatusBadge };
