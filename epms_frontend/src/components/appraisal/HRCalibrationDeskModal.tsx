import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Award,
  BookOpen,
  Lock,
  Send,
  UserCheck,
} from 'lucide-react';
import {
  useGetEvaluationSummaryQuery,
  usePublishParticipantEvaluationMutation,
} from '../../features/appraisal/appraisalApi';

interface HRCalibrationDeskModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycleId: string;
  participantId: string;
  participantName: string;
  employeeCode: string;
  department: string;
  publicationStatus: 'PUBLISHED' | 'BLOCKED' | 'READY_TO_PUBLISH' | 'DRAFT';
  publishedAt?: string | null;
  configurationBlockers?: string[];
  initialScorecard?: {
    technical_score?: number | null;
    behavioral_score?: number | null;
    final_score?: number | null;
  };
}

export const HRCalibrationDeskModal: React.FC<HRCalibrationDeskModalProps> = ({
  isOpen,
  onClose,
  cycleId,
  participantId,
  participantName,
  employeeCode,
  department,
  publicationStatus,
  publishedAt,
  configurationBlockers = [],
  initialScorecard,
}) => {
  const isPublished = publicationStatus === 'PUBLISHED';
  const isBlocked = publicationStatus === 'BLOCKED';
  const isReady = publicationStatus === 'READY_TO_PUBLISH';

  // Form State
  const [strengthsText, setStrengthsText] = useState('');
  const [areasText, setAreasText] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [finalComments, setFinalComments] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Queries & Mutations
  const {
    data: summaryData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetEvaluationSummaryQuery(
    { cycleId, participantId },
    { skip: !isOpen || !cycleId || !participantId }
  );

  const [publishEvaluation, { isLoading: isPublishing }] =
    usePublishParticipantEvaluationMutation();

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, participantId]);

  if (!isOpen) return null;

  const scoreCalculation = summaryData?.score_calculation;
  const techSection = scoreCalculation?.technical_section;
  const behavSection = scoreCalculation?.behavioral_section;
  const finalScore =
    scoreCalculation?.final_score ?? initialScorecard?.final_score ?? null;

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const strengths = strengthsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const areas_for_improvement = areasText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const resp = await publishEvaluation({
        cycleId,
        participantId,
        data: {
          strengths: strengths.length > 0 ? strengths : undefined,
          areas_for_improvement:
            areas_for_improvement.length > 0
              ? areas_for_improvement
              : undefined,
          recommendations: recommendations.trim() || undefined,
          final_comments: finalComments.trim() || undefined,
        },
      }).unwrap();

      setSuccessMessage(resp.message || 'Evaluation officially published.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      if (err?.status === 409) {
        setErrorMessage(
          err.data?.detail || 'This appraisal has already been published.'
        );
      } else if (err?.status === 422) {
        const blockers = err.data?.readiness_blockers || [];
        setErrorMessage(
          err.data?.detail ||
            `Publication blocked: ${blockers.join(' • ') || 'Readiness validation failed'}`
        );
      } else {
        setErrorMessage(
          err.data?.detail || err.data?.error || 'Failed to publish appraisal.'
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-100">
              {participantName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  {participantName}
                </h3>
                {isPublished && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <CheckCircle2 className="w-3 h-3 text-indigo-600" /> Published
                  </span>
                )}
                {isBlocked && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Blocked
                  </span>
                )}
                {isReady && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <UserCheck className="w-3 h-3 text-emerald-600" /> Ready to Publish
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                <span className="font-mono font-semibold">{employeeCode}</span> •{' '}
                <span>{department || 'General'}</span>
                {publishedAt && (
                  <span>
                    {' '}
                    • Published on {new Date(publishedAt).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Dual Pane */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px] max-h-[75vh] overflow-y-auto">
          {/* Left Pane: Evidence & Score Breakdown (7 cols) */}
          <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-slate-100 space-y-6 overflow-y-auto">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mb-3" />
                <p className="text-xs font-bold text-slate-700">
                  Retrieving evaluation evidence & calculations...
                </p>
              </div>
            ) : isError ? (
              <div className="py-12 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  Failed to load evaluation breakdown
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {(error as any)?.data?.error || 'An unexpected error occurred.'}
                </p>
                <button
                  onClick={() => refetch()}
                  className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {/* Technical Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        T
                      </div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Technical Competencies
                      </h4>
                    </div>
                    {techSection?.section_score !== null && (
                      <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 font-mono">
                        {techSection?.section_score?.toFixed(2)}%
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50/70 rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="py-2 px-3">Competency</th>
                          <th className="py-2 px-2 text-center">Weight</th>
                          <th className="py-2 px-2 text-center">Score</th>
                          <th className="py-2 px-3 text-right">Norm %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {techSection?.breakdown?.map((comp) => (
                          <tr key={comp.competency_id}>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-800 text-[11px]">
                                {comp.competency_name}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-500 font-medium text-[11px]">
                              {comp.weight}%
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-700 text-[11px]">
                              {comp.raw_score !== null
                                ? comp.raw_score.toFixed(1)
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-[11px]">
                              {comp.normalized_percentage !== null
                                ? `${comp.normalized_percentage.toFixed(1)}%`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Behavioral Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                        B
                      </div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Behavioral Competencies
                      </h4>
                    </div>
                    {behavSection?.section_score !== null && (
                      <span className="text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100 font-mono">
                        {behavSection?.section_score?.toFixed(2)}%
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50/70 rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="py-2 px-3">Competency</th>
                          <th className="py-2 px-2 text-center">Weight</th>
                          <th className="py-2 px-2 text-center">Score</th>
                          <th className="py-2 px-3 text-right">Norm %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {behavSection?.breakdown?.map((comp) => (
                          <tr key={comp.competency_id}>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-800 text-[11px]">
                                {comp.competency_name}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-500 font-medium text-[11px]">
                              {comp.weight}%
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-700 text-[11px]">
                              {comp.raw_score !== null
                                ? comp.raw_score.toFixed(1)
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-[11px]">
                              {comp.normalized_percentage !== null
                                ? `${comp.normalized_percentage.toFixed(1)}%`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Non-Scoring Operational Telemetry */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>Non-Scoring Telemetry (0% Score Weight)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">
                        Goals Completed
                      </div>
                      <div className="text-xs font-black text-slate-800 mt-0.5">
                        {scoreCalculation?.operational_telemetry?.goals
                          ?.completed_goals ?? 0}{' '}
                        /{' '}
                        {scoreCalculation?.operational_telemetry?.goals
                          ?.total_goals ?? 0}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">
                        Self-Assessment
                      </div>
                      <div className="text-xs font-black text-slate-800 mt-0.5">
                        {scoreCalculation?.operational_telemetry?.self_assessment
                          ?.submitted
                          ? 'Submitted'
                          : 'Pending'}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">
                        Japanese Track
                      </div>
                      <div className="text-xs font-black text-slate-800 mt-0.5">
                        {scoreCalculation?.operational_telemetry?.japanese?.status ||
                          'Optional'}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Pane: Final Score Calibration & Feedback Form (5 cols) */}
          <div className="lg:col-span-5 p-6 space-y-5 bg-white flex flex-col justify-between">
            <form onSubmit={handlePublish} className="space-y-4">
              {/* Scorecard Hero Banner */}
              <div className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 rounded-2xl p-4 border border-indigo-100 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-600" /> Official Final Score
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Deterministic 100% Scale
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {finalScore !== null ? finalScore.toFixed(2) : '—'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/ 100.00</span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-indigo-50/80 font-medium">
                  <span>
                    Technical (
                    {scoreCalculation?.cycle_weights?.technical_weight ?? 60}%):{' '}
                    <strong className="text-slate-800">
                      {techSection?.weighted_contribution?.toFixed(2) ?? '—'}
                    </strong>
                  </span>
                  <span>
                    Behavioral (
                    {scoreCalculation?.cycle_weights?.behavioral_weight ?? 40}%):{' '}
                    <strong className="text-slate-800">
                      {behavSection?.weighted_contribution?.toFixed(2) ?? '—'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Status Alert Banners */}
              {isPublished && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-indigo-900 space-y-0.5">
                    <p className="font-bold">Scorecard is Immutable</p>
                    <p className="text-[11px] text-indigo-700 leading-relaxed">
                      This evaluation was officially published on{' '}
                      {publishedAt
                        ? new Date(publishedAt).toLocaleString()
                        : 'a previous date'}
                      . Scores and qualitative feedback cannot be modified.
                    </p>
                  </div>
                </div>
              )}

              {isBlocked && configurationBlockers.length > 0 && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Publication Blocked</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5 font-medium">
                    {configurationBlockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-rose-800">{errorMessage}</p>
                </div>
              )}

              {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-emerald-800">
                    {successMessage}
                  </p>
                </div>
              )}

              {/* Qualitative Feedback Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Key Strengths (Intern-Visible)
                  </label>
                  <textarea
                    rows={2}
                    disabled={isPublished || isBlocked}
                    readOnly={isPublished}
                    value={strengthsText}
                    onChange={(e) => setStrengthsText(e.target.value)}
                    placeholder={
                      isPublished
                        ? 'No specific strengths recorded'
                        : 'Enter key demonstrated strengths (one per line)...'
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Areas for Growth (Intern-Visible)
                  </label>
                  <textarea
                    rows={2}
                    disabled={isPublished || isBlocked}
                    readOnly={isPublished}
                    value={areasText}
                    onChange={(e) => setAreasText(e.target.value)}
                    placeholder={
                      isPublished
                        ? 'No growth areas recorded'
                        : 'Enter recommendations for growth and development...'
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    HR Final Comments
                  </label>
                  <textarea
                    rows={2}
                    disabled={isPublished || isBlocked}
                    readOnly={isPublished}
                    value={finalComments}
                    onChange={(e) => setFinalComments(e.target.value)}
                    placeholder={
                      isPublished
                        ? 'No final comments recorded'
                        : 'Official concluding remarks and calibration notes...'
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-500 resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {isPublished ? 'Close' : 'Cancel'}
                </button>

                {!isPublished && (
                  <button
                    type="submit"
                    disabled={isPublishing || isBlocked || !isReady}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isPublishing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Publish Evaluation</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};