import type React from 'react';
import { AlertCircle, BarChart3, CheckCircle2, Clock, FileText, Loader2, Mail, Users } from 'lucide-react';
import { useGetFeedbackCycleDashboardQuery } from '../../../features/feedback360/feedback360Api';
import { panel, sectionTitle } from '../constants/styles';

interface CycleDashboardTabProps {
  cycleId: number;
}

const CycleDashboardTab = ({ cycleId }: CycleDashboardTabProps) => {
  const { data: dashboard, isLoading, error } = useGetFeedbackCycleDashboardQuery(cycleId, { skip: !cycleId });

  if (!cycleId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9EA3B0', fontSize: 13, padding: '20px 0' }}>
        <AlertCircle size={15} /> Select a Cycle above to view the dashboard.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9EA3B0', padding: '24px 0' }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13 }}>Loading cycle dashboard metrics…</span>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#EF4444', fontSize: 13, padding: '20px 0' }}>
        <AlertCircle size={15} /> Failed to load cycle dashboard metrics. Make sure feedback requests are generated for this cycle.
      </div>
    );
  }

  const statCard = (title: string, value: string | number, sub: string, icon: React.ReactNode, bg: string, color: string) => (
    <div style={{
      ...panel, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 10, flex: 1, minWidth: 160
    }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 500, color: '#5A6070', margin: '0 0 6px 0' }}>{title}</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>{value}</p>
        <p style={{ fontSize: 11, color: '#9EA3B0', margin: '4px 0 0 0' }}>{sub}</p>
      </div>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
        {icon}
      </div>
    </div>
  );

  const getRelationshipColor = (rel: string) => {
    switch (rel) {
      case 'DIRECT_MANAGER': return '#1A56DB';
      case 'PEER': return '#7C3AED';
      case 'SUBORDINATE': return '#059669';
      case 'SELF': return '#D97706';
      default: return '#5A6070';
    }
  };

  const formatRelName = (rel: string) => {
    return rel.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stat Cards Grid */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {statCard(
          'Submission Rate',
          `${dashboard.submissionRate}%`,
          'Overall completion rate',
          <BarChart3 size={18} />,
          '#EEF3FD',
          '#1A56DB'
        )}
        {statCard(
          'Total Requests',
          dashboard.totalRequests,
          'Total feedback slots assigned',
          <FileText size={18} />,
          '#F3F4F6',
          '#374151'
        )}
        {statCard(
          'Completed Feedback',
          dashboard.submittedRequests,
          'Submitted responses',
          <CheckCircle2 size={18} />,
          '#ECFDF5',
          '#059669'
        )}
        {statCard(
          'Overdue Requests',
          dashboard.overdueRequests,
          'Past due date requests',
          <Clock size={18} />,
          dashboard.overdueRequests > 0 ? '#FEF2F2' : '#F9FAFB',
          dashboard.overdueRequests > 0 ? '#DC2626' : '#9EA3B0'
        )}
        {statCard(
          'Pending / In Progress',
          dashboard.pendingRequests,
          'On schedule requests',
          <Loader2 size={18} style={{ animation: dashboard.pendingRequests > 0 ? 'spin 2s linear infinite' : 'none' }} />,
          '#FFFBEB',
          '#D97706'
        )}
        {statCard(
          'Target Employees',
          dashboard.totalTargets,
          'Receiving feedback',
          <Users size={18} />,
          '#F5F3FF',
          '#7C3AED'
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Left Side: Relationship Submission Rates */}
        <div style={panel}>
          <p style={sectionTitle}>Submission Rate by Relationship</p>
          {Object.keys(dashboard.relationshipRates).length === 0 ? (
            <p style={{ fontSize: 13, color: '#9EA3B0', margin: 0 }}>No relationship submission stats available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(dashboard.relationshipRates).map(([rel, rate]) => {
                const color = getRelationshipColor(rel);
                return (
                  <div key={rel} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500 }}>
                      <span style={{ color: '#374151' }}>{formatRelName(rel)}</span>
                      <span style={{ color: color }}>{rate}%</span>
                    </div>
                    <div style={{ height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease-out' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Top Bottlenecks */}
        <div style={panel}>
          <p style={sectionTitle}>Evaluator Bottlenecks</p>
          {dashboard.bottlenecks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', color: '#9EA3B0', gap: 6 }}>
              <CheckCircle2 size={24} color="#059669" />
              <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>No outstanding bottleneck evaluators!</p>
              <p style={{ fontSize: 11, margin: 0 }}>All pending reviews are nicely distributed.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E4E6EC', background: '#FAFBFC' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#5A6070', fontSize: 11, textTransform: 'uppercase' }}>Evaluator</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#5A6070', fontSize: 11, textTransform: 'uppercase' }}>Department</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600, color: '#5A6070', fontSize: 11, textTransform: 'uppercase' }}>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.bottlenecks.map((b) => (
                    <tr key={b.evaluatorId} style={{ borderBottom: '0.5px solid #E4E6EC' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: '#111827' }}>{b.evaluatorName}</span>
                          <span style={{ fontSize: 11, color: '#9EA3B0', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Mail size={10} /> {b.evaluatorEmail}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#5A6070' }}>{b.departmentName}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 12,
                          background: '#FEF2F2', color: '#DC2626', border: '0.5px solid #FEE2E2'
                        }}>
                          {b.pendingCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────

export default CycleDashboardTab;
