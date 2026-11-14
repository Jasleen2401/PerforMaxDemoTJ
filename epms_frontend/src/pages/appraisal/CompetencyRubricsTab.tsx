// epms_frontend/src/pages/appraisal/CompetencyRubricsTab.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers, Plus, Trash2, Edit2, AlertCircle, CheckCircle2,
  ChevronRight, BookOpen, ShieldCheck, Scale, Info, X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAppraisalWorkspace } from './AppraisalWorkspaceContext';
import {
  appraisalWorkspaceService,
} from '../../features/appraisal/appraisalWorkspaceService';
import type {
  CycleCompetency,
  JapaneseEvalCriterion,
} from '../../features/appraisal/appraisalWorkspaceService';

type ActiveSection = 'TECHNICAL' | 'BEHAVIORAL' | 'JAPANESE';

export const CompetencyRubricsTab: React.FC = () => {
  const { activeCycle, refreshReadiness } = useAppraisalWorkspace();

  const [activeSection, setActiveSection] = useState<ActiveSection>('TECHNICAL');
  const [competencies, setCompetencies] = useState<CycleCompetency[]>([]);
  const [japaneseCriteria, setJapaneseCriteria] = useState<JapaneseEvalCriterion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Modal / Drawer state for creating / editing competency
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingComp, setEditingComp] = useState<CycleCompetency | null>(null);

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formWeight, setFormWeight] = useState<string>('20.00');
  const [formBenchmark, setFormBenchmark] = useState<string>('4.0');
  const [formOrder, setFormOrder] = useState<number>(0);
  const [formDescriptors, setFormDescriptors] = useState<Record<string, string>>({
    '1': '',
    '2': '',
    '3': '',
    '4': '',
    '5': '',
  });

  // Anchor viewer modal state
  const [inspectingComp, setInspectingComp] = useState<CycleCompetency | null>(null);

  const isLocked = activeCycle?.status === 'FINALIZED' ||
    activeCycle?.status === 'PUBLISHED' ||
    activeCycle?.status === 'CLOSED';

  // Load competencies
  const loadData = useCallback(async () => {
    if (!activeCycle?.id) return;
    try {
      setLoading(true);
      const [comps, jpCrits] = await Promise.all([
        appraisalWorkspaceService.getCompetencies(activeCycle.id),
        appraisalWorkspaceService.getJapaneseCriteria(activeCycle.id).catch(() => []),
      ]);
      setCompetencies(comps);
      setJapaneseCriteria(jpCrits);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load competencies';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeCycle?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Section Filtering
  const technicalComps = useMemo(
    () => competencies.filter((c) => c.section === 'TECHNICAL'),
    [competencies]
  );
  const behavioralComps = useMemo(
    () => competencies.filter((c) => c.section === 'BEHAVIORAL'),
    [competencies]
  );

  // Weight Calculations
  const technicalWeightSum = useMemo(
    () => technicalComps.reduce((acc, c) => acc + (parseFloat(c.weight) || 0), 0),
    [technicalComps]
  );
  const behavioralWeightSum = useMemo(
    () => behavioralComps.reduce((acc, c) => acc + (parseFloat(c.weight) || 0), 0),
    [behavioralComps]
  );
  const japaneseWeightSum = useMemo(
    () => japaneseCriteria.reduce((acc, c) => acc + (parseFloat(c.weight) || 0), 0),
    [japaneseCriteria]
  );

  const currentSectionComps = activeSection === 'TECHNICAL' ? technicalComps : behavioralComps;
  const currentWeightSum = activeSection === 'TECHNICAL' ? technicalWeightSum : behavioralWeightSum;
  const isSectionBalanced = Math.abs(currentWeightSum - 100) < 0.01;

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingComp(null);
    setFormName('');
    setFormDesc('');
    // Suggest remaining weight up to 100%
    const currentSum = activeSection === 'TECHNICAL' ? technicalWeightSum : behavioralWeightSum;
    const remaining = Math.max(0, 100 - currentSum);
    setFormWeight(remaining > 0 ? remaining.toFixed(2) : '20.00');
    setFormBenchmark('4.0');
    setFormOrder(currentSectionComps.length + 1);
    setFormDescriptors({
      '1': '',
      '2': '',
      '3': '',
      '4': '',
      '5': '',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (comp: CycleCompetency) => {
    setEditingComp(comp);
    setFormName(comp.name);
    setFormDesc(comp.description || '');
    setFormWeight(comp.weight);
    setFormBenchmark(comp.benchmark_score || '4.0');
    setFormOrder(comp.order);
    const existing = comp.rubric_descriptors || {};
    setFormDescriptors({
      '1': existing['1'] || '',
      '2': existing['2'] || '',
      '3': existing['3'] || '',
      '4': existing['4'] || '',
      '5': existing['5'] || '',
    });
    setIsModalOpen(true);
  };

  // Submit Form (Create or Update)
  const handleSaveCompetency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCycle?.id) return;
    if (!formName.trim()) {
      toast.error('Competency name is required.');
      return;
    }

    const weightNum = parseFloat(formWeight);
    if (isNaN(weightNum) || weightNum < 0 || weightNum > 100) {
      toast.error('Weight must be between 0.00 and 100.00%.');
      return;
    }

    try {
      setSaving(true);
      const cleanedDescriptors: Record<string, string> = {};
      Object.entries(formDescriptors).forEach(([lvl, text]) => {
        if (text && text.trim()) {
          cleanedDescriptors[lvl] = text.trim();
        }
      });

      const payload: Partial<CycleCompetency> = {
        section: activeSection === 'TECHNICAL' ? 'TECHNICAL' : 'BEHAVIORAL',
        name: formName.trim(),
        description: formDesc.trim(),
        weight: weightNum.toFixed(2),
        benchmark_score: parseFloat(formBenchmark || '4.0').toFixed(1),
        order: Number(formOrder) || 0,
        rubric_descriptors: cleanedDescriptors,
      };

      if (editingComp) {
        await appraisalWorkspaceService.updateCompetency(activeCycle.id, editingComp.id, payload);
        toast.success(`Updated competency: "${formName.trim()}"`);
      } else {
        await appraisalWorkspaceService.createCompetency(activeCycle.id, payload);
        toast.success(`Created competency: "${formName.trim()}"`);
      }

      setIsModalOpen(false);
      await loadData();
      await refreshReadiness();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save competency';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Delete Competency
  const handleDeleteCompetency = async (comp: CycleCompetency) => {
    if (!activeCycle?.id) return;
    const confirm = window.confirm(`Are you sure you want to delete competency "${comp.name}"?`);
    if (!confirm) return;

    try {
      await appraisalWorkspaceService.deleteCompetency(activeCycle.id, comp.id);
      toast.success(`Deleted competency: "${comp.name}"`);
      await loadData();
      await refreshReadiness();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete competency';
      toast.error(msg);
    }
  };

  if (!activeCycle) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-xs">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No Cycle Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Select or create an appraisal cycle to configure competency rubrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Section Switcher */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                Tab 4 · Rubrics
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-slate-600">{activeCycle.name}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Competency Rubrics & Anchors
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Define cycle-scoped capabilities, internal percentage weights, and 1–5 level proficiency descriptors.
            </p>
          </div>

          {/* Section Pill Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setActiveSection('TECHNICAL')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSection === 'TECHNICAL'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Technical ({activeCycle.technical_weight}%)
            </button>
            <button
              onClick={() => setActiveSection('BEHAVIORAL')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSection === 'BEHAVIORAL'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Behavioral ({activeCycle.behavioral_weight}%)
            </button>
            <button
              onClick={() => setActiveSection('JAPANESE')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSection === 'JAPANESE'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Japanese Language Track
            </button>
          </div>
        </div>

        {/* Live Section Calibration Meter */}
        {activeSection !== 'JAPANESE' ? (
          <div className="mt-6 p-4 rounded-xl border bg-slate-50/70 border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {activeSection === 'TECHNICAL' ? 'Technical Capabilities' : 'Behavioral Competencies'} Internal Weight Balance
                  </span>
                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                    isSectionBalanced
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {isSectionBalanced ? 'Balanced (100.00%)' : `Current: ${currentWeightSum.toFixed(2)}%`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Internal weights within this section must sum to exactly 100.00% to qualify for cycle activation.
                  Incremental draft saves are preserved at any percentage.
                </p>
              </div>

              {!isLocked && (
                <button
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Competency
                </button>
              )}
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-3">
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isSectionBalanced
                      ? 'bg-emerald-500'
                      : currentWeightSum > 100
                      ? 'bg-red-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, currentWeightSum)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>0.00%</span>
                <span>
                  {currentWeightSum < 100
                    ? `+${(100 - currentWeightSum).toFixed(2)}% remaining`
                    : currentWeightSum > 100
                    ? `-${(currentWeightSum - 100).toFixed(2)}% excess`
                    : '100.00% Perfectly Calibrated'}
                </span>
                <span>Target: 100.00%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 p-4 rounded-xl border bg-blue-50/50 border-blue-100">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-blue-900">
                  Japanese Language Track · Canonical Criteria Architecture
                </h4>
                <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                  Japanese language evaluation criteria are managed via the canonical{' '}
                  <code className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-[11px]">JapaneseEvalCriterion</code>{' '}
                  model and RTK Query endpoints. In accordance with the PR #3 specification, criteria definitions are shared with
                  Japanese instructors without duplicate modeling in CycleCompetency. Rubric anchor descriptors for Japanese criteria
                  are deferred.
                </p>
                <div className="mt-2 text-xs font-bold text-blue-800">
                  Cycle Track Policy:{' '}
                  {activeCycle.japanese_evaluation_mandatory === true
                    ? 'Mandatory (Instructor submission required before publication)'
                    : activeCycle.japanese_evaluation_mandatory === false
                    ? 'Not Mandatory (Standard intern track)'
                    : 'Unconfigured Decision'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-xs">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-semibold">Loading competency definitions and rubric anchors...</p>
        </div>
      ) : activeSection === 'JAPANESE' ? (
        /* Japanese Criteria Reference View */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Active Japanese Language Criteria ({japaneseCriteria.length})
            </h3>
            <span className="text-xs font-bold text-slate-500">
              Total Weight: {japaneseWeightSum.toFixed(2)}%
            </span>
          </div>

          {japaneseCriteria.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No Japanese evaluation criteria configured for this cycle.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {japaneseCriteria.map((crit, idx) => (
                <div key={crit.id} className="p-4 sm:px-6 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                      <h4 className="text-xs font-bold text-slate-900">{crit.name}</h4>
                    </div>
                    {crit.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl">{crit.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {crit.weight}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : currentSectionComps.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-xs">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">
            No {activeSection === 'TECHNICAL' ? 'Technical Capabilities' : 'Behavioral Competencies'} Configured
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add competencies for this cycle to calibrate mentor scoring rubrics and define expected performance benchmarks.
          </p>
          {!isLocked && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add First Competency
            </button>
          )}
        </div>
      ) : (
        /* Competencies Cards Grid */
        <div className="grid grid-cols-1 gap-4">
          {currentSectionComps.map((comp) => {
            const descriptorsCount = Object.values(comp.rubric_descriptors || {}).filter(Boolean).length;
            const hasAllAnchors = descriptorsCount === 5;

            return (
              <div
                key={comp.id}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:border-slate-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                      {comp.order}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{comp.name}</h3>
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                      Weight: {comp.weight}%
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-700 shrink-0">
                      Benchmark: {comp.benchmark_score} / {activeCycle.rating_scale_max}
                    </span>
                  </div>

                  {comp.description && (
                    <p className="text-xs text-slate-500 pl-8 max-w-2xl leading-relaxed">
                      {comp.description}
                    </p>
                  )}

                  <div className="pl-8 pt-1 flex items-center gap-3">
                    <button
                      onClick={() => setInspectingComp(comp)}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-md px-2 py-1 transition-colors cursor-pointer ${
                        hasAllAnchors
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : descriptorsCount > 0
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {hasAllAnchors ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      <span>Anchors: {descriptorsCount}/5 Defined</span>
                      <ChevronRight className="w-3 h-3 opacity-60" />
                    </button>
                  </div>
                </div>

                {!isLocked && (
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => handleOpenEdit(comp)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                      title="Edit competency"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCompetency(comp)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete competency"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Anchor Inspector Modal */}
      {inspectingComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase text-indigo-600">Proficiency Rubric Anchors</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{inspectingComp.name}</h3>
              </div>
              <button
                onClick={() => setInspectingComp(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const desc = inspectingComp.rubric_descriptors?.[String(lvl)];
                const labels: Record<number, string> = {
                  1: 'Level 1: Novice / Needs Guidance',
                  2: 'Level 2: Developing Capability',
                  3: 'Level 3: Competent / Standard Target',
                  4: 'Level 4: Advanced Proficiency',
                  5: 'Level 5: Role Model / Master',
                };
                return (
                  <div key={lvl} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{labels[lvl]}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white rounded border border-slate-200">
                        Score {lvl}.0
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {desc || <span className="text-slate-400 italic">No descriptor specified for this level.</span>}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setInspectingComp(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Competency Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase text-indigo-600">
                  {editingComp ? 'Edit Competency' : 'New Competency'}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {activeSection === 'TECHNICAL' ? 'Technical Capability' : 'Behavioral Competency'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompetency} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Competency Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. System Design, Code Quality, Cross-Functional Communication"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Performance Expectations
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Describe scope, key assessment indicators, and deliverables..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Section Weight (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Must sum to 100% at activation.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Benchmark Score
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max={activeCycle.rating_scale_max}
                    value={formBenchmark}
                    onChange={(e) => setFormBenchmark(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Expected proficiency target.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Rubric Anchors 1-5 Accordion / Inputs */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 mb-2">
                  Proficiency Level Anchors (1 to 5)
                </h4>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((lvl) => {
                    const placeholders: Record<number, string> = {
                      1: 'Level 1: Novice — Struggles with fundamentals; requires continuous mentoring...',
                      2: 'Level 2: Developing — Executes routine tasks with periodic direction...',
                      3: 'Level 3: Competent — Delivers standard quality independently to specification...',
                      4: 'Level 4: Advanced — Exceeds expectations, mentors peers, anticipates defects...',
                      5: 'Level 5: Role Model — Industry-level excellence, drives organizational best practices...',
                    };
                    return (
                      <div key={lvl}>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-0.5">
                          <span>Anchor Level {lvl}</span>
                        </div>
                        <input
                          type="text"
                          value={formDescriptors[String(lvl)] || ''}
                          onChange={(e) =>
                            setFormDescriptors({
                              ...formDescriptors,
                              [String(lvl)]: e.target.value,
                            })
                          }
                          placeholder={placeholders[lvl]}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingComp ? 'Save Changes' : 'Create Competency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
