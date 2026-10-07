import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import {
  ChevronLeft, CheckCircle2, AlertCircle,
  Loader2, Save, User, Calendar, Lock, Target,
} from 'lucide-react';
import {
  useGetMyFeedbackRequestsQuery,
  useGetFormQuestionsQuery,
  useSubmitFeedbackMutation,
  useSaveFeedbackDraftMutation,
  useGetFeedbackDraftQuery,
  useGetSubmittedFeedbackByRequestQuery,
} from '../../features/feedback360/feedback360Api';
import type { FeedbackResponseRequest, CategoryDTO, QuestionDTO } from '../../features/feedback360/feedback360Types';
import { FeedbackStatus } from '../../features/feedback360/feedback360Types';

// ── Constants ─────────────────────────────────────────────────────────────────

const REL_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DIRECT_MANAGER: { label: 'Manager',     bg: '#EEF3FD', text: '#1A56DB', border: '#BFCFFA' },
  PEER:           { label: 'Peer',        bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  SUBORDINATE:    { label: 'Subordinate', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  SELF:           { label: 'Self',        bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
};

const RATING_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Unsatisfactory', color: '#7C2D12', bg: '#B91C1C' },
  2: { label: 'Below Average',  color: '#92400E', bg: '#D97706' },
  3: { label: 'Meets Expects',  color: '#1E3A5F', bg: '#2563EB' },
  4: { label: 'Exceeds',        color: '#14532D', bg: '#16A34A' },
  5: { label: 'Outstanding',    color: '#1E1B4B', bg: '#4F46E5' },
};

// ── Number Rating (1–5 buttons, mirrors screenshot) ───────────────────────────

const NumberRating = ({
  value, onChange, disabled,
}: { value: number; onChange: (v: number) => void; disabled?: boolean }) => (
  <div role="radiogroup" aria-label="Rating 1 to 5" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
    {[1, 2, 3, 4, 5].map((n) => {
      const active = value === n;
      return (
        <button
          key={n}
          role="radio"
          aria-checked={active}
          aria-label={`${n} – ${RATING_LABELS[n].label}`}
          disabled={disabled}
          onClick={() => !disabled && onChange(n)}
          title={RATING_LABELS[n].label}
          style={{
            width: 36, height: 36, borderRadius: 8,
            fontSize: 13, fontWeight: 600,
            border: active ? 'none' : '1px solid #E0E2E8',
            background: active ? RATING_LABELS[n].bg : '#FFFFFF',
            color: active ? '#FFFFFF' : '#6B7280',
            cursor: disabled ? 'default' : 'pointer',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: active ? `0 2px 8px ${RATING_LABELS[n].bg}55` : 'none',
          }}
        >
          {n}
        </button>
      );
    })}
    {value > 0 && (
      <span style={{ fontSize: 12, color: RATING_LABELS[value].bg, fontWeight: 600, marginLeft: 4 }}>
        {RATING_LABELS[value].label}
      </span>
    )}
  </div>
);

// ── Question Row ──────────────────────────────────────────────────────────────

const QuestionRow = ({
  question, index, answer, hasError, disabled, onChange,
}: {
  question: QuestionDTO;
  index: number;
  answer?: FeedbackResponseRequest;
  hasError: boolean;
  disabled: boolean;
  onChange: (patch: Partial<FeedbackResponseRequest>) => void;
}) => {
  const hasRating  = question.questionType === 'RATING' || question.secondaryQuestionType === 'RATING';
  const hasComment = question.questionType === 'TEXT'   || question.secondaryQuestionType === 'TEXT';

  return (
    <div
      id={`q-${question.questionId}`}
      style={{
        padding: '16px 20px',
        borderTop: '1px solid #F0F2F5',
        background: hasError ? '#FFF8F8' : '#FFFFFF',
        transition: 'background 0.15s',
      }}
    >
      {/* Question label */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <span style={{
          fontSize: 12, color: '#9EA3B0', fontWeight: 500,
          minWidth: 18, paddingTop: 1,
        }}>
          {index}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: '#111827', margin: 0, lineHeight: 1.6 }}>
            {question.questionText}
            {question.isRequired && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}
          </p>
          {hasError && (
            <p style={{ fontSize: 11, color: '#EF4444', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={11} /> This field is required
            </p>
          )}
        </div>
      </div>

      {/* Rating */}
      {hasRating && (
        <div style={{ paddingLeft: 28, marginBottom: hasComment ? 10 : 0 }}>
          <NumberRating
            value={answer?.score ?? 0}
            disabled={disabled}
            onChange={(v) => onChange({ score: v })}
          />
        </div>
      )}

      {/* Comment */}
      {hasComment && (
        <div style={{ paddingLeft: 28 }}>
          <textarea
            placeholder={question.isRequired ? 'Your comment (required)' : 'Your comment (optional)'}
            value={answer?.comment ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ comment: e.target.value })}
            rows={3}
            style={{
              width: '100%', fontSize: 13, color: '#111827',
              background: disabled ? '#F5F6F8' : '#FAFBFC',
              border: '1px solid #E4E6EC', borderRadius: 8,
              padding: '10px 12px', outline: 'none',
              resize: 'vertical', boxSizing: 'border-box',
              fontFamily: 'inherit', lineHeight: 1.6,
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { if (!disabled) e.target.style.borderColor = '#1A56DB'; }}
            onBlur={(e) => { e.target.style.borderColor = '#E4E6EC'; }}
          />
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const Feedback360SubmitPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = Number(searchParams.get('requestId'));

  const [answers, setAnswers] = useState<Record<number, FeedbackResponseRequest>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [requiredErrors, setRequiredErrors] = useState<Set<number>>(new Set());
  const dirtyRef = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: allRequests = [] } = useGetMyFeedbackRequestsQuery();
  const request = allRequests.find((r) => r.id === requestId);

  const isCompleted = request?.status === FeedbackStatus.COMPLETED;
  const isResume    = request?.status === FeedbackStatus.IN_PROGRESS;

  const { data: form, isLoading: formLoading, error: formError } = useGetFormQuestionsQuery(requestId, { skip: !requestId });
  const { data: draft,         isLoading: draftLoading }     = useGetFeedbackDraftQuery(requestId, { skip: !requestId || !isResume });
  const { data: completedData, isLoading: completedLoading } = useGetSubmittedFeedbackByRequestQuery(requestId, { skip: !requestId || !isCompleted });
  const [submitFeedback, { isLoading: submitting }] = useSubmitFeedbackMutation();
  const [saveDraft,      { isLoading: saving }]     = useSaveFeedbackDraftMutation();

  // Pre-populate from draft
  useEffect(() => {
    if (!draft) return;
    const map: Record<number, FeedbackResponseRequest> = {};
    draft.responses.forEach((r) => { map[r.questionId] = r; });
    setAnswers(map);
    dirtyRef.current = false;
  }, [draft]);

  // Pre-populate from completed
  useEffect(() => {
    if (!completedData) return;
    const map: Record<number, FeedbackResponseRequest> = {};
    completedData.responses.forEach((r) => {
      map[r.questionId] = { questionId: r.questionId, score: r.score, comment: r.comment };
    });
    setAnswers(map);
    dirtyRef.current = false;
  }, [completedData]);

  const doSaveDraft = useCallback(async (silent = false) => {
    if (!dirtyRef.current || !requestId) return;
    try {
      await saveDraft({ requestId, overallComment: '', responses: Object.values(answers) }).unwrap();
      setSavedAt(format(new Date(), 'HH:mm'));
      dirtyRef.current = false;
      if (!silent) toast.success('Draft saved.');
    } catch {
      if (!silent) toast.error('Failed to save draft.');
    }
  }, [answers, requestId, saveDraft]);

  // Debounced autosave
  useEffect(() => {
    if (!dirtyRef.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => doSaveDraft(true), 5000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [answers, doSaveDraft]);

  // Save on unmount if dirty
  useEffect(() => {
    return () => { if (dirtyRef.current) doSaveDraft(true); };
  }, [doSaveDraft]);

  const setAnswer = (questionId: number, patch: Partial<FeedbackResponseRequest>) => {
    dirtyRef.current = true;
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch, questionId } }));
    setRequiredErrors((prev) => { const s = new Set(prev); s.delete(questionId); return s; });
  };

  // Progress calculation
  const allQuestions = form?.categories.flatMap((c) => c.questions) ?? [];
  const requiredQuestions = allQuestions.filter((q) => q.isRequired);
  const answeredRequired  = requiredQuestions.filter((q) => {
    const a = answers[q.questionId];
    const ratingOk  = (q.questionType === 'RATING' || q.secondaryQuestionType === 'RATING') ? !!a?.score   : true;
    const commentOk = (q.questionType === 'TEXT'   || q.secondaryQuestionType === 'TEXT')   ? !!a?.comment?.trim() : true;
    return ratingOk && commentOk;
  });
  const progressPct = requiredQuestions.length === 0 ? 100 : Math.round((answeredRequired.length / requiredQuestions.length) * 100);
  const ratingQuestions = allQuestions.filter((q) => q.questionType === 'RATING' || q.secondaryQuestionType === 'RATING');
  const answeredRatings = ratingQuestions.filter((q) => !!answers[q.questionId]?.score);
  const avgScore = answeredRatings.length > 0 
    ? (answeredRatings.reduce((acc, q) => acc + (answers[q.questionId].score ?? 0), 0) / answeredRatings.length).toFixed(1)
    : '—';

  const handleSubmit = async () => {
    const errorIds: number[] = [];
    form?.categories.forEach((c) => {
      c.questions.forEach((q) => {
        if (!q.isRequired) return;
        const a = answers[q.questionId];
        const missingRating  = (q.questionType === 'RATING' || q.secondaryQuestionType === 'RATING') && !a?.score;
        const missingComment = (q.questionType === 'TEXT'   || q.secondaryQuestionType === 'TEXT')   && !a?.comment?.trim();
        if (missingRating || missingComment) errorIds.push(q.questionId);
      });
    });

    if (errorIds.length > 0) {
      setRequiredErrors(new Set(errorIds));
      document.getElementById(`q-${errorIds[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error('Please answer all required questions.');
      return;
    }

    try {
      await submitFeedback({ requestId, overallComment: '', responses: Object.values(answers) }).unwrap();
      toast.success('Feedback submitted successfully!');
      dirtyRef.current = false;
      navigate('/360-feedback/pending');
    } catch (err: any) {
      toast.error('Submission failed.');
    }
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!requestId) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9EA3B0' }}>
        <AlertCircle size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p style={{ fontSize: 14 }}>
          No feedback request selected.{' '}
          <button onClick={() => navigate('/360-feedback/pending')} style={{ color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            Go back
          </button>
        </p>
      </div>
    );
  }

  const relCfg = request ? REL_CONFIG[request.relationship] ?? { label: request.relationship, bg: '#F5F6F8', text: '#5A6070', border: '#E4E6EC' } : null;
  const isLoading = formLoading || draftLoading || completedLoading;
  const pageTitle = isCompleted ? 'View Submitted Feedback' : isResume ? 'Resume Feedback Draft' : 'Submit 360° Feedback';

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8' }}>

      {/* ── Header ── */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #E4E6EC',
        borderRadius: 12, margin: '24px 24px 0',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60,
      }}>
        {/* Left: back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate('/360-feedback/pending')}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #E4E6EC', borderRadius: 8,
              background: '#FFFFFF', color: '#5A6070', cursor: 'pointer',
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              360° Feedback / Submit
            </p>
            <h1 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Right: progress pill + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 6, 
            background: '#F0F5FF', border: '1px solid #C4D3F0', 
            borderRadius: 8, padding: '4px 10px' 
          }}>
            <Target size={14} color="#64748B" />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>
              {answeredRatings.length} / {ratingQuestions.length} answered
            </span>
          </div>
          {savedAt && <span style={{ fontSize: 11, color: '#9EA3B0' }}>Saved {savedAt}</span>}
          {saving   && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', color: '#9EA3B0' }} />}

          {!isCompleted && (
            <button
              onClick={() => doSaveDraft(false)}
              disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 500, color: '#374151',
                background: '#FFFFFF', border: '1px solid #E4E6EC',
                borderRadius: 8, padding: '7px 14px',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={13} /> Save Draft
            </button>
          )}

          {!isCompleted && (
            <button
              onClick={handleSubmit}
              disabled={submitting || isLoading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 500, color: '#FFFFFF',
                background: submitting ? '#93A8E8' : '#1A56DB',
                border: 'none', borderRadius: 8, padding: '7px 18px',
                cursor: submitting || isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                : <><CheckCircle2 size={13} /> Submit Assessment</>
              }
            </button>
          )}

          {isCompleted && (
            <button
              onClick={() => navigate('/360-feedback/pending')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 500, color: '#FFFFFF',
                background: '#1A56DB', border: 'none', borderRadius: 8,
                padding: '7px 16px', cursor: 'pointer',
              }}
            >
              Back to Pending
            </button>
          )}
        </div>
      </div>

      {/* ── Page Body ── */}
      <div style={{ width: '100%', padding: '24px 24px 60px' }}>

        {/* Target Employee Info Card */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E4E6EC', borderRadius: 12,
          padding: '18px 22px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: '#EEF3FD',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={20} color="#1A56DB" />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>
                {request?.targetUserName ?? '—'}
              </p>
              {relCfg && (
                <span style={{
                  display: 'inline-block', fontSize: 11, fontWeight: 600,
                  padding: '2px 10px', borderRadius: 20, marginTop: 4,
                  background: relCfg.bg, color: relCfg.text, border: `1px solid ${relCfg.border}`,
                }}>
                  {relCfg.label}
                </span>
              )}
            </div>
            {request?.isAnonymous && (
              <div style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                background: '#F5F3FF', border: '1px solid #DDD6FE',
                borderRadius: 8, padding: '6px 12px',
              }}>
                <Lock size={12} color="#7C3AED" />
                <span style={{ fontSize: 12, color: '#7C3AED', fontWeight: 500 }}>Anonymous Response</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            {request?.targetDepartmentName && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Department</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>{request.targetDepartmentName}</p>
              </div>
            )}
            {request?.dueDate && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Due Date</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500, color: '#111827' }}>
                  <Calendar size={13} color="#9EA3B0" />
                  {format(new Date(request.dueDate), 'dd MMM yyyy')}
                </div>
              </div>
            )}
            <div>
              <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Status</p>
              <span style={{
                display: 'inline-block', fontSize: 12, fontWeight: 600,
                padding: '2px 10px', borderRadius: 20,
                background: isCompleted ? '#EAF3DE' : isResume ? '#EEF3FD' : '#FAEEDA',
                color:      isCompleted ? '#27500A' : isResume ? '#1A56DB' : '#633806',
              }}>
                {isCompleted ? 'Completed' : isResume ? 'In Progress' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Rating Scale Legend */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E4E6EC', borderRadius: 12,
          padding: '16px 20px', marginBottom: 16,
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>
            Rating Scale
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#F9FAFB', border: '1px solid #F3F4F6',
                borderRadius: 6, padding: '4px 12px 4px 4px',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 4,
                  background: RATING_LABELS[n].bg, color: '#FFFFFF',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {n}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#4B5563' }}>
                  {RATING_LABELS[n].label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        {isLoading ? (
          <div style={{
            background: '#FFFFFF', border: '1px solid #E4E6EC', borderRadius: 12,
            padding: '60px 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, color: '#9EA3B0',
          }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Loading form questions…</span>
          </div>
        ) : formError || !form ? (
          <div style={{
            background: '#FFF5F5', border: '1px solid #F5C6C6', borderRadius: 12, padding: '24px 24px',
          }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#7F1D1D', margin: '0 0 6px' }}>Could not load form questions.</p>
            <p style={{ fontSize: 13, color: '#5A6070', margin: 0 }}>
              {'No form is assigned to this request. Ask HR to create a FEEDBACK form for this cycle.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {form.categories.map((cat: CategoryDTO, catIdx: number) => {
              const catQuestions = cat.questions;
              const catRequired  = catQuestions.filter((q) => q.isRequired);
              const catAnswered  = catRequired.filter((q) => {
                const a = answers[q.questionId];
                const rOk = (q.questionType === 'RATING' || q.secondaryQuestionType === 'RATING') ? !!a?.score : true;
                const cOk = (q.questionType === 'TEXT'   || q.secondaryQuestionType === 'TEXT')   ? !!a?.comment?.trim() : true;
                return rOk && cOk;
              });
              const catPct = catRequired.length === 0 ? 100 : Math.round((catAnswered.length / catRequired.length) * 100);

              return (
                <div key={cat.categoryId} style={{
                  background: '#FFFFFF', border: '1px solid #E4E6EC', borderRadius: 12,
                  overflow: 'hidden',
                }}>
                  {/* Category header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', borderBottom: '1px solid #F0F2F5',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: '#1A56DB',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#FFFFFF', flexShrink: 0,
                      }}>
                        {catIdx + 1}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>
                        {cat.categoryName}
                      </p>
                    </div>
                  </div>

                  {/* Questions */}
                  {cat.questions.map((q, qIdx) => (
                    <QuestionRow
                      key={q.questionId}
                      question={q}
                      index={qIdx + 1}
                      answer={answers[q.questionId]}
                      hasError={requiredErrors.has(q.questionId)}
                      disabled={isCompleted}
                      onChange={(patch) => setAnswer(q.questionId, patch)}
                    />
                  ))}
                </div>
              );
            })}

            {/* Bottom action bar */}
            {!isCompleted && (
              <div style={{
                display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10,
                paddingTop: 8,
              }}>
                <button
                  onClick={() => doSaveDraft(false)}
                  disabled={saving}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontWeight: 500, color: '#374151',
                    background: '#FFFFFF', border: '1px solid #E4E6EC',
                    borderRadius: 8, padding: '9px 18px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Save size={13} /> Save Draft
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontWeight: 500, color: '#FFFFFF',
                    background: submitting ? '#93A8E8' : '#1A56DB',
                    border: 'none', borderRadius: 8, padding: '9px 20px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting
                    ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                    : <><CheckCircle2 size={13} /> Submit Assessment</>
                  }
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedback360SubmitPage;
