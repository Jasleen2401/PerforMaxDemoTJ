import { Edit3, FileDown, Loader2, Mail, RefreshCw, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../hooks/useAuth';
import { useDownloadReportMutation } from '../../../features/report/reportApi';
import type { FeedbackRequestResponse } from '../../../features/feedback360/feedback360Types';
import { FeedbackStatus } from '../../../features/feedback360/feedback360Types';
import RelBadge from '../../../components/feedback360/RelBadge';
import StatusBadge from '../../../components/feedback360/StatusBadge';
import { smBtn } from '../constants/styles';

interface PreviewRowProps {
  req: FeedbackRequestResponse;
  cycleLocked: boolean;
  onRegenerate: () => void;
  onCancel: () => void;
  onReassign: () => void;
  onRemind: () => void;
  isReminding: boolean;
}

const PreviewRow = ({ req, cycleLocked, onRegenerate, onCancel, onReassign, onRemind, isReminding }: PreviewRowProps) => {
  const { user } = useAuth();
  const isDone = req.status === FeedbackStatus.COMPLETED;
  const [downloadReport, { isLoading: isPrinting }] = useDownloadReportMutation();

  const isMyRow = req.targetUserId === user?.id;
  const shouldHide = isMyRow
    && req.isAnonymous
    && (req.relationship === 'PEER' || req.relationship === 'SUBORDINATE');
  const lockedButtonStyle = cycleLocked
    ? { opacity: 0.45, cursor: 'not-allowed' }
    : {};

  const handlePrint = async () => {
    if (!req.id) return;
    try {
      await downloadReport({
        endpoint: 'feedback-360/print-form',
        params: { requestId: req.id },
        fileName: `Feedback_360_Form_${req.id}.pdf`,
      }).unwrap();
      toast.success('Paper form downloaded successfully.');
    } catch {
      toast.error('Failed to download paper form.');
    }
  };

  return (
    <tr style={{
      borderBottom: '0.5px solid #F0F2F8',
      background: req.isReciprocalFallback ? '#FFFBEB' : 'transparent',
    }}>
      <td style={{ padding: '8px 10px' }}>
        <div style={{ fontWeight: 500, color: '#111827' }}>{req.targetUserName}</div>
        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
          {req.targetLevelCode && req.targetLevelCode !== 'N/A' ? `${req.targetLevelCode} • ` : ''}
          {req.targetDepartmentName || 'No Dept'}
        </div>
      </td>
      <td style={{ padding: '8px 10px' }}>
        <div style={{ color: shouldHide ? '#9EA3B0' : '#374151', fontStyle: shouldHide ? 'italic' : 'normal', fontWeight: 500 }}>
          {shouldHide ? 'Anonymous' : req.evaluatorName}
        </div>
        {!shouldHide && (
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
            {req.evaluatorLevelCode && req.evaluatorLevelCode !== 'N/A' ? `${req.evaluatorLevelCode} • ` : ''}
            {req.evaluatorDepartmentName || 'No Dept'}
          </div>
        )}
      </td>
      <td style={{ padding: '8px 10px' }}><RelBadge rel={req.relationship} /></td>
      <td style={{ padding: '8px 10px' }}><StatusBadge status={req.status} /></td>
      <td style={{ padding: '8px 10px', color: '#9EA3B0', fontSize: 12 }}>
        {req.dueDate ? req.dueDate.slice(0, 10) : '—'}
        {req.isReciprocalFallback && (
          <span
            title="No rotated evaluator available — using last cycle's evaluator as fallback"
            style={{ marginLeft: 6, fontSize: 10, color: '#D97706', fontWeight: 600 }}
          >
            Fallback
          </span>
        )}
      </td>
      <td style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            style={{ ...smBtn('neutral'), ...lockedButtonStyle }}
            onClick={onRegenerate}
            disabled={cycleLocked}
            title={cycleLocked ? 'Cycle is locked' : undefined}
          >
            <RefreshCw size={10} /> Regen
          </button>
          {!isDone && (
            <>
              <button
                style={{
                  ...smBtn('neutral'),
                  opacity: (!cycleLocked && req.id && !shouldHide) ? 1 : 0.45,
                  cursor: (!cycleLocked && req.id && !shouldHide) ? 'pointer' : 'not-allowed',
                }}
                onClick={onReassign}
                disabled={cycleLocked || !req.id || shouldHide}
                title={cycleLocked ? 'Cycle is locked' : shouldHide ? 'Cannot reassign your own anonymous evaluator' : !req.id ? 'Click Generate to enable per-row actions' : undefined}
              >
                <Edit3 size={10} /> Reassign
              </button>
              <button
                style={{
                  ...smBtn('danger'),
                  opacity: (!cycleLocked && req.id && !shouldHide) ? 1 : 0.45,
                  cursor: (!cycleLocked && req.id && !shouldHide) ? 'pointer' : 'not-allowed',
                }}
                onClick={onCancel}
                disabled={cycleLocked || !req.id || shouldHide}
                title={cycleLocked ? 'Cycle is locked' : shouldHide ? 'Cannot cancel your own anonymous evaluator' : !req.id ? 'Click Generate to enable per-row actions' : undefined}
              >
                <X size={10} /> Cancel
              </button>
            </>
          )}
          {(req.status === FeedbackStatus.PENDING || req.status === FeedbackStatus.IN_PROGRESS) && req.id && (
            <button
              style={{ ...smBtn('neutral'), background: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D', ...lockedButtonStyle }}
              onClick={onRemind}
              disabled={cycleLocked || isReminding}
              title={cycleLocked ? 'Cycle is locked' : 'Send immediate reminder notification to this evaluator'}
            >
              {isReminding ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={10} />}
              Remind
            </button>
          )}
          {req.id && (
            <button
              style={{ ...smBtn('neutral'), background: '#ECFDF5', color: '#065F46', borderColor: '#A7F3D0' }}
              onClick={handlePrint}
              disabled={isPrinting}
            >
              {isPrinting ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <FileDown size={10} />}
              Print Form
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

// ── Reassign modal ─────────────────────────────────────────────────────────────

export default PreviewRow;
