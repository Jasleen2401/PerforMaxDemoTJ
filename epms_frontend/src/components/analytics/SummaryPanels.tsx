import type { ReactNode } from 'react';
import { AlertCircle, Target, CheckCircle2, TrendingUp, Award, Calendar } from 'lucide-react';
import { DashboardCard, SkeletonBlock } from './DashboardPrimitives';
import { DASHBOARD_COLORS, DASHBOARD_BORDER } from '../../styles/dashboardStyles';

export interface SummaryMetricItem {
  label: string;
  value: string;
  sublabel?: string;
  icon?: 'completion' | 'score' | 'goal' | 'status';
  isAvailable?: boolean;
  isLoading?: boolean;
}

interface SummaryCardsProps {
  metrics: SummaryMetricItem[];
}

export const SummaryCards = ({ metrics }: SummaryCardsProps) => {
  const getIcon = (type?: string) => {
    switch (type) {
      case 'completion':
        return <CheckCircle2 size={16} className="text-emerald-600" />;
      case 'score':
        return <TrendingUp size={16} className="text-purple-600" />;
      case 'goal':
        return <Award size={16} className="text-indigo-600" />;
      case 'status':
        return <Calendar size={16} className="text-amber-600" />;
      default:
        return null;
    }
  };

  const getBadgeStyle = (type?: string) => {
    switch (type) {
      case 'completion':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      case 'score':
        return 'bg-purple-50 text-purple-700 border-purple-200/60';
      case 'goal':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
      case 'status':
        return 'bg-amber-50 text-amber-700 border-amber-200/60';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/60';
    }
  };

  return (
    <DashboardCard title="Key Metrics" className="lg:col-span-7">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex flex-col justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/80 transition-colors min-h-[104px]"
          >
            {metric.isLoading ? (
              <SkeletonBlock height={76} />
            ) : (
              <>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    {metric.label}
                  </span>
                  {metric.icon && (
                    <span className={`p-1 rounded-md border text-[10px] shrink-0 ${getBadgeStyle(metric.icon)}`}>
                      {getIcon(metric.icon)}
                    </span>
                  )}
                </div>
                <div>
                  <p className={`text-2xl font-extrabold tracking-tight ${
                    metric.isAvailable === false ? 'text-slate-400 text-xl font-bold' : 'text-slate-900'
                  }`}>
                    {metric.value}
                  </p>
                  {metric.sublabel && (
                    <p className="text-[11px] text-slate-500 font-medium mt-1 truncate" title={metric.sublabel}>
                      {metric.sublabel}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </DashboardCard>
  );
};

export const QuickInsights = ({ insights }: { insights: string[] }) => (
  <DashboardCard title="Quick Insights" className="lg:col-span-5">
    <div className="space-y-2.5">
      {insights.map((insight, index) => (
        <div key={insight} className="flex gap-2.5 items-start text-xs text-slate-700 leading-relaxed">
          <AlertCircle
            size={14}
            className={`mt-0.5 shrink-0 ${index === 0 ? 'text-purple-600' : 'text-slate-400'}`}
          />
          <span className="font-medium">{insight}</span>
        </div>
      ))}
    </div>
  </DashboardCard>
);

export const SelectCyclePrompt = () => (
  <div style={{ background: DASHBOARD_COLORS.primarySoft, border: `2px dashed ${DASHBOARD_COLORS.primaryBorder}`, borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
    <div style={{ width: 48, height: 48, background: DASHBOARD_COLORS.surface, border: `1px solid ${DASHBOARD_COLORS.primaryBorder}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
      <Target size={22} color={DASHBOARD_COLORS.primary} />
    </div>
    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#4C1D95', marginBottom: 6 }}>Select an Appraisal Cycle</h3>
    <p style={{ fontSize: 12, color: DASHBOARD_COLORS.muted, maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
      Choose an active or historical review cycle from the dropdown above to load verified performance outcomes, completion distributions, and goal metrics.
    </p>
  </div>
);
