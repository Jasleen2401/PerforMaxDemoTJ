import { useState } from 'react';
import { toast } from 'react-toastify';
import type { AppraisalCycle } from '../../../features/appraisal/appraisalApi';
import {
  useCancelFeedbackRequestMutation,
  useFinalizeSummaryMutation,
  useGenerateAllSummariesMutation,
  useGenerateFeedbackRequestsMutation,
  useLazyPreviewFeedbackRequestsQuery,
  useRegenerateUserRequestsMutation,
  useSendFeedbackCycleRemindersMutation,
  useSendIndividualFeedbackReminderMutation,
} from '../../../features/feedback360/feedback360Api';
import type { FeedbackRequestResponse } from '../../../features/feedback360/feedback360Types';
import { useDownloadReportMutation } from '../../../features/report/reportApi';
import type { ConfirmModalState } from '../components/ConfirmModal';

interface UseFeedback360ActionsProps {
  cycleId: number;
  previousCycleId: string;
  globalMaxLimit: number;
  excludeLongTermLeave: boolean;
  selectedCycle?: AppraisalCycle;
  selectedManagerId: string;
  setShowPreview: (showPreview: boolean) => void;
  setHasGenerated: (hasGenerated: boolean) => void;
}

export const useFeedback360Actions = ({
  cycleId,
  previousCycleId,
  globalMaxLimit,
  excludeLongTermLeave,
  selectedCycle,
  selectedManagerId,
  setShowPreview,
  setHasGenerated,
}: UseFeedback360ActionsProps) => {
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [previewTrigger, { data: previewData, isFetching: isPreviewing }] = useLazyPreviewFeedbackRequestsQuery();
  const [generate, { isLoading: isGenerating }] = useGenerateFeedbackRequestsMutation();
  const [generateSummaries, { isLoading: isGeneratingSummaries }] = useGenerateAllSummariesMutation();
  const [finalizeSummary, { isLoading: isFinalizing }] = useFinalizeSummaryMutation();
  const [regenerateUser] = useRegenerateUserRequestsMutation();
  const [cancelRequest] = useCancelFeedbackRequestMutation();
  const [sendCycleReminders, { isLoading: isSendingCycleReminders }] = useSendFeedbackCycleRemindersMutation();
  const [sendIndividualReminder, { isLoading: isSendingIndividualReminder }] = useSendIndividualFeedbackReminderMutation();
  const [downloadReport, { isLoading: isDownloadingReport }] = useDownloadReportMutation();
  const [downloadManagerPack, { isLoading: isDownloadingPack }] = useDownloadReportMutation();

  const closeConfirmModal = () => setConfirmModal((current) => ({ ...current, isOpen: false }));

  const buildParams = () => ({
    cycleId,
    previousCycleId: previousCycleId ? Number(previousCycleId) : undefined,
    globalMaxLimit,
    excludeLongTermLeave,
  });

  const handleDownloadSummaryReport = async () => {
    if (!cycleId) return toast.error('Please select a cycle.');
    try {
      await downloadReport({
        endpoint: 'feedback-360/cycle',
        params: { cycleId },
        fileName: 'Feedback_360_Cycle_' + cycleId + '_Summary.pdf',
      }).unwrap();
      toast.success('Summary report downloaded successfully.');
    } catch {
      toast.error('Failed to download summary report.');
    }
  };

  const handleDownloadManagerPack = async () => {
    if (!cycleId) return toast.error('Please select a cycle.');
    if (!selectedManagerId) return toast.error('Please select a manager.');
    try {
      await downloadManagerPack({
        endpoint: 'feedback-360/manager',
        params: { managerId: Number(selectedManagerId), cycleId },
        fileName: 'Feedback_360_Manager_Pack_Cycle_' + cycleId + '_Manager_' + selectedManagerId + '.pdf',
      }).unwrap();
      toast.success('Manager Review Pack downloaded successfully.');
    } catch {
      toast.error('Failed to download Manager Review Pack.');
    }
  };

  const handlePreview = async () => {
    if (!cycleId) return toast.error('Please enter a cycle ID.');
    if (!selectedCycle?.isActive) return toast.error('Only active cycles can be previewed.');

    setShowPreview(true);
    try {
      await previewTrigger(buildParams()).unwrap();
    } catch (err: any) {
      toast.error('Preview failed.');
    }
  };

  const handleGenerate = async () => {
    if (!cycleId) return toast.error('Please enter a cycle ID.');
    setConfirmModal({
      isOpen: true,
      title: 'Generate Feedback Requests',
      message: 'Generate feedback requests for cycle ' + cycleId + '? This may overwrite existing PENDING requests.',
      onConfirm: async () => {
        try {
          await generate(buildParams()).unwrap();
          toast.success('Requests generated.');
          setHasGenerated(true);
        } catch {
          toast.error('Generation failed.');
        }
      },
      confirmBtnText: 'Generate',
      confirmBtnBg: '#1A56DB',
    });
  };

  const handleGenerateSummaries = async () => {
    if (!cycleId) return toast.error('Please enter a cycle ID.');
    setConfirmModal({
      isOpen: true,
      title: 'Generate All Summaries',
      message: 'Generate all summaries for cycle ' + cycleId + '?',
      onConfirm: async () => {
        try {
          await generateSummaries(cycleId).unwrap();
          toast.success('Summaries generated.');
        } catch {
          toast.error('Failed.');
        }
      },
      confirmBtnText: 'Generate',
      confirmBtnBg: '#1A56DB',
    });
  };

  const handleFinalize = async (summaryId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Finalize Summary',
      message: 'Finalize this summary? It will be visible to the employee.',
      onConfirm: async () => {
        try {
          await finalizeSummary(summaryId).unwrap();
          toast.success('Finalized.');
        } catch {
          toast.error('Finalization failed.');
        }
      },
      confirmBtnText: 'Finalize',
      confirmBtnBg: '#059669',
    });
  };

  const handleRegenerate = async (req: FeedbackRequestResponse) => {
    try {
      await regenerateUser({
        targetEmployeeId: req.targetUserId,
        cycleId,
        globalMaxLimit,
        previousCycleId: previousCycleId ? Number(previousCycleId) : undefined,
      }).unwrap();
      toast.success('Requests regenerated.');
    } catch (err: any) {
      toast.error('Regeneration failed. Run Generate first.');
    }
  };

  const handleCancel = async (requestId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancel Feedback Request',
      message: 'Cancel this feedback request?',
      onConfirm: async () => {
        try {
          await cancelRequest(requestId).unwrap();
          toast.success('Request cancelled.');
        } catch {
          toast.error('Cancellation failed.');
        }
      },
      confirmBtnText: 'Cancel Request',
      confirmBtnBg: '#791F1F',
    });
  };

  const handleSendCycleReminders = async () => {
    if (!cycleId) return toast.error('Please select a cycle.');
    setConfirmModal({
      isOpen: true,
      title: 'Send Cycle Reminders',
      message: 'Send urgent feedback reminders to all pending/in-progress evaluators of this cycle?',
      onConfirm: async () => {
        try {
          await sendCycleReminders(cycleId).unwrap();
          toast.success('Cycle reminders sent successfully.');
        } catch {
          toast.error('Failed to send cycle reminders.');
        }
      },
      confirmBtnText: 'Send Reminders',
      confirmBtnBg: '#D97706',
    });
  };

  const handleSendIndividualReminder = async (requestId: number) => {
    try {
      await sendIndividualReminder(requestId).unwrap();
      toast.success('Reminder sent to evaluator.');
    } catch {
      toast.error('Failed to send reminder.');
    }
  };

  return {
    confirmModal,
    closeConfirmModal,
    previewData,
    isPreviewing,
    isGenerating,
    isGeneratingSummaries,
    isFinalizing,
    isSendingCycleReminders,
    isSendingIndividualReminder,
    isDownloadingReport,
    isDownloadingPack,
    handleDownloadSummaryReport,
    handleDownloadManagerPack,
    handlePreview,
    handleGenerate,
    handleGenerateSummaries,
    handleFinalize,
    handleRegenerate,
    handleCancel,
    handleSendCycleReminders,
    handleSendIndividualReminder,
  };
};
