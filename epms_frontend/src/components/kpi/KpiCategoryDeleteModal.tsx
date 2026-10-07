import React from 'react';
import { Trash2 } from 'lucide-react';
import type { KpiCategory } from '../../features/kpi/kpiTypes';

interface KpiCategoryDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  categoryToDelete: KpiCategory | null;
  isDeleting: boolean;
}

const KpiCategoryDeleteModal: React.FC<KpiCategoryDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  categoryToDelete,
  isDeleting
}) => {
  if (!isOpen || !categoryToDelete) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.5)' }}>
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
        <div style={{ padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: '#DC2626' }}>
            <Trash2 size={22} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Delete KPI Category</h3>
          <p style={{ fontSize: 13, color: '#5A6070', lineHeight: '20px', marginBottom: 24 }}>
            Are you sure you want to delete <strong style={{ color: '#111827' }}>{categoryToDelete.categoryName || categoryToDelete.name}</strong>? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button type="button" onClick={onClose} disabled={isDeleting}
              style={{ flex: 1, padding: '9px 16px', fontSize: 13, fontWeight: 500, color: '#5A6070', background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 8, cursor: isDeleting ? 'not-allowed' : 'pointer' }}
              className="hover:bg-[#F9FAFC] transition-colors">
              Cancel
            </button>
            <button type="button" onClick={onConfirm} disabled={isDeleting}
              style={{ flex: 1, padding: '9px 16px', fontSize: 13, fontWeight: 500, color: '#FFFFFF', background: '#DC2626', border: 'none', borderRadius: 8, cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.6 : 1 }}
              className="hover:bg-[#B91C1C] transition-colors">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KpiCategoryDeleteModal;
