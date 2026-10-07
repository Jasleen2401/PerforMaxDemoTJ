import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { UserPlus, CheckCircle, XCircle, Loader2, AlertCircle, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  useListMyNominationsQuery,
  useProposeNominationMutation,
  useApproveNominationMutation,
  useRejectNominationMutation,
} from '../../features/feedback360/feedback360Api';
import { useGetAllEmployeesQuery } from '../../features/employee/employeeapi';
import type { EvaluatorNomination } from '../../features/feedback360/feedback360Types';
import { FeedbackRelationship } from '../../features/feedback360/feedback360Types';
import RelBadge from '../../components/feedback360/RelBadge';

// ── Style constants ────────────────────────────────────────────────────────────

const panel: React.CSSProperties = {
  background: '#FFFFFF',
  border: '0.5px solid #E4E6EC',
  borderRadius: 12,
  padding: '20px 22px',
};

const inputStyle: React.CSSProperties = {
  fontSize: 13, color: '#111827', background: '#FAFBFC',
  border: '0.5px solid #E4E6EC', borderRadius: 8,
  padding: '8px 12px', outline: 'none', width: '100%',
  boxSizing: 'border-box' as const,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: '#5A6070',
  marginBottom: 4, display: 'block',
};

const NOMINATION_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PROPOSED: { label: 'Proposed', bg: '#FAEEDA', text: '#633806' },
  APPROVED: { label: 'Approved', bg: '#EAF3DE', text: '#27500A' },
  REJECTED: { label: 'Rejected', bg: '#FCEBEB', text: '#791F1F' },
};

type PageTab = 'mine' | 'pending';

// ── Status badge ───────────────────────────────────────────────────────────────

