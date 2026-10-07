import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  useGetEmployeeAssessmentQuery,
  useCalculateScoreMutation,
  useApproveAppraisalMutation,
  useFinalizeAppraisalMutation
} from '../../features/appraisal/appraisalApi';
import { format } from 'date-fns';
import {
  ClipboardList,
  FileText,
  ChevronLeft,
  User,
  CheckCircle2,
  Clock,
  Target,
  ArrowRight,
  Lock,
  Calculator,
  ShieldCheck,
  Flag,
  Calendar,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const panelStyle: React.CSSProperties = {
  background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px',
};

const STATUS_INFO: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  PENDING:      { label: 'Pending Self Assessment',   bg: '#FAEEDA', text: '#633806', border: '#F0D4A4', icon: Clock },
  SELF_ASSESSED:{ label: 'Awaiting Manager Review',   bg: '#EEF3FD', text: '#0C447C', border: '#B5D4F4', icon: UserCheck },
  EVALUATED:    { label: 'Ready for HR Calculation',  bg: '#EEF3FD', text: '#0C447C', border: '#B5D4F4', icon: Calculator },
  HR_APPROVED:  { label: 'Awaiting Sign-offs',        bg: '#F1EFE8', text: '#444441', border: '#DDDBD2', icon: ShieldCheck },
  FINALIZED:    { label: 'Finalized',                 bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0', icon: CheckCircle2 },
};

const AppraisalDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isHR, isManager: authIsManager } = useAuth();

  const { data: appraisal, isLoading } = useGetEmployeeAssessmentQuery(id || '', { skip: !id });
  const [calculateScore, { isLoading: isCalculating }] = useCalculateScoreMutation();
  const [approveAppraisal, { isLoading: isApproving }] = useApproveAppraisalMutation();
  const [finalizeAppraisal, { isLoading: isFinalizing }] = useFinalizeAppraisalMutation();
  const [approvalComment, setApprovalComment] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  if (isLoading) return <div className="py-16 text-center" style={{ color: '#9EA3B0', fontSize: 13 }}>Loading…</div>;
  if (!appraisal) return (
    <div style={{ background: '#FCEBEB', border: '0.5px solid #F5C2C2', borderRadius: 12, padding: '16px 18px', fontSize: 13, color: '#791F1F' }}>
      Appraisal not found.
    </div>
  );

  const isEmployee = Boolean(
    user && (
      String(user.id) === String(appraisal.employeeId) ||
      (user.profile && String(user.profile.id) === String(appraisal.employeeId)) ||
      ((user as any).profileId && String((user as any).profileId) === String(appraisal.employeeId)) ||
      ((user as any).employeeId && String((user as any).employeeId) === String(appraisal.employeeId))
    )
  );
  const isAssignedManager = Boolean(
    user && appraisal.managerId && (
      String(user.id) === String(appraisal.managerId) ||
      (user.profile && String(user.profile.id) === String(appraisal.managerId)) ||
      ((user as any).profileId && String((user as any).profileId) === String(appraisal.managerId))
    )
  );
  const isManager = isAssignedManager || authIsManager;
  const isPrivileged = isAdmin || isHR;
  const canViewSelfAssessment = isEmployee || isManager || isPrivileged;
  const canViewManagerEvaluation = isManager || isPrivileged || (isEmployee && !!appraisal.managerSubmittedAt);

  // Signature gate for finalize
  const hasEmployeeSigned = !!appraisal.employeeSignedAt;
  const hasManagerSigned  = !!appraisal.managerSignedAt;
  const canFinalize = appraisal.status === 'HR_APPROVED' && hasEmployeeSigned && hasManagerSigned;
  const finalizeBlockedReason =
    appraisal.status !== 'HR_APPROVED' ? 'Appraisal must be HR-approved first.'
    : !hasEmployeeSigned && !hasManagerSigned ? 'Awaiting employee and manager signatures.'
    : !hasEmployeeSigned ? 'Awaiting employee signature.'
    : !hasManagerSigned  ? 'Awaiting manager signature.'
    : '';

  const handleCalculate = async () => {
    try { await calculateScore(id!).unwrap(); toast.success('Scores calculated!'); }
    catch (err: any) { toast.error('Calculation failed.'); }
  };
  const handleApprove = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve Appraisal Results',
      message: 'Are you sure you want to approve these appraisal results? This action cannot be undone once completed.',
      onConfirm: async () => {
        try { await approveAppraisal({ id: id!, comment: approvalComment }).unwrap(); toast.success('Approved!'); }
        catch (err: any) { toast.error('Approval failed.'); }
      }
    });
  };
  const handleFinalize = async () => {
    try { await finalizeAppraisal(id!).unwrap(); toast.success('Finalized!'); }
    catch (err: any) { toast.error('Failed to finalize.'); }
  };

  const statusInfo = STATUS_INFO[appraisal.status] ?? STATUS_INFO['PENDING'];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-4 pb-8">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/appraisal')}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #E4E6EC', borderRadius: 8, background: '#FFFFFF', color: '#5A6070' }}
            className="hover:bg-[#F5F6F8] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Appraisal Detail</h1>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 1 }}>{appraisal.cycleName}</p>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 500, background: statusInfo.bg, color: statusInfo.text, border: `0.5px solid ${statusInfo.border}`, borderRadius: 20, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <StatusIcon size={11} /> {statusInfo.label}
        </span>
      </div>

      {/* Employee profile + score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2" style={panelStyle}>
          <div className="flex items-start gap-4">
            <div style={{ width: 48, height: 48, borderRadius: 8, background: '#EEF3FD', color: '#0C447C', fontSize: 18, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {appraisal.employeeName?.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 6 }}>
                <h2 style={{ fontSize: 16, fontWeight: 500, color: '#111827' }}>{appraisal.employeeName}</h2>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#9EA3B0', background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '1px 6px' }}>{appraisal.employeeCode}</span>
              </div>
              <div className="flex flex-wrap gap-4">
                <span style={{ fontSize: 12, color: '#5A6070', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Target size={12} style={{ color: '#1A56DB' }} /> {appraisal.positionName || 'Associate'}
                </span>
                <span style={{ fontSize: 12, color: '#5A6070', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <User size={12} style={{ color: '#1A56DB' }} /> {appraisal.managerName || 'Pending'}
                </span>
                <span style={{ fontSize: 12, color: '#5A6070', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} style={{ color: '#1A56DB' }} />
                  {appraisal.assignedAt ? format(new Date(appraisal.assignedAt), 'dd/MM/yyyy') : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...panelStyle, background: '#111827' }}>
          <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Performance Score</p>
          <p style={{ fontSize: 32, fontWeight: 500, color: '#FFFFFF', marginBottom: 8 }}>
            {appraisal.finalScore != null ? Number(appraisal.finalScore).toFixed(1) : '--'}
            <span style={{ fontSize: 14, color: '#9EA3B0', fontWeight: 400 }}> / 100</span>
          </p>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
            <div style={{ height: '100%', borderRadius: 4, background: '#1A56DB', width: `${appraisal.finalScore || 0}%` }} />
          </div>
        </div>
      </div>

      {/* HR Admin controls */}
      {isPrivileged && (
        <div style={panelStyle}>
          <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
            <ShieldCheck size={15} style={{ color: '#1A56DB' }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>HR Administrator Controls</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Calculate */}
            <div style={{ border: `0.5px solid ${appraisal.status === 'EVALUATED' || appraisal.status === 'HR_APPROVED' ? '#B5D4F4' : '#E4E6EC'}`, borderRadius: 10, padding: '14px', background: appraisal.status === 'EVALUATED' || appraisal.status === 'HR_APPROVED' ? '#EEF3FD' : '#F5F6F8', opacity: ['PENDING', 'SELF_ASSESSED'].includes(appraisal.status) ? 0.6 : 1 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                <Calculator size={14} style={{ color: '#0C447C' }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Score Calculation</p>
              </div>
              <p style={{ fontSize: 12, color: '#9EA3B0', marginBottom: 10 }}>Process all form ratings into the final weighted score.</p>
              <button disabled={isCalculating || !['EVALUATED', 'HR_APPROVED'].includes(appraisal.status)} onClick={handleCalculate}
                className="w-full transition-colors disabled:opacity-50"
                style={{ background: '#FFFFFF', color: '#0C447C', border: '0.5px solid #B5D4F4', borderRadius: 8, padding: '7px', fontSize: 12, fontWeight: 500 }}>
                {isCalculating ? 'Processing…' : 'Run Calculation'}
              </button>
            </div>

            {/* Approve */}
            <div style={{ border: `0.5px solid ${appraisal.status === 'EVALUATED' ? '#DDDBD2' : '#E4E6EC'}`, borderRadius: 10, padding: '14px', background: appraisal.status === 'EVALUATED' ? '#F1EFE8' : '#F5F6F8', opacity: appraisal.status === 'EVALUATED' ? 1 : 0.6 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                <ShieldCheck size={14} style={{ color: '#444441' }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>HR Approval</p>
              </div>
              <input type="text" placeholder="Approval comment…" value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)}
                disabled={appraisal.status !== 'EVALUATED'}
                style={{ width: '100%', background: '#FFFFFF', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#111827', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
              <button disabled={isApproving || appraisal.status !== 'EVALUATED'} onClick={handleApprove}
                className="w-full transition-colors disabled:opacity-50"
                style={{ background: '#FFFFFF', color: '#444441', border: '0.5px solid #DDDBD2', borderRadius: 8, padding: '7px', fontSize: 12, fontWeight: 500 }}>
                {isApproving ? 'Approving…' : 'Approve Results'}
              </button>
            </div>

            {/* Finalize */}
            <div style={{ border: `0.5px solid ${canFinalize ? '#B8DCA0' : '#E4E6EC'}`, borderRadius: 10, padding: '14px', background: canFinalize ? '#EAF3DE' : '#F5F6F8', opacity: canFinalize ? 1 : 0.6 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                <Flag size={14} style={{ color: '#27500A' }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Finalize & Lock</p>
              </div>
              <p style={{ fontSize: 12, color: '#9EA3B0', marginBottom: 10 }}>Complete the cycle and archive the record.</p>
              {!canFinalize && appraisal.status === 'HR_APPROVED' && (
                <p style={{ fontSize: 11, color: '#791F1F', marginBottom: 8 }}>⚠ {finalizeBlockedReason}</p>
              )}
              <button
                disabled={isFinalizing || !canFinalize}
                onClick={handleFinalize}
                title={canFinalize ? 'Finalize and lock this appraisal' : finalizeBlockedReason}
                className="w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#FFFFFF', color: '#27500A', border: '0.5px solid #B8DCA0', borderRadius: 8, padding: '7px', fontSize: 12, fontWeight: 500 }}>
                {isFinalizing ? 'Finalizing…' : 'Close Appraisal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score Preview Banner (when not finalized) */}
      {appraisal.status !== 'FINALIZED' && (
        <div onClick={() => navigate(`/appraisal/${id}/score`)} style={{ background: '#EEF3FD', border: '0.5px solid #B5D4F4', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
          className="hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-3">
            <Calculator size={20} style={{ color: '#0C447C', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#0C447C' }}>
                View Score Preview
              </p>
              <p style={{ fontSize: 12, color: '#5A6070', marginTop: 2 }}>
                See your provisional score breakdown based on currently submitted data.
              </p>
            </div>
          </div>
          <ArrowRight size={16} style={{ color: '#0C447C', flexShrink: 0 }} />
        </div>
      )}

      {/* Results banner */}
      {(appraisal.status === 'HR_APPROVED' || appraisal.status === 'FINALIZED') && (
        <div onClick={() => navigate(`/appraisal/${id}/results`)} style={{ background: '#1A56DB', border: 'none', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
          className="hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} style={{ color: '#FFFFFF', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#FFFFFF' }}>
                {appraisal.status === 'FINALIZED' ? 'View Final Report' : 'Final Results & Formal Sign-off'}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                {appraisal.status === 'FINALIZED' ? 'The appraisal process is complete.' : 'HR approved. Proceed to sign-off.'}
              </p>
            </div>
          </div>
          <ArrowRight size={16} style={{ color: '#FFFFFF', flexShrink: 0 }} />
        </div>
      )}

      {/* When finalized, we also offer the live breakdown as a secondary preview */}
      {appraisal.status === 'FINALIZED' && (
        <div onClick={() => navigate(`/appraisal/${id}/score`)} style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 12, padding: '12px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
          className="hover:bg-[#EEF0F4] transition-colors">
          <div className="flex items-center gap-3">
            <Calculator size={16} style={{ color: '#5A6070', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#5A6070' }}>
                Compare with Live Score Breakdown
              </p>
            </div>
          </div>
          <ArrowRight size={14} style={{ color: '#5A6070', flexShrink: 0 }} />
        </div>
      )}


      {/* Form cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Manager Evaluation */}
        {canViewManagerEvaluation ? (
          <div onClick={() => navigate(`/appraisal/${id}/manager-evaluation`)}
            style={{ ...panelStyle, cursor: 'pointer' }}
            className="hover:border-[#1A56DB] transition-colors">
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EEF3FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={16} style={{ color: '#1A56DB' }} />
              </div>
              {appraisal.managerSubmittedAt ? (
                <span style={{ fontSize: 11, fontWeight: 500, background: '#EAF3DE', color: '#27500A', border: '0.5px solid #B8DCA0', borderRadius: 20, padding: '2px 8px' }}>Completed</span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 500, background: isManager ? '#FAEEDA' : '#F1EFE8', color: isManager ? '#633806' : '#444441', border: `0.5px solid ${isManager ? '#F0D4A4' : '#DDDBD2'}`, borderRadius: 20, padding: '2px 8px' }}>
                  {isManager ? 'Action Required' : 'In Progress'}
                </span>
              )}
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 6 }}>Evaluation Form</p>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginBottom: 14 }}>Manager's performance review and objective ratings.</p>
            <div className="flex items-center justify-between" style={{ paddingTop: 10, borderTop: '0.5px solid #F0F2F6' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#1A56DB' }}>
                {appraisal.managerSubmittedAt
                  ? (isManager && !['FINALIZED', 'HR_APPROVED'].includes(appraisal.status) ? 'Edit Evaluation' : 'View Evaluation')
                  : (isManager ? 'Start Evaluating' : 'View Progress')}
              </span>
              <ArrowRight size={14} style={{ color: '#1A56DB' }} />
            </div>
          </div>
        ) : (
          <div style={{ ...panelStyle, background: '#F5F6F8', border: '0.5px dashed #E0E2E8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 140 }}>
            <Lock size={20} style={{ color: '#9EA3B0', marginBottom: 8 }} />
            <p style={{ fontSize: 13, fontWeight: 500, color: '#9EA3B0' }}>Evaluation Locked</p>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 4 }}>Available once submitted.</p>
          </div>
        )}

        {/* Self Assessment */}
        {canViewSelfAssessment ? (
          <div onClick={() => navigate(`/appraisal/${id}/self-assessment`)}
            style={{ ...panelStyle, cursor: 'pointer' }}
            className="hover:border-[#1A56DB] transition-colors">
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EEF3FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardList size={16} style={{ color: '#1A56DB' }} />
              </div>
              {appraisal.selfSubmittedAt ? (
                <span style={{ fontSize: 11, fontWeight: 500, background: '#EAF3DE', color: '#27500A', border: '0.5px solid #B8DCA0', borderRadius: 20, padding: '2px 8px' }}>Submitted</span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 500, background: '#FAEEDA', color: '#633806', border: '0.5px solid #F0D4A4', borderRadius: 20, padding: '2px 8px' }}>In Progress</span>
              )}
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 6 }}>Self Assessment</p>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginBottom: 14 }}>Personal reflection on achievements, challenges, and core values.</p>
            <div className="flex items-center justify-between" style={{ paddingTop: 10, borderTop: '0.5px solid #F0F2F6' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#1A56DB' }}>
                {appraisal.selfSubmittedAt ? 'View Assessment' : (isEmployee ? 'Continue Assessment' : 'View Progress')}
              </span>
              <ArrowRight size={14} style={{ color: '#1A56DB' }} />
            </div>
          </div>
        ) : (
          <div style={{ ...panelStyle, background: '#F5F6F8', border: '0.5px dashed #E0E2E8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 140 }}>
            <Lock size={20} style={{ color: '#9EA3B0', marginBottom: 8 }} />
            <p style={{ fontSize: 13, fontWeight: 500, color: '#9EA3B0' }}>Self Assessment Locked</p>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 4 }}>Available once submitted.</p>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.5)' }}>
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '24px', maxWidth: 400, width: '100%' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={16} style={{ color: '#633806' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{confirmModal.title}</p>
            </div>
            <p style={{ fontSize: 13, color: '#5A6070', marginBottom: 20 }}>{confirmModal.message}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 transition-colors"
                style={{ background: '#F5F6F8', color: '#111827', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }); }} className="flex-1 transition-colors"
                style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 500 }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppraisalDetail;
