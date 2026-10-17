import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  GraduationCap, 
  Briefcase, 
  Award, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  ExternalLink,
  Target,
  Sparkles,
  BookOpen
} from 'lucide-react';
import type { MenteeItem } from '../../features/manager/managerApi';

interface MenteeProfileDrawerProps {
  mentee: MenteeItem | null;
  onClose: () => void;
  onAssignTask: (menteeId: string) => void;
  onRateTech: (menteeId: string) => void;
}

export const MenteeProfileDrawer: React.FC<MenteeProfileDrawerProps> = ({
  mentee,
  onClose,
  onAssignTask,
  onRateTech,
}) => {
  const navigate = useNavigate();
  if (!mentee) return null;

  const academic = mentee.academicHistory || {};

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center font-extrabold text-2xl text-white shadow-inner">
              {mentee.firstName?.[0]}{mentee.lastName?.[0]}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold text-indigo-200 border border-white/20 mb-1">
                <span>{mentee.universityCohort || 'MIRAI Engineering Intern'}</span>
              </div>
              <h2 className="text-xl font-black text-white">{mentee.fullName}</h2>
              <div className="text-xs text-indigo-200 font-mono mt-0.5">
                {mentee.employeeCode} • {mentee.email}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10 text-center">
            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
              <span className="text-[10px] text-indigo-200 uppercase tracking-wider font-semibold block">Goals Ratio</span>
              <span className="text-sm font-black text-white mt-0.5 block">
                {mentee.metrics.completedGoals} / {mentee.metrics.totalGoals}
              </span>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
              <span className="text-[10px] text-indigo-200 uppercase tracking-wider font-semibold block">Tech Capability</span>
              <span className="text-sm font-black text-emerald-300 mt-0.5 block">
                {mentee.metrics.technicalCapabilityAvg ? `${mentee.metrics.technicalCapabilityAvg}/10` : 'Unrated'}
              </span>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
              <span className="text-[10px] text-indigo-200 uppercase tracking-wider font-semibold block">Appraisal Status</span>
              <span className="text-xs font-bold text-amber-300 mt-1 block truncate">
                {mentee.activeAppraisal?.statusDisplay || 'Not Started'}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TM-01: Academic Background & Cohort Verification */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <GraduationCap size={16} className="text-indigo-600" />
              <span>Academic Background & Cohort Verification (TM-01)</span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">University / Institution</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                    {academic.university || 'Tokyo Institute of Technology'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Degree & Major</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                    {academic.degree || 'B.Tech in Computer Science'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Cumulative GPA</span>
                  <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                    {academic.gpa || '3.88 / 4.0'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Graduation Year</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                    {academic.graduationYear || '2027'}
                  </span>
                </div>
              </div>

              {academic.coursework && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Key Coursework</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(academic.coursework) ? academic.coursework : [academic.coursework]).map((c: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-700">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Department & Role */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Briefcase size={16} className="text-indigo-600" />
              <span>Internship Organizational Binding</span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Designation:</span>
                <span className="font-bold text-slate-800">{mentee.designation}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Engineering Pod:</span>
                <span className="font-bold text-slate-800">{mentee.department}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Employment Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                  {mentee.employmentStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pending Deliverables:</span>
                <span className="font-bold text-amber-700">{mentee.metrics.pendingEvidence} Under Review</span>
              </div>
            </div>
          </div>

          {/* Baseline Technical Skills */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Sparkles size={16} className="text-indigo-600" />
              <span>Baseline Technical Competencies</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap gap-2">
                {['Python & Django', 'TypeScript & React', 'Relational DB / SQL', 'Automated Testing', 'Git & CI/CD Sprints'].map((skill, idx) => (
                  <span key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              onClose();
              navigate(`/continuous/meetings`);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
          >
            <Calendar size={14} className="text-indigo-600" />
            1-on-1 Sync
          </button>
          <button
            onClick={() => {
              onClose();
              onAssignTask(mentee.id);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
          >
            <Target size={14} className="text-indigo-600" />
            Assign Task
          </button>
          <button
            onClick={() => {
              onClose();
              onRateTech(mentee.id);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all cursor-pointer shadow-md shadow-indigo-100"
          >
            <Sparkles size={14} />
            Rate Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
export default MenteeProfileDrawer;
