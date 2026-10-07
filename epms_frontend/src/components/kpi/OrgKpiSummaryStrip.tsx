import React from 'react';
import { Activity, FolderOpen, Lock, Edit3, Trash2, Milestone } from 'lucide-react';
import type { OrgKpiHistorySummary } from '../../features/kpi/kpiAuditTypes';

interface OrgKpiSummaryStripProps {
  summary?: OrgKpiHistorySummary;
}

const OrgKpiSummaryStrip: React.FC<OrgKpiSummaryStripProps> = ({ summary }) => {
  const stats = [
    {
      label: 'Total Events',
      value: summary?.totalEvents ?? 0,
      icon: Activity,
      color: '#1A56DB',
      bg: '#EEF3FD',
    },
    {
      label: 'Phases Opened',
      value: summary?.phasesOpened ?? 0,
      icon: FolderOpen,
      color: '#059669',
      bg: '#ECFDF5',
    },
    {
      label: 'Phases Closed',
      value: summary?.phasesClosed ?? 0,
      icon: Lock,
      color: '#7C3AED',
      bg: '#F5F3FF',
    },
    {
      label: 'KPIs Approved',
      value: summary?.kpisApproved ?? 0,
      icon: Edit3,
      color: '#059669',
      bg: '#ECFDF5',
    },
    {
      label: 'KPIs Reverted',
      value: summary?.kpisReverted ?? 0,
      icon: Trash2,
      color: '#D97706',
      bg: '#FEF3C7',
    },
    {
      label: 'Mid-Cycle Events',
      value: summary?.midCycleEvents ?? 0,
      icon: Milestone,
      color: '#2563EB',
      bg: '#EFF6FF',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            style={{
              background: '#FFFFFF',
              border: '0.5px solid #E4E6EC',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: stat.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stat.color,
                flexShrink: 0,
              }}
            >
              <Icon size={16} />
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.2 }}>
                {stat.value}
              </p>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#9EA3B0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  margin: '4px 0 0 0',
                }}
              >
                {stat.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrgKpiSummaryStrip;
