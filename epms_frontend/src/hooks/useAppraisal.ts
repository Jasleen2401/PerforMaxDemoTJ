import { useState, useCallback } from 'react';
import { 
  useLazyGetEmployeeAssessmentQuery, 
  useCreateSelfAssessmentMutation,
  useSubmitSelfAssessmentMutation, 
  useCreateManagerEvaluationMutation,
  useSubmitManagerEvaluationMutation,
  useSaveDraftMutation
} from '../features/appraisal/appraisalApi';
import { useLazyGetFormByIdQuery } from '../features/appraisal/formApiSlice';
import type { Appraisal, AssessmentResponse } from '../types/appraisal';
import type { FormTemplate } from '../types/form';

export const useAppraisal = () => {
  const [appraisal, setAppraisal] = useState<Appraisal | null>(null);
  const [form, setForm] = useState<FormTemplate | null>(null);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [getAppraisal] = useLazyGetEmployeeAssessmentQuery();
  const [getForm] = useLazyGetFormByIdQuery();
  const [createSelf] = useCreateSelfAssessmentMutation();
  const [submitSelf] = useSubmitSelfAssessmentMutation();
  const [createManager] = useCreateManagerEvaluationMutation();
  const [submitManager] = useSubmitManagerEvaluationMutation();
  const [saveDraftMutation] = useSaveDraftMutation();

  const loadAppraisal = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const appraisalData = await getAppraisal(id).unwrap();
      const formData = await getForm(appraisalData.formId).unwrap();
      
      setAppraisal(appraisalData);
      setForm(formData);

      // Initialize responses based on existing data or form structure
      const existingResponses = appraisalData.status === 'PENDING_ASSESSMENT' 
        ? appraisalData.selfAssessment?.responses 
        : appraisalData.managerEvaluation?.responses;

      if (existingResponses && existingResponses.length > 0) {
        setResponses(existingResponses);
      } else {
        const initialResponses: AssessmentResponse[] = formData.sections.flatMap(s => 
          s.questions.map(q => ({ questionId: q.id, rating: 0, comment: '' }))
        );
        setResponses(initialResponses);
      }
    } catch (err) {
      setError('Failed to load appraisal data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getAppraisal, getForm]);

  const updateRating = (questionId: string, rating: number) => {
    setResponses(prev => prev.map(r => r.questionId === questionId ? { ...r, rating } : r));
  };

  const updateComment = (questionId: string, comment: string) => {
    setResponses(prev => prev.map(r => r.questionId === questionId ? { ...r, comment } : r));
  };

  const saveDraft = useCallback(async (type: 'self' | 'manager') => {
    if (!appraisal) return;
    setSaving(true);
    try {
      const payload = {
        appraisalId: appraisal.id,
        responses: responses.reduce((acc, r) => {
          acc[r.questionId] = { rating: r.rating, comment: r.comment };
          return acc;
        }, {} as any)
      };
      await saveDraftMutation({ appraisalId: appraisal.id, data: payload }).unwrap();
      return true;
    } catch (err) {
      setError('Failed to save draft');
      return false;
    } finally {
      setSaving(false);
    }
  }, [appraisal, responses, saveDraftMutation]);

  const submitFinal = useCallback(async (type: 'self' | 'manager') => {
    if (!appraisal) return;
    setSaving(true);
    try {
      const payload = {
        appraisalId: appraisal.id,
        responses: responses.reduce((acc, r) => {
          acc[r.questionId] = { rating: r.rating, comment: r.comment };
          return acc;
        }, {} as any)
      };

      if (type === 'self') {
        // Step 1: Save
        await createSelf(payload).unwrap();
        // Step 2: Finalize
        await submitSelf(appraisal.id).unwrap();
      } else {
        // Step 1: Save
        await createManager(payload).unwrap();
        // Step 2: Finalize
        await submitManager(appraisal.id).unwrap();
      }
      return true;
    } catch (err) {
      setError('Failed to submit final assessment');
      return false;
    } finally {
      setSaving(false);
    }
  }, [appraisal, responses, createSelf, submitSelf, createManager, submitManager]);

  return {
    appraisal,
    form,
    responses,
    loading,
    saving,
    error,
    loadAppraisal,
    updateRating,
    updateComment,
    saveDraft,
    submitFinal,
  };
};
