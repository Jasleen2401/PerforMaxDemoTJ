import { AlertTriangle } from 'lucide-react';

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmBtnText?: string;
  confirmBtnBg?: string;
}

interface ConfirmModalProps {
  confirmModal: ConfirmModalState;
  onClose: () => void;
}

const ConfirmModal = ({ confirmModal, onClose }: ConfirmModalProps) => {
  if (!confirmModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.5)' }}>
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '24px', maxWidth: 400, width: '100%' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={16} style={{ color: '#D97706' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>{confirmModal.title}</p>
        </div>
        <p style={{ fontSize: 13, color: '#5A6070', marginBottom: 20 }}>{confirmModal.message}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: '#F5F6F8',
              color: '#111827',
              border: '0.5px solid #E0E2E8',
              borderRadius: 8,
              padding: '8px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              confirmModal.onConfirm();
              onClose();
            }}
            style={{
              flex: 1,
              background: confirmModal.confirmBtnBg || '#791F1F',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '8px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {confirmModal.confirmBtnText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
