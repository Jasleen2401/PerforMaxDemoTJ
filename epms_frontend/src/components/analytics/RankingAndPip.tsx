import { memo, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { DashboardCard, EmptyState, SkeletonBlock } from './DashboardPrimitives';
import { DASHBOARD_COLORS, DASHBOARD_BORDER } from '../../styles/dashboardStyles';
import { formatScore, getTopRows, getUnderRows, isMockEmployee } from '../../utils/reportUtils';
import type { PerformanceRankingReportDTO } from '../../types/report';

const DownloadButton = ({
  label,
  tone = 'plain',
  ariaLabel,
  onClick,
}: {
  label: string;
  tone?: 'primary' | 'success' | 'plain';
  ariaLabel: string;
  onClick: () => void;
}) => {
  const isPrimary = tone === 'primary';
  const isSuccess = tone === 'success';

  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minHeight: 28,
        padding: '4px 10px',
        background: isPrimary ? DASHBOARD_COLORS.primarySoft : isSuccess ? DASHBOARD_COLORS.successSoft : 'transparent',
        color: isPrimary ? DASHBOARD_COLORS.primary : isSuccess ? DASHBOARD_COLORS.success : DASHBOARD_COLORS.subtle,
        border: isPrimary ? `1px solid ${DASHBOARD_COLORS.primaryBorder}` : isSuccess ? `1px solid ${DASHBOARD_COLORS.successBorder}` : 'none',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {isSuccess ? <FileSpreadsheet size={12} /> : isPrimary ? <FileText size={12} /> : <Download size={14} />}
      {label}
    </button>
  );
};

const ReportFormatButtons = ({
  onDownloadPdf,
  onDownloadExcel,
}: {
  onDownloadPdf: () => void;
  onDownloadExcel: () => void;
}) => (
  <div style={{ display: 'flex', gap: 6 }}>
    <DownloadButton label="PDF" tone="primary" ariaLabel="Download PDF report" onClick={onDownloadPdf} />
    <DownloadButton label="Excel" tone="success" ariaLabel="Download Excel report" onClick={onDownloadExcel} />
  </div>
);

