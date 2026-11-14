// epms_frontend/src/pages/appraisal/CycleSetupTab.tsx
import React, { useState, useEffect } from 'react';
import {
  Save, ShieldAlert, Sparkles
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAppraisalWorkspace } from './AppraisalWorkspaceContext';
import { appraisalWorkspaceService } from '../../features/appraisal/appraisalWorkspaceService';
import type { PerformanceCycle } from '../../features/appraisal/appraisalWorkspaceService';

export const CycleSetupTab: React.FC = () => {
  const { activeCycle, refreshCycles, refreshActiveCycle, setActiveCycleId } = useAppraisalWorkspace();
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [miraiStage, setMiraiStage] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | ''>('');
  const [technicalWeight, setTechnicalWeight] = useState('60.00');
  const [behavioralWeight, setBehavioralWeight] = useState('40.00');
  const [ratingScaleMax, setRatingScaleMax] = useState('5.0');
  const [selfAssessmentDeadline, setSelfAssessmentDeadline] = useState('');
  const [evidenceDeadline, setEvidenceDeadline] = useState('');
  const [evaluatorDeadline, setEvaluatorDeadline] = useState('');
  const [japaneseMandatory, setJapaneseMandatory] = useState<boolean | null>(null);

  // Populate when activeCycle changes and not creating new
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeCycle && !isCreatingNew) {
      setName(activeCycle.name || '');
      setDescription(activeCycle.description || '');
      setStartDate(activeCycle.start_date || '');
      setEndDate(activeCycle.end_date || '');
      setMiraiStage(activeCycle.mirai_stage || '');
      setTechnicalWeight(activeCycle.technical_weight || '60.00');
      setBehavioralWeight(activeCycle.behavioral_weight || '40.00');
      setRatingScaleMax(activeCycle.rating_scale_max || '5.0');
      setSelfAssessmentDeadline(activeCycle.self_assessment_deadline || '');
      setEvidenceDeadline(activeCycle.evidence_deadline || '');
      setEvaluatorDeadline(activeCycle.evaluator_deadline || '');
      setJapaneseMandatory(activeCycle.japanese_evaluation_mandatory ?? null);
    }
  }, [activeCycle, isCreatingNew]);

  const handleStartNew = () => {
    setIsCreatingNew(true);
    setName('');
    setDescription('');
    setStartDate(new Date().toISOString().split('T')[0]);
    const future = new Date();
    future.setDate(future.getDate() + 90);
    setEndDate(future.toISOString().split('T')[0]);
    setMiraiStage('Q1');
    setTechnicalWeight('60.00');
    setBehavioralWeight('40.00');
    setRatingScaleMax('5.0');
    setSelfAssessmentDeadline('');
    setEvidenceDeadline('');
    setEvaluatorDeadline('');
    setJapaneseMandatory(null);
  };

  const handleCancelNew = () => {
    setIsCreatingNew(false);
    if (activeCycle) {
      setName(activeCycle.name || '');
    }
  };

  // Live weight calculation
  const techNum = Number(technicalWeight) || 0;
  const behNum = Number(behavioralWeight) || 0;
  const totalWeight = Math.round((techNum + behNum) * 100) / 100;
  const weightsBalanced = totalWeight === 100;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Cycle name is required to save a draft.');
      return;
    }

    const payload: Partial<PerformanceCycle> = {
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      mirai_stage: (miraiStage as 'Q1' | 'Q2' | 'Q3' | 'Q4') || null,
      technical_weight: technicalWeight,
      behavioral_weight: behavioralWeight,
      rating_scale_max: ratingScaleMax,
      japanese_evaluation_mandatory: japaneseMandatory,
      self_assessment_deadline: selfAssessmentDeadline || null,
      evidence_deadline: evidenceDeadline || null,
      evaluator_deadline: evaluatorDeadline || null,
    };

    try {
      setSaving(true);
      if (isCreatingNew || !activeCycle) {
        const created = await appraisalWorkspaceService.createCycle(payload);
        toast.success(`Draft cycle "${created.name}" created successfully!`);
        setIsCreatingNew(false);
        await refreshCycles();
        setActiveCycleId(created.id);
      } else {
        await appraisalWorkspaceService.updateCycle(activeCycle.id, payload);
        toast.success('Cycle setup configuration saved.');
        await refreshActiveCycle();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save cycle configuration';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const isLocked = activeCycle && (activeCycle.status === 'ACTIVE' || activeCycle.status === 'CLOSED' || activeCycle.status === 'PUBLISHED');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            {isCreatingNew ? 'Create New Appraisal Cycle' : `Configure Cycle: ${name || 'Untitled Draft'}`}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Set calendar boundaries, program quarter, scoring weights, and cutoff deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isCreatingNew && (
            <button
              type="button"
              onClick={handleStartNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> New Cycle Draft
            </button>
          )}
          {isCreatingNew && (
            <button
              type="button"
              onClick={handleCancelNew}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {isLocked && !isCreatingNew && (
        <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-200/60 flex items-center gap-2 text-xs text-amber-800">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This cycle is currently <strong>{activeCycle?.status}</strong>. Scoring weights and core parameters are locked to protect ongoing evaluations.</span>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSave} className="p-6 space-y-6">
        {/* Section 1: Cycle Identity & Calendar */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            1. Program Identity & Calendar Boundaries
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cycle Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MIRAI 2026 Q2 Performance Cycle"
                disabled={isLocked && !isCreatingNew}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all disabled:opacity-60"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Purpose
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of program goals, deliverables, and focus areas for this cycle..."
                rows={2}
                disabled={isLocked && !isCreatingNew}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cycle Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isLocked && !isCreatingNew}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cycle End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isLocked && !isCreatingNew}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Section 2: MIRAI Framework & Scoring Calibration */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. MIRAI Stage & 60/40 Weight Calibration
            </h4>
            <div className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md ${
              weightsBalanced
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              Sum: {totalWeight}% {weightsBalanced ? '✓ Valid' : '⚠️ Must equal 100%'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MIRAI Quarter Designation
              </label>
              <select
                value={miraiStage}
                onChange={(e) => setMiraiStage(e.target.value as 'Q1' | 'Q2' | 'Q3' | 'Q4' | '')}
                disabled={isLocked && !isCreatingNew}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all disabled:opacity-60"
              >
                <option value="">-- Select Program Quarter --</option>
                <option value="Q1">Q1 – Baseline & Priorities</option>
                <option value="Q2">Q2 – Application & Progress</option>
                <option value="Q3">Q3 – Ownership & Initiative</option>
                <option value="Q4">Q4 – Professional Readiness (Panel)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Technical Capability Weight (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={technicalWeight}
                onChange={(e) => setTechnicalWeight(e.target.value)}
                disabled={isLocked && !isCreatingNew}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all disabled:opacity-60"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Approved MIRAI default: 60.00%</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Behavioral Capability Weight (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={behavioralWeight}
                onChange={(e) => setBehavioralWeight(e.target.value)}
                disabled={isLocked && !isCreatingNew}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all disabled:opacity-60"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Approved MIRAI default: 40.00%</span>
            </div>
          </div>
        </div>

        {/* Section 3: Cutoff Deadlines */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            3. Submission Deadlines & Program Cutoffs
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Self-Assessment Cutoff Date
              </label>
              <input
                type="date"
                value={selfAssessmentDeadline}
                onChange={(e) => setSelfAssessmentDeadline(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Intern rating submission window closes</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Evidence Submission Cutoff
              </label>
              <input
                type="date"
                value={evidenceDeadline}
                onChange={(e) => setEvidenceDeadline(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Optional (defaults to self-appraisal date)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Evaluator Review Cutoff Date
              </label>
              <input
                type="date"
                value={evaluatorDeadline}
                onChange={(e) => setEvaluatorDeadline(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Mentor & instructor submission closes</span>
            </div>
          </div>
        </div>

        {/* Section 4: Evaluation Program Settings */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            4. Program Evaluation Policies
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Japanese Language Evaluation Track <span className="text-red-500">*</span>
                </label>
                {japaneseMandatory === null ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    Pending Configuration
                  </span>
                ) : japaneseMandatory ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Mandatory
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                    Not Mandatory
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Select whether Japanese language evaluation is required before participant scorecards can be published.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <label className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                  japaneseMandatory === true
                    ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="jpRequirement"
                    checked={japaneseMandatory === true}
                    onChange={() => setJapaneseMandatory(true)}
                    disabled={isLocked && !isCreatingNew}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Mandatory Track</span>
                </label>
                <label className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                  japaneseMandatory === false
                    ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="jpRequirement"
                    checked={japaneseMandatory === false}
                    onChange={() => setJapaneseMandatory(false)}
                    disabled={isLocked && !isCreatingNew}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Not Mandatory</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rating Scale Maximum
              </label>
              <input
                type="number"
                step="0.5"
                min="1.0"
                max="10.0"
                value={ratingScaleMax}
                onChange={(e) => setRatingScaleMax(e.target.value)}
                disabled={isLocked && !isCreatingNew}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all disabled:opacity-60"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Standard MIRAI rating scale: 1.0 to 5.0</span>
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Saving persists draft configuration incrementally. To activate this cycle, visit the <strong>Cycle Overview</strong> tab.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Draft...' : isCreatingNew ? 'Create Cycle Draft' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
