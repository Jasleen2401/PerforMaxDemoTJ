import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Target, 
  User, 
  Search, 
  Check, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { toast } from 'react-toastify';
import { 
  useGetManagerTasksQuery, 
  useVerifyGoalMutation 
} from '../../features/manager/managerApi';
import type { ManagerTaskItem } from '../../features/manager/managerApi';

interface GoalAuditingSectionProps {
  onRefetchData?: () => void;
}

export const GoalAuditingSection: React.FC<GoalAuditingSectionProps> = ({ onRefetchData }) => {
  const { data: tasks = [], isLoading, refetch } = useGetManagerTasksQuery();
  const [verifyGoal, { isLoading: isVerifying }] = useVerifyGoalMutation();

  const [search, setSearch] = useState('');
  const [disputeModalTask, setDisputeModalTask] = useState<ManagerTaskItem | null>(null);
  const [disputeNote, setDisputeNote] = useState('');

  const filteredTasks = tasks.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.employeeName.toLowerCase().includes(q) ||
      (t.projectTitle && t.projectTitle.toLowerCase().includes(q))
    );
  });

  const handleAuditDecision = async (taskId: string, decision: 'VALIDATED' | 'DISPUTED', note?: string) => {
    try {
      await verifyGoal({
        goal_id: taskId,
        decision,
        discrepancy_note: note,
      }).unwrap();

      toast.success(
        decision === 'VALIDATED'
          ? 'KPI achievement ratio confirmed and credited to appraisal package!'
          : 'Goal progress disputed. Notification sent to mentee.'
      );

      setDisputeModalTask(null);
      setDisputeNote('');
      refetch();
      if (onRefetchData) onRefetchData();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.data?.error || 'Failed to update goal audit status.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100 mb-1">
            <Target size={13} />
            <span>Goal Progress & KPI Achievement Auditing (TM-09)</span>
          </div>
          <h2 className="text-lg font-black text-slate-900">Sprint KRA & Deliverable Verification</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit intern-reported progress ratios. Confirmed progress feeds into the 40% deliverable execution score.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by goal, mentee, or project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 w-56 focus:outline-hidden"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            title="Refresh Goals"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading KRA goals for audit...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <Target size={38} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Goals Under Audit</h3>
          <p className="text-xs text-slate-500 mt-1">All assigned goals are currently validated or none match your query.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'COMPLETED';
            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-slate-300 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-slate-900">{task.title}</span>
                    {task.projectCode && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[10px] font-mono font-bold text-indigo-700">
                        {task.projectCode}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        task.priority === 'CRITICAL'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {task.statusDisplay}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
                    <span>
                      Mentee: <strong className="text-slate-800 font-semibold">{task.employeeName}</strong>
                    </span>
                    {task.expectedEvidenceType && (
                      <span>
                        Expected Proof: <strong className="text-indigo-600 font-semibold">{task.expectedEvidenceType}</strong>
                      </span>
                    )}
                    {task.linkedCompetency && (
                      <span>
                        Competency: <strong className="text-slate-700 font-semibold">{task.linkedCompetency}</strong>
                      </span>
                    )}
                    <span>
                      Due: <strong className="text-slate-700 font-semibold">{task.dueDate || 'No due date'}</strong>
                    </span>
                  </div>
                </div>

                {/* Progress bar & Audit Decision */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                  <div className="w-32 space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">Progress</span>
                      <span className="text-indigo-600">{task.currentValue || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, task.currentValue || 0)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={isVerifying || isCompleted}
                      onClick={() => handleAuditDecision(task.id, 'VALIDATED')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                      title={isCompleted ? 'Deliverable already verified' : 'Confirm intern-reported completion ratio'}
                    >
                      <CheckCircle2 size={13} />
                      {isCompleted ? 'Verified' : 'Validate Ratio'}
                    </button>

                    {!isCompleted && (
                      <button
                        disabled={isVerifying}
                        onClick={() => {
                          setDisputeModalTask(task);
                          setDisputeNote('');
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                        title="Dispute progress and request evidence"
                      >
                        <XCircle size={13} />
                        Dispute
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Dispute Goal Progress</h3>
                <p className="text-xs text-slate-500">Mentee: {disputeModalTask.employeeName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Entering a discrepancy note will revert reported progress to the previous verified level and notify the mentee to provide verifiable proof.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discrepancy Note *</label>
              <textarea
                rows={3}
                placeholder="Explain missing PR commits, broken test coverage, or unverified claims..."
                value={disputeNote}
                onChange={(e) => setDisputeNote(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDisputeModalTask(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isVerifying || !disputeNote.trim()}
                onClick={() => handleAuditDecision(disputeModalTask.id, 'DISPUTED', disputeNote)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                Submit Discrepancy Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default GoalAuditingSection;
