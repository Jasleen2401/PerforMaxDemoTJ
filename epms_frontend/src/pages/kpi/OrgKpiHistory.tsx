import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useGetCyclesQuery } from '../../features/appraisal/appraisalApi';
import {
  useGetOrgKpiHistoryQuery,
  useGetTeamKpiHistoryQuery,
} from '../../services/kpiAuditApi';
import OrgKpiSummaryStrip from '../../components/kpi/OrgKpiSummaryStrip';
import KpiAuditLogTable from '../../components/kpi/KpiAuditLogTable';
import { ChevronLeft, Calendar, ShieldAlert } from 'lucide-react';

const ACTIONS = [
  { label: 'All Actions', value: '' },
  { label: 'Phase Opened', value: 'PHASE_OPENED' },
  { label: 'Phase Closed', value: 'PHASE_CLOSED' },
  { label: 'Phase Locked', value: 'PHASE_LOCKED' },
  { label: 'KPI Assigned', value: 'KPI_ASSIGNED' },
  { label: 'KPI Approved', value: 'KPI_APPROVED' },
  { label: 'KPI Reverted', value: 'KPI_REVERTED' },
  { label: 'KPI Locked', value: 'KPI_LOCKED' },
  { label: 'KPI Added', value: 'KPI_ADDED' },
  { label: 'KPI Revised', value: 'KPI_REVISED' },
  { label: 'KPI Deleted', value: 'KPI_DELETED' },
  { label: 'Mid-Cycle Event', value: 'MID_CYCLE_EVENT' },
];

const OrgKpiHistory: React.FC = () => {
  const navigate = useNavigate();
  const { isHR, isAdmin, isManager, activeCycleId } = useAuth();

  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>(undefined);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [size] = useState<number>(20);

  const { data: cycles = [], isLoading: isLoadingCycles } = useGetCyclesQuery();

  // Set default cycle to activeCycleId once loaded
  useEffect(() => {
    if (selectedCycleId === undefined) {
      if (activeCycleId) {
        setSelectedCycleId(activeCycleId);
      } else if (cycles.length > 0) {
        setSelectedCycleId(cycles[0].cycleId);
      }
    }
  }, [activeCycleId, cycles, selectedCycleId]);

  const isHrOrAdmin = isHR || isAdmin;
  const isAuthorized = isHrOrAdmin || isManager;

  // Conditional RTK Query calls based on role
  const {
    data: orgHistoryData,
    isLoading: isLoadingOrg,
    isError: isErrorOrg,
  } = useGetOrgKpiHistoryQuery(
    {
      cycleId: selectedCycleId ?? 0,
      action: selectedAction || undefined,
      page,
      size,
    },
    {
      skip: !isHrOrAdmin || !selectedCycleId,
    }
  );

  const {
    data: teamHistoryData,
    isLoading: isLoadingTeam,
    isError: isErrorTeam,
  } = useGetTeamKpiHistoryQuery(
    {
      cycleId: selectedCycleId ?? 0,
      action: selectedAction || undefined,
      page,
      size,
    },
    {
      skip: isHrOrAdmin || !isManager || !selectedCycleId,
    }
  );

  const historyData = isHrOrAdmin ? orgHistoryData : teamHistoryData;
  const isLoadingHistory = isHrOrAdmin ? isLoadingOrg : isLoadingTeam;
  const isErrorHistory = isHrOrAdmin ? isErrorOrg : isErrorTeam;

  if (!isAuthorized) {
    return (
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: 48, textAlign: 'center', marginTop: 24 }}>
        <ShieldAlert size={48} style={{ color: '#DC2626', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Access Denied</h2>
        <p style={{ fontSize: 13, color: '#5A6070', marginBottom: 16 }}>You do not have the required permissions to view the KPI Audit History.</p>
        <button
          onClick={() => navigate('/kpi')}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 8,
            background: '#1A56DB',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Go back to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/kpi')}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '0.5px solid #E4E6EC',
            borderRadius: 8,
            background: '#FFFFFF',
            color: '#5A6070',
            flexShrink: 0,
          }}
          className="hover:bg-[#F5F6F8] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>
            {isHrOrAdmin ? 'Organization KPI History & Audit Trail' : 'Team KPI History & Audit Trail'}
          </h1>
          <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 1 }}>
            Track and audit all changes, additions, and status transitions for KPI goal sets.
          </p>
        </div>
      </div>

      {/* Filter and Selection Card */}
      <div
        style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px' }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Cycle Dropdown */}
          <div className="relative" style={{ minWidth: 240 }}>
            <Calendar size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
            <select
              value={selectedCycleId ?? ''}
              onChange={(e) => {
                setSelectedCycleId(Number(e.target.value));
                setPage(0);
              }}
              style={{
                width: '100%',
                padding: '8px 32px 8px 12px',
                fontSize: 12,
                borderRadius: 8,
                border: '0.5px solid #E4E6EC',
                outline: 'none',
                background: '#FFFFFF',
                color: '#374151',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              {isLoadingCycles ? (
                <option value="">Loading cycles...</option>
              ) : (
                cycles.map((c) => (
                  <option key={c.cycleId} value={c.cycleId}>
                    Cycle: {c.cycleName}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Action Dropdown */}
          <div className="relative" style={{ minWidth: 180 }}>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(0);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 12,
                borderRadius: 8,
                border: '0.5px solid #E4E6EC',
                outline: 'none',
                background: '#FFFFFF',
                color: '#374151',
                cursor: 'pointer',
              }}
            >
              {ACTIONS.map((act) => (
                <option key={act.value} value={act.value}>
                  {act.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0' }}>
          Scope: <span style={{ color: '#1A56DB' }}>{isHrOrAdmin ? 'Org-Wide' : 'Team Direct Reports'}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <OrgKpiSummaryStrip summary={historyData?.data?.summary} />

      {/* Audit Log Table */}
      <KpiAuditLogTable
        logs={historyData?.data?.logs ?? []}
        isLoading={isLoadingHistory}
        isError={isErrorHistory}
        page={page}
        size={size}
        totalElements={historyData?.data?.totalElements ?? 0}
        onPageChange={(newPage) => setPage(newPage)}
      />
    </div>
  );
};

export default OrgKpiHistory;
