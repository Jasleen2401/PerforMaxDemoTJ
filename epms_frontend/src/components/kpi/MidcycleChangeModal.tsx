import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MidcycleSummaryResponse } from '../../features/kpi/midcycleTypes';
import { useTriggerMidcycleChangeMutation, useGetMidcycleSummaryQuery } from '../../services/midcycleApi';
import { toast } from 'react-toastify';

interface MidcycleChangeModalProps {
  employeeId: number;
  employeeName: string;
  cycleId: number;
  cycleName: string;
  cycleStartDate: string;
  cycleEndDate: string;
  summary: MidcycleSummaryResponse | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

export const MidcycleChangeModal: React.FC<MidcycleChangeModalProps> = ({
  employeeId,
  employeeName,
  cycleId,
  cycleName,
  cycleStartDate,
  cycleEndDate,
  summary,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [triggerChange, { isLoading }] = useTriggerMidcycleChangeMutation();

  const toDateTimeLocalValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const { data: internalSummaryResponse } = useGetMidcycleSummaryQuery(
    { employeeId, cycleId },
    { skip: !!summary || !employeeId || !cycleId, refetchOnMountOrArgChange: true }
  );

  const effectiveSummary = summary || internalSummaryResponse?.data || null;

  // Find the start date of the current open phase
  const openPhase = effectiveSummary?.phases.find((p) => p.status === 'OPEN');
  const currentPhaseNumber = openPhase ? openPhase.phaseNumber : 1;
  const currentPhaseStartDate = openPhase ? openPhase.startDate : `${cycleStartDate}T00:00`;

  const parseLocalDateTime = (value: string) => new Date(value);

  const formatDate = (value: string | Date) => {
    const date = typeof value === 'string' ? parseLocalDateTime(value) : value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (value: string | Date) => {
    const date = typeof value === 'string' ? parseLocalDateTime(value) : value;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Calculate constraints
  const phaseStartDateObj = parseLocalDateTime(currentPhaseStartDate);
  const minDateObj = parseLocalDateTime(currentPhaseStartDate);
  minDateObj.setMinutes(minDateObj.getMinutes() + 1);
  const minDateStr = toDateTimeLocalValue(minDateObj);

  const cycleEndDateTime = parseLocalDateTime(`${cycleEndDate}T23:59:59`);
  const todayObj = new Date();
  const maxDateObj = cycleEndDateTime < todayObj ? cycleEndDateTime : todayObj;
  const maxDateStr = toDateTimeLocalValue(maxDateObj);

  const getInitialChangeDate = () => {
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);
    const nowStr = toDateTimeLocalValue(now);
    if (nowStr < minDateStr) return minDateStr;
    if (nowStr > maxDateStr) return maxDateStr;
    return nowStr;
  };

  const [changeDate, setChangeDate] = useState(getInitialChangeDate());
  const [changeReason, setChangeReason] = useState('');
  const hasValidDateRange = minDateStr <= maxDateStr;
  const currentPhaseStartsInFuture = phaseStartDateObj > new Date();
  const currentPhaseStartsAfterCycleEnd = phaseStartDateObj > cycleEndDateTime;

  // Live preview metrics
  const [currentPhaseDays, setCurrentPhaseDays] = useState(0);
  const [currentPhaseWeight, setCurrentPhaseWeight] = useState(0);
  const [nextPhaseDays, setNextPhaseDays] = useState(0);
  const [nextPhaseWeight, setNextPhaseWeight] = useState(0);

  const getDaysBetween = (start: string, end: string) => {
    const s = parseLocalDateTime(start);
    const e = parseLocalDateTime(end);
    const diff = e.getTime() - s.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  useEffect(() => {
    if (!hasValidDateRange) {
      setChangeDate('');
      return;
    }

    if (!changeDate || changeDate < minDateStr || changeDate > maxDateStr) {
      setChangeDate(maxDateStr);
      return;
    }

    if (cycleStartDate && cycleEndDate && changeDate) {
      const total = getDaysBetween(`${cycleStartDate}T00:00`, `${cycleEndDate}T23:59`);
      const current = getDaysBetween(currentPhaseStartDate, changeDate);

      const next = getDaysBetween(changeDate, `${cycleEndDate}T23:59`);

      setCurrentPhaseDays(current);
      setCurrentPhaseWeight(Math.round((current / total) * 100));
      setNextPhaseDays(next);
      setNextPhaseWeight(Math.round((next / total) * 100));
    }
  }, [changeDate, cycleStartDate, cycleEndDate, currentPhaseStartDate, hasValidDateRange, minDateStr, maxDateStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeReason.trim()) {
      toast.warning('Please enter a change reason.');
      return;
    }
    if (!hasValidDateRange || !changeDate) {
      toast.warning('No valid change date is available yet.');
      return;
    }

    try {
      await triggerChange({
        employeeId,
        cycleId,
        changeDate,
        changeReason,
      }).unwrap();
      toast.success(
        <div>
          KPI phase split triggered successfully!<br />
          <button
            type="button"
            onClick={() => navigate(`/kpi/assign/${employeeId}?cycleId=${cycleId}&mode=edit`)}
            style={{
              marginTop: 8,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #1A56DB',
              background: '#EFF6FF',
              color: '#1A56DB',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Go to KPI Assignment
          </button>
        </div>
      );
      await onSuccess();
    } catch (err: any) {
      toast.error('Failed to trigger midcycle change.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }} className="flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            Trigger Midcycle KPI Split
          </h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF' }} className="hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Info Banner */}
          <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px' }}>
            <p style={{ fontSize: '12px', color: '#374151' }}>
              Employee: <strong>{employeeName}</strong>
            </p>
            <p style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>
              Cycle: <strong>{cycleName}</strong> ({formatDate(cycleStartDate)} - {formatDate(cycleEndDate)})
            </p>
            <p style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>
              Current Phase: <strong>Phase {currentPhaseNumber}</strong> (Started: {formatDateTime(currentPhaseStartDate)})
            </p>
          </div>

          {/* Date Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              Effective Date and Time of Change
            </label>
            <input
              type="datetime-local"
              min={minDateStr}
              max={maxDateStr}
              value={changeDate}
              onChange={(e) => setChangeDate(e.target.value)}
              disabled={!hasValidDateRange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                outline: 'none',
                fontSize: '13px',
              }}
              required
            />
            <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
              {hasValidDateRange
                ? `Date and time boundary where Phase ${currentPhaseNumber} ends. Phase ${currentPhaseNumber + 1} begins immediately afterward.`
                : currentPhaseStartsAfterCycleEnd
                  ? `No valid date/time is available because Phase ${currentPhaseNumber} begins after the cycle end date (${formatDate(cycleEndDate)}). Please verify the cycle and phase dates before triggering a split.`
                  : currentPhaseStartsInFuture
                    ? `No valid date/time is available yet. The current phase starts on ${formatDateTime(currentPhaseStartDate)}, which is still in the future.`
                    : 'No valid date/time is available yet. The change date cannot be in the future.'}
            </p>
          </div>

          {/* Live Weight Split Preview */}
          {hasValidDateRange && changeDate && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Phase Split Preview
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <div className="flex justify-between" style={{ fontSize: '12px', color: '#1E3A8A' }}>
                <span>Phase {currentPhaseNumber} ends on {formatDateTime(changeDate)}:</span>
                <strong>{currentPhaseDays} days ({currentPhaseWeight}%)</strong>
              </div>
              <div className="flex justify-between" style={{ fontSize: '12px', color: '#1E3A8A' }}>
                <span>Phase {currentPhaseNumber + 1} starts immediately on {formatDateTime(changeDate)}:</span>
                <strong>{nextPhaseDays} days ({nextPhaseWeight}%)</strong>
              </div>
            </div>
          </div>
          )}

          {/* Reason Textarea */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              Reason for Change
            </label>
            <textarea
              rows={3}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Explain the reason for this midcycle split (e.g. organizational changes, role modifications, revised business objectives)..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                outline: 'none',
                fontSize: '13px',
                resize: 'none',
              }}
              required
            />
          </div>

          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 12px' }} className="flex gap-2 items-start">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p style={{ fontSize: '11px', color: '#92400E', lineHeight: '1.4' }}>
              <strong>Important:</strong> Triggering this split will lock the current goals and calculate their score. A new blank draft will be created for Phase {currentPhaseNumber + 1}, and the manager must assign new KPIs.
            </p>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#FFFFFF',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !hasValidDateRange}
              style={{
                background: '#1A56DB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Processing...' : 'Confirm Split'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
