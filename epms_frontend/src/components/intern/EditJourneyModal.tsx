import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  BookOpen,
  Briefcase,
  Cpu,
  Award,
  Plus,
  Trash2,
  Calendar,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useUpdateInternJourneyMutation } from '../../features/dashboard/dashboardApi';
import type { InternJourneyData, MiraiQuarterItem } from '../../features/dashboard/dashboardTypes';

interface EditJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  internName: string;
  journeyData: InternJourneyData;
  onSaved: () => void;
}

export const EditJourneyModal: React.FC<EditJourneyModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  internName,
  journeyData,
  onSaved,
}) => {
  const [selectedQuarterCode, setSelectedQuarterCode] = useState<string>('Q1');
  const [updateJourney, { isLoading: isSaving }] = useUpdateInternJourneyMutation();

  // Form states per quarter
  const [quarterForms, setQuarterForms] = useState<Record<string, {
    title: string;
    status: string;
    progress: number;
    currentFocus: string;
    projectName: string;
    startDate: string;
    endDate: string;
    attendancePercentage: number;
    completedRequirements: string[];
    pendingRequirements: string[];
    forceOverride: boolean;
    // Cert
    certLevel: string;
    certStatus: string;
    certScore: string;
    certVerification: string;
    certNotes: string;
    // Tech
    techScore: number;
    techNotes: string;
    // Conversion (Q4)
    conversionDecision: string;
    conversionEffectiveDate: string;
    hrConversionNotes: string;
  }>>({});

  const [newCompletedReq, setNewCompletedReq] = useState('');
  const [newPendingReq, setNewPendingReq] = useState('');

  // Initialize form states when journeyData changes
  useEffect(() => {
    if (!journeyData?.quarters) return;

    const initial: Record<string, any> = {};
    for (const q of journeyData.quarters) {
      const qCode = q.quarterCode;
      const cert = q.exams?.[0];
      const tech = q.technicalParameters?.[0];

      initial[qCode] = {
        title: q.title || '',
        status: q.status || 'NOT_STARTED',
        progress: Number(q.completionPercentage) || 0,
        currentFocus: q.currentFocus || '',
        projectName: q.projectName || '',
        startDate: q.startDate || '',
        endDate: q.endDate || '',
        attendancePercentage: q.attendancePercentage ? Number(q.attendancePercentage) : 95,
        completedRequirements: [...(q.completedRequirements || [])],
        pendingRequirements: [...(q.pendingRequirements || [])],
        forceOverride: false,
        certLevel: cert?.jlptLevel || ({ Q1: 'N5', Q2: 'N4', Q3: 'N3', Q4: 'N2' }[qCode] || 'OTHER'),
        certStatus: cert?.status || 'NOT_STARTED',
        certScore: cert?.score || '',
        certVerification: cert?.verificationStatus || 'VERIFIED',
        certNotes: cert?.verificationNotes || '',
        techScore: tech ? Number(tech.achievedScore) : 4.0,
        techNotes: '',
        conversionDecision: q.conversionDecision || 'PENDING',
        conversionEffectiveDate: q.conversionEffectiveDate || '',
        hrConversionNotes: q.hrConversionNotes || '',
      };
    }
    setQuarterForms(initial);
    if (journeyData.currentQuarter && initial[journeyData.currentQuarter]) {
      setSelectedQuarterCode(journeyData.currentQuarter);
    }
  }, [journeyData, isOpen]);

  if (!isOpen) return null;

  const currentForm = quarterForms[selectedQuarterCode] || {
    title: '',
    status: 'NOT_STARTED',
    progress: 0,
    currentFocus: '',
    projectName: '',
    startDate: '',
    endDate: '',
    attendancePercentage: 95,
    completedRequirements: [],
    pendingRequirements: [],
    forceOverride: false,
    certLevel: 'N5',
    certStatus: 'NOT_STARTED',
    certScore: '',
    certVerification: 'VERIFIED',
    certNotes: '',
    techScore: 4.0,
    techNotes: '',
    conversionDecision: 'PENDING',
    conversionEffectiveDate: '',
    hrConversionNotes: '',
  };

  const updateCurrentField = (field: string, value: any) => {
    setQuarterForms((prev) => ({
      ...prev,
      [selectedQuarterCode]: {
        ...prev[selectedQuarterCode],
        [field]: value,
      },
    }));
  };

  const handleAddCompletedReq = () => {
    if (!newCompletedReq.trim()) return;
    const updated = [...currentForm.completedRequirements, newCompletedReq.trim()];
    updateCurrentField('completedRequirements', updated);
    setNewCompletedReq('');
  };

  const handleRemoveCompletedReq = (idx: number) => {
    const updated = currentForm.completedRequirements.filter((_, i) => i !== idx);
    updateCurrentField('completedRequirements', updated);
  };

  const handleAddPendingReq = () => {
    if (!newPendingReq.trim()) return;
    const updated = [...currentForm.pendingRequirements, newPendingReq.trim()];
    updateCurrentField('pendingRequirements', updated);
    setNewPendingReq('');
  };

  const handleRemovePendingReq = (idx: number) => {
    const updated = currentForm.pendingRequirements.filter((_, i) => i !== idx);
    updateCurrentField('pendingRequirements', updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate progress strictly between 0 and 100
    for (const [code, f] of Object.entries(quarterForms)) {
      if (f.progress < 0 || f.progress > 100) {
        toast.error(`Quarter ${code} progress must be strictly between 0 and 100%`);
        return;
      }
    }

    try {
      const quartersPayload = Object.entries(quarterForms).map(([code, f]) => ({
        quarter_code: code,
        title: f.title,
        status: f.status,
        completion_percentage: f.progress,
        current_focus: f.currentFocus,
        project_name: f.projectName,
        start_date: f.startDate || null,
        end_date: f.endDate || null,
        attendance_percentage: f.attendancePercentage,
        completed_requirements: f.completedRequirements,
        pending_requirements: f.pendingRequirements,
        force_override: f.forceOverride,
        conversion_decision: code === 'Q4' ? f.conversionDecision : undefined,
        conversion_effective_date: code === 'Q4' ? (f.conversionEffectiveDate || null) : undefined,
        hr_conversion_notes: code === 'Q4' ? f.hrConversionNotes : undefined,
      }));

      // Gather certifications to update
      const certsPayload = Object.entries(quarterForms)
        .filter(([_, f]) => f.certScore || f.certStatus !== 'NOT_STARTED')
        .map(([code, f]) => ({
          quarter_code: code,
          jlpt_level: f.certLevel,
          status: f.certStatus,
          score: f.certScore,
          verification_status: f.certVerification,
          verification_notes: f.certNotes,
        }));

      // Gather tech reviews to update
      const techPayload = Object.entries(quarterForms).map(([_, f]) => ({
        score: f.techScore,
        mentor_assessment: f.techNotes || 'Assessed by HR Administrator',
      }));

      const res: any = await updateJourney({
        employeeId,
        quarters: quartersPayload,
        certifications: certsPayload.length > 0 ? certsPayload : undefined,
        technical_parameters: techPayload,
      }).unwrap();

      toast.success(res?.message || 'MIRAI Journey updated and persisted successfully');
      onSaved();
      onClose();
    } catch (err: any) {
      const errMsg = err?.data?.message || err?.message || 'Failed to update MIRAI Journey. Please verify prerequisites.';
      toast.error(errMsg);
    }
  };

  const getQuarterIcon = (code: string) => {
    switch (code) {
      case 'Q1': return BookOpen;
      case 'Q2': return Briefcase;
      case 'Q3': return Cpu;
      case 'Q4': return Award;
      default: return Layers;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-400/30 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Edit MIRAI Journey — {internName}
              </h3>
              <p className="text-xs text-purple-200/80">
                Update progress percentages, quarter status transitions, milestones, exams, and technical parameters.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quarter Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto">
          {['Q1', 'Q2', 'Q3', 'Q4'].map((code) => {
            const Icon = getQuarterIcon(code);
            const isSelected = selectedQuarterCode === code;
            const qForm = quarterForms[code];
            const qProgress = qForm ? qForm.progress : 0;
            const qStatus = qForm ? qForm.status : 'NOT_STARTED';

            return (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedQuarterCode(code)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-t border-x -mb-[1px] ${
                  isSelected
                    ? 'bg-white text-purple-950 border-slate-200 border-b-transparent shadow-xs'
                    : 'bg-transparent text-slate-500 hover:text-slate-800 border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-slate-400'}`} />
                <span>{code}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  qStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                  qStatus === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-800' :
                  'bg-slate-200 text-slate-600'
                }`}>
                  {qProgress}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quarter Header & Status Controls */}
          <div className="p-4.5 rounded-xl bg-purple-50/50 border border-purple-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Quarter Status
              </label>
              <select
                value={currentForm.status}
                onChange={(e) => updateCurrentField('status', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="NOT_STARTED">Not Started (0%)</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed (100%)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Progress Percentage
                </label>
                <span className="text-xs font-bold text-purple-700">{currentForm.progress}%</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentForm.progress}
                  onChange={(e) => updateCurrentField('progress', Number(e.target.value))}
                  className="flex-1 accent-purple-600 cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={currentForm.progress}
                  onChange={(e) => updateCurrentField('progress', Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-center font-bold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Attendance & Participation (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={currentForm.attendancePercentage}
                onChange={(e) => updateCurrentField('attendancePercentage', Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Prerequisite Alert & Override */}
          {(selectedQuarterCode === 'Q3' || selectedQuarterCode === 'Q4') && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Entry Prerequisites Requirement:</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {selectedQuarterCode === 'Q3'
                      ? 'Q3 requires verified JLPT N4 clearance and a Technical Capability benchmark ≥ 3.5/5.0.'
                      : 'Q4 requires verified JLPT N3 clearance and a Technical Capability benchmark ≥ 4.0/5.0.'}
                  </p>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-amber-300 shrink-0 self-start sm:self-auto">
                <input
                  type="checkbox"
                  checked={currentForm.forceOverride}
                  onChange={(e) => updateCurrentField('forceOverride', e.target.checked)}
                  className="accent-purple-600 rounded"
                />
                <span className="text-[11px] font-bold text-slate-800">Admin Override Prerequisites</span>
              </label>
            </div>
          )}

          {/* Quarter Details Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Quarter Title
              </label>
              <input
                type="text"
                value={currentForm.title}
                onChange={(e) => updateCurrentField('title', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
                placeholder="e.g. Q1 — Japanese Foundations"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Project Name
              </label>
              <input
                type="text"
                value={currentForm.projectName}
                onChange={(e) => updateCurrentField('projectName', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
                placeholder="e.g. Performax AI Automation Engine"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Current Strategic Focus & Deliverables
              </label>
              <textarea
                rows={2}
                value={currentForm.currentFocus}
                onChange={(e) => updateCurrentField('currentFocus', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800"
                placeholder="Key deliverables, curriculum tracks, or focus areas..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={currentForm.startDate}
                onChange={(e) => updateCurrentField('startDate', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={currentForm.endDate}
                onChange={(e) => updateCurrentField('endDate', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Milestones & Requirements Manager */}
          <div className="border border-slate-200 rounded-xl p-4.5 bg-slate-50/50 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Quarter Milestones & Requirements
            </h4>

            {/* Completed Milestones */}
            <div>
              <span className="text-[11px] font-bold text-emerald-800 block mb-1.5">
                Completed Milestones ({currentForm.completedRequirements.length}):
              </span>
              <div className="flex flex-wrap gap-2 mb-2">
                {currentForm.completedRequirements.map((req, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200"
                  >
                    <span>{req}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCompletedReq(idx)}
                      className="text-emerald-700 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCompletedReq}
                  onChange={(e) => setNewCompletedReq(e.target.value)}
                  placeholder="Add completed milestone (e.g. JLPT N5 Cleared)..."
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCompletedReq(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddCompletedReq}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Pending Requirements */}
            <div className="pt-3 border-t border-slate-200">
              <span className="text-[11px] font-bold text-amber-800 block mb-1.5">
                Pending Requirements ({currentForm.pendingRequirements.length}):
              </span>
              <div className="flex flex-wrap gap-2 mb-2">
                {currentForm.pendingRequirements.map((req, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200"
                  >
                    <span>{req}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePendingReq(idx)}
                      className="text-amber-700 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPendingReq}
                  onChange={(e) => setNewPendingReq(e.target.value)}
                  placeholder="Add pending requirement (e.g. Mid-term Assessment Pending)..."
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPendingReq(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddPendingReq}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Exam & Technical Parameters Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Certifications */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                JLPT / Exam Certification
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-600 font-medium mb-1">Level</label>
                  <select
                    value={currentForm.certLevel}
                    onChange={(e) => updateCurrentField('certLevel', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold"
                  >
                    <option value="N5">JLPT N5</option>
                    <option value="N4">JLPT N4</option>
                    <option value="N3">JLPT N3</option>
                    <option value="N2">JLPT N2</option>
                    <option value="N1">JLPT N1</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 font-medium mb-1">Exam Status</label>
                  <select
                    value={currentForm.certStatus}
                    onChange={(e) => updateCurrentField('certStatus', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold"
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="CLEARED">Cleared</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 font-medium mb-1">Score</label>
                  <input
                    type="text"
                    value={currentForm.certScore}
                    onChange={(e) => updateCurrentField('certScore', e.target.value)}
                    placeholder="e.g. 150/180"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 font-medium mb-1">Verification</label>
                  <select
                    value={currentForm.certVerification}
                    onChange={(e) => updateCurrentField('certVerification', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold"
                  >
                    <option value="VERIFIED">Verified</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="NOT_SUBMITTED">Not Submitted</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Technical Capability Parameters */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                Technical Capability Review
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-medium text-slate-600">Assessed Benchmark Score</span>
                    <span className="font-bold text-blue-700">{currentForm.techScore.toFixed(1)} / 5.0</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={currentForm.techScore}
                    onChange={(e) => updateCurrentField('techScore', Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 font-medium mb-1">HR Assessor Notes</label>
                  <input
                    type="text"
                    value={currentForm.techNotes}
                    onChange={(e) => updateCurrentField('techNotes', e.target.value)}
                    placeholder="Evaluation notes, benchmarks..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Q4 Conversion Details */}
          {selectedQuarterCode === 'Q4' && (
            <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/30 space-y-3">
              <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                Q4 Full-Time Conversion Committee Decision
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-700 font-bold mb-1">Conversion Outcome</label>
                  <select
                    value={currentForm.conversionDecision}
                    onChange={(e) => updateCurrentField('conversionDecision', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
                  >
                    <option value="PENDING">Pending Evaluation</option>
                    <option value="RECOMMENDED">Mentor Recommended</option>
                    <option value="OFFERED">Full-Time Offer Extended</option>
                    <option value="CONVERTED">Converted to Full-Time</option>
                    <option value="NOT_CONVERTED">Not Converted</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-700 font-bold mb-1">Conversion Effective Date</label>
                  <input
                    type="date"
                    value={currentForm.conversionEffectiveDate}
                    onChange={(e) => updateCurrentField('conversionEffectiveDate', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] text-slate-700 font-bold mb-1">HR Conversion Committee Remarks</label>
                  <textarea
                    rows={2}
                    value={currentForm.hrConversionNotes}
                    onChange={(e) => updateCurrentField('hrConversionNotes', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800"
                    placeholder="Document committee review decisions and full-time transition pathway..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Changes will be strictly validated and recorded in the database audit log.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
