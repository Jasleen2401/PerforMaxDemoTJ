import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
  Send,
  Lock,
  RotateCcw,
  Star,
  ExternalLink,
  Plus,
  Trash2,
  FileText,
  Layers,
  Info,
  Check
} from 'lucide-react';
import type {
  InternSelfAppraisalData,
  CompetencyItem,
  RatingScaleItem,
  EvidenceAttachmentItem
} from '../../features/dashboard/dashboardTypes';
import { toast } from 'react-toastify';

interface InternEvaluationTabProps {
  selfAppraisal?: InternSelfAppraisalData;
  isLoading: boolean;
  onSubmitSelfAppraisal: (payload: {
    selfRating?: number;
    competencyRatings?: Record<string, number>;
    evidenceAttachments?: Array<{ url: string; description?: string }>;
    achievements?: string;
    challenges?: string;
    skillsAcquired?: string;
    mentorshipNeeds?: string;
    reflectionSummary?: string;
    isSubmitted?: boolean;
    is_submitted?: boolean;
    quarterCode?: string;
  }) => Promise<any>;
  onRefetch: () => void;
  onNavigateToTab?: (tab: string) => void;
}

const DEFAULT_COMPETENCIES: CompetencyItem[] = [
  {
    id: 'tech_architecture',
    name: 'Technical Architecture & Software Engineering',
    weight: 35,
    description: 'Execution of clean software architecture, database schemas, and robust backend/frontend code.',
    subCompetencies: [
      {
        id: 'tech_code_quality',
        name: 'Code Quality & Clean Architecture',
        expectations: 'Writes clean, modular Python and TypeScript code following repository architecture, type safety, and lint standards.',
        required: true,
      },
      {
        id: 'tech_api_db',
        name: 'API Design & Database Efficiency',
        expectations: 'Develops well-structured RESTful API endpoints, query optimizations, and schema models without performance bottlenecks.',
        required: true,
      },
      {
        id: 'tech_testing',
        name: 'Automated Testing & Reliability',
        expectations: 'Creates comprehensive test suites and maintains high test coverage before submitting pull requests.',
        required: true,
      }
    ]
  },
  {
    id: 'delivery_execution',
    name: 'Sprint Execution & Deliverables',
    weight: 25,
    description: 'Punctuality, accountability, and quality of sprint commitments and milestone deliveries.',
    subCompetencies: [
      {
        id: 'exec_sprint_delivery',
        name: 'Milestone Delivery & Timeliness',
        expectations: 'Consistently completes assigned deliverables within sprint cutoffs and communicates blockers proactively.',
        required: true,
      },
      {
        id: 'exec_evidence_artifacts',
        name: 'Verifiable Deliverables & Documentation',
        expectations: 'Submits verifiable PR URLs, design documents, and clear release notes for mentor verification.',
        required: true,
      }
    ]
  },
  {
    id: 'communication_mentorship',
    name: 'Professional Communication & Teamwork',
    weight: 20,
    description: 'Receptivity to feedback, active participation in reviews, and constructive team coordination.',
    subCompetencies: [
      {
        id: 'comm_stakeholder_sync',
        name: 'Mentor Alignment & Feedback Receptivity',
        expectations: 'Listens actively to mentor guidance, applies recommended improvements quickly, and participates in standups.',
        required: true,
      },
      {
        id: 'comm_peer_collaboration',
        name: 'Teamwork & Knowledge Sharing',
        expectations: 'Collaborates effectively with cohort peers and participates thoughtfully in code reviews.',
        required: true,
      }
    ]
  },
  {
    id: 'growth_ownership',
    name: 'Problem Solving & Continuous Growth',
    weight: 20,
    description: 'Independent initiative, problem diagnosis, and dedication to technical growth.',
    subCompetencies: [
      {
        id: 'growth_problem_solving',
        name: 'Independent Troubleshooting & Initiative',
        expectations: 'Demonstrates curiosity and tenacity in debugging complex problems before escalating.',
        required: true,
      },
      {
        id: 'growth_skills_training',
        name: 'Technical Training & Learning Commitment',
        expectations: 'Consistently finishes scheduled technical immersion training modules and expands capabilities.',
        required: true,
      }
    ]
  }
];

