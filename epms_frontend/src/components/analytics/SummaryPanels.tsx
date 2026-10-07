import { AlertCircle, Target } from 'lucide-react';
import { DashboardCard } from './DashboardPrimitives';
import { DASHBOARD_COLORS, DASHBOARD_BORDER } from '../../styles/dashboardStyles';

interface SummaryCardsProps {
  metrics: Array<{ label: string; value: string }>;
}

export const SummaryCards = ({ metrics }: SummaryCardsProps) => (
  <DashboardCard title="Key Metrics" className="lg:col-span-7">
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
      {metrics.map((metric) => (
        <div
          key={metric.label}
          style={{ background: DASHBOARD_COLORS.surfaceAlt, border: DASHBOARD_BORDER, borderRadius: 8, padding: '10px 12px', minWidth: 0 }}
        >
          <p style={{ fontSize: 11, color: DASHBOARD_COLORS.muted, marginBottom: 4 }}>{metric.label}</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: DASHBOARD_COLORS.ink }}>{metric.value}</p>
        </div>
      ))}
    </div>
  </DashboardCard>
);

export const QuickInsights = ({ insights }: { insights: string[] }) => (
  <DashboardCard title="Quick Insights" className="lg:col-span-5">
    <div style={{ display: 'grid', gap: 8 }}>
      {insights.map((insight, index) => (
        <div key={insight} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: DASHBOARD_COLORS.ink, lineHeight: 1.5 }}>
          <AlertCircle size={14} color={index === 0 ? DASHBOARD_COLORS.primary : DASHBOARD_COLORS.subtle} style={{ marginTop: 2, flex: '0 0 auto' }} />
          <span>{insight}</span>
        </div>
      ))}
    </div>
  </DashboardCard>
);

export const SelectCyclePrompt = () => (
  <div style={{ background: DASHBOARD_COLORS.primarySoft, border: `2px dashed ${DASHBOARD_COLORS.primaryBorder}`, borderRadius: 8, padding: '48px 24px', textAlign: 'center' }}>
    <div style={{ width: 48, height: 48, background: DASHBOARD_COLORS.surface, border: `0.5px solid ${DASHBOARD_COLORS.primaryBorder}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
      <Target size={22} color={DASHBOARD_COLORS.primary} />
    </div>
    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0C447C', marginBottom: 6 }}>Select a cycle to view analytics</h3>
    <p style={{ fontSize: 12, color: DASHBOARD_COLORS.muted, maxWidth: 360, margin: '0 auto' }}>
      Choose an active or historical appraisal cycle from the dropdown above to generate performance insights.
    </p>
  </div>
);
