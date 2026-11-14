// epms_frontend/src/pages/appraisal/CycleOverviewTab.tsx
import React, { useState } from 'react';
import {
  Calendar, CheckCircle2, AlertCircle, Clock, Users,
  Sliders, ArrowRight, Play, ShieldAlert, Award, Layers, UserCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAppraisalWorkspace } from './AppraisalWorkspaceContext';
import { appraisalWorkspaceService } from '../../features/appraisal/appraisalWorkspaceService';

export const CycleOverviewTab: React.FC = () => {
  const { activeCycle, readiness, refreshActiveCycle, setActiveTab } = useAppraisalWorkspace();
  const [activating, setActivating] = useState(false);

  if (!activeCycle) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-xs">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No Cycle Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Create a new appraisal cycle or select an existing draft to inspect its readiness.
        </p>
        <button
          onClick={() => setActiveTab('setup')}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          Create New Cycle <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const isDraft = activeCycle.status === 'DRAFT' || activeCycle.status === 'VALIDATING';
  const isActive = activeCycle.status === 'ACTIVE' || activeCycle.status === 'IN_PROGRESS';

  // Calculate countdown days
  const getDaysRemaining = (deadlineStr: string | null) => {
    if (!deadlineStr) return null;
    const target = new Date(deadlineStr).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const selfDays = getDaysRemaining(activeCycle.self_assessment_deadline);

  const handleActivate = async () => {
    if (!activeCycle.id) return;
    try {
      setActivating(true);
      await appraisalWorkspaceService.activateCycle(activeCycle.id);
      toast.success(`Cycle "${activeCycle.name}" has been successfully activated!`);
      await refreshActiveCycle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to activate cycle';
      toast.error(msg);
    } finally {
      setActivating(false);
    }
  };

  const checklist = readiness?.checklist || {
    name_valid: Boolean(activeCycle.name),
    dates_valid: Boolean(activeCycle.start_date && activeCycle.end_date && activeCycle.end_date >= activeCycle.start_date),
    quarter_designated: Boolean(activeCycle.mirai_stage),
    weights_balanced: (Number(activeCycle.technical_weight) + Number(activeCycle.behavioral_weight)) === 100,
    scale_valid: Number(activeCycle.rating_scale_max) > 0,
    deadlines_populated: Boolean(activeCycle.self_assessment_deadline && activeCycle.evaluator_deadline),
    deadlines_sequence_valid: true,
    participants_enrolled: activeCycle.participants_count > 0,
    participant_count: activeCycle.participants_count,
    japanese_mandatory_explicit: activeCycle.japanese_evaluation_mandatory !== null,
    technical_competencies_configured: false,
    behavioral_competencies_configured: false,
    technical_evaluators_assigned: false,
    behavioral_evaluators_assigned: false,
    japanese_criteria_configured: activeCycle.japanese_evaluation_mandatory !== true,
    japanese_evaluators_assigned: activeCycle.japanese_evaluation_mandatory !== true,
  };

  const isReady = readiness ? readiness.is_ready : false;

  return (
    <div className="space-y-6">
      {/* Top Banner: Status & Program Header */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase rounded-full ${
                isDraft ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                'bg-slate-700/50 text-slate-300 border border-slate-600'
              }`}>
                {activeCycle.status}
              </span>
              {activeCycle.mirai_stage && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 rounded-md border border-indigo-500/30">
                  {activeCycle.mirai_stage} Quarter
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold mt-2 text-white">{activeCycle.name}</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {activeCycle.description || 'No description provided for this evaluation cycle.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {isDraft && (
              <button
                onClick={handleActivate}
                disabled={activating || !isReady}
                title={!isReady ? 'Satisfy all readiness conditions below before activating' : 'Release and activate this cycle'}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                  isReady && !activating
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {activating ? 'Activating...' : 'Activate Cycle'}
              </button>
            )}
            <button
              onClick={() => setActiveTab('setup')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" /> Configure Setup
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Key Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dates Card */}
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cycle Window</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-sm font-bold text-slate-800">
            {activeCycle.start_date} <span className="text-slate-400 font-normal">to</span> {activeCycle.end_date}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Program evaluation timeframe
          </p>
        </div>

        {/* Scoring Distribution */}
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Scoring Weights</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-sm font-bold text-slate-800">
            Tech {activeCycle.technical_weight}% <span className="text-slate-300">/</span> Beh {activeCycle.behavioral_weight}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Scale: 1.0 – {activeCycle.rating_scale_max}
          </p>
        </div>

        {/* Milestone 1: Self-Assessment Cutoff */}
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Self-Appraisal Due</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-sm font-bold text-slate-800">
            {activeCycle.self_assessment_deadline || 'Not configured'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {selfDays !== null
              ? selfDays >= 0 ? `${selfDays} days remaining` : `${Math.abs(selfDays)} days overdue`
              : 'Cutoff date pending'}
          </p>
        </div>

        {/* Cohort Participants */}
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Enrolled Cohort</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-sm font-bold text-slate-800">
            {activeCycle.participants_count} <span className="text-xs font-normal text-slate-500">interns enrolled</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {activeCycle.japanese_evaluation_mandatory ? 'Japanese mandatory' : 'Standard track'}
            </span>
            <button
              onClick={() => setActiveTab('participants')}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              View list →
            </button>
          </div>
        </div>
      </div>

      {/* Activation Readiness Checklist */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Activation Readiness Checklist</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify pre-launch requirements before transitioning this cycle from Draft to Active.
            </p>
          </div>
          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
            isReady
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {isReady ? 'Ready for Activation' : 'Requirements Pending'}
          </span>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item 1: Name and Dates */}
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              checklist.name_valid && checklist.dates_valid
                ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                : 'bg-amber-50/40 border-amber-100 text-amber-900'
            }`}>
              {checklist.name_valid && checklist.dates_valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-xs font-bold">1. Cycle Name & Calendar Boundaries</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Name is unique and end date is on or after start date.
                </div>
              </div>
            </div>

            {/* Item 2: MIRAI Quarter */}
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              checklist.quarter_designated
                ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                : 'bg-amber-50/40 border-amber-100 text-amber-900'
            }`}>
              {checklist.quarter_designated ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-xs font-bold">2. MIRAI Quarter Alignment</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Designated quarter: {activeCycle.mirai_stage ? `Quarter ${activeCycle.mirai_stage}` : 'None'}
                </div>
              </div>
            </div>

            {/* Item 3: 60/40 Weight Balance & Rating Scale */}
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              checklist.weights_balanced && checklist.scale_valid
                ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                : 'bg-amber-50/40 border-amber-100 text-amber-900'
            }`}>
              {checklist.weights_balanced && checklist.scale_valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-xs font-bold">3. 100% Weight Calibration (60/40) & Rating Scale</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Tech {activeCycle.technical_weight}% + Beh {activeCycle.behavioral_weight}% = {Number(activeCycle.technical_weight) + Number(activeCycle.behavioral_weight)}% · Scale max: {activeCycle.rating_scale_max}
                </div>
              </div>
            </div>

            {/* Item 4: Deadlines Sequence */}
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              checklist.deadlines_populated && checklist.deadlines_sequence_valid
                ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                : 'bg-amber-50/40 border-amber-100 text-amber-900'
            }`}>
              {checklist.deadlines_populated && checklist.deadlines_sequence_valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-xs font-bold">4. Cutoff Deadlines Populated & Ordered</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Self cutoff &lt;= Evaluator review cutoff &lt;= Cycle end date.
                </div>
              </div>
            </div>

            {/* Item 5: Cohort Enrollment */}
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              checklist.participants_enrolled
                ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                : 'bg-amber-50/40 border-amber-100 text-amber-900'
            }`}>
              {checklist.participants_enrolled ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Users className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold">5. Participant Cohort Enrollment</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {checklist.participant_count > 0
                      ? `${checklist.participant_count} active interns enrolled in this cycle.`
                      : 'No interns enrolled yet. At least one intern must be enrolled.'}
                  </div>
                </div>
                {!checklist.participants_enrolled && (
                  <button
                    onClick={() => setActiveTab('participants')}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs cursor-pointer"
                  >
                    Enroll Interns Now
                  </button>
                )}
              </div>
            </div>

            {/* Item 6: Japanese Language Track */}
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              checklist.japanese_mandatory_explicit
                ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                : 'bg-amber-50/40 border-amber-100 text-amber-900'
            }`}>
              {checklist.japanese_mandatory_explicit ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-xs font-bold">6. Japanese Language Evaluation Track</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {activeCycle.japanese_evaluation_mandatory === true
                    ? 'Mandatory: Instructor submission required before publication.'
                    : activeCycle.japanese_evaluation_mandatory === false
                    ? 'Not Mandatory: Standard evaluation track without Japanese blocker.'
                    : 'Unconfigured: HR must explicitly designate Mandatory or Not Mandatory.'}
                </div>
              </div>
            </div>

            {/* Item 7: Technical Competency Rubric */}
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              checklist.technical_competencies_configured
                ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                : 'bg-amber-50/40 border-amber-100 text-amber-900'
            }`}>
              {checklist.technical_competencies_configured ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Layers className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold">7. Technical Capabilities Calibration</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {checklist.technical_competencies_configured
                      ? `Calibrated: 100.00% across ${checklist.technical_competencies_count || 0} competencies.`
                      : `Weights must sum to 100.00% (currently ${checklist.technical_weight_total ?? 0}%).`}
                  </div>
                </div>
                {!checklist.technical_competencies_configured && (
                  <button
                    onClick={() => setActiveTab('competencies')}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs cursor-pointer"
                  >
                    Configure
                  </button>
                )}
              </div>
            </div>

            {/* Item 8: Behavioral Competency Rubric */}
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              checklist.behavioral_competencies_configured
                ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                : 'bg-amber-50/40 border-amber-100 text-amber-900'
            }`}>
              {checklist.behavioral_competencies_configured ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Layers className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold">8. Behavioral Competencies Calibration</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {checklist.behavioral_competencies_configured
                      ? `Calibrated: 100.00% across ${checklist.behavioral_competencies_count || 0} competencies.`
                      : `Weights must sum to 100.00% (currently ${checklist.behavioral_weight_total ?? 0}%).`}
                  </div>
                </div>
                {!checklist.behavioral_competencies_configured && (
                  <button
                    onClick={() => setActiveTab('competencies')}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs cursor-pointer"
                  >
                    Configure
                  </button>
                )}
              </div>
            </div>

            {/* Item 9: Technical & Behavioral Evaluator Assignments */}
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              checklist.technical_evaluators_assigned && checklist.behavioral_evaluators_assigned
                ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                : 'bg-amber-50/40 border-amber-100 text-amber-900'
            }`}>
              {checklist.technical_evaluators_assigned && checklist.behavioral_evaluators_assigned ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <UserCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold">9. Mentor Evaluator Assignments</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {checklist.technical_evaluators_assigned && checklist.behavioral_evaluators_assigned
                      ? 'Technical & Behavioral evaluators assigned for all enrolled cohort interns.'
                      : 'Evaluators missing for some interns in Technical or Behavioral sections.'}
                  </div>
                </div>
                {!(checklist.technical_evaluators_assigned && checklist.behavioral_evaluators_assigned) && (
                  <button
                    onClick={() => setActiveTab('evaluators')}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs cursor-pointer"
                  >
                    Assign Mentors
                  </button>
                )}
              </div>
            </div>

            {/* Item 10: Japanese Track Criteria & Instructors (when mandatory) */}
            {activeCycle.japanese_evaluation_mandatory === true && (
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                checklist.japanese_criteria_configured && checklist.japanese_evaluators_assigned
                  ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                  : 'bg-amber-50/40 border-amber-100 text-amber-900'
              }`}>
                {checklist.japanese_criteria_configured && checklist.japanese_evaluators_assigned ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold">10. Japanese Criteria & Batch Sensei</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {checklist.japanese_criteria_configured && checklist.japanese_evaluators_assigned
                        ? '100% Japanese criteria calibrated & batch instructors assigned.'
                        : 'Criteria weights must sum to 100% and valid batch instructors must be assigned.'}
                    </div>
                  </div>
                  {!(checklist.japanese_criteria_configured && checklist.japanese_evaluators_assigned) && (
                    <button
                      onClick={() => setActiveTab('evaluators')}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs cursor-pointer"
                    >
                      Assign Sensei
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Readiness Errors List (if any) */}
          {readiness?.readiness_errors && readiness.readiness_errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50/60 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-red-800 mb-1">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Activation Blockers Identified:
              </div>
              <ul className="list-disc list-inside text-xs text-red-700 space-y-0.5 pl-1">
                {readiness.readiness_errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
