import React, { useState } from 'react';
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle, Calendar,
  ExternalLink, UserCheck, ShieldAlert, RefreshCw, X, Send,
  FileCheck, HelpCircle, Plus, Edit2, Trash2, Tag, Check
} from 'lucide-react';
import type { InternTaskItem, InternGoalItem } from '../../features/dashboard/dashboardTypes';
import {
  useCreateInternTaskMutation,
  useUpdateInternTaskMutation,
  useDeleteInternTaskMutation
} from '../../features/dashboard/dashboardApi';
import { toast } from 'react-toastify';

interface InternTasksTabProps {
  tasks: InternTaskItem[];
  goals?: InternGoalItem[];
  isLoading: boolean;
  onCompleteTask: (payload: {
    id: string;
    isCompleted: boolean;
    completedAt?: string;
    hoursSpent?: number;
    completionNotes?: string;
    artifactUrl?: string;
  }) => Promise<any>;
  onRefetch: () => void;
}

export const InternTasksTab: React.FC<InternTasksTabProps> = ({
  tasks = [],
  goals = [],
  isLoading,
  onCompleteTask,
  onRefetch,
}) => {
  // Existing complete task modal state
  const [selectedTask, setSelectedTask] = useState<InternTaskItem | null>(null);
  const [completionDate, setCompletionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [hoursSpent, setHoursSpent] = useState<string>('3.5');
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [artifactUrl, setArtifactUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New task creation modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newGoalId, setNewGoalId] = useState<string>('');
  const [newDueDate, setNewDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [newPriority, setNewPriority] = useState<string>('MEDIUM');
  const [newStatus, setNewStatus] = useState<string>('IN_PROGRESS');

  // Edit task modal state
  const [editingTask, setEditingTask] = useState<InternTaskItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editPriority, setEditPriority] = useState<string>('MEDIUM');
  const [editStatus, setEditStatus] = useState<string>('IN_PROGRESS');

  // RTK Query Mutations
  const [createTask, { isLoading: isCreating }] = useCreateInternTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateInternTaskMutation();
  const [deleteTask, { isLoading: isDeleting }] = useDeleteInternTaskMutation();

  const handleOpenCompleteModal = (task: InternTaskItem) => {
    setSelectedTask(task);
    setCompletionDate(new Date().toISOString().split('T')[0]);
    setHoursSpent(task.hoursSpent ? String(task.hoursSpent) : '3.5');
    setCompletionNotes(task.completionNotes || '');
    setArtifactUrl(task.artifactUrl || '');
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
  };

  const handleOpenCreateModal = () => {
    setNewTitle('');
    setNewDescription('');
    setNewGoalId('');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setNewDueDate(d.toISOString().split('T')[0]);
    setNewPriority('MEDIUM');
    setNewStatus('IN_PROGRESS');
    setIsCreateModalOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Task title is required.');
      return;
    }

    try {
      await createTask({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        goalId: newGoalId || undefined,
        dueDate: newDueDate,
        priority: newPriority,
        status: newStatus,
      }).unwrap();

      toast.success('Task created successfully!');
      setIsCreateModalOpen(false);
      onRefetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.data?.detail || 'Failed to create task.');
    }
  };

  const handleOpenEditModal = (task: InternTaskItem) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditDueDate(task.dueDate || new Date().toISOString().split('T')[0]);
    setEditPriority(task.priority || 'MEDIUM');
    setEditStatus(task.status || (task.isCompleted ? 'COMPLETED' : 'IN_PROGRESS'));
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!editTitle.trim()) {
      toast.error('Task title is required.');
      return;
    }

    try {
      await updateTask({
        id: editingTask.id,
        title: editTitle.trim(),
        description: editDescription.trim(),
        dueDate: editDueDate,
        priority: editPriority,
        status: editStatus,
      }).unwrap();

      toast.success('Task updated successfully!');
      setEditingTask(null);
      onRefetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.data?.detail || 'Failed to update task.');
    }
  };

  const handleQuickStatusChange = async (task: InternTaskItem, newSt: string) => {
    try {
      await updateTask({
        id: task.id,
        status: newSt,
      }).unwrap();
      toast.success(`Task status changed to ${newSt.replace(/_/g, ' ')}`);
      onRefetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.data?.detail || 'Failed to update status.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(taskId).unwrap();
      toast.success('Task deleted successfully.');
      onRefetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.data?.detail || 'Failed to delete task.');
    }
  };

  const handleSubmitCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const parsedHours = parseFloat(hoursSpent);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      toast.error('Please enter a valid positive number for hours spent.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onCompleteTask({
        id: selectedTask.id,
        isCompleted: true,
        completedAt: completionDate,
        hoursSpent: parsedHours,
        completionNotes: completionNotes.trim(),
        artifactUrl: artifactUrl.trim() || undefined,
      });

      const requiresReview = (selectedTask as any).requires_mentor_review ?? (selectedTask as any).requiresMentorReview;
      if (requiresReview) {
        toast.success('Task submitted for mentor review! Status is now SUBMITTED.');
      } else {
        toast.success('Task marked completed successfully!');
      }

      handleCloseModal();
      onRefetch();
    } catch {
      toast.error('Failed to submit task completion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (task: any) => {
    const st = task.status || (task.isCompleted ? 'COMPLETED' : 'IN_PROGRESS');
    switch (st) {
      case 'COMPLETED':
        return {
          label: 'Completed',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 size={13} />,
        };
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return {
          label: 'Submitted for Review',
          className: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <UserCheck size={13} />,
        };
      case 'OVERDUE':
        return {
          label: 'Overdue',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <AlertCircle size={13} />,
        };
      case 'IN_PROGRESS':
        return {
          label: 'In Progress',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Clock size={13} />,
        };
      default:
        return {
          label: 'To Do',
          className: 'bg-slate-50 text-slate-600 border-slate-200',
          icon: <Clock size={13} />,
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <ClipboardList className="text-indigo-600" size={20} />
            My Tasks & Deliverables
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Create personal tasks, link them to assigned goals, and track completion milestones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefetch}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh task list"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <Plus size={15} /> Add Task
          </button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center space-y-3">
          <ClipboardList size={44} className="mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">No Tasks Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You currently have no tasks assigned or created. Start by creating a personal task or milestone towards your goals.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Plus size={14} /> Add your first task
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task: any) => {
            const badge = getStatusBadge(task);
            const requiresReview = task.requires_mentor_review ?? task.requiresMentorReview;
            const reviewFeedback = task.review_feedback ?? task.reviewFeedback;
            const isFinished = task.isCompleted || task.status === 'COMPLETED';
            const isUnderReview = task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW';
            const isSelf = task.isSelfCreated || task.is_self_created;

            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 transition-all hover:border-slate-300"
              >
                {/* Top row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">{task.title}</h3>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.className}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(task.priority)}`}>
                        {task.priority} Priority
                      </span>
                      {isSelf ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          Personal Task
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          Assigned Deliverable
                        </span>
                      )}
                      {requiresReview && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                          <UserCheck size={11} />
                          Mentor Review Required
                        </span>
                      )}
                    </div>

                    {task.goalTitle && (
                      <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                        <Tag size={12} />
                        <span>Related Goal: {task.goalTitle}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isSelf ? (
                      <>
                        {/* Status selector for self-created tasks */}
                        <select
                          value={task.status || (task.isCompleted ? 'COMPLETED' : 'IN_PROGRESS')}
                          onChange={(e) => handleQuickStatusChange(task, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="PENDING">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>

                        <button
                          onClick={() => handleOpenEditModal(task)}
                          className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                          title="Edit Task"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        {!isFinished && !isUnderReview ? (
                          <button
                            onClick={() => handleOpenCompleteModal(task)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1.5"
                          >
                            <CheckCircle2 size={14} />
                            {requiresReview ? 'Submit for Review' : 'Mark Completed'}
                          </button>
                        ) : isUnderReview ? (
                          <button
                            onClick={() => handleOpenCompleteModal(task)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-200 flex items-center gap-1"
                          >
                            Update Submission
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            <FileCheck size={14} /> Verified Complete
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Task description or instructions */}
                {(task.description || task.instructions) && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      {task.instructions ? 'Instructions & Steps' : 'Description'}
                    </span>
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                      {task.description || task.instructions}
                    </p>
                  </div>
                )}

                {/* Revision feedback from mentor */}
                {reviewFeedback && !isFinished && (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                      <AlertCircle size={13} /> Mentor Revision Feedback
                    </span>
                    <p className="text-xs text-amber-900 leading-relaxed">"{reviewFeedback}"</p>
                  </div>
                )}

                {/* Footer with metadata */}
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 pt-1">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      Due: <span className="font-semibold text-slate-700">{task.dueDate}</span>
                    </span>

                    {task.hoursSpent !== null && task.hoursSpent !== undefined && (
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        Logged: <span className="font-semibold text-slate-700">{task.hoursSpent} hrs</span>
                      </span>
                    )}

                    {task.artifactUrl && (
                      <a
                        href={task.artifactUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <ExternalLink size={12} />
                        Artifact PR/Link
                      </a>
                    )}
                  </div>

                  {task.completedAt && (
                    <span className="text-slate-400">
                      Completed on: {task.completedAt}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Add New Task</h3>
                <p className="text-xs text-slate-500">Create a personal task or milestone</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement Docker multi-stage build"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Related Goal (Optional)</label>
                <select
                  value={newGoalId}
                  onChange={(e) => setNewGoalId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                >
                  <option value="">No goal linked (General task)</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} {g.weightage ? `(${g.weightage}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Initial Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                >
                  <option value="PENDING">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  placeholder="Outline key requirements, acceptance criteria, or dependencies..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCreating ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Personal Task</h3>
                <p className="text-xs text-slate-500">Update task status and parameters</p>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateTask} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Task Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Due Date</label>
                  <input
                    type="date"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                >
                  <option value="PENDING">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdating ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completion Modal for Assigned Tasks */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Complete / Submit Task</h3>
                <p className="text-xs text-slate-500">{selectedTask.title}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitCompletion} className="p-6 space-y-4">
              {((selectedTask as any).requires_mentor_review ?? (selectedTask as any).requiresMentorReview) && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
                  <UserCheck size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Mentor Review Required:</strong> This task requires mentor review. Upon submitting, it will transition to <strong>SUBMITTED</strong> state and notify your assigned mentor.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Completion Date</label>
                  <input
                    type="date"
                    required
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Hours Spent</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    max="100"
                    required
                    value={hoursSpent}
                    onChange={(e) => setHoursSpent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Artifact / PR URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://github.com/org/repo/pull/123"
                  value={artifactUrl}
                  onChange={(e) => setArtifactUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Completion Notes</label>
                <textarea
                  rows={3}
                  placeholder="Describe your implementation, test results, or key deliverables..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                  Confirm Submission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternTasksTab;
