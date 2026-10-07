import React, { useState, useMemo } from 'react';
import { AlertCircle, MessageSquare, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { KpiAuditLogResponse } from '../../features/kpi/kpiAuditTypes';
import { formatRelativeTime } from '../../utils/timeUtils';

interface KpiAuditLogTableProps {
  logs: KpiAuditLogResponse[];
  isLoading: boolean;
  isError: boolean;
  page: number;
  size: number;
  totalElements: number;
  onPageChange: (newPage: number) => void;
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  PHASE_OPENED: { bg: '#EAF3DE', text: '#27500A' },
  PHASE_CLOSED: { bg: '#F1EFE8', text: '#444441' },
  PHASE_LOCKED: { bg: '#F5F3FF', text: '#7C3AED' },
  KPI_ASSIGNED: { bg: '#EFF6FF', text: '#1D4ED8' },
  KPI_APPROVED: { bg: '#ECFDF5', text: '#059669' },
  KPI_REVERTED: { bg: '#FFFBEB', text: '#D97706' },
  KPI_LOCKED: { bg: '#F5F3FF', text: '#7C3AED' },
  KPI_ADDED: { bg: '#EEF3FD', text: '#0C447C' },
  KPI_REVISED: { bg: '#FEF3C7', text: '#92400E' },
  KPI_DELETED: { bg: '#FEF2F2', text: '#DC2626' },
  MID_CYCLE_EVENT: { bg: '#E0E7FF', text: '#4F46E5' },
};

const KpiAuditLogTable: React.FC<KpiAuditLogTableProps> = ({
  logs,
  isLoading,
  isError,
  page,
  size,
  totalElements,
  onPageChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<KpiAuditLogResponse | null>(null);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter((l) =>
      l.employeeName?.toLowerCase().includes(term) ||
      l.departmentName?.toLowerCase().includes(term) ||
      l.changedByName?.toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  const totalPages = Math.ceil(totalElements / size);

  const pageBtnStyle = (disabled: boolean) => ({
    padding: '4px 10px',
    fontSize: 12,
    borderRadius: 6,
    border: '0.5px solid #E0E2E8',
    background: disabled ? '#F5F6F8' : '#FFFFFF',
    color: disabled ? '#C0C4CC' : '#374151',
    cursor: disabled ? 'not-allowed' : 'pointer',
  });

  const truncate = (str: string, len: number) => (str && str.length > len ? str.slice(0, len) + '…' : str || '');

  const parseDiffString = (details: string) => {
    const regex = /(.*) changed from (.*) to (.*)/i;
    const match = details.match(regex);
    if (match) {
      const [, field, oldVal, newVal] = match;
      return (
        <div style={{ fontSize: 13, marginTop: 8 }}>
          <span style={{ fontWeight: 600, color: '#111827' }}>{field}: </span>
          <span style={{ textDecoration: 'line-through', color: '#E53E3E', background: '#FEE2E2', padding: '2px 6px', borderRadius: 4 }}>
            {oldVal}
          </span>
          <span style={{ margin: '0 8px', color: '#9EA3B0' }}>→</span>
          <span style={{ color: '#27500A', fontWeight: 600, background: '#EAF3DE', padding: '2px 6px', borderRadius: 4 }}>
            {newVal}
          </span>
        </div>
      );
    }
    return <p style={{ fontSize: 13, color: '#5A6070', marginTop: 8 }}>{details}</p>;
  };

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
      {/* Search Bar */}
      <div style={{ padding: '16px 18px', background: '#FAFBFF', borderBottom: '0.5px solid #E4E6EC' }}>
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9EA3B0' }} />
          <input
            type="text"
            placeholder="Search by employee or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              fontSize: 12,
              borderRadius: 8,
              border: '0.5px solid #E4E6EC',
              outline: 'none',
              background: '#FFFFFF',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ background: 'none', border: 'none', color: '#9EA3B0', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
          <thead>
            <tr style={{ background: '#FAFBFF', borderBottom: '0.5px solid #E4E6EC' }}>
              <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timestamp</th>
              <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee</th>
              <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Emp Code</th>
              <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</th>
              <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
              <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Details</th>
              <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Changed By</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const badge = ACTION_COLORS[log.action] || { bg: '#EEF3FD', text: '#0C447C' };
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-[#F9FAFC] cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                    style={{ borderBottom: '0.5px solid #E4E6EC' }}
                  >
                    <td style={{ padding: '14px 18px', fontSize: 12, color: '#111827' }}>
                      {formatRelativeTime(log.createdAt)}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 12, fontWeight: 500, color: '#111827' }}>
                      {log.employeeName}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 11, color: '#9EA3B0', fontFamily: 'monospace' }}>
                      {log.employeeCode || '—'}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: '#5A6070' }}>
                      {log.departmentName || 'N/A'}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: badge.bg,
                          color: badge.text,
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          display: 'inline-block',
                        }}
                      >
                        {log.action.replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: '#5A6070' }}>
                      {truncate(log.changeDetails || log.changeReason || '', 50)}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: '#111827' }}>
                      {log.changedByName}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: '40px 18px', textAlign: 'center', fontSize: 12, color: '#9EA3B0' }}>
                  No history records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div style={{ padding: '14px 18px', background: '#FAFBFF', borderTop: '0.5px solid #E4E6EC', display: 'flex', alignItems: 'center', justifyContent: 'between' }} className="justify-between">
        <span style={{ fontSize: 11, color: '#9EA3B0' }}>
          Showing {filteredLogs.length} of {totalElements} items
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            style={pageBtnStyle(page === 0)}
          >
            <ChevronLeft size={14} style={{ display: 'inline', marginRight: 2 }} /> Prev
          </button>
          <span style={{ fontSize: 12, alignSelf: 'center', color: '#5A6070', margin: '0 4px' }}>
            Page {page + 1} of {Math.max(totalPages, 1)}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            style={pageBtnStyle(page >= totalPages - 1)}
          >
            Next <ChevronRight size={14} style={{ display: 'inline', marginLeft: 2 }} />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxWidth: 550, width: '100%', maxHeight: '85vh', overflow: 'auto' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Audit Trail Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#9EA3B0' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20 }} className="space-y-5">
              <div className="flex items-center justify-between">
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 4,
                    background: ACTION_COLORS[selectedLog.action]?.bg || '#EEF3FD',
                    color: ACTION_COLORS[selectedLog.action]?.text || '#0C447C',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}
                >
                  {selectedLog.action.replaceAll('_', ' ')}
                </span>
                <span style={{ fontSize: 12, color: '#9EA3B0' }}>
                  {formatRelativeTime(selectedLog.createdAt)}
                </span>
              </div>

              {/* Employee & Dept Info */}
              <div style={{ background: '#FAFBFF', border: '0.5px solid #E4E6EC', borderRadius: 8, padding: 12 }} className="space-y-2">
                <div className="flex justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: '#9EA3B0' }}>Target Employee:</span>
                  <span style={{ color: '#111827', fontWeight: 600 }}>{selectedLog.employeeName}</span>
                </div>
                <div className="flex justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: '#9EA3B0' }}>Department:</span>
                  <span style={{ color: '#111827', fontWeight: 600 }}>{selectedLog.departmentName || 'N/A'}</span>
                </div>
                <div className="flex justify-between" style={{ fontSize: 12 }}>
                  <span style={{ color: '#9EA3B0' }}>Goal Set Ref:</span>
                  <span style={{ color: '#111827', fontWeight: 600 }}>ID #{selectedLog.goalSetId}</span>
                </div>
              </div>

              {/* Change Details */}
              {selectedLog.changeDetails && (
                <div style={{ background: '#F8F9FA', border: '0.5px solid #E4E6EC', borderRadius: 8, padding: 12 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#9EA3B0', textTransform: 'uppercase', margin: '0 0 8px 0' }}>Changes Made</p>
                  {parseDiffString(selectedLog.changeDetails)}
                </div>
              )}

              {/* Change Reason */}
              {selectedLog.changeReason && (
                <div style={{ background: '#FFFDF5', border: '0.5px solid #F3D995', borderRadius: 8, padding: 12, display: 'flex', gap: 10 }}>
                  <MessageSquare size={16} style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#B45309', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Change Reason</p>
                    <p style={{ fontSize: 12, color: '#5A6070', fontStyle: 'italic', margin: 0 }}>"{selectedLog.changeReason}"</p>
                  </div>
                </div>
              )}

              {/* Changed By Metadata */}
              <div style={{ borderTop: '0.5px solid #E4E6EC', paddingTop: 14 }} className="flex justify-between items-center">
                <div>
                  <span style={{ fontSize: 11, color: '#9EA3B0', display: 'block' }}>Performed By</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedLog.changedByName}</span>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  style={{
                    padding: '6px 16px',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 8,
                    border: '0.5px solid #E4E6EC',
                    background: '#FFFFFF',
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                  className="hover:bg-[#F9FAFC]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiAuditLogTable;
