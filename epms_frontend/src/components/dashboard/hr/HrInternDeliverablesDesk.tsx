import React from 'react';
import { FileCheck, Clock, FileText, Target, Filter, ExternalLink, Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import type { HrInternTask, Evidence, Goal, Intern, SectionFetchStatus } from './types';

interface HrInternDeliverablesDeskProps {
  activeDeskTab: 'tasks' | 'evidence' | 'goals';
  setActiveDeskTab: (tab: 'tasks' | 'evidence' | 'goals') => void;
  hrTasks: HrInternTask[];
  evidenceList: Evidence[];
  goals: Goal[];
  interns: Intern[];
  filterTaskIntern: string;
  setFilterTaskIntern: (intern: string) => void;
  filterTaskStatus: string;
  setFilterTaskStatus: (status: string) => void;
  onOpenAssignGoal: () => void;
  onSelectReviewEvidence: (evidence: Evidence) => void;
  tasksStatus?: SectionFetchStatus;
  evidenceStatus?: SectionFetchStatus;
  goalsStatus?: SectionFetchStatus;
  tasksError?: string | null;
  evidenceError?: string | null;
  goalsError?: string | null;
  onRetryTab?: (tab: 'tasks' | 'evidence' | 'goals') => void;
}

export const HrInternDeliverablesDesk: React.FC<HrInternDeliverablesDeskProps> = ({
  activeDeskTab,
  setActiveDeskTab,
  hrTasks,
  evidenceList,
  goals,
  interns,
  filterTaskIntern,
  setFilterTaskIntern,
  filterTaskStatus,
  setFilterTaskStatus,
  onOpenAssignGoal,
  onSelectReviewEvidence,
  tasksStatus = 'success',
  evidenceStatus = 'success',
  goalsStatus = 'success',
  tasksError,
  evidenceError,
  goalsError,
  onRetryTab
}) => {
  return (
    <div className="bg-white rounded-2xl border border-purple-100/90 shadow-xs p-5 md:p-6 space-y-5">
      {/* Desk Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
              <FileCheck size={16} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Intern Deliverables, Tasks & Evidence Desk</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Live tracking of intern-created tasks, deliverables proof of work, and assigned performance goals.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveDeskTab('tasks')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeDeskTab === 'tasks' ? 'bg-white text-purple-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={13} />
            <span>
              Intern Tasks {tasksStatus === 'loading' ? '(…)' : `(${hrTasks.length})`}
            </span>
          </button>
          <button
            onClick={() => setActiveDeskTab('evidence')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeDeskTab === 'evidence' ? 'bg-white text-purple-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={13} />
            <span>
              Evidence Submissions {evidenceStatus === 'loading' ? '(…)' : `(${evidenceList.length})`}
            </span>
          </button>
          <button
            onClick={() => setActiveDeskTab('goals')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeDeskTab === 'goals' ? 'bg-white text-purple-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target size={13} />
            <span>
              Assigned Goals {goalsStatus === 'loading' ? '(…)' : `(${goals.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Intern Tasks Table */}
      {activeDeskTab === 'tasks' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Filter size={13} className="text-purple-600" />
                <span className="font-semibold">Filter Intern:</span>
                <select
                  value={filterTaskIntern}
                  onChange={(e) => setFilterTaskIntern(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden"
                >
                  <option value="ALL">All Interns</option>
                  {interns.map((i) => (
                    <option key={i.id} value={i.name}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="font-semibold">Status:</span>
                <select
                  value={filterTaskStatus}
                  onChange={(e) => setFilterTaskStatus(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="SUBMITTED">Submitted / Review</option>
                </select>
              </div>
            </div>

            <span className="text-[11px] text-slate-400 font-medium">
              Showing {
                hrTasks
                  .filter(t => filterTaskIntern === 'ALL' || t.internName.toLowerCase() === filterTaskIntern.toLowerCase())
                  .filter(t => filterTaskStatus === 'ALL' || t.status?.toUpperCase() === filterTaskStatus)
                  .length
              } tasks
            </span>
          </div>

          {/* Tasks Loading State */}
          {tasksStatus === 'loading' ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3, 4].map((idx) => (
                <div key={idx} className="h-12 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : tasksStatus === 'error' ? (
            /* Tasks Error State with Retry */
            <div className="py-10 text-center text-rose-600 text-xs bg-rose-50/50 rounded-xl border border-rose-200 space-y-2.5">
              <AlertCircle size={22} className="mx-auto text-rose-500" />
              <div className="font-semibold text-rose-900">{tasksError || 'Failed to load intern tasks from server.'}</div>
              <p className="text-[11px] text-rose-700 max-w-sm mx-auto">The backend request encountered an error or network timeout.</p>
              {onRetryTab && (
                <button
                  onClick={() => onRetryTab('tasks')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-100 rounded-lg border border-rose-300 transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw size={12} />
                  <span>Retry Tasks</span>
                </button>
              )}
            </div>
          ) : hrTasks.length === 0 ? (
            /* Tasks Empty State */
            <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No intern tasks recorded in database yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3.5">Intern</th>
                    <th className="py-2.5 px-3.5">Task Title & Description</th>
                    <th className="py-2.5 px-3.5">Related Goal</th>
                    <th className="py-2.5 px-3.5">Priority</th>
                    <th className="py-2.5 px-3.5">Due Date</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hrTasks
                    .filter(t => filterTaskIntern === 'ALL' || t.internName.toLowerCase() === filterTaskIntern.toLowerCase())
                    .filter(t => filterTaskStatus === 'ALL' || t.status?.toUpperCase() === filterTaskStatus)
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3.5">
                          <div className="font-bold text-slate-900">{t.internName}</div>
                          {t.internEmail && <div className="text-[10px] text-slate-400">{t.internEmail}</div>}
                        </td>
                        <td className="py-2.5 px-3.5 max-w-xs">
                          <div className="font-semibold text-slate-800">{t.title}</div>
                          {t.description && (
                            <div className="text-[11px] text-slate-500 line-clamp-1">{t.description}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5">
                          {t.goalTitle ? (
                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200 text-[10px] font-semibold">
                              {t.goalTitle}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">General Task</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            t.priority?.toUpperCase() === 'CRITICAL' || t.priority?.toUpperCase() === 'HIGH'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : t.priority?.toUpperCase() === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 font-medium">
                          {t.dueDate || '—'}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            t.status?.toUpperCase() === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : t.status?.toUpperCase() === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : t.status?.toUpperCase() === 'SUBMITTED'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {t.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-[10px] font-semibold text-slate-500">
                          {t.isSelfCreated ? 'Intern-Created' : 'Assigned'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Evidence Submissions Table */}
      {activeDeskTab === 'evidence' && (
        <div className="space-y-4">
          {evidenceStatus === 'loading' ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3, 4].map((idx) => (
                <div key={idx} className="h-12 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : evidenceStatus === 'error' ? (
            <div className="py-10 text-center text-rose-600 text-xs bg-rose-50/50 rounded-xl border border-rose-200 space-y-2.5">
              <AlertCircle size={22} className="mx-auto text-rose-500" />
              <div className="font-semibold text-rose-900">{evidenceError || 'Failed to load evidence submissions.'}</div>
              <p className="text-[11px] text-rose-700 max-w-sm mx-auto">The backend request encountered an error or network timeout.</p>
              {onRetryTab && (
                <button
                  onClick={() => onRetryTab('evidence')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-100 rounded-lg border border-rose-300 transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw size={12} />
                  <span>Retry Evidence</span>
                </button>
              )}
            </div>
          ) : evidenceList.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No work evidence submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3.5">Intern</th>
                    <th className="py-2.5 px-3.5">Evidence Title</th>
                    <th className="py-2.5 px-3.5">Related Goal / Task</th>
                    <th className="py-2.5 px-3.5">Artifact Link / File</th>
                    <th className="py-2.5 px-3.5">Submitted</th>
                    <th className="py-2.5 px-3.5">Review Status</th>
                    <th className="py-2.5 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evidenceList.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{ev.internName}</td>
                      <td className="py-2.5 px-3.5 max-w-xs">
                        <div className="font-semibold text-slate-800">{ev.title}</div>
                        {ev.note && <div className="text-[10px] text-slate-500 italic mt-0.5">Notes: "{ev.note}"</div>}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 text-[10px] font-semibold">
                          {ev.goalTitle}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2">
                          {ev.link && (
                            <a
                              href={ev.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                            >
                              <ExternalLink size={12} /> URL
                            </a>
                          )}
                          {ev.fileAttachment && (
                            <a
                              href={`/api/evidence/${ev.id}/download/`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200"
                            >
                              <Download size={11} /> File
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-400 text-[11px]">
                        {ev.createdAt || 'Recent'}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          ev.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : ev.status === 'NEEDS_CHANGES'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {ev.status === 'APPROVED' ? <CheckCircle size={10} /> : ev.status === 'NEEDS_CHANGES' ? <AlertCircle size={10} /> : <Clock size={10} />}
                          {ev.status === 'APPROVED' ? 'Approved' : ev.status === 'NEEDS_CHANGES' ? 'Revision Needed' : 'Pending Review'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <button
                          onClick={() => onSelectReviewEvidence(ev)}
                          className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Assigned Goals Table */}
      {activeDeskTab === 'goals' && (
        <div className="space-y-4">
          {goalsStatus === 'loading' ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3, 4].map((idx) => (
                <div key={idx} className="h-12 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : goalsStatus === 'error' ? (
            <div className="py-10 text-center text-rose-600 text-xs bg-rose-50/50 rounded-xl border border-rose-200 space-y-2.5">
              <AlertCircle size={22} className="mx-auto text-rose-500" />
              <div className="font-semibold text-rose-900">{goalsError || 'Failed to load assigned goals.'}</div>
              <p className="text-[11px] text-rose-700 max-w-sm mx-auto">The backend request encountered an error or network timeout.</p>
              {onRetryTab && (
                <button
                  onClick={() => onRetryTab('goals')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-100 rounded-lg border border-rose-300 transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw size={12} />
                  <span>Retry Goals</span>
                </button>
              )}
            </div>
          ) : goals.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-2">
              <p className="font-medium text-slate-600">No goals assigned yet.</p>
              <p className="text-[11px] text-slate-400">Assign quantifiable performance goals to interns for the active cycle.</p>
              <button
                type="button"
                onClick={onOpenAssignGoal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors cursor-pointer"
              >
                <span>+ Assign Goal</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3.5">Assigned Intern</th>
                    <th className="py-2.5 px-3.5">Goal Title & Category</th>
                    <th className="py-2.5 px-3.5">Due Date</th>
                    <th className="py-2.5 px-3.5">Progress</th>
                    <th className="py-2.5 px-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {goals.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{g.internName}</td>
                      <td className="py-2.5 px-3.5 max-w-sm">
                        <div className="font-semibold text-slate-800">{g.title}</div>
                        <div className="text-[10px] text-slate-400">{g.category}</div>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 font-medium">{g.dueDate}</td>
                      <td className="py-2.5 px-3.5 w-44">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, g.progress))}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-700 text-[11px] shrink-0">{g.progress}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          g.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : g.status === 'In Progress'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {g.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
