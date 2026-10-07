import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  BarChart3, MessageSquare, Star, Users, AlertCircle, Loader2,
  Lock, FileText, Info, TrendingUp, ChevronDown,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import {
  useGetFeedbackSummaryQuery,
  useGetReceivedFeedbackQuery,
} from '../../features/feedback360/feedback360Api';
import { useGetCyclesQuery } from '../../features/appraisal/appraisalApi';
import { useDownloadReportMutation } from '../../features/report/reportApi';
import SuppressionNotice from '../../components/feedback360/SuppressionNotice';
import type {
  CategoryScore,
  FeedbackSummaryResponse,
  CategoryGap,
  ParticipationStat,
  FeedbackDetailsResponse,
  PooledFeedbackSection,
} from '../../features/feedback360/feedback360Types';
import { FeedbackRelationship } from '../../features/feedback360/feedback360Types';

// ── Style constants ────────────────────────────────────────────────────────────

const panel: React.CSSProperties = {
  background: '#FFFFFF',
  border: '0.5px solid #E4E6EC',
  borderRadius: 12,
  padding: '20px 22px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#111827',
  marginBottom: 16,
};

const SCORE_CARDS = [
  { key: 'managerScores' as const, label: 'Manager', color: '#1A56DB', bg: '#EEF3FD', rel: FeedbackRelationship.DIRECT_MANAGER },
  { key: 'peerScores' as const, label: 'Peer', color: '#7C3AED', bg: '#F5F3FF', rel: FeedbackRelationship.PEER },
  { key: 'subordinateScores' as const, label: 'Subordinate', color: '#059669', bg: '#ECFDF5', rel: FeedbackRelationship.SUBORDINATE },
  { key: 'selfScores' as const, label: 'Self', color: '#D97706', bg: '#FFFBEB', rel: FeedbackRelationship.SELF },
] as const;

type ChartTab = 'radar' | 'bar' | 'gap';

const fmtScore = (v: unknown) =>
  typeof v === 'number' ? v.toFixed(2) : 'N/A';

// ── Helpers ────────────────────────────────────────────────────────────────────

function avg(scores: CategoryScore[]): number | null {
  if (!scores || scores.length === 0) return null;
  const s = scores.reduce((sum, c) => sum + c.averageScore, 0);
  return Math.round((s / scores.length) * 100) / 100;
}

function buildRadarData(summary: FeedbackSummaryResponse) {
  const cats = new Set([
    ...summary.managerScores.map((c) => c.categoryName),
    ...summary.peerScores.map((c) => c.categoryName),
    ...summary.subordinateScores.map((c) => c.categoryName),
    ...summary.selfScores.map((c) => c.categoryName),
  ]);
  const byName = (arr: CategoryScore[], name: string) =>
    arr.find((c) => c.categoryName === name)?.averageScore ?? null;
  return Array.from(cats).map((cat) => ({
    category: cat,
    Manager: byName(summary.managerScores, cat),
    Peer: byName(summary.peerScores, cat),
    Subordinate: byName(summary.subordinateScores, cat),
    Self: byName(summary.selfScores, cat),
  }));
}

function buildBarData(summary: FeedbackSummaryResponse) {
  return summary.scores.map((c) => ({
    category: c.categoryName,
    Overall: Math.round(c.averageScore * 100) / 100,
  }));
}

// ── Score card ─────────────────────────────────────────────────────────────────

const ScoreCard = ({
  label, color, bg, score, naReason,
}: { label: string; color: string; bg: string; score: number | null; naReason?: string }) => (
  <div
    title={score === null && naReason ? naReason : undefined}
    style={{ ...panel, background: bg, border: `0.5px solid ${color}22`, textAlign: 'center', flex: '1 1 130px' }}
  >
    <p style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
      {label}
    </p>
    {score !== null ? (
      <>
        <p style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{score.toFixed(2)}</p>
        <p style={{ fontSize: 11, color: '#9EA3B0', marginTop: 4 }}>/ 100.00</p>
      </>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <p style={{ fontSize: 13, color: '#9EA3B0', margin: 0 }}>N/A</p>
        {naReason && <Info size={13} color="#9EA3B0" />}
      </div>
    )}
  </div>
);

// ── Participation strip ────────────────────────────────────────────────────────

const REL_LABEL: Record<string, string> = {
  DIRECT_MANAGER: 'Manager',
  PEER: 'Peers',
  SUBORDINATE: 'Subordinates',
  SELF: 'Self',
};

