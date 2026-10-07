import type React from 'react';
import { CheckCircle, ChevronDown, ChevronUp, Edit3, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useDownloadReportMutation } from '../../../features/report/reportApi';
import type { FeedbackSummaryResponse } from '../../../features/feedback360/feedback360Types';
import { smBtn } from '../constants/styles';
import { CalStatusBadge } from './CalibrateModal';

const ScorePill = ({ score }: { score: number }) => (
  <span style={{
    fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
    background: score >= 4 ? '#EAF3DE' : score >= 3 ? '#FAEEDA' : '#FCEBEB',
    color: score >= 4 ? '#27500A' : score >= 3 ? '#633806' : '#791F1F',
  }}>
    {score.toFixed(2)}
  </span>
);

interface SummaryRowProps {
  summary: FeedbackSummaryResponse;
  isExpanded: boolean;
  cycleLocked: boolean;
  onToggle: () => void;
  onFinalize: () => void;
  onCalibrate: () => void;
  isFinalizing: boolean;
  cycleId: number;
}

const SummaryRow = ({ summary, isExpanded, cycleLocked, onToggle, onFinalize, onCalibrate, isFinalizing, cycleId }: SummaryRowProps) => {
  const displayScore = summary.calibratedFinalScore ?? summary.totalAverageScore;
  const [downloadReport, { isLoading: isDownloading }] = useDownloadReportMutation();

  const handleDownloadPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadReport({
        endpoint: 'feedback-360',
        params: { targetUserId: summary.targetUserId, cycleId },
        fileName: `Feedback_360_Report_${summary.targetUserName}.pdf`,
      }).unwrap();
      toast.success('Feedback report downloaded successfully.');
    } catch {
      toast.error('Failed to download individual feedback report.');
    }
  };

  return (
    <div style={{ border: '0.5px solid #E4E6EC', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#FAFBFC', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{summary.targetUserName}</p>
          {summary.calibratedFinalScore != null && (
            <p style={{ fontSize: 11, color: '#9EA3B0', margin: '2px 0 0' }}>
              Pre-calibration: {summary.totalAverageScore.toFixed(2)}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#9EA3B0' }}>Overall</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', background: '#F5F6F8', padding: '2px 8px', borderRadius: 6 }}>
            {displayScore.toFixed(2)}
          </span>
          <CalStatusBadge status={summary.calibrationStatus} />
          {summary.calibratedFinalScore != null && !summary.calibrationStatus && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: '#EEF3FD', color: '#1A56DB' }}>
              Calibrated
            </span>
          )}
          {summary.summaryId && (
            <button
              style={{ ...smBtn('neutral'), display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              title="Download Individual 360 PDF Report"
            >
              {isDownloading ? (
                <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <FileDown size={11} />
              )}
              Report PDF
            </button>
          )}
          {!cycleLocked && (
            <button
              style={smBtn('neutral')}
              onClick={(e) => { e.stopPropagation(); onCalibrate(); }}
              disabled={!summary.summaryId}
              title="Calibrate score and write manager summary"
            >
              <Edit3 size={11} />
              {summary.calibratedFinalScore != null || summary.managerSummary ? 'Edit Calibration' : 'Calibrate'}
            </button>
          )}
          {summary.isFinalized ? (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#EAF3DE', color: '#27500A' }}>
              Finalized
            </span>
          ) : !cycleLocked ? (
            <button
              style={smBtn('success')}
              onClick={(e) => { e.stopPropagation(); onFinalize(); }}
              disabled={isFinalizing || !summary.summaryId}
              title="Finalize this summary for employee viewing"
            >
              {isFinalizing ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={11} />}
              Finalize
            </button>
          ) : null}
          {isExpanded ? <ChevronUp size={14} color="#9EA3B0" /> : <ChevronDown size={14} color="#9EA3B0" />}
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: '14px 16px', background: '#FFFFFF', borderTop: '0.5px solid #E4E6EC' }}>
          {summary.managerSummary && (
            <div style={{ marginBottom: 12, padding: '10px 12px', background: '#F5F6F8', borderRadius: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase', margin: '0 0 4px' }}>Manager Summary</p>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{summary.managerSummary}</p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Manager', scores: summary.managerScores, color: '#1A56DB' },
              { label: 'Peer', scores: summary.peerScores, color: '#7C3AED' },
              { label: 'Subordinate', scores: summary.subordinateScores, color: '#059669' },
              { label: 'Self', scores: summary.selfScores, color: '#D97706' },
            ].map((group) => {
              const a = group.scores?.length
                ? group.scores.reduce((s, c) => s + c.averageScore, 0) / group.scores.length
                : null;
              return (
                <div key={group.label} style={{ background: '#FAFBFC', border: '0.5px solid #E4E6EC', borderRadius: 8, padding: '8px 12px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: group.color, textTransform: 'uppercase', margin: '0 0 4px' }}>{group.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                    {a !== null ? a.toFixed(2) : <span style={{ color: '#9EA3B0', fontSize: 13 }}>N/A</span>}
                  </p>
                </div>
              );
            })}
          </div>
          {summary.scores.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #E4E6EC' }}>
                  <th style={{ textAlign: 'left', padding: '4px 6px', color: '#5A6070', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Category</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px', color: '#5A6070', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Weighted</th>
                </tr>
              </thead>
              <tbody>
                {summary.scores.map((c) => (
                  <tr key={c.categoryName} style={{ borderBottom: '0.5px solid #F0F2F8' }}>
                    <td style={{ padding: '5px 6px', color: '#374151' }}>{c.categoryName}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right' }}>
                      <ScorePill score={c.averageScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// ── Preview table row ──────────────────────────────────────────────────────────

export default SummaryRow;
