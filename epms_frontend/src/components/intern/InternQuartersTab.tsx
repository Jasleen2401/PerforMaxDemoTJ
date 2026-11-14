import React, { useState } from 'react';
import {
  Compass,
  Calendar,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  ShieldCheck,
  Lock,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import type {
  InternJourneyData,
  InternOverviewData,
  InternPublishedFeedbackData,
  CompetencyItem
} from '../../features/dashboard/dashboardTypes';

interface InternQuartersTabProps {
  journeyData?: InternJourneyData;
  overviewData?: InternOverviewData;
  feedbackData?: InternPublishedFeedbackData;
  isLoading: boolean;
  onNavigateToTab: (tab: string) => void;
  onRefresh: () => void;
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


interface QuarterMeta {
  code: string;
  name: string;
  purpose: string;
  dueDate: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
}

export const InternQuartersTab: React.FC<InternQuartersTabProps> = ({
  journeyData,
  overviewData,
  feedbackData,
  isLoading,
  onNavigateToTab,
}) => {
  const currentQCode = overviewData?.currentQuarter?.code || journeyData?.currentQuarter || 'Q2';
  const [selectedQuarterCode, setSelectedQuarterCode] = useState<string>(currentQCode);

  const quarterList: QuarterMeta[] = [
    {
      code: 'Q1',
      name: 'Q1 — Japanese Foundations & Immersion',
      purpose: 'Foundational AI Engineering, Language Immersion & Workplace Japanese Proficiency',
      dueDate: 'Completed Quarter',
      status: 'COMPLETED'
    },
    {
      code: 'Q2',
      name: 'Q2 — Internship Begins & Sprint Deliverables',
      purpose: 'Sprint Deliverables, Mentor Alignment, Code Reliability & System Architecture',
      dueDate: overviewData?.cycle?.endDate
        ? new Date(overviewData.cycle.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Dec 20, 2026',
      status: 'IN_PROGRESS'
    },
    {
      code: 'Q3',
      name: 'Q3 — Advanced Engineering & Technical Growth',
      purpose: 'Scalable Microservices, Independent Component Ownership & Performance Optimization',
      dueDate: 'Mar 31, 2027',
      status: 'NOT_STARTED'
    },
    {
      code: 'Q4',
      name: 'Q4 — Production Delivery & Full-Time Conversion',
      purpose: 'End-to-End Reliability, Final Committee Evaluation & Full-Time Conversion',
      dueDate: 'Jun 30, 2027',
      status: 'NOT_STARTED'
    }
  ];

  const selectedQuarter = quarterList.find(q => q.code === selectedQuarterCode) || quarterList[1];
  const isCurrentActiveQuarter = selectedQuarter.code === currentQCode;

  const competencies = overviewData?.requiredCompetencies && overviewData.requiredCompetencies.length > 0
    ? overviewData.requiredCompetencies
    : DEFAULT_COMPETENCIES;

  const isPublishedForSelectedQuarter = Boolean(
    feedbackData?.isPublished && (selectedQuarter.code === 'Q1' || (selectedQuarter.code === currentQCode && overviewData?.workflowStatus === 'PUBLISHED'))
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-slate-100 rounded-2xl border border-slate-200" />
        <div className="h-96 bg-slate-100 rounded-2xl border border-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl text-white p-6 sm:p-8 shadow-xl border border-purple-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-semibold border border-purple-400/30">
              <Compass className="w-3.5 h-3.5 text-purple-300" />
              <span>Mirai Journey Progression & Competency Standards</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Mirai Journey & Quarter Expectations
            </h1>
            <p className="text-purple-200/80 text-xs sm:text-sm max-w-2xl">
              Inspect quarter objectives, competencies, expectations, and review cutoffs.
              All expectations are calibrated by HR and your mentor for your cohort.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 flex flex-col items-center justify-center min-w-[200px] text-center">
            <span className="text-xs uppercase tracking-wider text-purple-200 font-semibold">Active Quarter</span>
            <span className="text-2xl font-black text-white mt-0.5">{currentQCode}</span>
            <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-400/40 mt-1">
              {overviewData?.currentReviewStage || 'Review Open'}
            </span>
          </div>
        </div>
      </div>

      {/* Quarter Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quarterList.map((q) => {
          const isSelected = q.code === selectedQuarterCode;
          const isCurrent = q.code === currentQCode;

          return (
            <button
              key={q.code}
              onClick={() => setSelectedQuarterCode(q.code)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400/40'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span
                  className={`text-xs font-black uppercase px-2 py-0.5 rounded ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}
                >
                  {q.code}
                </span>
                {q.status === 'COMPLETED' ? (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${isSelected ? 'text-emerald-200' : 'text-emerald-700'}`}>
                    <CheckCircle2 size={13} /> Done
                  </span>
                ) : isCurrent ? (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${isSelected ? 'text-amber-200' : 'text-amber-700'}`}>
                    <Clock size={13} /> Active
                  </span>
                ) : (
                  <span className={`text-[11px] font-medium ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                    Upcoming
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold truncate">
                  {q.code} Quarter
                </h4>
                <p className={`text-[11px] mt-0.5 truncate ${isSelected ? 'text-purple-100' : 'text-slate-500'}`}>
                  Due: {q.dueDate}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Quarter Structured Details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-8">
        {/* Quarter Purpose Header */}
        <div className="border-b border-slate-100 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-purple-100 text-purple-800 font-bold text-xs uppercase px-2.5 py-0.5 rounded-full border border-purple-200">
                {selectedQuarter.code} Expectations
              </span>
              {selectedQuarter.status === 'COMPLETED' && (
                <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Quarter Completed
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {selectedQuarter.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
              <strong className="text-slate-800">Quarter Purpose:</strong> {selectedQuarter.purpose}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-left md:text-right bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Submission Due Date
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Calendar size={14} className="text-purple-600" />
                {selectedQuarter.dueDate}
              </span>
            </div>

            {isCurrentActiveQuarter && (
              <button
                onClick={() => onNavigateToTab('self-review')}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Open Self-Review</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 1. Required Competencies and Sub-Competencies */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Required Competencies & Expectations</h3>
              <p className="text-xs text-slate-500">
                Evaluation criteria configured for this quarter. All required competencies must be rated during self-review.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {competencies.map((comp) => (
              <div
                key={comp.id}
                className="rounded-xl border border-slate-200 bg-slate-50/40 p-5 space-y-4 hover:border-purple-200 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {comp.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {comp.description}
                    </p>
                  </div>
                  <span className="bg-purple-100 text-purple-800 font-extrabold text-xs px-3 py-1 rounded-full border border-purple-200 shrink-0 self-start sm:self-auto">
                    Weight: {comp.weight}%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {comp.subCompetencies.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <h5 className="text-xs font-bold text-slate-800">
                            {sub.name}
                          </h5>
                          {sub.required && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {sub.expectations}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>Rating scale: 1–5</span>
                        <span className="text-purple-600 font-semibold">Self & Mentor</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* 3. Previously Submitted Feedback (Strict Privacy Rules) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Quarter Feedback & Calibrated Results
              </h3>
              <p className="text-xs text-slate-500">
                Official feedback from your mentor and HR is displayed here only when published.
              </p>
            </div>
          </div>

          {isPublishedForSelectedQuarter && feedbackData ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/80 pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                    <CheckCircle2 size={13} /> Official Published Result
                  </span>
                  <h4 className="text-lg font-extrabold text-slate-900 mt-2">
                    {feedbackData.performanceClassification || 'Meets High Expectations'}
                  </h4>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-emerald-200 text-center shrink-0">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Overall Score</span>
                  <span className="text-2xl font-black text-emerald-700">
                    {feedbackData.overallScore?.toFixed(1) || '88.5'} / 100
                  </span>
                </div>
              </div>

              {feedbackData.mentorFeedback && (
                <div className="space-y-1 bg-white p-4 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Mentor Remarks</span>
                  <p className="text-xs text-slate-700 italic">"{feedbackData.mentorFeedback}"</p>
                </div>
              )}

              <button
                onClick={() => onNavigateToTab('feedback')}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Published Feedback Report</span>
                <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-200/70 text-slate-500 flex items-center justify-center mx-auto">
                <Lock size={18} />
              </div>
              <h4 className="text-xs font-bold text-slate-800">
                Feedback Not Yet Published for {selectedQuarter.code}
              </h4>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                In accordance with PMS visibility rules, reviewer comments, internal remarks, and calibrated scores remain confidential until officially published by People Operations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternQuartersTab;
