import React from 'react';
import { X, MessageSquare } from 'lucide-react';
import type { KpiHistoryLog } from '../../features/kpi/kpiTypes';
import { formatRelativeTime } from '../../utils/timeUtils';

interface KpiLogDetailModalProps {
  log: KpiHistoryLog;
  onClose: () => void;
}

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

const KpiLogDetailModal: React.FC<KpiLogDetailModalProps> = ({ log, onClose }) => {
  const actionKey = log.action.includes('ITEM') ? 'ITEM' : log.action;
  const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
    PROGRESS_UPDATE: { bg: '#EAF3DE', text: '#27500A' },
    ITEM: { bg: '#EEF3FD', text: '#0C447C' },
    STATUS_CHANGE: { bg: '#FEF3C7', text: '#92400E' },
    APPROVED: { bg: '#EAF3DE', text: '#27500A' },
    LOCKED: { bg: '#F1EFE8', text: '#444441' },
  };
  const ac = ACTION_COLORS[actionKey] || { bg: '#EEF3FD', text: '#0C447C' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.3)' }}>
      <div style={{ background: '#FFFFFF', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxWidth: 600, width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Audit Event Details</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', color: '#9EA3B0' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }} className="space-y-6">
          {/* Action Badge + Date */}
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', background: ac.bg, color: ac.text, borderRadius: 4, padding: '4px 10px' }}>
              {log.action.replaceAll('_', ' ')}
            </span>
            <span style={{ fontSize: 12, color: '#9EA3B0' }}>
              {formatRelativeTime(log.createdAt)}
            </span>
          </div>

          {/* Change Details */}
          {log.changeDetails && (
            <div style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9EA3B0', textTransform: 'uppercase', marginBottom: 8 }}>Changes</p>
              {parseDiffString(log.changeDetails)}
            </div>
          )}

          {/* Change Reason */}
          {log.changeReason && (
            <div style={{ background: '#FFFBEB', border: '0.5px solid #FEE08B', borderRadius: 8, padding: 12, display: 'flex', gap: 10 }}>
              <MessageSquare size={16} style={{ color: '#92400E', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#92400E', textTransform: 'uppercase', marginBottom: 4 }}>Reason</p>
                <p style={{ fontSize: 13, color: '#5A6070', fontStyle: 'italic' }}>"{log.changeReason}"</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div style={{ background: '#F5F6F8', borderRadius: 8, padding: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#9EA3B0', textTransform: 'uppercase', marginBottom: 8 }}>Metadata</p>
            <div className="space-y-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#9EA3B0' }}>Changed By:</span>
                <span style={{ color: '#111827', fontWeight: 600 }}>User #{log.changedBy}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#9EA3B0' }}>Timestamp:</span>
                <span style={{ color: '#111827', fontWeight: 600 }}>{formatRelativeTime(log.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KpiLogDetailModal;