const ParticipationStrip = ({ stats }: { stats: ParticipationStat[] }) => (
  <div style={{
    display: 'flex', flexWrap: 'wrap', gap: 12,
    padding: '10px 14px', background: '#F5F6F8',
    borderRadius: 8, marginBottom: 16,
  }}>
    {stats.map((s) => (
      <div key={s.relationship} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#5A6070' }}>
          {REL_LABEL[s.relationship] ?? s.relationship}{' '}
          <span style={{ color: '#111827' }}>{s.submitted}/{s.requested}</span>
        </span>
        {s.suppressed && (
          <span style={{ fontSize: 10, color: '#9EA3B0' }}>
            (comments hidden — fewer than minimum required)
          </span>
        )}
      </div>
    ))}
  </div>
);

// ── Anonymous chip ─────────────────────────────────────────────────────────────

const AnonymousChip = () => (
  <span
    aria-label="This comment is anonymous"
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
      background: '#F5F6F8', color: '#5A6070',
    }}
  >
    <Lock size={9} /> Anonymous
  </span>
);

// ── Gap bar ────────────────────────────────────────────────────────────────────

const GapRow = ({ item }: { item: CategoryGap }) => {
  const highlight = item.gap !== null && Math.abs(item.gap) >= 1.0;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto auto auto',
      alignItems: 'center', gap: 12, padding: '8px 10px',
      background: highlight ? '#FFFBEB' : '#FAFBFC',
      border: `0.5px solid ${highlight ? '#FDE68A' : '#E4E6EC'}`,
      borderRadius: 8, marginBottom: 6,
    }}>
      <span style={{ fontSize: 13, color: '#111827', fontWeight: highlight ? 600 : 400 }}>
        {item.categoryName}
        {highlight && (
          <span style={{ fontSize: 10, marginLeft: 6, color: '#D97706', fontWeight: 600 }}>
            Blind spot
          </span>
        )}
      </span>
      <span style={{ fontSize: 12, color: '#1A56DB', whiteSpace: 'nowrap' }}>
        Self: {item.selfScore !== null ? item.selfScore.toFixed(2) : 'N/A'}
      </span>
      <span style={{ fontSize: 12, color: '#5A6070', whiteSpace: 'nowrap' }}>
        Others: {item.othersScore !== null ? item.othersScore.toFixed(2) : 'N/A'}
      </span>
      <span style={{
        fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
        color: item.gap === null ? '#9EA3B0' : item.gap > 0 ? '#059669' : '#EF4444',
      }}>
        {item.gap !== null ? `${item.gap > 0 ? '+' : ''}${item.gap.toFixed(2)}` : '—'}
      </span>
    </div>
  );
};

// ── Tab button ─────────────────────────────────────────────────────────────────

const TabBtn = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '6px 12px', fontSize: 12,
      fontWeight: active ? 600 : 400,
      color: active ? '#1A56DB' : '#5A6070',
      background: active ? '#EEF3FD' : 'transparent',
      border: 'none', borderRadius: 6, cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

// ── ExpandableSubmissionCard ───────────────────────────────────────────────────

const REL_CARD_LABEL: Record<string, string> = {
  SELF: 'Self',
  DIRECT_MANAGER: 'Direct Manager',
  PEER: 'Peer',
  SUBORDINATE: 'Subordinate',
};
const REL_CARD_COLOR: Record<string, string> = {
  SELF: '#D97706',
  DIRECT_MANAGER: '#1A56DB',
  PEER: '#7C3AED',
  SUBORDINATE: '#059669',
};

