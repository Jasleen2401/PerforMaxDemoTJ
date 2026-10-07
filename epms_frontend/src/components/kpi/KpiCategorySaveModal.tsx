import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { KpiCategory } from '../../features/kpi/kpiTypes';

interface KpiCategorySaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  editingCategory: KpiCategory | null;
  isSaving: boolean;
}

const inputStyle: React.CSSProperties = {
  background: '#F5F6F8',
  border: '0.5px solid #E0E2E8',
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: 13,
  color: '#111827',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit'
};

const KpiCategorySaveModal: React.FC<KpiCategorySaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCategory,
  isSaving
}) => {
  const [formName, setFormName] = useState('');

  useEffect(() => {
    if (editingCategory) {
      setFormName(editingCategory.categoryName || editingCategory.name || '');
    } else {
      setFormName('');
    }
  }, [editingCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formName);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.5)' }}>
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, width: '100%', maxWidth: 420, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #E4E6EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111827' }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: '#FFFFFF' }}>
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </h3>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}
            className="hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '18px 20px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Category Name *
          </label>
          <input type="text" required value={formName} onChange={e => setFormName(e.target.value)}
            placeholder="e.g. Technical Excellence" style={inputStyle} />
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#5A6070', background: '#F5F6F8', border: '0.5px solid #E4E6EC', borderRadius: 8, cursor: 'pointer' }}
              className="hover:border-[#9EA3B0] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSaving}
              style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: isSaving ? 0.6 : 1 }}
              className="hover:opacity-90 transition-opacity">
              {isSaving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KpiCategorySaveModal;
