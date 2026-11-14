// epms_frontend/src/pages/appraisal/AppraisalManagementWorkspace.tsx
import React from 'react';
import {
  LayoutDashboard, Sliders, Users, Layers, CheckSquare,
  Lock, AlertCircle, RefreshCw, PlusCircle, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AppraisalWorkspaceProvider,
  useAppraisalWorkspace,
} from './AppraisalWorkspaceContext';
import { CycleOverviewTab } from './CycleOverviewTab';
import { CycleSetupTab } from './CycleSetupTab';
import { CohortEnrollmentTab } from './CohortEnrollmentTab';

const WorkspaceContent: React.FC = () => {
  const navigate = useNavigate();
  const {
    cycles,
    activeCycleId,
    activeCycle,
    activeTab,
    loading,
    error,
    setActiveTab,
    setActiveCycleId,
    refreshCycles,
  } = useAppraisalWorkspace();

  if (loading && cycles.length === 0) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Loading Appraisal Workspace...</h3>
        <p className="text-xs text-slate-400 mt-1">Retrieving performance cycles and cohort telemetry.</p>
      </div>
    );
  }

  if (error && cycles.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <h3 className="text-base font-bold text-slate-800">Workspace Unavailable</h3>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
        <button
          onClick={refreshCycles}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <button
              onClick={() => navigate('/hr')}
              className="hover:text-indigo-600 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> HR Dashboard
            </button>
            <span>/</span>
            <span className="text-slate-600 font-bold">Appraisal Management</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Appraisal Management Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified administrative center for MIRAI performance cycles, rubrics, and cohort evaluations.
          </p>
        </div>

        {/* Cycle Switcher & Quick New Action */}
        <div className="flex items-center gap-3">
          <div className="relative min-w-[220px]">
            <select
              value={activeCycleId || ''}
              onChange={(e) => setActiveCycleId(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer text-slate-800"
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
              {cycles.length === 0 && <option value="">No cycles found</option>}
            </select>
          </div>

          <button
            onClick={() => setActiveTab('setup')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New Cycle</span>
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-1.5 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Tab 1: Cycle Overview
        </button>

        <button
          onClick={() => setActiveTab('setup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'setup'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Tab 2: Cycle Setup
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'participants'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Tab 3: Cohort Enrollment
          {activeCycle && (
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
              activeTab === 'participants' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {activeCycle.participants_count}
            </span>
          )}
        </button>

        {/* Deferred Workstream Tabs (PR #3 and PR #4) */}
        <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />

        <div className="flex items-center gap-1.5 px-3 py-2 text-slate-400 text-xs font-medium cursor-not-allowed shrink-0" title="Competency rubrics & evaluator assignment (PR #3)">
          <Layers className="w-3.5 h-3.5" />
          <span>Competencies</span>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded">PR #3</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-2 text-slate-400 text-xs font-medium cursor-not-allowed shrink-0" title="Assessment progress tracker (PR #4)">
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Progress</span>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded">PR #4</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-2 text-slate-400 text-xs font-medium cursor-not-allowed shrink-0" title="HR review, normalization and publication desk (PR #4)">
          <Lock className="w-3.5 h-3.5" />
          <span>Review & Publish</span>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded">PR #4</span>
        </div>
      </div>

      {/* Tab Content Display */}
      <div>
        {activeTab === 'overview' && <CycleOverviewTab />}
        {activeTab === 'setup' && <CycleSetupTab />}
        {activeTab === 'participants' && <CohortEnrollmentTab />}
      </div>
    </div>
  );
};

export const AppraisalManagementWorkspace: React.FC = () => {
  return (
    <AppraisalWorkspaceProvider>
      <WorkspaceContent />
    </AppraisalWorkspaceProvider>
  );
};

export default AppraisalManagementWorkspace;
