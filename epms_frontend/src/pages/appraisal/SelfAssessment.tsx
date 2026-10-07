import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  useGetSelfAssessmentFormQuery,
  useSaveSelfAssessmentAnswersMutation,
  useSubmitSelfAssessmentMutation,
  useSaveDraftMutation,
} from '../../features/appraisal/appraisalApi';
import { useGetEmployeeAssessmentQuery } from '../../features/appraisal/appraisalApi';
import { useDownloadReportMutation } from '../../features/report/reportApi';
import { User, ChevronLeft, Target, Save, Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const RATING_SCALE = [
  { v: 1, label: 'Unsatisfactory', color: '#791F1F' },
  { v: 2, label: 'Needs improvement', color: '#633806' },
  { v: 3, label: 'Meet requirement', color: '#444441' },
  { v: 4, label: 'Good', color: '#27500A' },
  { v: 5, label: 'Outstanding',    color: '#0C447C' },
];

const inputStyle: React.CSSProperties = {
  background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8,
  padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box',
};

const SelfAssessment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: formData, isLoading } = useGetSelfAssessmentFormQuery(id || '', { skip: !id });
  const [saveAnswers, { isLoading: isSaving }] = useSaveSelfAssessmentAnswersMutation();
  const [submitSelfAssessment, { isLoading: isSubmitting }] = useSubmitSelfAssessmentMutation();
  const [saveDraftMutation, { isLoading: isDrafting }] = useSaveDraftMutation();
  const [downloadReport, { isLoading: isExporting }] = useDownloadReportMutation();

  const { data: appraisalDetail } = useGetEmployeeAssessmentQuery(id || '', { skip: !id });

  const [responses, setResponses] = useState<Record<string, { ratingValue: number; isCompleted: boolean | null; comment?: string }>>({});
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (formData?.categories) {
      const initial: Record<string, { ratingValue: number; isCompleted: boolean | null; comment?: string }> = {};
      formData.categories.forEach((cat: any) => {
        cat.questions.forEach((q: any) => {
          initial[q.questionId] = {
            ratingValue: q.ratingValue || 0,
            isCompleted: q.isCompleted ?? null,
            comment: q.comment || '',
          };
        });
      });
      setResponses(initial);
      setComment(formData.overallReflection || '');
    }
  }, [formData]);

  const totalQuestions = useMemo(() =>
    formData?.categories?.reduce((acc: number, s: any) => acc + s.questions.length, 0) || 0,
    [formData]);
  const completedCount = useMemo(() =>
    Object.values(responses).filter(r => r.ratingValue > 0).length,
    [responses]);

  const handleRatingChange = (qId: string, val: number) => setResponses(p => ({ ...p, [qId]: { ...p[qId], ratingValue: val } }));
  const handleCompletionChange = (qId: string, val: boolean) => setResponses(p => ({ ...p, [qId]: { ...p[qId], isCompleted: val } }));
  const handleCommentChange = (qId: string, val: string) => setResponses(p => ({ ...p, [qId]: { ...p[qId], comment: val } }));

  const buildPayload = () => Object.keys(responses).map(qId => ({
    questionId: isNaN(Number(qId)) ? qId : Number(qId),
    ratingValue: responses[qId].ratingValue,
    isCompleted: true,
    comment: responses[qId].comment || null,
  }));

  const handleSaveDraft = async () => {
    if (!formData?.selfAssessmentId) return;
    try {
      await saveAnswers({ id: formData.selfAssessmentId, answers: buildPayload() }).unwrap();
      await saveDraftMutation({ selfAssessmentId: formData.selfAssessmentId, overallReflection: comment }).unwrap();
      toast.success('Draft saved!');
    } catch (err: any) { toast.error('Save failed.'); }
  };

  const handleSubmit = async () => {
    if (completedCount < totalQuestions) { toast.warning('Please answer all questions before submitting.'); return; }
    try {
      await saveAnswers({ id: formData.selfAssessmentId, answers: buildPayload() }).unwrap();
      await saveDraftMutation({ selfAssessmentId: formData.selfAssessmentId, overallReflection: comment }).unwrap();
      await submitSelfAssessment(formData.selfAssessmentId).unwrap();
      toast.success('Self-assessment submitted!');
      navigate('/appraisal');
    } catch (err: any) { toast.error('Submit failed.'); }
  };

  if (isLoading) return <div className="py-16 text-center" style={{ color: '#9EA3B0', fontSize: 13 }}>Loading…</div>;
  if (!formData) return (
    <div style={{ background: '#FCEBEB', border: '0.5px solid #F5C2C2', borderRadius: 12, padding: '16px 18px', fontSize: 13, color: '#791F1F' }}>
      Assessment form not found.
    </div>
  );

  const isOwner = Boolean(
    user && (
      String(user.id) === String(formData.employeeId) ||
      (user.profile && String(user.profile.id) === String(formData.employeeId)) ||
      ((user as any).profileId && String((user as any).profileId) === String(formData.employeeId)) ||
      ((user as any).employeeId && String((user as any).employeeId) === String(formData.employeeId))
    )
  );
  const isReadOnly = !!formData.submitted || !isOwner;
  const isDisabled = isSubmitting || isReadOnly;
  const canExport = appraisalDetail?.status === 'HR_APPROVED' || appraisalDetail?.status === 'FINALIZED' || appraisalDetail?.status === 'ARCHIVED';

  if (!isOwner && !formData.submitted) return (
    <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '32px 24px', textAlign: 'center', maxWidth: 480, margin: '40px auto' }}>
      <div style={{ width: 48, height: 48, borderRadius: 8, background: '#EEF3FD', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Target size={20} style={{ color: '#1A56DB' }} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 8 }}>Assessment Not Yet Available</p>
      <p style={{ fontSize: 13, color: '#9EA3B0', marginBottom: 20 }}>
        You are not authorized to view this assessment until <strong>{formData.employeeName}</strong> has submitted it.
      </p>
      <button onClick={() => navigate(-1)}
        style={{ background: '#111827', color: '#FFFFFF', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none' }}>
        Go Back
      </button>
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #E4E6EC', borderRadius: 8, background: '#FFFFFF', color: '#5A6070' }}
            className="hover:bg-[#F5F6F8] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Self-Assessment</h1>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 1 }}>Reflect on your performance for the current cycle.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontSize: 12, color: '#5A6070', background: '#EEF3FD', border: '0.5px solid #B5D4F4', borderRadius: 8, padding: '5px 10px' }}>
            <Target size={12} style={{ display: 'inline', marginRight: 4 }} />{completedCount} / {totalQuestions} answered
          </span>
          {formData.submitted && (
            <span style={{ fontSize: 11, fontWeight: 500, background: '#EAF3DE', color: '#27500A', border: '0.5px solid #B8DCA0', borderRadius: 20, padding: '4px 10px' }}>Submitted</span>
          )}
          {/* Export PDF button — always visible, disabled until FINALIZED */}
          <button
            onClick={async () => {
              try {
                await downloadReport({
                  endpoint: 'self-assessment',
                  params: { appraisalId: Number(id), format: 'pdf' },
                  fileName: `Self_Assessment_${formData.employeeName ?? 'Form'}.pdf`,
                }).unwrap();
              } catch (err: any) {
                toast.error('Export failed.');
              }
            }}
            disabled={!canExport || isExporting}
            title={canExport ? 'Export this form as PDF' : 'Available after the appraisal is approved'}
            className="inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#111827', color: '#FFFFFF', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500, border: 'none', cursor: canExport ? 'pointer' : 'not-allowed' }}
          >
            <Download size={13} /> {isExporting ? 'Exporting…' : 'Export PDF'}
          </button>
          {!isReadOnly && (
            <>
              <button onClick={handleSaveDraft} disabled={isSaving || isDrafting} className="flex items-center gap-1 transition-colors disabled:opacity-50"
                style={{ background: '#FFFFFF', color: '#5A6070', border: '0.5px solid #E4E6EC', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>
                <Save size={13} /> {isDrafting ? 'Saving…' : 'Save Draft'}
              </button>
              <button onClick={handleSubmit} disabled={isSubmitting || isSaving || completedCount < totalQuestions}
                className="transition-colors disabled:opacity-50"
                style={{ background: '#1A56DB', color: '#FFFFFF', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, border: 'none' }}>
                {isSubmitting ? 'Submitting…' : 'Submit Assessment'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Employee info */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EEF3FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} style={{ color: '#1A56DB' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{formData.employeeName}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Employee ID', value: formData.employeeCode },
            { label: 'Department', value: formData.departmentName },
            { label: 'Manager', value: formData.managerName },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rating scale reference */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '12px 18px' }}>
        <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Rating Scale</p>
        <div className="flex flex-wrap gap-2">
          {RATING_SCALE.map(({ v, label, color }) => (
            <div key={v} className="flex items-center gap-2" style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '5px 10px' }}>
              <span style={{ width: 20, height: 20, borderRadius: 4, background: color, color: '#FFFFFF', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{v}</span>
              <span style={{ fontSize: 12, color: '#5A6070' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Assessment sections */}
      {formData.categories?.map((section: any, sIdx: number) => {
        const sectionMax = section.questions.length * 5;
        const sectionScore = section.questions.reduce((acc: number, q: any) =>
          acc + (responses[q.questionId.toString()]?.ratingValue || 0), 0);
        const pct = sectionMax > 0 ? (sectionScore / sectionMax) * 100 : 0;

        return (
          <div key={section.categoryId} style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ padding: '12px 18px', borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF' }}>
              <div className="flex items-center gap-3">
                <span style={{ width: 28, height: 28, borderRadius: 6, background: '#1A56DB', color: '#FFFFFF', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{sIdx + 1}</span>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{section.categoryName}</p>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{sectionScore}<span style={{ fontSize: 11, color: '#9EA3B0' }}> / {sectionMax}</span></span>
                <div style={{ width: 80, height: 4, background: '#F0F2F6', borderRadius: 4 }}>
                  <div style={{ height: '100%', borderRadius: 4, background: '#1A56DB', width: `${pct}%` }} />
                </div>
                <span style={{ fontSize: 11, color: '#9EA3B0' }}>{Math.round(pct)}%</span>
              </div>
            </div>

            {/* Questions */}
            <div>
              {section.questions.map((q: any, qIdx: number) => {
                const qId = q.questionId.toString();
                const resp = responses[qId] || { ratingValue: 0, isCompleted: null };
                const hasYN = q.questionType === 'YESNO' || q.secondaryQuestionType === 'YESNO';
                const hasRating = q.questionType === 'RATING' || q.secondaryQuestionType === 'RATING';
                const hasText = q.questionType === 'TEXT' || q.secondaryQuestionType === 'TEXT';
                const ratingLocked = hasYN && hasRating && resp.isCompleted === null;
                const selectedScale = resp.ratingValue ? RATING_SCALE.find(s => s.v === resp.ratingValue) : null;

                return (
                  <div key={q.questionId} style={{ padding: '14px 18px', borderBottom: qIdx < section.questions.length - 1 ? '0.5px solid #F0F2F6' : 'none' }}>
                    <div className="flex items-start gap-3">
                      <span style={{ width: 20, height: 20, borderRadius: 4, background: '#F5F6F8', fontSize: 11, color: '#9EA3B0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{qIdx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, color: '#111827', marginBottom: 10, lineHeight: 1.5 }}>{q.questionText}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {hasYN && (
                            <div className="flex gap-2">
                              {[true, false].map(val => (
                                <button key={String(val)} type="button" disabled={isDisabled}
                                  onClick={() => handleCompletionChange(qId, val)}
                                  style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: `0.5px solid ${resp.isCompleted === val ? (val ? '#B8DCA0' : '#F5C2C2') : '#E0E2E8'}`, background: resp.isCompleted === val ? (val ? '#EAF3DE' : '#FCEBEB') : '#FFFFFF', color: resp.isCompleted === val ? (val ? '#27500A' : '#791F1F') : '#5A6070', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.6 : 1 }}>
                                  {val ? 'Yes' : 'No'}
                                </button>
                              ))}
                            </div>
                          )}
                          {hasYN && hasRating && <div style={{ width: 1, height: 20, background: '#E4E6EC' }} />}
                          {hasRating && (
                            <>
                              {[1, 2, 3, 4, 5].map(n => {
                                const scale = RATING_SCALE.find(s => s.v === n)!;
                                const sel = resp.ratingValue === n;
                                return (
                                  <button key={n} type="button" disabled={isDisabled || ratingLocked}
                                    onClick={() => handleRatingChange(qId, n)} title={scale.label}
                                    style={{ width: 32, height: 32, borderRadius: 6, fontSize: 12, fontWeight: 500, border: `0.5px solid ${sel ? scale.color : '#E0E2E8'}`, background: sel ? scale.color : '#FFFFFF', color: sel ? '#FFFFFF' : '#5A6070', cursor: isDisabled || ratingLocked ? 'not-allowed' : 'pointer', opacity: isDisabled || ratingLocked ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {n}
                                  </button>
                                );
                              })}
                              {selectedScale && !ratingLocked && (
                                <span style={{ fontSize: 11, fontWeight: 500, color: selectedScale.color, background: `${selectedScale.color}15`, border: `0.5px solid ${selectedScale.color}44`, borderRadius: 20, padding: '2px 8px' }}>
                                  {selectedScale.label}
                                </span>
                              )}
                              {ratingLocked && <span style={{ fontSize: 11, color: '#633806' }}>Select Yes/No first</span>}
                            </>
                          )}
                          {hasText && (
                            <input type="text" value={resp.comment || ''} disabled={isDisabled || ratingLocked}
                              onChange={e => handleCommentChange(qId, e.target.value)}
                              placeholder={ratingLocked ? 'Select Yes/No first' : 'Your note…'}
                              style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: 140 }} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Overall reflection */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Overall Self-Reflection</p>
        <textarea
          style={{ ...inputStyle, height: 100, resize: 'none' }}
          placeholder="Share your major achievements, challenges, and goals for the next period…"
          value={comment}
          onChange={e => setComment(e.target.value)}
          disabled={isDisabled}
        />
      </div>
    </div>
  );
};

export default SelfAssessment;