export const PerformanceRankingTable = memo(({
  data,
  loading,
  isError,
  pageSize = 5,
}: {
  data?: PerformanceRankingReportDTO[];
  loading: boolean;
  isError?: boolean;
  pageSize?: number;
}) => {
  const [showAll, setShowAll] = useState(false);
  const visibleRows = useMemo(() => {
    const realData = (data || []).filter(r => !isMockEmployee(r.employeeName));
    return showAll ? realData : getTopRows(realData, pageSize);
  }, [data, pageSize, showAll]);

  return (
    <DashboardCard
      className="lg:col-span-6"
      title="Top Performers Leaderboard"
      isError={isError}
      style={{ overflow: 'hidden', padding: 0 }}
    >
      {loading ? <div style={{ padding: 16 }}><SkeletonBlock height={180} /></div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
            <thead>
              <tr style={{ borderBottom: DASHBOARD_BORDER, background: DASHBOARD_COLORS.surfaceAlt }}>
                {['Rank', 'Employee', 'Final Score'].map((heading, index) => (
                  <th key={heading} style={{ padding: '9px 14px', fontSize: 11, fontWeight: 700, color: DASHBOARD_COLORS.subtle, textTransform: 'uppercase', letterSpacing: 0, textAlign: index === 2 ? 'right' : 'left' }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!visibleRows.length ? (
                <tr><td colSpan={3}><EmptyState title="No Top Performers Recorded" body="Top performance rankings will populate once final appraisal scores are submitted for this cycle." /></td></tr>
              ) : visibleRows.map((row) => (
                <tr key={`${row.rank}-${row.employeeName}`} style={{ borderBottom: `1px solid ${DASHBOARD_COLORS.grid}` }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 800, color: DASHBOARD_COLORS.primary }}>#{row.rank}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: DASHBOARD_COLORS.ink }}>{row.employeeName}</div>
                    <div style={{ fontSize: 11, color: DASHBOARD_COLORS.subtle, marginTop: 1 }}>{row.departmentName}</div>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                    <span style={{ padding: '3px 8px', background: DASHBOARD_COLORS.primarySoft, color: DASHBOARD_COLORS.primary, border: `1px solid ${DASHBOARD_COLORS.primaryBorder}`, borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                      {formatScore(row.currentScore, 1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data?.length || 0) > pageSize && (
            <button
              aria-label={showAll ? 'Show top 5' : 'View all performers'}
              onClick={() => setShowAll((value) => !value)}
              style={{ width: '100%', padding: '10px 14px', background: DASHBOARD_COLORS.surface, border: 'none', borderTop: DASHBOARD_BORDER, color: DASHBOARD_COLORS.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {showAll ? 'Show Top 5' : `View All ${data?.length || 0}`}
            </button>
          )}
        </div>
      )}
    </DashboardCard>
  );
});

export const UnderPerformanceRankingTable = memo(({
  data,
  loading,
  isError,
  pageSize = 5,
}: {
  data?: PerformanceRankingReportDTO[];
  loading: boolean;
  isError?: boolean;
  pageSize?: number;
}) => {
  const [showAll, setShowAll] = useState(false);
  const sortedRows = useMemo(() => getUnderRows(data, data?.length || pageSize), [data, pageSize]);
  const visibleRows = useMemo(() => showAll ? sortedRows : sortedRows.slice(0, pageSize), [pageSize, showAll, sortedRows]);

  return (
    <DashboardCard
      className="lg:col-span-6"
      title="Under Performers Leaderboard"
      isError={isError}
      style={{ overflow: 'hidden', padding: 0 }}
    >
      {loading ? <div style={{ padding: 16 }}><SkeletonBlock height={180} /></div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
            <thead>
              <tr style={{ borderBottom: DASHBOARD_BORDER, background: DASHBOARD_COLORS.surfaceAlt }}>
                {['Priority', 'Employee', 'Final Score'].map((heading, index) => (
                  <th key={heading} style={{ padding: '9px 14px', fontSize: 11, fontWeight: 700, color: DASHBOARD_COLORS.subtle, textTransform: 'uppercase', letterSpacing: 0, textAlign: index === 2 ? 'right' : 'left' }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!visibleRows.length ? (
                <tr><td colSpan={3}><EmptyState title="No Under Performers Identified" body="All evaluated employees in this review cycle currently meet or exceed expected performance targets." /></td></tr>
              ) : visibleRows.map((row, index) => (
                <tr key={`under-${row.rank}-${row.employeeName}`} style={{ borderBottom: `1px solid ${DASHBOARD_COLORS.grid}` }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 800, color: DASHBOARD_COLORS.danger }}>#{index + 1}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: DASHBOARD_COLORS.ink }}>{row.employeeName}</div>
                    <div style={{ fontSize: 11, color: DASHBOARD_COLORS.subtle, marginTop: 1 }}>{row.departmentName}</div>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                    <span style={{ padding: '3px 8px', background: DASHBOARD_COLORS.dangerSoft, color: DASHBOARD_COLORS.danger, border: `1px solid ${DASHBOARD_COLORS.dangerBorder}`, borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                      {formatScore(row.currentScore, 1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(sortedRows.length || 0) > pageSize && (
            <button
              aria-label={showAll ? 'Show bottom 5' : 'View all under performers'}
              onClick={() => setShowAll((value) => !value)}
              style={{ width: '100%', padding: '10px 14px', background: DASHBOARD_COLORS.surface, border: 'none', borderTop: DASHBOARD_BORDER, color: DASHBOARD_COLORS.danger, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {showAll ? 'Show Bottom 5' : `View All ${sortedRows.length}`}
            </button>
          )}
        </div>
      )}
    </DashboardCard>
  );
});
