import React, { useState } from 'react';
import { 
  Sparkles, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  Users, 
  ShieldCheck, 
  Briefcase,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-toastify';
import { 
  useGetTalentRadarQuery, 
  useSubmitPpoVerdictMutation 
} from '../../features/manager/managerApi';
import type { MenteeItem } from '../../features/manager/managerApi';

interface TalentRadarSectionProps {
  mentees: MenteeItem[];
}

export const TalentRadarSection: React.FC<TalentRadarSectionProps> = ({ mentees }) => {
  const [selectedMenteeId, setSelectedMenteeId] = useState<string>(() => mentees[0]?.id || '');
  const activeMenteeId = selectedMenteeId || (mentees[0]?.id ?? '');

  const { data: radarData, isLoading, refetch } = useGetTalentRadarQuery(activeMenteeId, {
    skip: !activeMenteeId,
  });

  const [submitPpo, { isLoading: isSubmittingVerdict }] = useSubmitPpoVerdictMutation();

  const [verdictForm, setVerdictForm] = useState({
    verdict: 'RECOMMEND_PPO' as 'RECOMMEND_PPO' | 'EXTEND_INTERNSHIP' | 'STANDARD_COMPLETION',
    rationale: '',
    tech_stack: 'Full-Stack (Django / React)',
    salary_tier: 'Tier 1 (High Performance)',
    extension_days: 45,
    deficit_area: 'Architecture & System Design',
  });

  const [isVerdictModalOpen, setIsVerdictModalOpen] = useState(false);

  const selectedMentee = mentees.find((m) => m.id === activeMenteeId) || mentees[0];

  const handleVerdictSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMenteeId) return;

    try {
      await submitPpo({
        employee_id: activeMenteeId,
        verdict: verdictForm.verdict,
        rationale: verdictForm.rationale,
        recommended_track: verdictForm.tech_stack,
        salary_tier: verdictForm.salary_tier,
        extension_days: verdictForm.verdict === 'EXTEND_INTERNSHIP' ? verdictForm.extension_days : undefined,
        competency_deficit: verdictForm.verdict === 'EXTEND_INTERNSHIP' ? verdictForm.deficit_area : undefined,
      }).unwrap();

      toast.success('PPO Career Verdict successfully submitted to Executive Calibration Panel!');
      setIsVerdictModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.data?.error || 'Failed to submit verdict.');
    }
  };

  const radarDimensions = radarData?.radarDimensions || [
    { name: 'Problem Solving', score: 8.5, max: 10 },
    { name: 'Architecture', score: 7.8, max: 10 },
    { name: 'Code Quality', score: 9.0, max: 10 },
    { name: 'Delivery Velocity', score: 8.2, max: 10 },
    { name: 'Engineering Agility', score: 8.7, max: 10 },
  ];

  // Radar polygon calculation
  const size = 300;
  const center = size / 2;
  const radius = center - 40;
  const count = radarDimensions.length;

  const getCoordinates = (index: number, score: number, max: number) => {
    const angle = (Math.PI * 2 / count) * index - Math.PI / 2;
    const r = (score / max) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const points = radarDimensions
    .map((d: any, idx: number) => {
      const { x, y } = getCoordinates(idx, d.score, d.max || 10);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100 mb-1">
            <Sparkles size={13} />
            <span>Longitudinal Talent Radar & PPO Verdict (TM-12)</span>
          </div>
          <h2 className="text-lg font-black text-slate-900">Career Calibration & Hiring Decisions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit multi-quarter growth across the 5 core engineering pillars and submit formal conversion recommendations.
          </p>
        </div>

        {/* Mentee Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Mentee:</span>
          <select
            value={activeMenteeId}
            onChange={(e) => setSelectedMenteeId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          >
            {mentees.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName} ({m.employeeCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading talent radar and trajectory...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Radar Visualization */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center justify-between">
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Competency Radar Dimensions</h3>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                Overall: {radarData?.averageScore ? `${radarData.averageScore}/10` : '8.4/10'}
              </span>
            </div>

            {/* SVG Radar */}
            <div className="py-4 relative flex items-center justify-center">
              <svg width={size} height={size} className="overflow-visible">
                {/* Background Concentric Rings */}
                {[0.25, 0.5, 0.75, 1.0].map((level, lIdx) => (
                  <circle
                    key={lIdx}
                    cx={center}
                    cy={center}
                    r={radius * level}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeDasharray={level === 1 ? 'none' : '3 3'}
                  />
                ))}

                {/* Axis Lines */}
                {radarDimensions.map((_: any, idx: number) => {
                  const { x, y } = getCoordinates(idx, 10, 10);
                  return (
                    <line
                      key={idx}
                      x1={center}
                      y1={center}
                      x2={x}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeWidth={1}
                    />
                  );
                })}

                {/* Score Polygon */}
                <polygon
                  points={points}
                  fill="rgba(79, 70, 229, 0.25)"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                />

                {/* Points on radar */}
                {radarDimensions.map((d: any, idx: number) => {
                  const { x, y } = getCoordinates(idx, d.score, d.max || 10);
                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r={4.5}
                      fill="#4F46E5"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  );
                })}

                {/* Labels */}
                {radarDimensions.map((d: any, idx: number) => {
                  const angle = (Math.PI * 2 / count) * idx - Math.PI / 2;
                  const labelR = radius + 22;
                  const lx = center + labelR * Math.cos(angle);
                  const ly = center + labelR * Math.sin(angle);
                  return (
                    <text
                      key={idx}
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[10px] font-bold fill-slate-700"
                    >
                      {d.name} ({d.score})
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
              {radarDimensions.map((d: any, idx: number) => (
                <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block truncate">{d.name}</span>
                  <span className="text-xs font-black text-slate-800">{d.score} / 10</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Longitudinal Trajectory & PPO Verdict Action */}
          <div className="lg:col-span-6 space-y-4">
            {/* Trajectory Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-600" />
                  <h3 className="font-extrabold text-sm text-slate-900">Longitudinal Quarterly Growth</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">MIRAI 2026 Trajectory</span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { quarter: 'Q1 (Baseline)', score: '6.8 / 10', badge: 'Onboarding', status: 'COMPLETED' },
                  { quarter: 'Q2 (Intermediate)', score: '7.9 / 10', badge: 'Core Features', status: 'COMPLETED' },
                  { quarter: 'Q3 (Advanced)', score: '8.8 / 10', badge: 'Autonomous Sprints', status: 'CURRENT' },
                ].map((q, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">{q.quarter}</span>
                    <span className="text-sm font-black text-indigo-700 block">{q.score}</span>
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                      {q.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* PPO Recommendation Callout */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-white/20 mb-2">
                    <Award size={12} /> Stage-Gate Verdict Open
                  </div>
                  <h3 className="text-lg font-black">Pre-Placement Offer (PPO) Deliberation</h3>
                  <p className="text-indigo-200 text-xs mt-1 max-w-sm">
                    Submit your binding technical hiring recommendation for <strong>{selectedMentee?.fullName}</strong> to the Executive Calibration Committee.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => setIsVerdictModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-indigo-950 font-black text-xs shadow-lg hover:bg-indigo-50 transition-all cursor-pointer active:scale-95"
                >
                  <Send size={15} className="text-indigo-600" />
                  Submit Career Verdict (TM-12)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Career Verdict Modal */}
      {isVerdictModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Career Verdict & PPO Sign-Off</h3>
                <p className="text-xs text-slate-500">Candidate: {selectedMentee?.fullName} ({selectedMentee?.employeeCode})</p>
              </div>
              <button onClick={() => setIsVerdictModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleVerdictSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Decision Option *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'RECOMMEND_PPO', label: 'Recommend PPO', desc: 'Full-Time Junior Engineer' },
                    { key: 'EXTEND_INTERNSHIP', label: 'Extend 30-60 Days', desc: 'Coaching Extension' },
                    { key: 'STANDARD_COMPLETION', label: 'Completion Certificate', desc: 'No Employment Conversion' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setVerdictForm({ ...verdictForm, verdict: opt.key as any })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        verdictForm.verdict === opt.key
                          ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {verdictForm.verdict === 'RECOMMEND_PPO' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Recommended Tech Track</label>
                    <input
                      type="text"
                      value={verdictForm.tech_stack}
                      onChange={(e) => setVerdictForm({ ...verdictForm, tech_stack: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Recommended Salary Tier</label>
                    <select
                      value={verdictForm.salary_tier}
                      onChange={(e) => setVerdictForm({ ...verdictForm, salary_tier: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                    >
                      <option value="Tier 1 (High Performance)">Tier 1 (High Performance)</option>
                      <option value="Tier 2 (Standard Engineering)">Tier 2 (Standard Engineering)</option>
                    </select>
                  </div>
                </div>
              )}

              {verdictForm.verdict === 'EXTEND_INTERNSHIP' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">Extension Duration (Days)</label>
                    <input
                      type="number"
                      value={verdictForm.extension_days}
                      onChange={(e) => setVerdictForm({ ...verdictForm, extension_days: Number(e.target.value) })}
                      className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">Target Competency Deficit</label>
                    <input
                      type="text"
                      value={verdictForm.deficit_area}
                      onChange={(e) => setVerdictForm({ ...verdictForm, deficit_area: e.target.value })}
                      className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Technical Rationale & Audit Evidence *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail PR review milestones, system design contributions, and delivery velocity..."
                  value={verdictForm.rationale}
                  onChange={(e) => setVerdictForm({ ...verdictForm, rationale: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVerdictModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVerdict}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
                >
                  {isSubmittingVerdict ? 'Submitting...' : 'Deliver Verdict to Panel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default TalentRadarSection;
