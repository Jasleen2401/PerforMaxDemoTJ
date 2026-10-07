import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isAfter } from 'date-fns';
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle,
  Loader2, Calendar,
} from 'lucide-react';
import {
  useGetMyFeedbackRequestsQuery,
} from '../../features/feedback360/feedback360Api';
import type {
  FeedbackRequestResponse,
} from '../../features/feedback360/feedback360Types';
import { FeedbackStatus } from '../../features/feedback360/feedback360Types';

// ── Style constants ────────────────────────────────────────────────────────────

const panel: React.CSSProperties = {
  background: '#FFFFFF',
  border: '0.5px solid #E4E6EC',
  borderRadius: 12,
  padding: '16px 18px',
};

const REL_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DIRECT_MANAGER: { label: 'Manager',     bg: '#EEF3FD', text: '#1A56DB', border: '#BFCFFA' },
  PEER:           { label: 'Peer',        bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  SUBORDINATE:    { label: 'Subordinate', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  SELF:           { label: 'Self',        bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:     { label: 'Pending',     bg: '#FAEEDA', text: '#633806' },
  IN_PROGRESS: { label: 'In Progress', bg: '#EEF3FD', text: '#1A56DB' },
  COMPLETED:   { label: 'Completed',   bg: '#EAF3DE', text: '#27500A' },
  CANCELLED:   { label: 'Cancelled',   bg: '#FCEBEB', text: '#791F1F' },
};

type FilterTab = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

// ── Helpers ────────────────────────────────────────────────────────────────────

function isOverdue(req: FeedbackRequestResponse): boolean {
  if (req.isOverdue) return true;
  if (!req.dueDate || req.status === FeedbackStatus.COMPLETED || req.status === FeedbackStatus.CANCELLED) return false;
  return isAfter(new Date(), parseISO(req.dueDate));
}

function sortRequests(list: FeedbackRequestResponse[]): FeedbackRequestResponse[] {
  return [...list].sort((a, b) => {
    // Overdue first
    const aOD = isOverdue(a) ? 0 : 1;
    const bOD = isOverdue(b) ? 0 : 1;
    if (aOD !== bOD) return aOD - bOD;
    // Then by due date ascending (nulls last)
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const RelBadge = ({ rel }: { rel: string }) => {
  const cfg = REL_CONFIG[rel] ?? { label: rel, bg: '#F5F6F8', text: '#5A6070', border: '#E4E6EC' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.text, border: `0.5px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#F5F6F8', text: '#5A6070' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.text,
    }}>
      {cfg.label}
    </span>
  );
};

const OverduePill = () => (
  <span style={{
    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
    background: '#FCEBEB', color: '#791F1F', border: '0.5px solid #F5C6C6',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }}>
    Overdue
  </span>
);

// ── Request card ───────────────────────────────────────────────────────────────

const RequestCard = ({ req, onOpen }: { req: FeedbackRequestResponse; onOpen: () => void }) => {
  const overdue = isOverdue(req);
  const isCancelled = req.status === FeedbackStatus.CANCELLED;
  const isCompleted = req.status === FeedbackStatus.COMPLETED;

  return (
    <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
      {req.isReciprocalFallback && (
        <div style={{
          position: 'absolute', top: 0, right: 0, fontSize: 10, fontWeight: 600,
          background: '#FAEEDA', color: '#633806', padding: '2px 10px',
          borderRadius: '0 12px 0 8px',
        }}>
          Reciprocal Fallback
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <RelBadge rel={req.relationship} />
        <StatusBadge status={req.status} />
        {overdue && <OverduePill />}
      </div>

      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{req.targetUserName}</p>
        {req.targetDepartmentName && (
          <p style={{ fontSize: 12, color: '#9EA3B0', margin: '2px 0 0' }}>{req.targetDepartmentName}</p>
        )}
      </div>

      {req.dueDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Calendar size={12} color={overdue ? '#791F1F' : '#9EA3B0'} />
          <span style={{ fontSize: 12, color: overdue ? '#791F1F' : '#9EA3B0' }}>
            Due {format(parseISO(req.dueDate), 'dd MMM yyyy')}
          </span>
        </div>
      )}

      {isCancelled ? (
        <p style={{ fontSize: 12, color: '#9EA3B0', fontStyle: 'italic', margin: 0 }}>Cancelled by HR</p>
      ) : (
        <button
          onClick={onOpen}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 500,
            color: isCompleted ? '#1A56DB' : '#FFFFFF',
            background: isCompleted ? '#EEF3FD' : '#1A56DB',
            border: isCompleted ? '0.5px solid #BFCFFA' : 'none',
            borderRadius: 8, padding: '7px 14px',
            cursor: 'pointer', alignSelf: 'flex-start',
          }}
        >
          {isCompleted ? <CheckCircle2 size={13} /> : <Clock size={13} />}
          {isCompleted ? 'View Submission' : req.status === FeedbackStatus.IN_PROGRESS ? 'Resume Draft' : 'Submit Feedback'}
        </button>
      )}
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────

const TABS: { key: FilterTab; label: string; icon: React.ElementType }[] = [
  { key: 'ALL',         label: 'All',         icon: ClipboardList },
  { key: 'PENDING',     label: 'Pending',     icon: Clock },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: AlertCircle },
  { key: 'COMPLETED',   label: 'Completed',   icon: CheckCircle2 },
];

const Feedback360PendingPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const { data: requests = [], isLoading, isError } = useGetMyFeedbackRequestsQuery();

  const filtered = sortRequests(
    activeTab === 'ALL' ? requests : requests.filter((r) => r.status === activeTab),
  );

  return (
    <div style={{ padding: 24 }}>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
          My 360° Feedback Requests
        </h1>
        <p style={{ fontSize: 13, color: '#9EA3B0', marginTop: 4 }}>
          Feedback you have been asked to provide for colleagues.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: '#F5F6F8', borderRadius: 10, padding: 4, width: 'fit-content',
      }}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const count = key === 'ALL' ? requests.length : requests.filter((r) => r.status === key).length;
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: active ? 600 : 400,
                color: active ? '#1A56DB' : '#5A6070',
                background: active ? '#FFFFFF' : 'transparent',
                border: 'none', borderRadius: 8, padding: '6px 12px',
                cursor: 'pointer',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Icon size={13} />
              {label}
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: active ? '#EEF3FD' : '#E4E6EC',
                color: active ? '#1A56DB' : '#9EA3B0',
                borderRadius: 20, padding: '1px 6px',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9EA3B0' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14 }}>Loading requests…</span>
        </div>
      ) : isError ? (
        <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: 10, color: '#791F1F' }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: 14 }}>Failed to load feedback requests.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...panel, textAlign: 'center', padding: '40px 0', color: '#9EA3B0' }}>
          <ClipboardList size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
          <p style={{ fontSize: 14, margin: 0 }}>No {activeTab !== 'ALL' ? activeTab.toLowerCase().replace('_', ' ') + ' ' : ''}requests found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                  {filtered.map((req) => (
          <RequestCard
            key={req.id}
            req={req}
            onOpen={() => navigate(`/360-feedback/submit?requestId=${req.id}`)}
          />
        ))}
      </div>
    )}
  </div>
);
};

export default Feedback360PendingPage;
