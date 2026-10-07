import type { CSSProperties, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { DASHBOARD_COLORS, dashboardStyles } from '../../styles/dashboardStyles';

interface CardProps {
  title?: string;
  className?: string;
  children: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
  isError?: boolean;
}

export const DashboardCard = ({ title, className, children, action, style, isError }: CardProps) => (
  <section
    className={className}
    style={{ ...dashboardStyles.card, ...style }}
    aria-label={title}
  >
    {title && (
      <div style={dashboardStyles.panelHeader}>
        <span style={dashboardStyles.label}>{title}</span>
        {action}
      </div>
    )}
    {isError ? <ErrorState /> : children}
  </section>
);

export const SkeletonBlock = ({ height = 180 }: { height?: number }) => (
  <div
    aria-busy="true"
    style={{
      height,
      borderRadius: 8,
      background: `linear-gradient(90deg, ${DASHBOARD_COLORS.surfaceAlt}, #FFFFFF, ${DASHBOARD_COLORS.surfaceAlt})`,
      border: `0.5px solid ${DASHBOARD_COLORS.grid}`,
    }}
  />
);

export const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div style={{ textAlign: 'center', padding: '28px 16px', color: DASHBOARD_COLORS.muted }}>
    <AlertCircle size={18} color={DASHBOARD_COLORS.subtle} style={{ margin: '0 auto 8px' }} />
    <p style={{ fontSize: 13, fontWeight: 600, color: DASHBOARD_COLORS.ink }}>{title}</p>
    <p style={{ fontSize: 12, marginTop: 4 }}>{body}</p>
  </div>
);

export const ErrorState = () => (
  <EmptyState title="Unable to load this report" body="Refresh the dashboard or check the selected filters." />
);