const ExpandableSubmissionCard = ({ submission }: { submission: FeedbackDetailsResponse }) => {
  const [expanded, setExpanded] = useState(false);
  const rel = submission.relationship ?? '';
  const color = REL_CARD_COLOR[rel] ?? '#5A6070';
  return (
    <div style={{ border: '0.5px solid #E4E6EC', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#FAFBFC', cursor: 'pointer', flexWrap: 'wrap' }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', background: `${color}18`, color, letterSpacing: '0.04em' }}>
          {REL_CARD_LABEL[rel] ?? rel}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1 }}>
          {submission.evaluatorName ?? '—'}
        </span>
        {submission.averageScore != null && (
          <span style={{ fontSize: 12, color: '#D97706', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Star size={11} fill="#D97706" />{Number(submission.averageScore).toFixed(2)}
          </span>
        )}
        <ChevronDown size={14} color="#9EA3B0" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      {expanded && (
        <div style={{ padding: '12px 14px', borderTop: '0.5px solid #E4E6EC' }}>
          {submission.responses.map((r) => (
            <div key={r.questionId} style={{ padding: '8px 0', borderBottom: '0.5px solid #F0F2F8' }}>
              <p style={{ fontSize: 12, color: '#5A6070', margin: 0 }}>{r.questionText}</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                {r.score != null && (
                  <span style={{ fontSize: 12, color: '#D97706', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Star size={11} fill="#D97706" />{r.score}/5
                  </span>
                )}
                {r.comment && (
                  <span style={{ fontSize: 12, color: '#374151', fontStyle: 'italic' }}>"{r.comment}"</span>
                )}
              </div>
            </div>
          ))}
          {submission.overallComment && (
            <div style={{ marginTop: 10, padding: '8px 10px', background: '#F5F6F8', borderRadius: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase' }}>Overall comment</span>
              <p style={{ fontSize: 13, color: '#374151', margin: '4px 0 0' }}>{submission.overallComment}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── CategoryAverageTable ───────────────────────────────────────────────────────

const CategoryAverageTable = ({ rows }: { rows: CategoryScore[] }) => (
  <div style={{ overflowX: 'auto', marginBottom: 12 }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #E4E6EC' }}>
          <th style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 600, color: '#5A6070', textTransform: 'uppercase', fontSize: 11 }}>Category</th>
          <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 600, color: '#5A6070', textTransform: 'uppercase', fontSize: 11 }}>Avg Score</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.categoryName} style={{ background: i % 2 === 0 ? '#FAFBFC' : '#FFFFFF', borderBottom: '0.5px solid #F0F2F8' }}>
            <td style={{ padding: '6px 8px', color: '#111827' }}>{r.categoryName}</td>
            <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600, color: '#1A56DB' }}>{r.averageScore.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── AnonymousCommentList ───────────────────────────────────────────────────────

const AnonymousCommentList = ({ comments }: { comments: string[] }) => (
  <div>
    <p style={{ fontSize: 11, color: '#9EA3B0', marginBottom: 8 }}>
      Comments are shuffled to protect anonymity. No name or order is shown.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {comments.map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#FAFBFC', border: '0.5px solid #E4E6EC', borderRadius: 8, padding: '10px 12px' }}>
          <MessageSquare size={12} color="#9EA3B0" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{c}</p>
        </div>
      ))}
    </div>
  </div>
);

// ── PooledSection ──────────────────────────────────────────────────────────────

const PooledSection = ({
  title, pool, accentColor,
}: {
  title: string;
  pool: PooledFeedbackSection | null | undefined;
  accentColor: string;
}) => (
  <div style={panel}>
    <p style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 6 }}>
      <Users size={15} color={accentColor} />
      {title}
      <span style={{ fontSize: 12, fontWeight: 400, color: '#9EA3B0', marginLeft: 4 }}>
        ({pool?.submissionCount ?? 0} submission{(pool?.submissionCount ?? 0) !== 1 ? 's' : ''})
      </span>
    </p>
    {!pool || pool.suppressed ? (
      <SuppressionNotice message={pool?.suppressionMessage} />
    ) : (
      <>
        {pool.averages && pool.averages.length > 0 && (
          <CategoryAverageTable rows={pool.averages} />
        )}
        {pool.shuffledComments && pool.shuffledComments.length > 0 ? (
          <AnonymousCommentList comments={pool.shuffledComments} />
        ) : (
          <p style={{ fontSize: 13, color: '#9EA3B0' }}>No comments submitted.</p>
        )}
      </>
    )}
  </div>
);

// ── Main page ──────────────────────────────────────────────────────────────────

const Feedback360ReportPage = () => {
  const { empId } = useParams<{ empId?: string }>();
  const { user, activeCycleId, isAdmin, isHR, isManager } = useAuth();
  const [chartTab, setChartTab] = useState<ChartTab>('radar');
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);

  const { data: cycles = [], isLoading: cyclesLoading } = useGetCyclesQuery();

  // Initialize selectedCycleId with activeCycleId or the most recent cycle
  React.useEffect(() => {
    if (selectedCycleId === null && !cyclesLoading) {
      if (activeCycleId) {
        setSelectedCycleId(activeCycleId);
      } else if (cycles.length > 0) {
        // Sort by id descending (assuming higher id is newer)
        const sortedCycles = [...cycles].sort((a, b) => b.cycleId - a.cycleId);
        setSelectedCycleId(sortedCycles[0].cycleId);
      }
    }
  }, [activeCycleId, cycles, cyclesLoading, selectedCycleId]);

  const targetId = empId ? Number(empId) : user?.id;
  const isOwnReport = !empId || Number(empId) === user?.id;

  // Access check: must be self, HR, admin, or manager viewing team
  const canView = isOwnReport || isAdmin || isHR || isManager;

  const { data: summary, isLoading, isError, error } = useGetFeedbackSummaryQuery(
    { targetUserId: targetId!, cycleId: selectedCycleId! },
    { skip: !targetId || !selectedCycleId || !canView },
  );

  const { data: individualSubmissions = [] } = useGetReceivedFeedbackQuery(
    { employeeId: targetId!, cycleId: selectedCycleId! },
    { skip: !targetId || !selectedCycleId || !canView },
  );

  const [downloadReport, { isLoading: isDownloading }] = useDownloadReportMutation();

  if (!canView) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: 10, color: '#791F1F' }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: 14 }}>You do not have permission to view this report.</span>
        </div>
      </div>
    );
  }

  if (!selectedCycleId && !cyclesLoading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: 10, color: '#9EA3B0' }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: 14 }}>No feedback cycles found.</span>
        </div>
      </div>
    );
  }

  if (isLoading || cyclesLoading) {
    return (
      <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 8, color: '#9EA3B0' }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 14 }}>Loading report…</span>
      </div>
    );
  }

  const isPendingRelease = error && 'status' in error && error.status === 403;
  const pendingReleaseMessage = (error && 'data' in error && (error.data as any)?.message)
    || 'Your 360° Feedback Report is currently under review by the calibration committee. It will be released once the appraisal cycle is finalized.';

  const renderCycleSelector = () => (
    <select
      value={selectedCycleId ?? ''}
      onChange={(e) => setSelectedCycleId(Number(e.target.value))}
      style={{
        padding: '6px 32px 6px 12px',
        fontSize: 13,
        color: '#4B5563',
        background: '#F9FAFB',
        border: '1px solid #D1D5DB',
        borderRadius: 6,
        outline: 'none',
        appearance: 'none',
        backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 6px center',
        backgroundSize: 14,
        cursor: 'pointer'
      }}
    >
      {cycles.map(c => (
        <option key={c.cycleId} value={c.cycleId}>
          {c.cycleName} {c.isActive ? '(Active)' : '(Archived)'}
        </option>
      ))}
    </select>
  );

  const renderHeader = (isSummaryValid: boolean) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
          {isOwnReport ? 'My 360° Feedback Report' : `${summary?.targetUserName || 'Employee'}'s 360° Report`}
        </h1>
        <div style={{ marginTop: 8 }}>
          {renderCycleSelector()}
        </div>
      </div>
      {isSummaryValid && summary && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {summary.calibratedFinalScore != null && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: '#EEF3FD', color: '#1A56DB', border: '0.5px solid #BFCFFA',
            }}>
              Calibrated by manager
            </span>
          )}
          {summary.isFinalized && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: '#ECFDF5', color: '#059669', border: '0.5px solid #A7F3D0',
            }}>
              Finalized{summary.finalizedAt ? ` · ${format(parseISO(summary.finalizedAt), 'dd MMM yyyy')}` : ''}
            </span>
          )}
          <button
            onClick={async () => {
              try {
                await downloadReport({
                  endpoint: 'feedback-360',
                  params: { targetUserId: targetId, cycleId: selectedCycleId },
                  fileName: `Feedback_360_Report_${summary?.targetUserName || 'Employee'}.pdf`
                }).unwrap();
              } catch (err) {
                toast.error('Failed to download individual 360 feedback report PDF.');
              }
            }}
            disabled={isDownloading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 600,
              color: '#FFFFFF',
              background: isDownloading ? '#9EA3B0' : '#1A56DB',
              border: 'none',
              borderRadius: 6,
              cursor: isDownloading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isDownloading) e.currentTarget.style.background = '#1E429F';
            }}
            onMouseLeave={(e) => {
              if (!isDownloading) e.currentTarget.style.background = '#1A56DB';
            }}
          >
            {isDownloading ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <FileText size={14} />
            )}
            {isDownloading ? 'Downloading...' : 'Download PDF Report'}
          </button>
        </div>
      )}
    </div>
  );

  if (isPendingRelease) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {renderHeader(false)}
        <div style={{
          padding: 40,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}>
          <div style={{
            ...panel,
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
            padding: '40px 32px',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
            border: '1px solid rgba(228, 230, 236, 0.8)',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
            }}>
              <Lock size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>
                Report Under Calibration
              </h2>
              <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.5, margin: 0 }}>
                {pendingReleaseMessage}
              </p>
            </div>
            <div style={{
              fontSize: 12,
              color: '#9CA3AF',
              background: '#F9FAFB',
              padding: '10px 16px',
              borderRadius: 8,
              width: '100%',
              boxSizing: 'border-box',
            }}>
              Discussed calibration reviews are confidential until officially locked by HR.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {renderHeader(false)}
        <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: 10, color: '#791F1F' }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: 14 }}>
            {isError ? 'Failed to load feedback report.' : 'No feedback report available for the selected cycle.'}
          </span>
        </div>
      </div>
    );
  }

  const radarData = buildRadarData(summary);
  const barData = buildBarData(summary);
  const radarEmpty = radarData.every(
    (r) => r.Manager == null && r.Peer == null && r.Subordinate == null && r.Self == null,
  );
  const presentKeys = SCORE_CARDS.filter((c) => summary[c.key] && summary[c.key].length > 0);

  const displayScore = summary.calibratedFinalScore ?? summary.totalAverageScore;
  const isCalibrated = summary.calibratedFinalScore != null;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Universal Header */}
      {renderHeader(true)}

      {/* Participation strip */}
      {summary.participation && summary.participation.length > 0 && (
        <ParticipationStrip stats={summary.participation} />
      )}

      {/* Score cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {SCORE_CARDS.map((c) => {
          const score = avg(summary[c.key]);
          let naReason: string | undefined;
          if (score === null) {
            if (c.rel === FeedbackRelationship.DIRECT_MANAGER) naReason = 'L04 employees have no upward manager — weight redistributed across peer and subordinate.';
            if (c.rel === FeedbackRelationship.SUBORDINATE) naReason = 'No subordinates — weight redistributed across manager and peer.';
          }
          return <ScoreCard key={c.key} label={c.label} color={c.color} bg={c.bg} score={score} naReason={naReason} />;
        })}

        {/* Overall */}
        <div style={{ ...panel, background: '#F5F6F8', border: '0.5px solid #E4E6EC', textAlign: 'center', flex: '1 1 130px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Overall
          </p>
          <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
            {displayScore.toFixed(2)}
          </p>
          {isCalibrated && (
            <p style={{ fontSize: 11, color: '#9EA3B0', marginTop: 4 }}>
              Pre-calibration: {summary.totalAverageScore.toFixed(2)}
            </p>
          )}
          {!isCalibrated && <p style={{ fontSize: 11, color: '#9EA3B0', marginTop: 4 }}>/ 100.00</p>}
        </div>
      </div>

      {/* Manager Summary panel */}
      {summary.managerSummary && (
        <div style={panel}>
          <p style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={15} color="#5A6070" />
            Manager Summary
          </p>
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0 }}>
            {summary.managerSummary}
          </p>
          {summary.finalizedBy && (
            <p style={{ fontSize: 11, color: '#9EA3B0', marginTop: 8 }}>
              Written by {summary.finalizedBy}
            </p>
          )}
        </div>
      )}

      {/* Charts */}
      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={sectionTitle}>Score Breakdown</p>
          <div style={{ display: 'flex', gap: 4 }}>
            <TabBtn active={chartTab === 'radar'} onClick={() => setChartTab('radar')}>
              <Users size={12} /> Radar
            </TabBtn>
            <TabBtn active={chartTab === 'bar'} onClick={() => setChartTab('bar')}>
              <BarChart3 size={12} /> Bar
            </TabBtn>
            {summary.selfVsOthersGap && summary.selfVsOthersGap.length > 0 && (
              <TabBtn active={chartTab === 'gap'} onClick={() => setChartTab('gap')}>
                <TrendingUp size={12} /> Gap Analysis
              </TabBtn>
            )}
          </div>
        </div>

        {chartTab === 'radar' && !radarEmpty && radarData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#E4E6EC" />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: '#5A6070' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9EA3B0' }} />
              {presentKeys.map((c) => (
                <Radar
                  key={c.label}
                  name={c.label}
                  dataKey={c.label}
                  stroke={c.color}
                  fill={c.color}
                  fillOpacity={0.1}
                  dot={false}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: '0.5px solid #E4E6EC', borderRadius: 8 }}
                formatter={fmtScore}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : chartTab === 'bar' && barData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 4, right: 16, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F8" />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#5A6070' }} angle={-30} textAnchor="end" interval={0} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9EA3B0' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: '0.5px solid #E4E6EC', borderRadius: 8 }}
                formatter={fmtScore}
              />
              <Bar dataKey="Overall" radius={[4, 4, 0, 0]} barSize={32}>
                {barData.map((_, i) => (
                  <Cell key={i} fill="#1A56DB" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : chartTab === 'gap' && summary.selfVsOthersGap && summary.selfVsOthersGap.length > 0 ? (
          <div>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginBottom: 12 }}>
              Rows highlighted in amber have a gap ≥ 1.0 — potential blind spots or over-modesty signals.
            </p>
            {summary.selfVsOthersGap.map((item) => (
              <GapRow key={item.categoryName} item={item} />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: '#9EA3B0', textAlign: 'center', padding: '32px 0' }}>
            No score data available.
          </p>
        )}
      </div>

      {/* Category details table */}
      {summary.scores.length > 0 && (
        <div style={panel}>
          <p style={sectionTitle}>Category Scores</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E4E6EC' }}>
                  {['Category', 'Manager', 'Peer', 'Sub.', 'Self', 'Weighted'].map((h) => (
                    <th key={h} style={{
                      textAlign: h === 'Category' ? 'left' : 'right',
                      padding: '6px 8px', fontWeight: 600, color: '#5A6070', fontSize: 11, textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.scores.map((row, i) => {
                  const getScore = (arr: CategoryScore[]) =>
                    arr.find((c) => c.categoryName === row.categoryName)?.averageScore ?? null;
                  return (
                    <tr key={row.categoryName} style={{ background: i % 2 === 0 ? '#FAFBFC' : '#FFFFFF', borderBottom: '0.5px solid #F0F2F8' }}>
                      <td style={{ padding: '8px 8px', color: '#111827', fontWeight: 500 }}>{row.categoryName}</td>
                      {[summary.managerScores, summary.peerScores, summary.subordinateScores, summary.selfScores].map((arr, j) => {
                        const s = getScore(arr);
                        return (
                          <td key={j} style={{ textAlign: 'right', padding: '8px 8px', color: s !== null ? '#111827' : '#9EA3B0' }}>
                            {s !== null ? s.toFixed(2) : '—'}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'right', padding: '8px 8px', fontWeight: 600, color: '#1A56DB' }}>
                        {row.averageScore.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comments */}
      {summary.detailedComments.length > 0 && (
        <div style={panel}>
          <p style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={15} color="#5A6070" />
            Feedback Comments
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {summary.detailedComments.map((c, i) => {
              const isAnon = c.evaluatorName === 'Anonymous';
              return (
                <div key={i} style={{
                  background: '#FAFBFC', border: '0.5px solid #E4E6EC',
                  borderRadius: 8, padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase' }}>
                      {c.categoryName}
                    </span>
                    {isAnon ? (
                      <AnonymousChip />
                    ) : (
                      <span style={{ fontSize: 11, color: '#374151' }}>{c.evaluatorName}</span>
                    )}
                    {c.score !== null && (
                      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#D97706' }}>
                        <Star size={11} fill="#D97706" />
                        {c.score.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{c.comment}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual Submissions — Manager + Self only (peers/subordinates filtered by backend) */}
      {individualSubmissions.length > 0 && (
        <div style={panel}>
          <p style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={15} color="#5A6070" />
            Individual Submissions
          </p>
          {individualSubmissions.map((sub) => (
            <ExpandableSubmissionCard key={sub.feedbackId} submission={sub} />
          ))}
        </div>
      )}

      {/* Pooled Peer Feedback */}
      <PooledSection
        title="Peer Feedback"
        pool={summary.pooledPeerFeedback}
        accentColor="#7C3AED"
      />

      {/* Pooled Subordinate Feedback */}
      <PooledSection
        title="Subordinate Feedback"
        pool={summary.pooledSubordinateFeedback}
        accentColor="#059669"
      />
    </div>
  );
};

export default Feedback360ReportPage;
