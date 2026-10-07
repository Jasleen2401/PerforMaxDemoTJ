import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useReassignFeedbackRequestMutation } from '../../../features/feedback360/feedback360Api';
import { inputStyle, labelStyle, primaryBtn, smBtn } from '../constants/styles';

interface ReassignModalProps {
  requestId: number;
  onClose: () => void;
}

const ReassignModal = ({ requestId, onClose }: ReassignModalProps) => {
  const [newEvaluatorId, setNewEvaluatorId] = useState('');
  const [reassign, { isLoading }] = useReassignFeedbackRequestMutation();

  const handleSave = async () => {
    const id = parseInt(newEvaluatorId);
    if (!id) return toast.error('Enter a valid employee ID.');
    try {
      await reassign({ requestId, newEvaluatorId: id }).unwrap();
      toast.success('Request reassigned.');
      onClose();
    } catch {
      toast.error('Reassignment failed.');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#FFFFFF', borderRadius: 12, width: 380, border: '0.5px solid #E4E6EC', boxShadow: '0 12px 40px rgba(0,0,0,0.14)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '0.5px solid #E4E6EC' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Reassign Request</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9EA3B0' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '16px 18px' }}>
          <label style={labelStyle}>New Evaluator Employee ID</label>
          <input
            type="number"
            value={newEvaluatorId}
            onChange={(e) => setNewEvaluatorId(e.target.value)}
            placeholder="Enter employee ID"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: '0.5px solid #E4E6EC' }}>
          <button style={{ ...smBtn('neutral'), padding: '7px 14px', fontSize: 13 }} onClick={onClose}>Cancel</button>
          <button style={primaryBtn(isLoading)} onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            Reassign
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Form slots ─────────────────────────────────────────────────────────────────

export default ReassignModal;
