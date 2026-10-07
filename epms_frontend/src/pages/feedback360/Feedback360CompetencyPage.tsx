import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Check, X, Loader2, AlertCircle } from 'lucide-react';
import {
  useGetCompetenciesQuery,
  useCreateCompetencyMutation,
  useUpdateCompetencyMutation,
  useDeleteCompetencyMutation,
} from '../../features/feedback360/feedback360Api';
import type { Competency } from '../../features/feedback360/feedback360Types';

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
  padding: '7px 10px', outline: 'none', width: '100%',
  boxSizing: 'border-box' as const,
};

const iconBtn = (color = '#5A6070'): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 6,
  background: 'none', border: 'none',
  cursor: 'pointer', color,
});

// ── Inline editor row ──────────────────────────────────────────────────────────

interface EditorRowProps {
  initial?: Partial<Competency>;
  onSave: (name: string, description: string) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const EditorRow = ({ initial, onSave, onCancel, isSaving }: EditorRowProps) => {
  const [name, setName]             = useState(initial?.name ?? '');
  const [description, setDesc]      = useState(initial?.description ?? '');

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required.'); return; }
    await onSave(name.trim(), description.trim());
  };

  return (
    <tr style={{ background: '#F0F6FF' }}>
      <td style={{ padding: '8px 10px' }}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
          placeholder="Competency name"
          style={inputStyle}
        />
      </td>
      <td style={{ padding: '8px 10px' }}>
        <input
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
          placeholder="Description (optional)"
          style={inputStyle}
        />
      </td>
      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
        <button style={iconBtn('#059669')} onClick={handleSave} disabled={isSaving} title="Save">
          {isSaving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
        </button>
        <button style={iconBtn('#9EA3B0')} onClick={onCancel} title="Cancel">
          <X size={14} />
        </button>
      </td>
    </tr>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────

const Feedback360CompetencyPage = () => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  const { data: competencies = [], isLoading, isError } = useGetCompetenciesQuery();
  const [create, { isLoading: creating }] = useCreateCompetencyMutation();
  const [update, { isLoading: updating }] = useUpdateCompetencyMutation();
  const [remove, { isLoading: removing }] = useDeleteCompetencyMutation();

  const handleCreate = async (name: string, description: string) => {
    try {
      await create({ name, description }).unwrap();
      toast.success('Competency created.');
      setAddingNew(false);
    } catch {
      toast.error('Failed to create competency.');
    }
  };

  const handleUpdate = async (id: number, name: string, description: string) => {
    try {
      await update({ id, name, description }).unwrap();
      toast.success('Competency updated.');
      setEditingId(null);
    } catch {
      toast.error('Failed to update competency.');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete competency "${name}"?`)) return;
    try {
      await remove(id).unwrap();
      toast.success('Competency deleted.');
    } catch {
      toast.error('Failed to delete competency.');
    }
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Competencies</h1>
          <p style={{ fontSize: 13, color: '#9EA3B0', marginTop: 4 }}>
            Manage competency tags used to group 360° feedback questions.
          </p>
        </div>
        <button
          onClick={() => { setAddingNew(true); setEditingId(null); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 500, color: '#FFFFFF',
            background: '#1A56DB', border: 'none', borderRadius: 8,
            padding: '8px 14px', cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Add Competency
        </button>
      </div>

      <div style={panel}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9EA3B0' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Loading…</span>
          </div>
        ) : isError ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#791F1F' }}>
            <AlertCircle size={15} />
            <span style={{ fontSize: 13 }}>Failed to load competencies.</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E4E6EC', background: '#FAFBFC' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#5A6070', fontSize: 11, textTransform: 'uppercase' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#5A6070', fontSize: 11, textTransform: 'uppercase' }}>Description</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {addingNew && (
                <EditorRow
                  onSave={handleCreate}
                  onCancel={() => setAddingNew(false)}
                  isSaving={creating}
                />
              )}
              {competencies.length === 0 && !addingNew && (
                <tr>
                  <td colSpan={3} style={{ padding: '24px 0', textAlign: 'center', color: '#9EA3B0', fontSize: 13 }}>
                    No competencies yet. Click "Add Competency" to create one.
                  </td>
                </tr>
              )}
              {competencies.map((c, i) =>
                editingId === c.id ? (
                  <EditorRow
                    key={c.id}
                    initial={c}
                    onSave={(name, desc) => handleUpdate(c.id, name, desc)}
                    onCancel={() => setEditingId(null)}
                    isSaving={updating}
                  />
                ) : (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: '0.5px solid #F0F2F8',
                      background: i % 2 === 0 ? '#FAFBFC' : '#FFFFFF',
                    }}
                  >
                    <td style={{ padding: '10px 10px', fontWeight: 500, color: '#111827' }}>
                      {c.name}
                      {!c.isActive && (
                        <span style={{ marginLeft: 8, fontSize: 10, color: '#9EA3B0', fontWeight: 400 }}>Inactive</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#5A6070' }}>{c.description ?? '—'}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      <button
                        style={iconBtn('#1A56DB')}
                        onClick={() => { setEditingId(c.id); setAddingNew(false); }}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        style={iconBtn('#791F1F')}
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={removing}
                        title="Delete"
                      >
                        {removing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Feedback360CompetencyPage;