const NomStatusBadge = ({ status }: { status: string }) => {
  const cfg = NOMINATION_STATUS_CONFIG[status] ?? { label: status, bg: '#F5F6F8', text: '#5A6070' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
};

// ── Propose form ───────────────────────────────────────────────────────────────

interface ProposeFormProps {
  onSubmitted: () => void;
}

const ProposeForm = ({ onSubmitted }: ProposeFormProps) => {
  const { user, isAdmin, isHR, isManager } = useAuth();
  
  // Fetch all active employees
  const { data: allEmployees = [], isLoading: loadingEmployees } = useGetAllEmployeesQuery();
  
  // Only HR, Admin, or Managers can specify a different target employee. Regular employees can only propose for themselves.
  const canSelectTarget = isAdmin || isHR || isManager;
  
  const [targetUserId, setTargetUserId]   = useState('');
  const [nomineeId, setNomineeId]         = useState('');
  const [relationship, setRelationship]   = useState<string>(FeedbackRelationship.PEER);
  const [propose, { isLoading }]          = useProposeNominationMutation();

  // Automatically set target employee to self if not HR/Admin/Manager
  React.useEffect(() => {
    if (!canSelectTarget && user) {
      setTargetUserId(String(user.id));
    }
  }, [user, canSelectTarget]);

  // Find target employee object
  const targetEmployee = allEmployees.find(emp => String(emp.id) === targetUserId);

  // Dynamically compute eligible nominees based on relationship type
  const eligibleNominees = React.useMemo(() => {
    if (!targetEmployee) return [];

    if (relationship === FeedbackRelationship.DIRECT_MANAGER) {
      // 1. Direct Manager: Show their registered manager, or managers in the system
      if (targetEmployee.directManagerId) {
        const mgr = allEmployees.find(emp => emp.id === targetEmployee.directManagerId);
        if (mgr) return [mgr];
      }
      return allEmployees.filter(emp => 
        emp.id !== targetEmployee.id && 
        (emp.roles?.some(r => r.includes('MANAGER')) || emp.levelRank < targetEmployee.levelRank)
      );
    } 
    
    if (relationship === FeedbackRelationship.PEER) {
      // 2. Peer: Same department, excluding self
      return allEmployees.filter(emp => 
        emp.id !== targetEmployee.id &&
        emp.currentDepartmentId === targetEmployee.currentDepartmentId
      );
    } 
    
    if (relationship === FeedbackRelationship.SUBORDINATE) {
      // 3. Subordinate: Direct reports OR lower ranking in same department, excluding self
      return allEmployees.filter(emp => 
        emp.id !== targetEmployee.id &&
        (emp.directManagerId === targetEmployee.id || 
         (emp.currentDepartmentId === targetEmployee.currentDepartmentId && emp.levelRank > targetEmployee.levelRank))
      );
    }

    return [];
  }, [relationship, targetEmployee, allEmployees]);

  // Reset or pre-select nomineeId when list of eligible nominees changes
  React.useEffect(() => {
    if (eligibleNominees.length > 0) {
      const isValid = eligibleNominees.some(n => String(n.id) === nomineeId);
      if (!isValid) {
        setNomineeId(String(eligibleNominees[0].id));
      }
    } else {
      setNomineeId('');
    }
  }, [eligibleNominees, nomineeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tId = parseInt(targetUserId);
    const nId = parseInt(nomineeId);
    if (!tId || !nId) return toast.error('Please select both a target and a nominee.');
    try {
      await propose({
        targetUserId: tId,
        nomineeId: nId,
        relationship: relationship as typeof FeedbackRelationship[keyof typeof FeedbackRelationship],
      }).unwrap();
      toast.success('Nomination proposed.');
      setNomineeId('');
      if (canSelectTarget) {
        setTargetUserId('');
      }
      onSubmitted();
    } catch {
      toast.error('Failed to propose nomination.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        <div>
          <label style={labelStyle}>Target Employee</label>
          {canSelectTarget ? (
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              style={inputStyle}
              disabled={loadingEmployees}
            >
              <option value="">-- Select Target --</option>
              {allEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.staffName} ({emp.employeeCode}) - {emp.positionName}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              readOnly
              value={user ? `${user.staffName} (${user.employeeCode})` : 'Loading…'}
              style={{ ...inputStyle, background: '#F3F4F6', color: '#6B7280', cursor: 'not-allowed' }}
            />
          )}
        </div>
        <div>
          <label style={labelStyle}>Relationship Type</label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            style={inputStyle}
            disabled={!targetUserId}
          >
            <option value={FeedbackRelationship.PEER}>Peer (Same Department)</option>
            <option value={FeedbackRelationship.SUBORDINATE}>Subordinate (Direct Report / Junior)</option>
            <option value={FeedbackRelationship.DIRECT_MANAGER}>Direct Manager</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Nominee (Evaluator)</label>
          <select
            value={nomineeId}
            onChange={(e) => setNomineeId(e.target.value)}
            style={inputStyle}
            disabled={!targetUserId || eligibleNominees.length === 0}
          >
            {eligibleNominees.length === 0 ? (
              <option value="">-- No eligible nominees found --</option>
            ) : (
              eligibleNominees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.staffName} ({emp.employeeCode}) - {emp.positionName}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
      <div>
        <button
          type="submit"
          disabled={isLoading || !targetUserId || !nomineeId}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 500, color: '#FFFFFF',
            background: isLoading || !targetUserId || !nomineeId ? '#93A8E8' : '#1A56DB',
            border: 'none', borderRadius: 8, padding: '8px 16px',
            cursor: isLoading || !targetUserId || !nomineeId ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={13} />}
          Propose Nomination
        </button>
      </div>
    </form>
  );
};

// ── Nomination table ───────────────────────────────────────────────────────────

interface NominationTableProps {
  nominations: EvaluatorNomination[];
  showActions: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  approving?: boolean;
  rejecting?: boolean;
}

const NominationTable = ({ nominations, showActions, onApprove, onReject, approving, rejecting }: NominationTableProps) => {
  const { data: allEmployees = [] } = useGetAllEmployeesQuery();

  if (nominations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#9EA3B0' }}>
        <Users size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
        <p style={{ fontSize: 13, margin: 0 }}>No nominations found.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #E4E6EC', background: '#FAFBFC' }}>
            {['Target', 'Nominee', 'Relationship', 'Status', ...(showActions ? ['Actions'] : [])].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#5A6070', fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nominations.map((n, i) => {
            const targetEmp = allEmployees.find(emp => emp.id === n.targetUserId);
            return (
              <tr key={n.id} style={{ borderBottom: '0.5px solid #F0F2F8', background: i % 2 === 0 ? '#FAFBFC' : '#FFFFFF' }}>
                <td style={{ padding: '10px 10px', color: '#5A6070' }}>{targetEmp ? targetEmp.staffName : `#${n.targetUserId}`}</td>
                <td style={{ padding: '10px 10px', fontWeight: 500, color: '#111827' }}>{n.nomineeName}</td>
              <td style={{ padding: '10px 10px' }}><RelBadge rel={n.relationship} /></td>
              <td style={{ padding: '10px 10px' }}><NomStatusBadge status={n.status} /></td>
              {showActions && (
                <td style={{ padding: '8px 10px' }}>
                  {n.status === 'PROPOSED' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => onApprove?.(n.id)}
                        disabled={approving}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 500, color: '#27500A',
                          background: '#EAF3DE', border: '0.5px solid #B7E0A0',
                          borderRadius: 6, padding: '3px 9px', cursor: 'pointer',
                        }}
                      >
                        {approving ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={11} />}
                        Approve
                      </button>
                      <button
                        onClick={() => onReject?.(n.id)}
                        disabled={rejecting}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 500, color: '#791F1F',
                          background: '#FCEBEB', border: '0.5px solid #F5C6C6',
                          borderRadius: 6, padding: '3px 9px', cursor: 'pointer',
                        }}
                      >
                        {rejecting ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={11} />}
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              )}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────

const Feedback360NominationsPage = () => {
  const { isAdmin, isHR, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState<PageTab>('mine');

  const { data: myNominations = [], isLoading, isError, refetch } = useListMyNominationsQuery();
  const [approve, { isLoading: approving }] = useApproveNominationMutation();
  const [reject,  { isLoading: rejecting }] = useRejectNominationMutation();
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);

  const pendingNominations = myNominations.filter((n) => n.status === 'PROPOSED');
  const canApprove = isAdmin || isHR || isManager;

  const handleApprove = async (id: number) => {
    try { await approve(id).unwrap(); toast.success('Nomination approved.'); }
    catch { toast.error('Failed to approve.'); }
  };

  const handleReject = (id: number) => {
    setRejectTargetId(id);
  };

  const confirmReject = async () => {
    if (!rejectTargetId) return;
    try { await reject(rejectTargetId).unwrap(); toast.success('Nomination rejected.'); }
    catch { toast.error('Failed to reject.'); }
    finally { setRejectTargetId(null); }
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
          360° Evaluator Nominations
        </h1>
        <p style={{ fontSize: 13, color: '#9EA3B0', marginTop: 4 }}>
          Propose peers and subordinates as evaluators; managers approve or reject.
        </p>
      </div>

      {/* Propose form */}
      <div style={panel}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Propose a Nomination</p>
        <ProposeForm onSubmitted={refetch} />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: '#F5F6F8', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {([
          { key: 'mine'    as PageTab, label: 'My Nominations',   count: myNominations.length },
          { key: 'pending' as PageTab, label: 'Pending Approval', count: pendingNominations.length },
        ]).map(({ key, label, count }) => {
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
                border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
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

      {/* Table */}
      <div style={panel}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9EA3B0' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Loading nominations…</span>
          </div>
        ) : isError ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#791F1F' }}>
            <AlertCircle size={15} />
            <span style={{ fontSize: 13 }}>Failed to load nominations.</span>
          </div>
        ) : activeTab === 'mine' ? (
          <NominationTable nominations={myNominations} showActions={false} />
        ) : (
          <NominationTable
            nominations={pendingNominations}
            showActions={canApprove}
            onApprove={handleApprove}
            onReject={handleReject}
            approving={approving}
            rejecting={rejecting}
          />
        )}
      </div>

      {rejectTargetId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Reject Nomination?</p>
            <p style={{ fontSize: 13, color: '#5A6070', marginBottom: 20 }}>
              This nomination will be rejected and removed from pending approval.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRejectTargetId(null)}
                disabled={rejecting}
                style={{ padding: '8px 16px', border: '1px solid #E4E6EC', borderRadius: 8, fontSize: 13, background: '#fff', cursor: rejecting ? 'not-allowed' : 'pointer', opacity: rejecting ? 0.7 : 1 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={rejecting}
                style={{ padding: '8px 16px', background: '#791F1F', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: rejecting ? 'not-allowed' : 'pointer', opacity: rejecting ? 0.7 : 1 }}
              >
                {rejecting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feedback360NominationsPage;
