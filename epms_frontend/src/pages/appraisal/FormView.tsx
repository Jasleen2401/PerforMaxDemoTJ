import { useParams, useNavigate } from 'react-router-dom';
import { useGetAppraisalFormQuery } from '../../features/appraisal/appraisalApi';
import { ChevronLeft, FileText, Calendar, Layers, CheckCircle2, Edit3 } from 'lucide-react';

const FormView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: form, isLoading, error } = useGetAppraisalFormQuery(id || '', { skip: !id });

  if (isLoading) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading template…</div>
  );

  if (error || !form) return (
    <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '48px 24px', textAlign: 'center', maxWidth: 420, margin: '32px auto' }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, background: '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <FileText size={20} style={{ color: '#791F1F' }} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 6 }}>Template Not Found</p>
      <p style={{ fontSize: 13, color: '#9EA3B0', marginBottom: 18 }}>The form could not be retrieved. It may have been deleted or moved.</p>
      <button onClick={() => navigate('/appraisal')}
        style={{ background: '#111827', color: '#FFFFFF', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none' }}>
        Return to Hub
      </button>
    </div>
  );

  const getSetName = (formName: string) => {
    const idx = formName.indexOf(' | ');
    return idx >= 0 ? formName.slice(0, idx).trim() : '__unassigned__';
  };

  const totalQuestions = (form.categories || []).reduce(
    (acc: number, cat: any) => acc + (cat.questions?.length || 0), 0
  );

  const renderRatingOptions = (type: string) => {
    if (type === 'RATING') return (
      <div className="flex gap-1.5">
        {[5, 4, 3, 2, 1].map(n => (
          <div key={n} style={{ width: 32, height: 32, border: '0.5px solid #E0E2E8', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#9EA3B0', background: '#F5F6F8' }}>{n}</div>
        ))}
      </div>
    );
    if (type === 'YESNO') return (
      <div className="flex gap-2">
        {['Yes', 'No'].map(opt => (
          <div key={opt} style={{ border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '4px 14px', fontSize: 12, fontWeight: 500, color: '#9EA3B0', background: '#F5F6F8' }}>{opt}</div>
        ))}
      </div>
    );
    if (type === 'TEXT') return (
      <div style={{ height: 32, border: '0.5px dashed #E0E2E8', borderRadius: 6, background: '#F5F6F8' }} />
    );
    return null;
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/appraisal', { state: { activeTab: 'forms', expandedCycle: form.cycleName, expandedSet: getSetName(form.formName) } })}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #E4E6EC', borderRadius: 8, background: '#FFFFFF', color: '#5A6070' }}
            className="hover:bg-[#F5F6F8] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Template Review</h1>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 1 }}>
              {form.cycleName} &bull; {getSetName(form.formName)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!form.isAssigned && (
            <button
              onClick={() => navigate(`/appraisal/design-form?cycleId=${form.cycleId}&type=${form.formType}&setName=${encodeURIComponent(getSetName(form.formName))}&formId=${form.formId}&edit=true`)}
              className="inline-flex items-center gap-2 transition-colors"
              style={{ background: '#EEF3FD', color: '#1A56DB', border: '0.5px solid #B5D4F4', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500 }}>
              <Edit3 size={13} /> Edit Structure
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main content */}
        <div className="lg:col-span-8 space-y-4">

          {/* Document header */}
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '20px 24px', borderBottom: '2px solid #111827' }}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <h2 style={{ fontSize: 22, fontWeight: 500, color: '#111827', maxWidth: 480 }}>
                {form.formName?.split(' | ')[1] || form.formName}
              </h2>
              <div className="inline-flex items-center gap-1.5"
                style={{ background: '#EAF3DE', color: '#27500A', border: '0.5px solid #B8DCA0', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 500 }}>
                <CheckCircle2 size={12} /> Active Template
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Calendar size={13} style={{ color: '#9EA3B0' }} />
                <span style={{ fontSize: 12, color: '#5A6070' }}>{form.cycleName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers size={13} style={{ color: '#9EA3B0' }} />
                <span style={{ fontSize: 12, color: '#5A6070' }}>{getSetName(form.formName)} Group</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 500, background: '#111827', color: '#FFFFFF', borderRadius: 20, padding: '2px 8px' }}>
                {form.formType?.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Form categories */}
          {(form.categories || []).map((cat: any, cIdx: number) => (
            <div key={cat.categoryId} style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
              {/* Category header */}
              <div className="flex items-center gap-3" style={{ padding: '12px 18px', borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF' }}>
                <div style={{ width: 28, height: 28, border: '0.5px solid #111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#111827', flexShrink: 0 }}>
                  {cIdx + 1}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat.categoryName}</span>
                <div style={{ flex: 1, height: '0.5px', background: '#E4E6EC' }} />
              </div>

              {/* Questions */}
              <div>
                {(cat.questions || []).map((q: any, qIdx: number) => (
                  <div key={qIdx} style={{ padding: '14px 18px', borderBottom: qIdx < cat.questions.length - 1 ? '0.5px solid #F0F2F6' : 'none' }}>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div style={{ flex: 1, maxWidth: 480 }}>
                        <div className="flex items-start gap-2">
                          <span style={{ fontSize: 11, color: '#9EA3B0', fontWeight: 500, marginTop: 1, flexShrink: 0 }}>{qIdx + 1}.</span>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#5A6070' }}>
                            {q.questionText}
                            {q.isRequired && <span style={{ color: '#791F1F', marginLeft: 3 }}>*</span>}
                          </p>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, minWidth: 200 }} className="space-y-3">
                        {q.secondaryQuestionType && q.secondaryQuestionType !== 'NONE' && (
                          <div>
                            <p style={{ fontSize: 9, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                              {q.secondaryQuestionType} Selection
                            </p>
                            {renderRatingOptions(q.secondaryQuestionType)}
                          </div>
                        )}
                        <div>
                          <p style={{ fontSize: 9, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                            {q.questionType} Rating
                          </p>
                          {renderRatingOptions(q.questionType)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Signature */}
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '20px 24px' }}>
            <div className="flex flex-wrap justify-between items-end gap-4">
              <div>
                <div style={{ width: 200, height: '0.5px', background: '#5A6070', marginBottom: 8 }} />
                <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>HR Administrator Signature</p>
              </div>
              <p style={{ fontSize: 11, color: '#9EA3B0', fontStyle: 'italic' }}>
                Generated {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          <div className="sticky top-4 space-y-4">
            <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Template Metadata</p>
              <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 14 }}>
                <div style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ fontSize: 9, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', marginBottom: 4 }}>Sections</p>
                  <p style={{ fontSize: 20, fontWeight: 500, color: '#111827' }}>{form.categories?.length || 0}</p>
                </div>
                <div style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ fontSize: 9, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', marginBottom: 4 }}>Questions</p>
                  <p style={{ fontSize: 20, fontWeight: 500, color: '#111827' }}>{totalQuestions}</p>
                </div>
              </div>
              <div style={{ paddingTop: 12, borderTop: '0.5px solid #F0F2F6' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#5A6070' }}>Weighted Max</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1A56DB' }}>{totalQuestions * 5}.0</span>
                </div>
                <div style={{ background: '#F0F2F6', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#1A56DB', width: '100%' }} />
                </div>
              </div>
            </div>

            <div style={{ background: '#1A56DB', border: 'none', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#FFFFFF', marginBottom: 6 }}>Admin Note</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                This template is locked for the {form.cycleName} cycle. Changes propagate to all assigned employees immediately.
              </p>
            </div>
          </div>
        </div>
     </div>
    </div>
  );
};

export default FormView;
