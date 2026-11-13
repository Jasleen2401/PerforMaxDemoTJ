import React, { useState } from 'react';
import {
  Compass,
  Layers,
  BookOpen,
  Briefcase,
  Cpu,
  Award,
  Target,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pencil,
  RefreshCw,
  AlertCircle,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useGetInternJourneyQuery } from '../../features/dashboard/dashboardApi';
import type { MiraiQuarterItem } from '../../features/dashboard/dashboardTypes';
import { QuarterDetailModal } from './QuarterDetailModal';
import { EditJourneyModal } from './EditJourneyModal';
import { useAuth } from '../../hooks/useAuth';

interface ProfileMiraiJourneySectionProps {
  employeeId: string;
  employeeName: string;
}

export const ProfileMiraiJourneySection: React.FC<ProfileMiraiJourneySectionProps> = ({
  employeeId,
  employeeName,
}) => {
  const { user, isAdmin } = useAuth();
  const isHrOrAdmin = Boolean(
    isAdmin ||
    user?.role === 'HR' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.roles?.some((r: string) => ['HR', 'ADMIN', 'SUPER_ADMIN'].includes(r.replace('ROLE_', '')))
  );

  const { data: journeyData, isLoading, error, refetch } = useGetInternJourneyQuery(employeeId, {
    skip: !employeeId,
  });

  const [selectedQuarter, setSelectedQuarter] = useState<MiraiQuarterItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleOpenQuarterDetail = (quarter: MiraiQuarterItem) => {
    setSelectedQuarter(quarter);
    setIsDetailModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4 bg-white rounded-2xl border border-slate-200">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium text-xs">Loading {employeeName}'s MIRAI Four-Quarter Journey...</p>
      </div>
    );
  }

  if (error || !journeyData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto my-6">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-base font-semibold text-red-900">Unable to load MIRAI Journey</h3>
        <p className="text-xs text-red-600">
          Could not fetch progression records for this intern. Please ensure the employee profile is valid.
        </p>
        <button
          type="button"
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
    stats,
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
    <div className="space-y-6 animate-fadeIn text-slate-800">
      {/* 1. Top Header Banner & Action Bar */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 rounded-2xl text-white p-6 sm:p-7 shadow-lg border border-purple-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-semibold border border-purple-400/30">
              <Compass className="w-3.5 h-3.5 text-purple-300" />
              <span>MIRAI Internship Journey • Four-Quarter Progression</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{intern?.name || employeeName}'s MIRAI Roadmap</span>
            </h2>
            <p className="text-purple-200/80 text-xs max-w-xl">
              Cohort tracking: Q1 Japanese Foundations, Q2 Sprint Onboarding, Q3 Technical Growth & JLPT N3, and Q4 Full-Time Conversion.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Progress Counter Pill */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 flex flex-col min-w-[210px]">
              <div className="flex justify-between items-center text-xs text-purple-200 mb-1.5 font-medium">
                <span>Overall Completion</span>
                <span className="font-bold text-white text-sm">{overallProgressPercent}%</span>
              </div>
              <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${overallProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2.5 text-[11px] text-purple-200/90 pt-1.5 border-t border-white/10">
                <span>Active:</span>
                <span className="font-bold text-white bg-purple-500/30 px-2 py-0.5 rounded text-[10px] border border-purple-400/30">
                  {currentQuarter}
                </span>
              </div>
            </div>

            {/* HR Edit Journey Action Button */}
            {isHrOrAdmin && (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4.5 py-3 bg-white hover:bg-purple-50 text-purple-950 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer shrink-0 self-start sm:self-center"
              >
                <Pencil className="w-4 h-4 text-purple-600" />
                <span>Edit Journey</span>
              </button>
            )}
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-purple-300/70 block">Department</span>
            <span className="font-semibold text-white text-sm">{intern?.department || 'Engineering'}</span>
          </div>
          <div>
            <span className="text-purple-300/70 block">Employee Code</span>
            <span className="font-semibold text-white text-sm">{intern?.employeeCode || 'Registered'}</span>
          </div>
          <div>
            <span className="text-purple-300/70 block">Days Active</span>
            <span className="font-semibold text-white text-sm">{intern?.daysActive || 1} Days Active</span>
          </div>
          <div>
            <span className="text-purple-300/70 block">Assigned Mentor</span>
            <span className="font-semibold text-white text-sm">{mentor?.name || 'Assigned Lead'}</span>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Bar */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quarterly Goals</p>
              <h4 className="text-lg font-bold text-slate-900 mt-1">
                {stats.goalsCompleted} / {stats.goalsTotal} Done
              </h4>
              <p className="text-[11px] text-purple-700 font-semibold mt-0.5">
                {stats.goalsWeightedProgress?.toFixed(1) || '0.0'}% Weighted Progress
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sprint Tasks</p>
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
          </div>

          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Evidence Submissions</p>
              <h4 className="text-lg font-bold text-slate-900 mt-1">
                {stats.evidenceTotal} Artifacts
              </h4>
              <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                {stats.evidenceApproved} Verified by Mentor
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Performance Status</p>
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
          </div>
        </div>
      )}

      {/* 3. FOUR-QUARTER STRUCTURED PROGRESSION ROADMAP */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
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
              Inspect all four quarters. Click any quarter to expand exam certifications, technical benchmarks, courses, and milestones.
            </p>
          </div>

          {isHrOrAdmin && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors cursor-pointer self-start sm:self-center"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Journey Fields
            </button>
          )}
        </div>

        {/* Quarters Cards Grid */}
        <div className="space-y-5">
          {quarters.map((q) => {
            const Icon = getQuarterIcon(q.quarterCode);
            const isCurrent = q.quarterCode === currentQuarter;
            const isCompleted = q.status === 'COMPLETED';

            return (
              <div
                key={q.id || q.quarterCode}
                className={`rounded-2xl border p-5 sm:p-6 transition-all duration-200 relative overflow-hidden ${
                  isCurrent
                    ? 'border-purple-300 bg-purple-50/25 ring-1 ring-purple-200'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/15'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Active Quarter Ribbon */}
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs">
                    Current Active Focus
                  </div>
                )}

                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  {/* Left Column: Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">
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

                    {/* Entry Prerequisites Alert */}
                    {!q.prerequisitesMet && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-900">Entry Prerequisites Pending:</span>
                          <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                            {q.pendingRequirements
                              .filter((req) => req.toLowerCase().includes('prerequisite') || req.toLowerCase().includes('entry') || req.toLowerCase().includes('required'))
                              .map((req, idx) => (
                                <li key={idx}>{req}</li>
                              ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Requirements / Milestones Badges */}
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200"
                        >
                          <Clock size={12} className="text-slate-400" />
                          {item}
                        </span>
                      ))}

                      {(q.completedRequirements.length + q.pendingRequirements.length > 5) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold">
                          +{q.completedRequirements.length + q.pendingRequirements.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Progress Meter & Action */}
                  <div className="flex flex-col items-end justify-between min-w-[190px] space-y-4">
                    <div className="w-full text-right">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-slate-500 font-medium">Quarter Progress</span>
                        <span className="font-bold text-slate-900 text-sm">{q.completionPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-purple-600'
                          }`}
                          style={{ width: `${q.completionPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenQuarterDetail(q)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                      >
                        <span>Inspect Details</span>
                        <ExternalLink size={12} />
                      </button>

                      {isHrOrAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer"
                          title={`Edit ${q.quarterCode}`}
                        >
                          <Pencil size={12} />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspect Quarter Details Modal */}
      <QuarterDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        quarter={selectedQuarter}
        onRefetch={refetch}
      />

      {/* HR Edit Journey Modal */}
      {isHrOrAdmin && (
        <EditJourneyModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          employeeId={employeeId}
          internName={intern?.name || employeeName}
          journeyData={journeyData}
          onSaved={refetch}
        />
      )}
    </div>
  );
};
