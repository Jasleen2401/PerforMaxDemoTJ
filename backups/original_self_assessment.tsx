import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetSelfAssessmentFormQuery,
  useSaveSelfAssessmentAnswersMutation,
  useSubmitSelfAssessmentMutation,
  useSaveDraftMutation,
  useUploadEmployeeSignatureMutation
} from '../../features/appraisal/appraisalApi';
import SectionCard from '../../components/appraisal/SectionCard';
import QuestionItem from '../../components/appraisal/QuestionItem';
import { 
  User, 
  UserCheck, 
  Cloud, 
  ChevronLeft, 
  Target, 
  Image as ImageIcon, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

const SelfAssessment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: formResp, isLoading: appraisalLoading } = useGetSelfAssessmentFormQuery(id || '', { skip: !id });
  const [saveAnswers, { isLoading: isSaving }] = useSaveSelfAssessmentAnswersMutation();
  const [submitSelfAssessment, { isLoading: isSubmitting }] = useSubmitSelfAssessmentMutation();
  const [saveDraftMutation, { isLoading: isDrafting }] = useSaveDraftMutation();
  const [uploadSignature, { isLoading: isUploadingSignature }] = useUploadEmployeeSignatureMutation();

  const [responses, setResponses] = useState<Record<string, { ratingValue: number, isCompleted: boolean | null, comment?: string }>>({});
  const [comment, setComment] = useState('');

  const formData = formResp;

  useEffect(() => {
    if (formData?.categories) {
      const initial: Record<string, { ratingValue: number, isCompleted: boolean | null, comment?: string }> = {};
      formData.categories.forEach((cat: any) => {
        cat.questions.forEach((q: any) => {
          initial[q.questionId] = {
            ratingValue: q.ratingValue || 0,
            isCompleted: q.isCompleted ?? null,
            comment: q.comment || ''
          };
        });
      });
      setResponses(initial);
    }
  }, [formData]);

  const totalQuestions = useMemo(() =>
    formData?.categories?.reduce((acc: number, section: any) => acc + section.questions.length, 0) || 0,
    [formData]);

  const completedCount = useMemo(() =>
    Object.values(responses).filter(r => r.ratingValue > 0 && r.isCompleted !== null).length,
    [responses]);

  const handleRatingChange = (qId: string, val: number) => {
    setResponses(prev => ({
      ...prev,
      [qId]: { ...prev[qId], ratingValue: val }
    }));
  };

  const handleCompletionChange = (qId: string, val: boolean) => {
    setResponses(prev => ({
      ...prev,
      [qId]: { ...prev[qId], isCompleted: val }
    }));
  };

  const handleCommentChange = (qId: string, val: string) => {
    setResponses(prev => ({
      ...prev,
      [qId]: { ...prev[qId], comment: val }
    }));
  };

  const handleSaveDraft = async () => {
    if (!formData?.selfAssessmentId) return;
    try {
      const answersPayload = Object.keys(responses).map((qId) => ({
        questionId: Number(qId),
        ratingValue: responses[qId].ratingValue,
        isCompleted: responses[qId].isCompleted,
        comment: responses[qId].comment || null
      }));
      await saveAnswers({ id: formData.selfAssessmentId, answers: answersPayload }).unwrap();
      await saveDraftMutation(formData.selfAssessmentId).unwrap();
      alert('Draft saved successfully!');
    } catch (err: any) {
      alert(err?.data?.message || 'Operation failed. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (completedCount < totalQuestions) {
      alert('Please answer all questions before submitting.');
      return;
    }

    try {
      const answersPayload = Object.keys(responses).map((qId) => ({
        questionId: Number(qId),
        ratingValue: responses[qId].ratingValue,
        isCompleted: responses[qId].isCompleted,
        comment: responses[qId].comment || null
      }));

      // Step 1: Save the assessment data
      await saveAnswers({ id: formData.selfAssessmentId, answers: answersPayload }).unwrap();

      // Step 2: Perform final submission
      await submitSelfAssessment(formData.selfAssessmentId).unwrap();

      alert('Self-assessment submitted successfully!');
      navigate('/appraisal');
    } catch (err: any) {
      const errMsg = err?.data?.message || 'Operation failed. Please try again.';
      alert(errMsg);
    }
  };

  if (appraisalLoading) return <div className="p-8 text-center text-gray-500 font-bold">Loading...</div>;
  if (!formData) return <div className="p-8 text-center text-gray-500 font-bold">Assessment Form not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-6 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Employee Self-Assessment</h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">Reflect on your performance for the current cycle.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right mr-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</p>
              <p className="text-sm font-black text-indigo-600">{completedCount} / {totalQuestions}</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isSaving || completedCount < totalQuestions}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 pt-10">
        {/* Employee Info Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-10 flex flex-wrap gap-10 items-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <User className="w-8 h-8" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employee Name</p>
              <p className="font-bold text-slate-800">{formData?.employeeName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employee ID</p>
              <p className="font-bold text-slate-800">{formData?.employeeCode || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</p>
              <p className="font-bold text-slate-800">{formData?.departmentName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Manager</p>
              <p className="font-bold text-indigo-600">{formData?.managerName || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Rating Scale Legend */}
        <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50 mb-10">
          <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" /> Rating Scale Guide
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { v: 5, l: 'Outstanding', d: 'Exceptional' },
              { v: 4, l: 'Exceeds', d: 'Above Avg' },
              { v: 3, l: 'Meets', d: 'Satisfactory' },
              { v: 2, l: 'Below', d: 'Needs Imp' },
              { v: 1, l: 'Unsatisfactory', d: 'Poor' },
            ].map(s => (
              <div key={s.v} className="bg-white/60 p-3 rounded-xl border border-white flex flex-col items-center text-center">
                <span className="text-lg font-black text-indigo-600">{s.v}</span>
                <span className="text-[10px] font-bold text-slate-700 uppercase">{s.l}</span>
              </div>
            ))}
          </div>
        </div>

        {formData?.categories?.map((section: any) => (
          <SectionCard key={section.categoryId} title={section.categoryName} noPadding={true}>
            <div className="bg-slate-50 grid grid-cols-[40px_1fr_60px_60px_250px] border-b border-slate-300">
              <div className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-200 flex items-center justify-center">#</div>
              <div className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200 flex items-center">Assessment Subject</div>
              <div className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-200 flex items-center justify-center">Yes</div>
              <div className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-200 flex items-center justify-center">No</div>
              <div className="flex flex-col border-slate-200">
                <div className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-200">Rating</div>
                <div className="grid grid-cols-5 flex-1">
                  {[5, 4, 3, 2, 1].map(n => (
                    <div key={n} className="flex items-center justify-center text-[10px] font-black text-slate-400 border-r last:border-r-0 border-slate-200">{n}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {section.questions.map((q: any, idx: number) => (
                <QuestionItem
                  key={q.questionId}
                  index={idx + 1}
                  question={q.questionText}
                  primaryType={q.questionType}
                  secondaryType={q.secondaryQuestionType || 'NONE'}
                  ratingValue={responses[q.questionId.toString()]?.ratingValue || 0}
                  isCompleted={responses[q.questionId.toString()]?.isCompleted ?? null}
                  textValue={responses[q.questionId.toString()]?.comment || ''}
                  onRatingChange={(val) => handleRatingChange(q.questionId.toString(), val)}
                  onCompletionChange={(val) => handleCompletionChange(q.questionId.toString(), val)}
                  onTextChange={(val) => handleCommentChange(q.questionId.toString(), val)}
                  disabled={isSubmitting || formData.submitted}
                />
              ))}
            </div>
          </SectionCard>
        ))}

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-10">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
            Overall Self-Reflection
          </h2>
          <textarea
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all min-h-40"
            placeholder="Share your major achievements, challenges, and goals for the next period..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={formData?.submitted}
          />
        </div>

        {/* Signature Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Signature</p>
              {formData?.employeeSignature && (
                <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase">Verified</div>
              )}
            </div>
            
            <div className="flex flex-col items-center justify-center min-h-[140px] bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 relative group transition-all">
              {formData?.employeeSignature ? (
                <img 
                  src={`data:image/png;base64,${formData.employeeSignature}`} 
                  alt="Signature" 
                  className="max-h-24 object-contain mix-blend-multiply"
                />
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-slate-300 mb-2 group-hover:text-indigo-400 transition-colors" />
                  <p className="text-[10px] font-bold text-slate-400">Click to upload signature photo</p>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file && id) {
                        try {
                          await uploadSignature({ id, file }).unwrap();
                          alert("Signature photo uploaded successfully!");
                        } catch (err) {
                          alert("Failed to upload signature photo.");
                        }
                      }
                    }}
                    disabled={formData?.submitted || isUploadingSignature}
                  />
                  {isUploadingSignature && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-2xl">
                       <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="mt-8 text-center border-t border-slate-50 pt-6">
                <p className="text-xl font-serif italic text-slate-700">{formData?.employeeName}</p>
                <p className="text-[10px] text-slate-400 mt-2">Date: {new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>

          <div className="bg-slate-50/30 rounded-3xl border border-slate-100 p-8 flex flex-col justify-between opacity-60">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manager Verification</p>
            <div className="flex flex-col items-center justify-center min-h-[140px]">
                <div className="w-16 h-1 bg-slate-200 rounded-full mb-4"></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Pending manager review</p>
            </div>
            <div className="mt-8 h-10"></div>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      {!formData?.submitted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-8 py-4 z-50 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Cloud className="w-4 h-4 text-slate-400" />
              Progress: {completedCount} / {totalQuestions} Answered
            </div>
            <div className="flex items-center gap-8">
              <button 
                onClick={handleSaveDraft}
                disabled={isSaving || isDrafting}
                className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                Save Progress
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || completedCount < totalQuestions}
                className="px-10 py-3 bg-[#0052CC] text-white font-bold rounded-lg hover:bg-[#0747A6] transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-100"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelfAssessment;
