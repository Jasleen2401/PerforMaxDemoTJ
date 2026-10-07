import React, { useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { AlertCircle, MessageSquare } from 'lucide-react';
import type { KpiHistoryLog } from '../../features/kpi/kpiTypes';
import KpiLogDetailModal from './KpiLogDetailModal';
import { formatRelativeTime } from '../../utils/timeUtils';

interface KpiAuditTableProps {
  logs: KpiHistoryLog[];
  isLoading: boolean;
  isError: boolean;
}

const ACTION_GROUPS: Record<string, (a: string) => boolean> = {
  ALL: () => true,
  PROGRESS: (a: string) => a === 'PROGRESS_UPDATE',
  CHANGES: (a: string) => a.includes('ITEM'),
  STATUS: (a: string) => ['APPROVED', 'LOCKED', 'STATUS_CHANGE'].includes(a),
};

const KpiAuditTable: React.FC<KpiAuditTableProps> = ({ logs, isLoading, isError }) => {
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<'7d' | '30d' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
  const [selectedLog, setSelectedLog] = useState<KpiHistoryLog | null>(null);

  const filteredLogs = useMemo(
    () => {
      const now = new Date();
      const cutoff: Record<string, Date | null> = {
        '7d': subDays(now, 7),
        '30d': subDays(now, 30),
        all: null,
      };
      return logs.filter(
        (l) =>
          ACTION_GROUPS[filterAction](l.action) &&
          (!cutoff[filterDate as keyof typeof cutoff] ||
            new Date(l.createdAt) >= cutoff[filterDate as keyof typeof cutoff]!)
      );
    },
    [logs, filterAction, filterDate]
  );

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const pagedLogs = filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const pageBtnStyle = (disabled: boolean) => ({
    padding: '4px 10px',
    fontSize: 12,
    borderRadius: 6,
    border: '0.5px solid #E0E2E8',
    background: disabled ? '#F5F6F8' : '#FFFFFF',
    color: disabled ? '#C0C4CC' : '#374151',
    cursor: disabled ? 'not-allowed' : 'pointer',
  });

  const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
    PROGRESS_UPDATE: { bg: '#EAF3DE', text: '#27500A' },
    ITEM: { bg: '#EEF3FD', text: '#0C447C' },
    STATUS_CHANGE: { bg: '#FEF3C7', text: '#92400E' },
    APPROVED: { bg: '#EAF3DE', text: '#27500A' },
    LOCKED: { bg: '#F1EFE8', text: '#444441' },
  };

  const truncate = (str: string, len: number) => (str.length > len ? str.slice(0, len) + '…' : str);

  if (isLoading) {
    return (
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#9EA3B0' }}>Loading audit logs…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: 24, textAlign: 'center' }}>
        <AlertCircle size={24} style={{ color: '#E53E3E', margin: '0 auto 8px' }} />
        <p style={{ fontSize: 13, color: '#E53E3E' }}>Failed to load audit logs.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
      {/* Filter Bar */}
      <div style={{ padding: '16px 18px', background: '#FAFBFF', borderBottom: '0.5px solid #E4E6EC' }}>
        <div className="flex flex-col gap-3">
          {/* Action Chips */}
          <div className="flex flex-wrap gap-2">
            {Object.keys(ACTION_GROUPS).map((key) => (
              <button
                key={key}
                onClick={() => { setFilterAction(key); setCurrentPage(1); }}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  background: filterAction === key ? '#1A56DB' : '#F0F2F6',
                  color: filterAction === key ? '#FFFFFF' : '#5A6070',
                  border: filterAction === key ? 'none' : '0.5px solid #E0E2E8',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                className="hover:opacity-80"
              >
                {key === 'ALL'
                  ? 'All'
                  : key === 'PROGRESS'
                    ? 'Progress Updates'
                    : key === 'CHANGES'
                      ? 'Goal Changes'
                      : 'Status Events'}
              </button>
            ))}
          </div>

          {/* Date Presets + Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(['7d', '30d', 'all'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => { setFilterDate(preset); setCurrentPage(1); }}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 500,
                    background: filterDate === preset ? '#D1E0FF' : '#F0F2F6',
                    color: filterDate === preset ? '#1A56DB' : '#5A6070',
                    border: '0.5px solid #E0E2E8',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  className="hover:opacity-80"
                >
                  {preset === '7d' ? 'Last 7 days' : preset === '30d' ? 'Last 30 days' : 'All time'}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, background: '#EEF3FD', color: '#1A56DB', borderRadius: 10, padding: '2px 8px', whiteSpace: 'nowrap' }}>
              {filteredLogs.length} event{filteredLogs.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredLogs.length === 0 ? (
        <div style={{ padding: '32px 18px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#9EA3B0' }}>No events match the current filter.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F6F8', borderBottom: '0.5px solid #E4E6EC' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9EA3B0', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 1, background: '#F5F6F8' }}>
                  Action
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9EA3B0', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 1, background: '#F5F6F8' }}>
                  Date
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9EA3B0', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 1, background: '#F5F6F8' }}>
                  Summary
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#9EA3B0', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 1, background: '#F5F6F8' }}>
                  Note
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedLogs.map((log, idx) => {
                const actionKey = log.action.includes('ITEM') ? 'ITEM' : log.action;
                const ac = ACTION_COLORS[actionKey] || { bg: '#EEF3FD', text: '#0C447C' };
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    style={{
                      borderBottom: idx < filteredLogs.length - 1 ? '0.5px solid #F0F2F6' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    className="hover:bg-[#FAFBFF]"
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 500,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: ac.bg,
                          color: ac.text,
                          borderRadius: 4,
                          padding: '2px 6px',
                        }}
                      >
                        {log.action.replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#5A6070', whiteSpace: 'nowrap' }}>
                      {formatRelativeTime(log.createdAt)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#111827', maxWidth: 300 }}>
                      {truncate(log.changeDetails || '—', 60)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {log.changeReason && <MessageSquare size={16} style={{ color: '#9EA3B0', margin: '0 auto' }} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{ padding: '12px 16px', borderTop: '0.5px solid #E4E6EC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: '#9EA3B0' }}>
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  style={pageBtnStyle(currentPage === 1)}>
                  ‹ Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                  const page = start + i;
                  return (
                    <button key={page} onClick={() => setCurrentPage(page)} disabled={page === currentPage}
                      style={{ ...pageBtnStyle(page === currentPage), background: page === currentPage ? '#1A56DB' : '#FFFFFF', color: page === currentPage ? '#FFFFFF' : '#374151' }}>
                      {page}
                    </button>
                  );
                })}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  style={pageBtnStyle(currentPage === totalPages)}>
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && <KpiLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
};

export default KpiAuditTable;
