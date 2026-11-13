import React, { useState } from 'react';
import {
  X,
  Award,
  Cpu,
  BookOpen,
  Briefcase,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Calendar,
  User,
  Check,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import type { 
  MiraiQuarterItem, 
  MiraiExamItem, 
  MiraiTechnicalParameterItem,
  MiraiCourseItem 
} from '../../features/dashboard/dashboardTypes';
import { useSubmitMiraiCertificationMutation } from '../../features/dashboard/dashboardApi';

interface QuarterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quarter: MiraiQuarterItem | null;
  onRefetch?: () => void;
}

type TabType = 'exams' | 'technical' | 'courses' | 'deliverables' | 'feedback' | 'timeline';

export const QuarterDetailModal: React.FC<QuarterDetailModalProps> = ({
  isOpen,
  onClose,
  quarter,
  onRefetch,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('exams');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLevel, setUploadLevel] = useState('N5');
  const [uploadScore, setUploadScore] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadStatus, setUploadStatus] = useState('CLEARED');
  const [submitCert, { isLoading: isSubmittingCert }] = useSubmitMiraiCertificationMutation();
  const [submitSuccess, setSubmitSuccess] = useState(false);

  if (!isOpen || !quarter) return null;

  const handleCertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitCert({
        jlptLevel: uploadLevel,
        quarterCode: quarter.quarterCode,
        score: uploadScore,
        certificateUrl: uploadUrl,
        status: uploadStatus,
      }).unwrap();
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowUploadModal(false);
        if (onRefetch) onRefetch();
      }, 1200);
    } catch {
      alert('Failed to submit certificate. Please try again.');
    }
  };

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

  const tabs: { id: TabType; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'exams', label: 'Exams & Certifications', icon: Award, count: quarter.exams?.length || 0 },
    { id: 'technical', label: 'Technical Parameters', icon: Cpu, count: quarter.technicalParameters?.length || 0 },
    { id: 'courses', label: 'Courses', icon: BookOpen, count: quarter.courses?.length || 0 },
    { id: 'deliverables', label: 'Internship & Deliverables', icon: Briefcase, count: quarter.deliverables?.tasks?.length || 0 },
    { id: 'feedback', label: 'Feedback & Reviews', icon: MessageSquare, count: quarter.feedback?.length || 0 },
    { id: 'timeline', label: 'Quarter Timeline', icon: Clock, count: quarter.timeline?.length || 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* Header                                                                    */}
        {/* ========================================================================= */}
        <div className="p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30 uppercase tracking-wider">
              {quarter.quarterCode}
            </span>
            {getStatusBadge(quarter.status)}
            {quarter.startDate && quarter.endDate && (
              <span className="text-xs text-purple-200/80 flex items-center gap-1 font-medium ml-1">
                <Calendar size={13} />
                {quarter.startDate} — {quarter.endDate}
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
            {quarter.title}
          </h2>

          <p className="text-xs sm:text-sm text-purple-100/80 max-w-2xl">
            {quarter.currentFocus}
          </p>

          {/* Progress Bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 bg-white/20 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${quarter.completionPercentage}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-300 shrink-0">
              {quarter.completionPercentage.toFixed(0)}% Complete
            </span>
          </div>

          {/* Prerequisite Alert Banner */}
          {!quarter.prerequisitesMet && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-100 flex items-start gap-2.5 text-xs">
              <AlertTriangle size={16} className="text-amber-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-200">Prerequisite Requirements Pending:</span>
                <p className="text-amber-100/90 mt-0.5">
                  This quarter requires prerequisite clearances before progression can complete.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* Navigation Tabs                                                           */}
        {/* ========================================================================= */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2 gap-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* Tab Content Area                                                          */}
        {/* ========================================================================= */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ----------------------------------------------------------------------- */}
          {/* TAB A: EXAMS & CERTIFICATIONS                                           */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'exams' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Exams & Official Certifications</h3>
                  <p className="text-xs text-slate-500">JLPT credentials, clearances, and HR verification status</p>
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                >
                  <Upload size={14} />
                  Submit Certificate Link
                </button>
              </div>

              {quarter.exams && quarter.exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quarter.exams.map((exam) => (
                    <div 
                      key={exam.id} 
                      className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs hover:border-purple-200 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {exam.jlptLevel}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 leading-tight">{exam.name}</h4>
                            <span className="text-[11px] text-slate-500">Level: {exam.jlptLevel}</span>
                          </div>
                        </div>
                        {exam.status === 'CLEARED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} /> Cleared
                          </span>
                        ) : exam.status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock size={11} /> In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Not Started
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Score / Result</span>
                          <span className="font-bold text-slate-800">{exam.score || 'Awaiting Examination'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Clearance Date</span>
                          <span className="font-medium text-slate-700">{exam.clearanceDate || exam.examDate || 'Scheduled'}</span>
                        </div>
                      </div>

                      {/* Verification Status */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck size={14} className={exam.verificationStatus === 'VERIFIED' ? 'text-emerald-600' : 'text-slate-400'} />
                          <span className="text-[11px] font-medium text-slate-600">
                            {exam.verificationStatus === 'VERIFIED' ? (
                              <span className="text-emerald-700 font-semibold">Verified by {exam.verifiedBy || 'HR'}</span>
                            ) : exam.verificationStatus === 'PENDING' ? (
                              <span className="text-amber-600 font-semibold">Verification Pending</span>
                            ) : (
                              'Not Submitted'
                            )}
                          </span>
                        </div>

                        {exam.certificateUrl && (
                          <a 
                            href={exam.certificateUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800"
                          >
                            Certificate <ExternalLink size={11} />
                          </a>
                        )}
                      </div>

                      {exam.verificationNotes && (
                        <p className="text-[11px] text-slate-500 italic bg-purple-50/50 p-2 rounded border border-purple-100/60">
                          {exam.verificationNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No examination records logged for {quarter.quarterCode}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Submit your JLPT certification credentials using the button above.</p>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB B: TECHNICAL PARAMETERS                                             */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'technical' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Technical Competency & Capability Parameters</h3>
                <p className="text-xs text-slate-500">Evaluations conducted by engineering mentors against enterprise benchmarks</p>
              </div>

              {quarter.technicalParameters && quarter.technicalParameters.length > 0 ? (
                <div className="space-y-3">
                  {quarter.technicalParameters.map((param) => {
                    const scoreRatio = (param.achievedScore / 5.0) * 100;
                    return (
                      <div 
                        key={param.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-purple-200 transition-all space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {param.category}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 mt-1">{param.parameterName}</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-purple-700">{param.achievedScore.toFixed(1)}</span>
                            <span className="text-xs text-slate-400"> / 5.0</span>
                            <span className="text-[11px] text-slate-400 block font-medium">Target: {param.targetScore.toFixed(1)}</span>
                          </div>
                        </div>

                        {/* Benchmark Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                            <span>Proficiency Rating</span>
                            <span className="font-bold text-slate-700">{param.achievedScore >= param.targetScore ? 'Benchmark Met' : 'In Progress'}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                param.achievedScore >= param.targetScore 
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                  : 'bg-gradient-to-r from-purple-500 to-indigo-400'
                              }`}
                              style={{ width: `${Math.min(100, scoreRatio)}%` }}
                            />
                          </div>
                        </div>

                        {param.mentorAssessment && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100/80">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Mentor Assessment</span>
                            <p className="text-slate-700">{param.mentorAssessment}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <User size={12} className="text-slate-400" />
                            Assessor: <strong className="text-slate-700">{param.assessorName}</strong> ({param.assessmentDate})
                          </span>
                          {param.evidenceUrl && (
                            <a 
                              href={param.evidenceUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-purple-600 hover:text-purple-800 font-bold inline-flex items-center gap-1"
                            >
                              Artifact PR <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Cpu className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No technical capability parameters logged yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Parameters will appear once your mentor completes their assessment review.</p>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB C: COURSES                                                          */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'courses' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Training Modules & Courses</h3>
                <p className="text-xs text-slate-500">Mandatory agentic AI and Japanese engineering courses</p>
              </div>

              {quarter.courses && quarter.courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quarter.courses.map((course) => (
                    <div 
                      key={course.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-purple-200 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">{course.courseName}</h4>
                          <span className="text-[11px] text-slate-500">{course.provider} • {course.durationHours} Hours</span>
                        </div>
                        {course.completionPercentage >= 100 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            <CheckCircle2 size={11} /> 100%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                            {course.completionPercentage.toFixed(0)}%
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all"
                            style={{ width: `${course.completionPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                        <span>Completed: {course.completionDate || 'In Progress'}</span>
                        {course.certificateUrl && (
                          <a 
                            href={course.certificateUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800"
                          >
                            Certificate <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No courses scheduled for {quarter.quarterCode}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Training enrollments are synchronized with the enterprise learning module.</p>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB D: INTERNSHIP & DELIVERABLES                                        */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'deliverables' && (
            <div className="space-y-5">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Internship Project & Sprint Deliverables</h3>
                <p className="text-xs text-slate-500">Live deliverables, mentor supervision, and submitted artifacts</p>
              </div>

              {/* Mentor & Project Overview Card */}
              <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
                    {quarter.deliverables?.mentor?.name?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-purple-700 tracking-wider">Assigned Mentor</span>
                    <h4 className="text-xs font-bold text-slate-900">{quarter.deliverables?.mentor?.name || 'Unassigned'}</h4>
                    <span className="text-[11px] text-slate-500">{quarter.deliverables?.mentor?.email}</span>
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-purple-100">
                  <span className="text-[10px] font-bold uppercase text-purple-700 tracking-wider">Project Scope</span>
                  <h4 className="text-xs font-bold text-slate-900">{quarter.projectName || quarter.deliverables?.projectName || 'Core Engineering Sprint'}</h4>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    {quarter.deliverables?.tasksCompleted || 0} of {quarter.deliverables?.tasksTotal || 0} Tasks Completed
                  </span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Sprint Technical Tasks</h4>
                {quarter.deliverables?.tasks && quarter.deliverables.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {quarter.deliverables.tasks.map((task) => (
                      <div 
                        key={task.id}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-purple-200 transition-all"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 rounded-full p-1 ${task.isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {task.isCompleted ? <Check size={13} /> : <Clock size={13} />}
                          </div>
                          <div>
                            <h5 className={`text-xs font-bold ${task.isCompleted ? 'text-slate-800 line-through' : 'text-slate-900'}`}>
                              {task.title}
                            </h5>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                              <span>Due: {task.dueDate || 'N/A'}</span>
                              <span>•</span>
                              <span className="uppercase text-[10px] font-semibold text-purple-700">{task.category}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {task.artifactUrl && (
                            <a 
                              href={task.artifactUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                            >
                              Artifact <ExternalLink size={11} />
                            </a>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            task.isCompleted 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No sprint tasks assigned yet for this quarter.</p>
                )}
              </div>

              {/* Evidence Submissions */}
              {quarter.deliverables?.evidence && quarter.deliverables.evidence.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Submitted Deliverable Evidence</h4>
                  <div className="space-y-2">
                    {quarter.deliverables.evidence.map((ev) => (
                      <div key={ev.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex items-center justify-between gap-3">
                        <div>
                          <h5 className="font-bold text-slate-900">{ev.title}</h5>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{ev.description}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          ev.reviewStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {ev.reviewStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB E: FEEDBACK & REVIEWS                                               */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Feedback, Appraisals & Growth Observations</h3>
                <p className="text-xs text-slate-500">Official calibrated appraisals and continuous feedback</p>
              </div>

              {quarter.feedback && quarter.feedback.length > 0 ? (
                <div className="space-y-4">
                  {quarter.feedback.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                            {item.reviewerName?.charAt(0) || 'R'}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{item.reviewerName}</h4>
                            <span className="text-[11px] text-slate-500">{item.reviewDate}</span>
                          </div>
                        </div>

                        {item.classification && (
                          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                            {item.classification}
                          </span>
                        )}
                      </div>

                      {/* Strengths */}
                      {item.strengths && item.strengths.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Demonstrated Strengths</span>
                          <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc marker:text-emerald-500">
                            {item.strengths.map((str, idx) => (
                              <li key={idx}>{str}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Areas for Improvement */}
                      {item.areasForImprovement && item.areasForImprovement.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Actionable Growth Areas</span>
                          <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc marker:text-amber-500">
                            {item.areasForImprovement.map((area, idx) => (
                              <li key={idx}>{area}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommendations */}
                      {item.recommendations && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Recommendations</span>
                          <p className="text-slate-700">{item.recommendations}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No published feedback recorded yet for {quarter.quarterCode}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Unpublished internal notes are confidential and only appear once officially calibrated.</p>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB F: QUARTER TIMELINE                                                 */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Chronological Event Timeline</h3>
                <p className="text-xs text-slate-500">Milestone transitions, exam verifications, and audit logging</p>
              </div>

              {quarter.timeline && quarter.timeline.length > 0 ? (
                <div className="relative border-l-2 border-purple-200 ml-4 space-y-6 my-2">
                  {quarter.timeline.map((event) => (
                    <div key={event.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-white border-2 border-purple-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900">{event.title}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">{event.eventDate}</span>
                        </div>
                        <p className="text-xs text-slate-600">{event.description}</p>
                        {event.actor && (
                          <span className="text-[10px] text-slate-400 block pt-1">
                            Logged by: <strong className="text-slate-600">{event.actor}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No timeline events recorded yet for {quarter.quarterCode}</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* Footer                                                                    */}
        {/* ========================================================================= */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Upload Certificate Modal                                                  */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-slate-800 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Submit Certification Link</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {submitSuccess ? (
              <div className="p-6 text-center space-y-2">
                <FileCheck2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                <h4 className="text-sm font-bold text-slate-900">Certificate Submitted!</h4>
                <p className="text-xs text-slate-500">Your certification has been logged and sent to HR for official verification.</p>
              </div>
            ) : (
              <form onSubmit={handleCertSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">JLPT Level</label>
                  <select
                    value={uploadLevel}
                    onChange={(e) => setUploadLevel(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden bg-white"
                  >
                    <option value="N5">JLPT N5 (Q1 Foundation)</option>
                    <option value="N4">JLPT N4 (Q2 / Q3 Gate)</option>
                    <option value="N3">JLPT N3 (Q3 / Q4 Gate)</option>
                    <option value="N2">JLPT N2 (Advanced)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Score / Result Details</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 142 / 180 (Passed)"
                    value={uploadScore}
                    onChange={(e) => setUploadScore(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Certificate Document URL / Storage Link</label>
                  <input
                    type="url"
                    required
                    placeholder="https://storage.performax.io/certificates/..."
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Link to hosted PDF or image of your score report.</span>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-3.5 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCert}
                    className="px-4 py-2 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmittingCert ? 'Submitting...' : 'Submit to HR'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
