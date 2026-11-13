import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  AlertCircle, 
  Calendar, 
  Award, 
  Target, 
  Briefcase, 
  UserCheck, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  Compass, 
  TrendingUp, 
  RefreshCw, 
  AlertTriangle,
  ChevronRight,
  BookOpen,
  Cpu,
  Layers,
  Check
} from 'lucide-react';
import { useGetInternJourneyQuery } from '../../features/dashboard/dashboardApi';
import type { MiraiQuarterItem } from '../../features/dashboard/dashboardTypes';
import { QuarterDetailModal } from './QuarterDetailModal';

interface InternJourneyTabProps {
  onNavigateTab?: (tab: string) => void;
}

export const InternJourneyTab: React.FC<InternJourneyTabProps> = ({ onNavigateTab }) => {
  const navigate = useNavigate();
  const { data: journeyData, isLoading, error, refetch } = useGetInternJourneyQuery();

  const [selectedQuarter, setSelectedQuarter] = useState<MiraiQuarterItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleNav = (tab: string, pathFallback: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      navigate(pathFallback);
    }
  };

  const handleOpenQuarterDetail = (quarter: MiraiQuarterItem) => {
    setSelectedQuarter(quarter);
    setIsDetailModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Loading your MIRAI four-quarter progression...</p>
      </div>
    );
  }

  if (error || !journeyData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto my-8">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-lg font-semibold text-red-900">Unable to load MIRAI Journey</h3>
        <p className="text-xs text-red-600">
          We encountered an issue fetching your live four-quarter milestone progression. Please verify your connection or try again.
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const { 
    intern, 
    mentor, 
    cycle, 
    currentQuarter = 'Q1', 
    overallProgressPercent = 0, 
    quarters = [], 
    stats 
  } = journeyData;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Not Started
          </span>
        );
    }
  };

  const getQuarterIcon = (qCode: string) => {
    switch (qCode) {
      case 'Q1': return BookOpen;
      case 'Q2': return Briefcase;
      case 'Q3': return Cpu;
      case 'Q4': return Award;
      default: return Target;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800">
      {/* ========================================================================= */}
      {/* 1. Header Banner & Trajectory Overview                                    */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 rounded-2xl text-white p-6 sm:p-8 shadow-xl border border-purple-800/40">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-purple-500 opacity-10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-semibold border border-purple-400/30">
              <Compass className="w-3.5 h-3.5 text-purple-300" />
              <span>MIRAI Internship Journey • Four-Quarter Progression</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {intern.name}'s MIRAI Roadmap
            </h1>
            <p className="text-purple-200/80 text-xs sm:text-sm max-w-xl">
              End-to-end progression tracking: Q1 Japanese foundations & AI modules, Q2 production sprint onboarding, Q3 verified technical growth, and Q4 full-time conversion.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-5 border border-white/15 flex flex-col min-w-[250px]">
            <div className="flex justify-between items-center text-xs text-purple-200 mb-1.5 font-medium">
              <span>Overall Roadmap Completion</span>
              <span className="font-bold text-white text-sm">{overallProgressPercent}%</span>
            </div>
            <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${overallProgressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-purple-200/90 pt-2 border-t border-white/10">
              <span>Active Quarter:</span>
              <span className="font-bold text-white bg-purple-500/30 px-2 py-0.5 rounded text-[11px] border border-purple-400/30">
                {currentQuarter} In Progress
              </span>
            </div>
          </div>
        </div>

        {/* Intern Meta Attributes */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-purple-300/70 block">Department</span>
            <span className="font-semibold text-white text-sm">{intern.department}</span>
          </div>
          <div>
            <span className="text-purple-300/70 block">Employee Code</span>
            <span className="font-semibold text-white text-sm">{intern.employeeCode || 'Registered'}</span>
          </div>
          <div>
            <span className="text-purple-300/70 block">Cohort Tenure</span>
            <span className="font-semibold text-white text-sm">{intern.daysActive} Days Active</span>
          </div>
          <div>
            <span className="text-purple-300/70 block">Assigned Mentor</span>
            <span className="font-semibold text-white text-sm">{mentor?.name || 'Assigned Lead'}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Key Metrics Bar                                                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => handleNav('goals', '/kpi/my')}
          className="bg-white rounded-xl p-4.5 border border-purple-100/90 shadow-2xs flex items-center justify-between text-left hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-purple-700 transition-colors">
              Quarterly Goals
            </p>
            <h4 className="text-lg font-bold text-slate-900 mt-1">
              {stats.goalsCompleted} / {stats.goalsTotal} Done
            </h4>
            <p className="text-[11px] text-purple-700 font-semibold mt-0.5">
              {stats.goalsWeightedProgress.toFixed(1)}% Weighted Progress
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleNav('tasks', '/manager/tasks')}
          className="bg-white rounded-xl p-4.5 border border-purple-100/90 shadow-2xs flex items-center justify-between text-left hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-purple-700 transition-colors">
              Sprint Tasks
            </p>
            <h4 className="text-lg font-bold text-slate-900 mt-1">
              {stats.tasksCompleted} / {stats.tasksTotal} Done
            </h4>
            <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
              {stats.tasksUnderReview} Under Mentor Review
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleNav('evidence', '/manager/evidence')}
          className="bg-white rounded-xl p-4.5 border border-purple-100/90 shadow-2xs flex items-center justify-between text-left hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-purple-700 transition-colors">
              Evidence & Artifacts
            </p>
            <h4 className="text-lg font-bold text-slate-900 mt-1">
              {stats.evidenceTotal} Total Submissions
            </h4>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              {stats.evidenceApproved} Verified by Mentor
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleNav('evaluation', '/appraisal')}
          className="bg-white rounded-xl p-4.5 border border-purple-100/90 shadow-2xs flex items-center justify-between text-left hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-purple-700 transition-colors">
              Performance Status
            </p>
            <h4 className="text-lg font-bold text-slate-900 mt-1">
              {stats.isResultsPublished ? 'Calibrated' : 'Active Cycle'}
            </h4>
            <p className="text-[11px] text-purple-700 font-semibold mt-0.5">
              {stats.selfEvaluationSubmitted ? 'Self-Eval Submitted' : 'Self-Eval Pending'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. FOUR-QUARTER TIMELINE & CARDS (Core Feature)                            */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-purple-100/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                MIRAI Cohort 1
              </span>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                Four-Quarter Structured Progression Roadmap
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Click any quarter card to inspect detailed examinations, technical parameters, course credentials, deliverables, and audit timelines.
            </p>
          </div>

          {cycle && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 self-start sm:self-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Cycle: <strong className="text-slate-800">{cycle.name}</strong></span>
            </div>
          )}
        </div>

        {/* Four Quarters Cards Grid */}
        <div className="space-y-6">
          {quarters.map((q) => {
            const Icon = getQuarterIcon(q.quarterCode);
            const isCurrent = q.quarterCode === currentQuarter;
            const isCompleted = q.status === 'COMPLETED';

            return (
              <div 
                key={q.id || q.quarterCode}
                onClick={() => handleOpenQuarterDetail(q)}
                className={`rounded-2xl border p-5 sm:p-6 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden ${
                  isCurrent 
                    ? 'border-purple-300 bg-purple-50/20 ring-1 ring-purple-200' 
                    : isCompleted 
                    ? 'border-emerald-200 bg-emerald-50/15' 
                    : 'border-slate-200 bg-white hover:border-purple-200'
                }`}
              >
                {/* Active Quarter Ribbon */}
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs">
                    Current Active Focus
                  </div>
                )}

                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  {/* Left: Title & Dates */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900">
                        {q.title}
                      </h4>
                      {getStatusBadge(q.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                      {q.startDate && q.endDate && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Calendar size={13} className="text-purple-600" />
                          {q.startDate} — {q.endDate}
                        </span>
                      )}
                      <span>•</span>
                      <span>Project: <strong className="text-slate-800">{q.projectName || 'Engineering Team Scope'}</strong></span>
                      {q.attendancePercentage && (
                        <>
                          <span>•</span>
                          <span>Attendance: <strong className="text-emerald-700">{q.attendancePercentage.toFixed(1)}%</strong></span>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-1">
                      <strong className="text-slate-800">Current Focus:</strong> {q.currentFocus}
                    </p>

                    {/* Prerequisite Alert Banner */}
                    {!q.prerequisitesMet && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-900">Entry Prerequisites Pending:</span>
                          <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                            {q.pendingRequirements
                              .filter(req => req.toLowerCase().includes('prerequisite') || req.toLowerCase().includes('entry') || req.toLowerCase().includes('required'))
                              .map((req, idx) => (
                                <li key={idx}>{req}</li>
                              ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Requirements Overview Badges */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[11px]">
                      {q.completedRequirements.slice(0, 3).map((item, idx) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium"
                        >
                          <Check size={12} className="text-emerald-600" />
                          {item}
                        </span>
                      ))}

                      {q.pendingRequirements.slice(0, 2).map((item, idx) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200 font-medium"
                        >
                          <Clock size={12} className="text-slate-400" />
                          {item}
                        </span>
                      ))}

                      {(q.completedRequirements.length + q.pendingRequirements.length) > 5 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 font-bold">
                          +{ (q.completedRequirements.length + q.pendingRequirements.length) - 5 } more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Progress Meter & CTA */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 min-w-[200px] shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                    <div className="w-full lg:w-44 text-right">
                      <div className="flex justify-between items-center text-xs font-semibold mb-1">
                        <span className="text-slate-500">Quarter Completion</span>
                        <span className="text-purple-700 font-bold">{q.completionPercentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-purple-600'
                          }`}
                          style={{ width: `${q.completionPercentage}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenQuarterDetail(q);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer w-full justify-center"
                    >
                      <span>Explore Quarter Details</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. Mentorship Footnote                                                    */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Assigned Mentorship Supervision & Verification
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {mentor ? (
                <>Your lead mentor <strong className="text-slate-900">{mentor.name}</strong> ({mentor.designation}) supervises technical task verification, JLPT readiness, and conversion recommendations.</>
              ) : (
                'Your lead mentor oversees sprint deliverables, technical reviews, and conversion gating.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => handleNav('evaluation', '/appraisal')}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            Open Self-Appraisal Workspace
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Interactive Quarter Detail Modal (Tabs A through F)                       */}
      {/* ========================================================================= */}
      <QuarterDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        quarter={selectedQuarter}
        onRefetch={refetch}
      />
    </div>
  );
};
