import React, { useState } from 'react';
import { 
  FolderGit2, 
  Plus, 
  Layers, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  Code2, 
  Tag, 
  X,
  Target
} from 'lucide-react';
import { toast } from 'react-toastify';
import { 
  useGetProjectsQuery, 
  useCreateProjectMutation 
} from '../../features/manager/managerApi';
import type { ProjectItem } from '../../features/manager/managerApi';

interface ProjectManagementSectionProps {
  onAssignTaskForProject?: (projectId: string) => void;
}

export const ProjectManagementSection: React.FC<ProjectManagementSectionProps> = ({
  onAssignTaskForProject,
}) => {
  const { data: projects = [], isLoading, refetch } = useGetProjectsQuery();
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    code: '',
    tech_stack: 'React, TypeScript, Django, PostgreSQL',
    target_cohort: '2026-Fall MIRAI Cohort A',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    milestones: [
      { title: 'Sprint 1: Architecture & DB Schema', due_date: '', deliverable: 'ERD & Migrations PR' },
      { title: 'Sprint 2: Core API Endpoints & Auth', due_date: '', deliverable: 'REST API & Unit Tests' },
      { title: 'Sprint 3: Frontend Integration & E2E', due_date: '', deliverable: 'UI Workflow & Demo Recording' }
    ]
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.code) {
      toast.warning('Please provide a project title and unique project code.');
      return;
    }

    try {
      const payload = {
        title: form.title,
        code: form.code,
        tech_stack: form.tech_stack.split(',').map((s) => s.trim()).filter(Boolean),
        target_cohort: form.target_cohort,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        milestones: form.milestones.filter((m) => m.title.trim().length > 0)
      };

      await createProject(payload).unwrap();
      toast.success('Real-world project created and linked to cohort workspace!');
      setIsModalOpen(false);
      setForm({
        title: '',
        code: '',
        tech_stack: 'React, TypeScript, Django, PostgreSQL',
        target_cohort: '2026-Fall MIRAI Cohort A',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        milestones: [
          { title: 'Sprint 1: Architecture & DB Schema', due_date: '', deliverable: 'ERD & Migrations PR' },
          { title: 'Sprint 2: Core API Endpoints & Auth', due_date: '', deliverable: 'REST API & Unit Tests' }
        ]
      });
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.data?.error || 'Failed to create project.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100 mb-1">
            <FolderGit2 size={13} />
            <span>Multi-Project & Milestone Definition (TM-02)</span>
          </div>
          <h2 className="text-lg font-black text-slate-900">Engineering Projects & Sprints</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Define multi-intern projects, tech stacks, and milestones. All tasks must link strictly to a parent project.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all cursor-pointer"
        >
          <Plus size={16} />
          + New Project (TM-02)
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading engineering projects...</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <FolderGit2 size={38} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Projects Defined</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Establish a parent engineering project to begin assigning sprint backlog items to your mentees.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 cursor-pointer"
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: ProjectItem) => (
            <div
              key={project.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-indigo-300 transition-all shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {project.code}
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-900 mt-1.5">{project.title}</h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      project.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : project.status === 'COMPLETED'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {project.status}
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Users size={12} className="text-slate-400" />
                    <span>Target Cohort: <strong className="text-slate-700">{project.targetCohort || 'General'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar size={12} className="text-slate-400" />
                    <span>Sprint: {project.startDate || 'Immediate'} → {project.endDate || 'Ongoing'}</span>
                  </div>
                </div>

                {/* Tech Stack Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {project.techStack?.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-indigo-50/80 border border-indigo-100 text-[10px] font-semibold text-indigo-700"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Milestones list */}
                {project.milestones && project.milestones.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                      Sprint Milestones ({project.milestones.length})
                    </span>
                    <div className="space-y-1">
                      {project.milestones.slice(0, 3).map((m: any, mIdx: number) => (
                        <div key={mIdx} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                          <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                          <span className="truncate">{m.title || m.deliverable}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Owner: <strong className="text-slate-700">{project.ownerName || 'Technical Mentor'}</strong>
                </span>
                {onAssignTaskForProject && (
                  <button
                    onClick={() => onAssignTaskForProject(project.id)}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold text-xs cursor-pointer"
                  >
                    <Plus size={13} />
                    Assign Task
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TM-02: Modal New Project Definition */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Define Multi-Project & Milestones (TM-02)</h3>
                <p className="text-xs text-slate-500">Persists to apps_goals_project and links to intern dashboards.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MIRAI Core Microservices"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unique Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PRJ-MIRAI-005"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tech Stack (comma separated)</label>
                <input
                  type="text"
                  placeholder="Django, React, TypeScript, PostgreSQL, Celery"
                  value={form.tech_stack}
                  onChange={(e) => setForm({ ...form, tech_stack: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Cohort</label>
                  <input
                    type="text"
                    placeholder="2026-Fall MIRAI Cohort A"
                    value={form.target_cohort}
                    onChange={(e) => setForm({ ...form, target_cohort: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sprint End Date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Milestones list inputs */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-700">Sprint Milestones & Expected Deliverables</label>
                {form.milestones.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder={`Milestone ${idx + 1} Title`}
                      value={m.title}
                      onChange={(e) => {
                        const newM = [...form.milestones];
                        newM[idx].title = e.target.value;
                        setForm({ ...form, milestones: newM });
                      }}
                      className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                    />
                    <input
                      type="text"
                      placeholder="Expected Deliverable (e.g. PR #, Doc)"
                      value={m.deliverable}
                      onChange={(e) => {
                        const newM = [...form.milestones];
                        newM[idx].deliverable = e.target.value;
                        setForm({ ...form, milestones: newM });
                      }}
                      className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 cursor-pointer"
                >
                  {isCreating ? 'Creating Project...' : 'Persist Project (TM-02)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProjectManagementSection;