const DEFAULT_RATING_SCALE: Record<number, RatingScaleItem> = {
  1: { label: 'Unsatisfactory', description: 'Fails to meet basic standards; requires constant supervision.' },
  2: { label: 'Needs Improvement', description: 'Inconsistently meets standards; requires guidance on routine tasks.' },
  3: { label: 'Meets Expectations', description: 'Consistently fulfills assigned tasks and code quality expectations.' },
  4: { label: 'Exceeds Expectations', description: 'Regularly delivers high-quality work ahead of schedule with initiative.' },
  5: { label: 'Outstanding', description: 'Demonstrates technical mastery, exemplary quality, and thought leadership.' }
};

export const InternEvaluationTab: React.FC<InternEvaluationTabProps> = ({
  selfAppraisal,
  isLoading,
  onSubmitSelfAppraisal,
  onRefetch,
  onNavigateToTab,
}) => {
  const submission = selfAppraisal?.submission;
  const workflowStatus = selfAppraisal?.workflowStatus || submission?.workflowStatus || 'IN_PROGRESS';
  const competencies = (selfAppraisal?.competencies && selfAppraisal.competencies.length > 0)
    ? selfAppraisal.competencies
    : DEFAULT_COMPETENCIES;
  const ratingScale = selfAppraisal?.ratingScale || DEFAULT_RATING_SCALE;

  const isLocked = (workflowStatus === 'SUBMITTED' || workflowStatus === 'UNDER_REVIEW' || workflowStatus === 'PUBLISHED');
  const isReturned = workflowStatus === 'RETURNED';

  // Form states
  const [competencyRatings, setCompetencyRatings] = useState<Record<string, number>>({});
  const [reflectionSummary, setReflectionSummary] = useState<string>('');
  const [achievements, setAchievements] = useState<string>('');
  const [challenges, setChallenges] = useState<string>('');
  const [skillsAcquired, setSkillsAcquired] = useState<string>('');
  const [mentorshipNeeds, setMentorshipNeeds] = useState<string>('');
  const [evidenceAttachments, setEvidenceAttachments] = useState<Array<{ url: string; description: string }>>([
    { url: 'https://github.com/Performaxdailoqa/Performax/pull/42', description: 'Sprint Deliverables PR and automated testing suite' }
  ]);
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('');
  const [newEvidenceDesc, setNewEvidenceDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (submission) {
      if (submission.competencyRatings) setCompetencyRatings(submission.competencyRatings);
      if (submission.reflectionSummary) setReflectionSummary(submission.reflectionSummary);
      if (submission.achievements) setAchievements(submission.achievements);
      if (submission.challenges) setChallenges(submission.challenges);
      if (submission.skillsAcquired) setSkillsAcquired(submission.skillsAcquired);
      if (submission.mentorshipNeeds) setMentorshipNeeds(submission.mentorshipNeeds);
      if (submission.evidenceAttachments && Array.isArray(submission.evidenceAttachments) && submission.evidenceAttachments.length > 0) {
        setEvidenceAttachments(
          submission.evidenceAttachments.map(e => ({
            url: e.url || '',
            description: e.description || ''
          }))
        );
      }
    } else if (selfAppraisal) {
      if (selfAppraisal.reflectionSummary) setReflectionSummary(selfAppraisal.reflectionSummary);
      if (selfAppraisal.achievements) setAchievements(selfAppraisal.achievements);
      if (selfAppraisal.challenges) setChallenges(selfAppraisal.challenges);
      if (selfAppraisal.skillsAcquired) setSkillsAcquired(selfAppraisal.skillsAcquired);
      if (selfAppraisal.mentorshipNeeds) setMentorshipNeeds(selfAppraisal.mentorshipNeeds);
    }
  }, [submission, selfAppraisal]);

  const handleRatingChange = (subId: string, rating: number) => {
    if (isLocked) return;
    setCompetencyRatings(prev => ({
      ...prev,
      [subId]: rating
    }));
    setValidationErrors([]);
  };

  const handleAddEvidence = () => {
    if (!newEvidenceUrl.trim()) {
      toast.warning('Please enter a valid evidence URL (e.g., GitHub PR, Figma link).');
      return;
    }
    setEvidenceAttachments(prev => [
      ...prev,
      { url: newEvidenceUrl.trim(), description: newEvidenceDesc.trim() || 'Supporting deliverable artifact' }
    ]);
    setNewEvidenceUrl('');
    setNewEvidenceDesc('');
    setValidationErrors([]);
  };

  const handleRemoveEvidence = (index: number) => {
    if (isLocked) return;
    setEvidenceAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Validate fields for submission
  const validateForm = (): boolean => {
    const errors: string[] = [];

    // 1. Mandatory competency ratings
    const missingRatings: string[] = [];
    competencies.forEach(comp => {
      comp.subCompetencies.forEach(sub => {
        if (sub.required) {
          const val = competencyRatings[sub.id];
          if (!val || val <= 0) {
            missingRatings.push(`${comp.name}: ${sub.name}`);
          }
        }
      });
    });

    if (missingRatings.length > 0) {
      errors.push(`Missing mandatory competency ratings: ${missingRatings.slice(0, 2).join(', ')}${missingRatings.length > 2 ? ` (+${missingRatings.length - 2} more)` : ''}`);
    }

    // 2. Supporting evidence
    const validEvidence = evidenceAttachments.filter(e => e.url && e.url.trim().length > 0);
    if (validEvidence.length === 0) {
      errors.push('Supporting evidence is required. Please attach at least one valid deliverable URL (e.g. GitHub PR or documentation link).');
    }

    // 3. Reflection fields
    if (!reflectionSummary.trim()) {
      errors.push('Overall Self-Reflection Summary is mandatory.');
    }
    if (!achievements.trim()) {
      errors.push('Key Technical Achievements reflection is mandatory.');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      await onSubmitSelfAppraisal({
        competencyRatings,
        evidenceAttachments,
        achievements,
        challenges,
        skillsAcquired,
        mentorshipNeeds,
        reflectionSummary,
        isSubmitted: false,
        is_submitted: false,
        quarterCode: submission?.quarterCode || 'Q2'
      });
      toast.success('Self-review draft saved successfully! You can continue editing anytime.');
      onRefetch();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save self-review draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitFinal = async () => {
    const isValid = validateForm();
    if (!isValid) {
      toast.error('Please complete all mandatory ratings and reflection fields before submitting.');
      return;
    }

    const confirmSubmit = window.confirm(
      'Are you sure you want to finalize and submit your self-review? Once submitted, your review will be locked against editing and routed to your mentor for review.'
    );
    if (!confirmSubmit) return;

    try {
      setIsSaving(true);
      await onSubmitSelfAppraisal({
        competencyRatings,
        evidenceAttachments,
        achievements,
        challenges,
        skillsAcquired,
        mentorshipNeeds,
        reflectionSummary,
        isSubmitted: true,
        is_submitted: true,
        quarterCode: submission?.quarterCode || 'Q2'
      });
      toast.success('Self-review submitted successfully! Your review is now under mentor evaluation.');
      onRefetch();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to submit self-review.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 bg-slate-100 rounded-2xl border border-slate-200" />
        <div className="h-96 bg-slate-100 rounded-2xl border border-slate-200" />
      </div>
    );
  }

  // Calculate average rating
  const ratedValues = Object.values(competencyRatings).filter(v => v > 0);
  const avgRating = ratedValues.length > 0 ? (ratedValues.reduce((a, b) => a + b, 0) / ratedValues.length).toFixed(1) : '--';

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Mirai Review Cycle
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Due Date: {selfAppraisal?.deadline ? new Date(selfAppraisal.deadline).toLocaleDateString() : 'End of Quarter'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="text-purple-600" size={24} />
            Self-Review & Competency Appraisal
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Rate required competencies and sub-competencies, provide your growth reflection, and attach supporting evidence.
            Once submitted, your evaluation moves to your mentor.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isLocked ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300">
              <Lock size={14} />
              {workflowStatus === 'PUBLISHED' ? 'Review Published' : 'Locked on File'}
            </span>
          ) : isReturned ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300">
              <RotateCcw size={14} />
              Returned for Revision
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-800 bg-purple-50 border border-purple-300">
              <Clock size={14} />
              Draft in Progress
            </span>
          )}
        </div>
      </div>

      {/* Lock Notice Banner */}
      {isLocked && (
        <div className="bg-emerald-50/70 border border-emerald-300 rounded-2xl p-5 flex items-start gap-3.5 text-emerald-900">
          <ShieldCheck size={22} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold">
              Self-Review Successfully Submitted & Locked
            </h4>
            <p className="text-xs leading-relaxed text-emerald-800">
              Your self-review was submitted on{' '}
              <strong>{submission?.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'File'}</strong>.
              Editing is locked against further modification while the review moves to your mentor for calibration.
              If corrections are requested, your reviewer will return it with feedback.
            </p>
          </div>
        </div>
      )}

      {/* Returned Review Notice Banner */}
      {isReturned && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-2 text-amber-900">
          <div className="flex items-center gap-2">
            <RotateCcw size={18} className="text-amber-700" />
            <h4 className="text-sm font-bold">
              Review Returned by Reviewer — Action Required
            </h4>
          </div>
          <p className="text-xs text-amber-800">
            Your reviewer has requested revisions. Read the comments below, modify your ratings, reflection, or evidence, and resubmit.
          </p>
          <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 mt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
              Reviewer Comments:
            </span>
            <p className="text-xs font-semibold text-slate-800 italic">
              "{submission?.reviewerComments || selfAppraisal?.submission?.reviewerComments || 'Please provide additional supporting evidence links and expand your technical achievements reflection before final submission.'}"
            </p>
          </div>
        </div>
      )}

      {/* Validation Errors Alert */}
      {validationErrors.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-2 text-rose-900">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-rose-600" />
            <h4 className="text-sm font-bold">
              Please complete all mandatory items before submitting:
            </h4>
          </div>
          <ul className="space-y-1 text-xs list-disc list-inside text-rose-800">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. REQUIRED COMPETENCIES & SUB-COMPETENCY RATINGS                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Competency Self-Ratings (Scale 1.0 – 5.0)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Rate your demonstrated performance across each required sub-competency based on expectations.
            </p>
          </div>

          <div className="bg-purple-50 px-3.5 py-1.5 rounded-xl border border-purple-200 text-center shrink-0">
            <span className="text-[10px] font-bold text-purple-700 uppercase block">Average Self-Rating</span>
            <span className="text-lg font-black text-purple-900">{avgRating}</span>
            <span className="text-[10px] text-purple-600"> / 5.0</span>
          </div>
        </div>

        {/* Competencies Accordion / Cards */}
        <div className="space-y-6">
          {competencies.map((comp) => (
            <div
              key={comp.id}
              className="rounded-xl border border-slate-200 bg-slate-50/40 p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{comp.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{comp.description}</p>
                </div>
                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-200 self-start sm:self-auto">
                  Weight: {comp.weight}%
                </span>
              </div>

              {/* Sub-competencies */}
              <div className="space-y-3">
                {comp.subCompetencies.map((sub) => {
                  const currentRating = competencyRatings[sub.id] || 0;
                  const isMissing = validationErrors.some(e => e.includes(sub.name));

                  return (
                    <div
                      key={sub.id}
                      className={`bg-white rounded-xl p-4 border transition-all space-y-3 ${
                        isMissing
                          ? 'border-rose-300 ring-1 ring-rose-300 bg-rose-50/30'
                          : 'border-slate-200 shadow-2xs hover:border-purple-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                              {sub.name}
                            </h5>
                            {sub.required && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                            {sub.expectations}
                          </p>
                        </div>

                        {/* Interactive 1 to 5 Rating Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                          {[1, 2, 3, 4, 5].map((val) => {
                            const isSelected = currentRating === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleRatingChange(sub.id, val)}
                                title={`${val} - ${ratingScale[val]?.label || ''}`}
                                className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                                  isLocked
                                    ? isSelected
                                      ? 'bg-purple-600 text-white cursor-default'
                                      : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                                    : isSelected
                                    ? 'bg-purple-600 text-white shadow-xs scale-105 cursor-pointer ring-2 ring-purple-300'
                                    : 'bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 border border-slate-200 cursor-pointer'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Display Selected Rating Label */}
                      {currentRating > 0 && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-purple-700">
                            Rating {currentRating}.0 — {ratingScale[currentRating]?.label}
                          </span>
                          <span className="text-slate-500 italic">
                            "{ratingScale[currentRating]?.description}"
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SELF-REFLECTION FIELDS                                                 */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
              2
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Performance Self-Reflection
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Explain your quarter performance, major engineering achievements, challenges overcome, and development goals.
          </p>
        </div>

        <div className="space-y-5">
          {/* 1. Overall Reflection Summary (Mandatory) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Overall Reflection Summary <span className="text-rose-600">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Mandatory for calibration</span>
            </label>
            <textarea
              rows={4}
              disabled={isLocked}
              value={reflectionSummary}
              onChange={(e) => setReflectionSummary(e.target.value)}
              placeholder="Summarize your overall performance, velocity, code contributions, and team coordination throughout this quarter..."
              className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-slate-50 disabled:text-slate-600 transition-all leading-relaxed"
            />
          </div>

          {/* 2. Key Technical Achievements (Mandatory) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Key Technical Achievements & Deliverables <span className="text-rose-600">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Mandatory for calibration</span>
            </label>
            <textarea
              rows={3}
              disabled={isLocked}
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              placeholder="Highlight major milestones, features delivered, bugs solved, database optimizations, or architectural designs..."
              className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-slate-50 disabled:text-slate-600 transition-all leading-relaxed"
            />
          </div>

          {/* 3. Challenges & Problem Solving */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              Technical Challenges Encountered & How You Overcame Them
            </label>
            <textarea
              rows={3}
              disabled={isLocked}
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              placeholder="Describe obstacles, debugging roadblocks, or complex integration hurdles and the approaches you used to overcome them..."
              className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-slate-50 disabled:text-slate-600 transition-all leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 4. Skills Acquired */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Skills & Technologies Acquired
              </label>
              <textarea
                rows={3}
                disabled={isLocked}
                value={skillsAcquired}
                onChange={(e) => setSkillsAcquired(e.target.value)}
                placeholder="New frameworks, TypeScript patterns, tools, or best practices learned..."
                className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-slate-50 disabled:text-slate-600 transition-all leading-relaxed"
              />
            </div>

            {/* 5. Mentorship & Guidance Needs */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Mentorship & Guidance Needed Next Quarter
              </label>
              <textarea
                rows={3}
                disabled={isLocked}
                value={mentorshipNeeds}
                onChange={(e) => setMentorshipNeeds(e.target.value)}
                placeholder="Specific areas where guidance from your mentor would help you grow faster..."
                className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-slate-50 disabled:text-slate-600 transition-all leading-relaxed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SUPPORTING EVIDENCE ATTACHMENT                                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
              3
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Supporting Deliverable Evidence <span className="text-rose-600">*</span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Attach verifiable URLs for your sprint deliverables (e.g., GitHub pull request, technical documentation, or Figma link).
            At least one valid evidence link is required for review submission.
          </p>
        </div>

        {/* Existing Attachments List */}
        <div className="space-y-3">
          {evidenceAttachments.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-purple-700 hover:underline flex items-center gap-1 truncate"
                  >
                    <span className="truncate">{item.url}</span>
                    <ExternalLink size={12} className="shrink-0" />
                  </a>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {item.description || 'Deliverable artifact'}
                  </p>
                </div>
              </div>

              {!isLocked && (
                <button
                  type="button"
                  onClick={() => handleRemoveEvidence(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                  title="Remove attachment"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}

          {evidenceAttachments.length === 0 && (
            <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
              No evidence attached yet. Add at least one supporting URL below.
            </div>
          )}
        </div>

        {/* Add Evidence Form */}
        {!isLocked && (
          <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              Add Deliverable Link
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="url"
                value={newEvidenceUrl}
                onChange={(e) => setNewEvidenceUrl(e.target.value)}
                placeholder="https://github.com/org/repo/pull/123"
                className="text-xs sm:text-sm p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <input
                type="text"
                value={newEvidenceDesc}
                onChange={(e) => setNewEvidenceDesc(e.target.value)}
                placeholder="Description (e.g. Core Auth API PR, Test Suite)"
                className="text-xs sm:text-sm p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <button
              type="button"
              onClick={handleAddEvidence}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Attach Deliverable URL</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. ACTIONS FOOTER: SAVE DRAFT & SUBMIT                                    */}
      {/* ========================================================================= */}
      {!isLocked && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            <span>All changes can be saved as a draft. Once submitted, your self-review is locked.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveDraft}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSubmitFinal}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send size={15} />
              <span>{isSaving ? 'Submitting...' : isReturned ? 'Resubmit Self-Review' : 'Submit Completed Self-Review'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternEvaluationTab;
