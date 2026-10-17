import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Award, 
  Search, 
  RefreshCw,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import type { MenteeItem } from '../../features/manager/managerApi';

interface LearningTrackSectionProps {
  mentees: MenteeItem[];
}

interface CourseItem {
  id: string;
  employeeId: string;
  employeeName: string;
  courseTitle: string;
  provider: string;
  linkedCompetency: string;
  dueDate: string;
  status: 'ASSIGNED' | 'SUBMITTED' | 'VERIFIED' | 'CHANGES_REQUESTED';
  certificateUrl?: string;
}

export const LearningTrackSection: React.FC<LearningTrackSectionProps> = ({ mentees }) => {
  const [courses, setCourses] = useState<CourseItem[]>([
    {
      id: 'lrn-001',
      employeeId: mentees[0]?.id || '',
      employeeName: mentees[0]?.fullName || 'MIRAI Intern',
      courseTitle: 'Advanced Distributed Systems & Microservices',
      provider: 'Coursera / DeepLearning.AI',
      linkedCompetency: 'System Architecture',
      dueDate: '2026-11-15',
      status: 'SUBMITTED',
      certificateUrl: 'https://coursera.org/verify/mirai-dist-sys-2026',
    },
    {
      id: 'lrn-002',
      employeeId: mentees[1]?.id || mentees[0]?.id || '',
      employeeName: mentees[1]?.fullName || mentees[0]?.fullName || 'MIRAI Intern',
      courseTitle: 'Automated QA & Integration Testing Pipelines',
      provider: 'Internal MIRAI Academy',
      linkedCompetency: 'Testing & QA Automation',
      dueDate: '2026-11-20',
      status: 'ASSIGNED',
    },
    {
      id: 'lrn-003',
      employeeId: mentees[0]?.id || '',
      employeeName: mentees[0]?.fullName || 'MIRAI Intern',
      courseTitle: 'PostgreSQL Indexing & Query Optimization',
      provider: 'Internal MIRAI Academy',
      linkedCompetency: 'Code Quality',
      dueDate: '2026-10-30',
      status: 'VERIFIED',
      certificateUrl: 'https://mirai.internal/certificates/pg-opt-01',
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: mentees[0]?.id || '',
    course_title: '',
    provider: 'Coursera',
    linked_competency: 'System Architecture',
    due_date: '',
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.course_title) {
      toast.warning('Please enter a course title.');
      return;
    }
    const assignee = mentees.find((m) => m.id === form.employee_id) || mentees[0];
    const newCourse: CourseItem = {
      id: `lrn-${Date.now()}`,
      employeeId: form.employee_id,
      employeeName: assignee?.fullName || 'Assigned Intern',
      courseTitle: form.course_title,
      provider: form.provider,
      linkedCompetency: form.linked_competency,
      dueDate: form.due_date || '2026-11-30',
      status: 'ASSIGNED',
    };
    setCourses([newCourse, ...courses]);
    toast.success('Technical learning track assigned to mentee workspace!');
    setIsModalOpen(false);
    setForm({
      employee_id: mentees[0]?.id || '',
      course_title: '',
      provider: 'Coursera',
      linked_competency: 'System Architecture',
      due_date: '',
    });
  };

  const handleVerify = (id: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'VERIFIED' } : c))
    );
    toast.success('Course completion verified and credited to mentee skill history!');
  };

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100 mb-1">
            <BookOpen size={13} />
            <span>Technical Courses & External Learning Assignments (TM-06)</span>
          </div>
          <h2 className="text-lg font-black text-slate-900">Learning Tracks & Certifications</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign prerequisite courses to close technical skill gaps. Verified completion unlocks stage gate advancement.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all cursor-pointer"
        >
          <Plus size={16} />
          + Assign Learning Track (TM-06)
        </button>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-indigo-300 transition-all shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {course.provider}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    course.status === 'VERIFIED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : course.status === 'SUBMITTED'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {course.status}
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900">{course.courseTitle}</h3>
                <div className="text-xs text-slate-500 mt-1">
                  Mentee: <strong className="text-slate-800">{course.employeeName}</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Competency:</span>
                  <span className="font-semibold text-slate-800">{course.linkedCompetency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Due Date:</span>
                  <span className="font-semibold text-slate-800">{course.dueDate}</span>
                </div>
              </div>

              {course.certificateUrl && (
                <a
                  href={course.certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline font-semibold"
                >
                  <ExternalLink size={13} /> View Certificate URL
                </a>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              {course.status === 'SUBMITTED' && (
                <button
                  onClick={() => handleVerify(course.id)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 size={13} />
                  Mark Verified
                </button>
              )}
              {course.status === 'VERIFIED' && (
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Verified & Credited
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Assign Technical Course (TM-06)</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mentee</label>
                <select
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  {mentees.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microservices with FastAPI & Docker"
                  value={form.course_title}
                  onChange={(e) => setForm({ ...form, course_title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Provider</label>
                  <select
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="Coursera">Coursera</option>
                    <option value="Udemy">Udemy</option>
                    <option value="Internal MIRAI Academy">Internal MIRAI Academy</option>
                    <option value="AWS Training">AWS Training</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Linked Competency</label>
                  <select
                    value={form.linked_competency}
                    onChange={(e) => setForm({ ...form, linked_competency: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="Problem Solving">Problem Solving</option>
                    <option value="Code Quality">Code Quality</option>
                    <option value="System Architecture">System Architecture</option>
                    <option value="Testing & QA Automation">Testing & QA Automation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100"
                >
                  Assign Track
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default LearningTrackSection;
