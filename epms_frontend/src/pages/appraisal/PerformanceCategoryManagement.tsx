import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useGetPerformanceCategoriesQuery,
  useCreatePerformanceCategoryMutation,
  useUpdatePerformanceCategoryMutation,
  useDeletePerformanceCategoryMutation
} from '../../features/appraisal/performanceCategoryApi';
import type { PerformanceCategory, PerformanceGrade } from '../../types/appraisal';
import { Plus, Trash2, Edit2, Layers, Target, BarChart3, X, Check } from 'lucide-react';
import { Can } from '../../components/Can';

const GRADES: PerformanceGrade[] = [
  'OUTSTANDING', 'EXCEEDS_EXPECTATIONS', 'MEETS_EXPECTATIONS', 'NEEDS_IMPROVEMENT', 'UNSATISFACTORY'
];

const inputStyle: React.CSSProperties = {
  background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8,
  padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5,
};

const PerformanceCategoryManagement: React.FC = () => {
  const { data: response, isLoading } = useGetPerformanceCategoriesQuery();
  const categories = response?.data || [];
  const [createCategory] = useCreatePerformanceCategoryMutation();
  const [updateCategory] = useUpdatePerformanceCategoryMutation();
  const [deleteCategory] = useDeletePerformanceCategoryMutation();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({ name: '', minScore: 0, maxScore: 100, ratingValue: 3, grade: 'MEETS_EXPECTATIONS', description: '' });

  const handleOpenAdd = () => { setEditingId(null); setFormData({ name: '', minScore: 0, maxScore: 100, ratingValue: 3, grade: 'MEETS_EXPECTATIONS', description: '' }); setShowModal(true); };
  const handleOpenEdit = (category: PerformanceCategory) => { setEditingId(category.id!); setFormData({ ...category }); setShowModal(true); };

  const handleSubmit = async () => {
    if (!formData.name || formData.minScore === undefined || formData.maxScore === undefined) { toast.warning('Please fill required fields'); return; }
    try {
      const cleanedCategory = {
        ...formData,
        minScore: formData.minScore === '' ? 0 : Number(formData.minScore),
        maxScore: formData.maxScore === '' ? 0 : Number(formData.maxScore),
        ratingValue: formData.ratingValue === '' ? 1 : Number(formData.ratingValue)
      };
      if (editingId) await updateCategory({ id: editingId, category: cleanedCategory }).unwrap();
      else await createCategory(cleanedCategory).unwrap();
      setShowModal(false);
    } catch { toast.error('Failed to save performance category'); }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this category? This may affect final appraisal calculations.')) await deleteCategory(id);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Performance Categories</h1>
          <p style={{ fontSize: 13, color: '#9EA3B0', marginTop: 2 }}>Define grading bands and score ranges for final appraisals.</p>
        </div>
        <Can permission="CYCLE_CONFIG_MANAGE">
          <button onClick={handleOpenAdd} className="inline-flex items-center gap-2 transition-colors self-start sm:self-auto"
            style={{ background: '#1A56DB', color: '#FFFFFF', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, border: 'none' }}>
            <Plus size={14} /> Add Category
          </button>
        </Can>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Categories', value: categories.length, icon: Layers, bg: '#EEF3FD', color: '#1A56DB' },
          { label: 'Score System', value: '0 – 100 Scale', icon: Target, bg: '#EAF3DE', color: '#27500A' },
          { label: 'Rating Range', value: '1 – 5 Values', icon: BarChart3, bg: '#FAEEDA', color: '#633806' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#111827' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #E4E6EC' }}>
                {['Grade Name', 'Score Range', 'Rating', 'System Enum', ''].map((h, i) => (
                  <th key={h + i} style={{ padding: '10px 18px', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading…</td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>No performance categories defined.</td></tr>
              ) : categories.map((cat, idx) => (
                <tr key={cat.id} style={{ borderBottom: idx < categories.length - 1 ? '0.5px solid #F0F2F6' : 'none' }}
                  className="hover:bg-[#FAFBFF] transition-colors">
                  <td style={{ padding: '11px 18px' }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{cat.name}</p>
                    <p style={{ fontSize: 11, color: '#9EA3B0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{cat.description}</p>
                  </td>
                  <td style={{ padding: '11px 18px' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, background: '#EEF3FD', color: '#0C447C', border: '0.5px solid #B5D4F4', borderRadius: 6, padding: '2px 8px' }}>
                      {cat.minScore} – {cat.maxScore}
                    </span>
                  </td>
                  <td style={{ padding: '11px 18px' }}>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} style={{ width: 5, height: 14, borderRadius: 3, background: i < cat.ratingValue ? '#1A56DB' : '#E4E6EC' }} />
                      ))}
                      <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 500, color: '#111827' }}>{cat.ratingValue}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 18px' }}>
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#444441', background: '#F1EFE8', border: '0.5px solid #DDDBD2', borderRadius: 6, padding: '2px 8px' }}>
                      {cat.grade}
                    </span>
                  </td>
                  <td style={{ padding: '11px 18px', textAlign: 'right' }}>
                    <Can permission="CYCLE_CONFIG_MANAGE">
                      <div className="flex justify-end items-center gap-1">
                        <button onClick={() => handleOpenEdit(cat)} title="Edit"
                          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9EA3B0', borderRadius: 6 }}
                          className="hover:bg-[#EEF3FD] hover:text-[#1A56DB] transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(cat.id!)} title="Delete"
                          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9EA3B0', borderRadius: 6 }}
                          className="hover:bg-[#FCEBEB] hover:text-[#791F1F] transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </Can>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.5)' }}>
          <div onClick={() => setShowModal(false)} className="absolute inset-0" />
          <div style={{ position: 'relative', background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between" style={{ padding: '14px 18px', borderBottom: '0.5px solid #E4E6EC' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{editingId ? 'Edit Category' : 'New Category'}</p>
                <p style={{ fontSize: 12, color: '#9EA3B0' }}>Configure how scores translate to performance grades.</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ color: '#9EA3B0' }} className="hover:text-[#111827] transition-colors">
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '16px 18px', overflowY: 'auto' }} className="space-y-4">
              <div>
                <label style={labelStyle}>Display Name</label>
                <input type="text" style={inputStyle} placeholder="e.g. Outstanding Performance"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Min Score (0-100)</label>
                  <input type="number" min="0" style={{ ...inputStyle, textAlign: 'right' }} value={formData.minScore === '' ? '' : formData.minScore}
                    onKeyDown={e => {
                      if (e.key === '-') {
                        e.preventDefault();
                      }
                    }}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, minScore: val === '' ? '' : Math.max(0, Number(val)) });
                    }} />
                </div>
                <div>
                  <label style={labelStyle}>Max Score (0-100)</label>
                  <input type="number" min="0" style={{ ...inputStyle, textAlign: 'right' }} value={formData.maxScore === '' ? '' : formData.maxScore}
                    onKeyDown={e => {
                      if (e.key === '-') {
                        e.preventDefault();
                      }
                    }}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, maxScore: val === '' ? '' : Math.max(0, Number(val)) });
                    }} />
                </div>
                <div>
                  <label style={labelStyle}>Rating Value (1-5)</label>
                  <input type="number" min="1" max="5" style={{ ...inputStyle, textAlign: 'right' }} value={formData.ratingValue === '' ? '' : formData.ratingValue}
                    onKeyDown={e => {
                      if (e.key === '-') {
                        e.preventDefault();
                      }
                    }}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, ratingValue: val === '' ? '' : Math.max(0, Number(val)) });
                    }} />
                </div>
                <div>
                  <label style={labelStyle}>System Grade</label>
                  <select style={inputStyle} value={formData.grade}
                    onChange={e => setFormData({ ...formData, grade: e.target.value as PerformanceGrade })}>
                    {GRADES.map(pg => <option key={pg} value={pg}>{pg}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea rows={3} style={{ ...inputStyle, resize: 'none', height: 72 }}
                  placeholder="Describe the characteristics of this performance level…"
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2" style={{ padding: '14px 18px', borderTop: '0.5px solid #E4E6EC' }}>
              <button onClick={() => setShowModal(false)} className="flex-1 transition-colors"
                style={{ background: '#F5F6F8', color: '#5A6070', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleSubmit} className="flex-[2] inline-flex items-center justify-center gap-2 transition-colors"
                style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 500 }}>
                <Check size={13} /> {editingId ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceCategoryManagement;
