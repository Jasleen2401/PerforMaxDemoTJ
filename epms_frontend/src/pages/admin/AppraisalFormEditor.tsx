import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetAppraisalFormQuery,
  useCreateAppraisalFormMutation,
  useUpdateAppraisalFormMutation
} from '../../features/appraisal/appraisalApi';
import type { FormTemplate, FormSection, FormQuestion } from '../../types/form';

const inputStyle: React.CSSProperties = { background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 };

const AppraisalFormEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [form, setForm] = useState<Partial<FormTemplate>>({
    title: '', description: '', sections: [], totalWeightage: 0, status: 'DRAFT',
  });

  const { data: existingForm, isLoading: isFetching } = useGetAppraisalFormQuery(id!, { skip: !isEditMode });
  const [createForm, { isLoading: isCreating }] = useCreateAppraisalFormMutation();
  const [updateForm, { isLoading: isUpdating }] = useUpdateAppraisalFormMutation();
  const isLoading = isFetching || isCreating || isUpdating;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingForm) {
      setForm({
        id: existingForm.id,
        title: existingForm.title,
        description: existingForm.description || '',
        sections: existingForm.sections?.map(s => ({
          id: s.id ?? '', title: s.title ?? '', description: s.description || '', weightage: s.weightage || 0,
          questions: s.questions?.map(q => ({
            id: q.id ?? '', text: q.text ?? '', type: q.type as any, required: q.required, weightage: q.weightage || 0
          })) || []
        })) || [],
        totalWeightage: 0,
        status: 'DRAFT'
      });
    }
  }, [existingForm]);

  const handleSave = async () => {
    if (!form.title) { setError('Title is required.'); return; }
    const payload: Partial<FormTemplate> = {
      title: form.title, description: form.description || '',
      sections: form.sections?.map(s => ({
        id: s.id, title: s.title, weightage: s.weightage === '' ? 0 : Number(s.weightage),
        questions: s.questions.map(q => ({ id: q.id, text: q.text, type: q.type, required: q.required, weightage: q.weightage === '' ? 0 : Number(q.weightage) }))
      }))
    };
    try {
      if (isEditMode && id) { await updateForm({ id, body: payload }).unwrap(); }
      else { await createForm(payload).unwrap(); }
      navigate('/appraisal-forms');
    } catch (err) {
      setError('Failed to save form template.');
      console.error(err);
    }
  };

  const addSection = () => {
    const newSection: FormSection = { id: Math.random().toString(36).substr(2, 9), title: 'New Section', questions: [], weightage: 0 };
    setForm({ ...form, sections: [...(form.sections || []), newSection] });
  };

  const removeSection = (sectionId: string) => {
    setForm({ ...form, sections: (form.sections || []).filter(s => s.id !== sectionId) });
  };

  const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
    setForm({ ...form, sections: (form.sections || []).map(s => s.id === sectionId ? { ...s, ...updates } : s) });
  };

  const addQuestion = (sectionId: string) => {
    const newQuestion: FormQuestion = { id: Math.random().toString(36).substr(2, 9), text: 'New Question', type: 'RATING', required: true, weightage: 0 };
    setForm({ ...form, sections: (form.sections || []).map(s => s.id === sectionId ? { ...s, questions: [...s.questions, newQuestion] } : s) });
  };

  const removeQuestion = (sectionId: string, questionId: string) => {
    setForm({ ...form, sections: (form.sections || []).map(s => s.id === sectionId ? { ...s, questions: s.questions.filter(q => q.id !== questionId) } : s) });
  };

  const updateQuestion = (sectionId: string, questionId: string, updates: Partial<FormQuestion>) => {
    setForm({
      ...form,
      sections: (form.sections || []).map(s => s.id === sectionId
        ? { ...s, questions: s.questions.map(q => q.id === questionId ? { ...q, ...updates } : q) }
        : s)
    });
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>
            {isEditMode ? 'Edit Appraisal Form' : 'Create New Appraisal Form'}
          </h1>
          <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>Define sections and questions for this template.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/appraisal-forms')}
            style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, color: '#5A6070', background: '#F5F6F8', border: '0.5px solid #E4E6EC', borderRadius: 8, cursor: 'pointer' }}
            className="hover:border-[#9EA3B0] transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isLoading}
            style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: isLoading ? 0.6 : 1 }}
            className="hover:opacity-90 transition-opacity">
            {isLoading ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: '#FCEBEB', border: '0.5px solid #F5BFBF', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#791F1F' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ fontSize: 16, color: '#791F1F', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* General Settings */}
      <section style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '18px 20px' }}>
        <h2 style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 14 }}>General Settings</h2>
        <div className="space-y-4">
          <div>
            <label style={labelStyle}>Form Title</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              style={inputStyle} placeholder="e.g., Annual Performance Appraisal 2024" />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle, resize: 'none', minHeight: 72 }} rows={3}
              placeholder="Provide context for employees and managers..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} style={inputStyle}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Total Weightage (%)</label>
              <input type="number" value={form.totalWeightage} readOnly
                style={{ ...inputStyle, background: '#F1EFE8', color: '#5A6070', cursor: 'not-allowed' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Sections & Questions */}
      <div className="space-y-3">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Sections & Questions</h2>
          <button onClick={addSection}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, fontWeight: 500, background: '#EEF3FD', color: '#0C447C', border: '0.5px solid #B5D4F4', borderRadius: 8, cursor: 'pointer' }}
            className="hover:bg-[#D6E8F9] transition-colors">
            <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Section
          </button>
        </div>

        {form.sections?.map(section => (
          <div key={section.id} style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
            {/* Section header */}
            <div style={{ background: '#F5F6F8', borderBottom: '0.5px solid #E4E6EC', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, display: 'flex', gap: 12, alignItems: 'center' }}>
                <input type="text" value={section.title}
                  onChange={e => updateSection(section.id, { title: e.target.value })}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 500, color: '#111827', fontFamily: 'inherit' }}
                  placeholder="Section Title" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: '#9EA3B0' }}>Weight %</span>
                  <input type="number" min="0" value={section.weightage === '' ? '' : section.weightage}
                    onKeyDown={e => {
                      if (e.key === '-') {
                        e.preventDefault();
                      }
                    }}
                    onChange={e => {
                      const val = e.target.value;
                      updateSection(section.id, { weightage: val === '' ? '' : Math.max(0, Number(val)) } as any);
                    }}
                    style={{ width: 64, background: '#FFFFFF', border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: '#111827', outline: 'none', fontFamily: 'inherit', textAlign: 'right' }} />
                </div>
              </div>
              <button onClick={() => removeSection(section.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: 'none', border: '0.5px solid #E4E6EC', color: '#9EA3B0', cursor: 'pointer', flexShrink: 0 }}
                className="hover:border-[#F5BFBF] hover:text-[#791F1F] transition-colors">
                <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Questions */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {section.questions.map(q => (
                <div key={q.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#F5F6F8', border: '0.5px solid #E4E6EC', borderRadius: 8, alignItems: 'flex-start' }}
                  className="group/question">
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="text" value={q.text}
                      onChange={e => updateQuestion(section.id, q.id, { text: e.target.value })}
                      style={{ background: '#FFFFFF', border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#111827', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                      placeholder="Question text..." />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <select value={q.type} onChange={e => updateQuestion(section.id, q.id, { type: e.target.value as any })}
                        style={{ background: '#FFFFFF', border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: '#5A6070', outline: 'none', fontFamily: 'inherit' }}>
                        <option value="RATING">Rating (1-5)</option>
                        <option value="TEXT">Text Answer</option>
                        <option value="NUMBER">Number</option>
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#5A6070', cursor: 'pointer' }}>
                        <input type="checkbox" checked={q.required}
                          onChange={e => updateQuestion(section.id, q.id, { required: e.target.checked })}
                          style={{ accentColor: '#1A56DB' }} />
                        Required
                      </label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <input type="number" min="0" value={q.weightage === '' ? '' : q.weightage}
                      onKeyDown={e => {
                        if (e.key === '-') {
                          e.preventDefault();
                        }
                      }}
                      onChange={e => {
                        const val = e.target.value;
                        updateQuestion(section.id, q.id, { weightage: val === '' ? '' : Math.max(0, Number(val)) } as any);
                      }}
                      style={{ width: 58, background: '#FFFFFF', border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: '#111827', outline: 'none', fontFamily: 'inherit', textAlign: 'right' }}
                      placeholder="W %" />
                    <button onClick={() => removeQuestion(section.id, q.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: 'none', border: '0.5px solid #E4E6EC', color: '#9EA3B0', cursor: 'pointer' }}
                      className="hover:border-[#F5BFBF] hover:text-[#791F1F] transition-colors">
                      <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              <button onClick={() => addQuestion(section.id)}
                style={{ width: '100%', padding: '9px', border: '2px dashed #E4E6EC', borderRadius: 8, background: 'none', fontSize: 12, color: '#9EA3B0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}
                className="hover:border-[#B5D4F4] hover:text-[#0C447C] transition-colors">
                <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Question
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppraisalFormEditor;
