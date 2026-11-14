import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogIn,
  Loader2,
  ShieldAlert,
  UserCheck,
  Search,
  Filter,
  Users,
  Briefcase,
  Award,
  Sparkles,
  ArrowRight,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { startImpersonation } from "../../features/auth/authSlice";
import {
  useImpersonateUserMutation,
  useGetSuperAdminUsersQuery,
} from "../../features/superadmin/superadminRoleApi";
import type { SuperAdminUser } from "../../features/superadmin/superadminRoleTypes";

interface DemoPersona {
  roleTitle: string;
  badgeLabel: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  username: string;
  description: string;
  highlights: string[];
  gradientBg: string;
  borderTheme: string;
  badgeColor: string;
  avatarColor: string;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    roleTitle: "HR Partner",
    badgeLabel: "PEOPLE OPS",
    name: "Sarah Davis",
    designation: "Senior HR Business Partner",
    department: "Human Resources",
    email: "sarah.hr@company.com",
    username: "hr_sarah",
    description:
      "Oversees company-wide performance cycles, appraisal form templates, 360 feedback campaigns, and rating calibrations.",
    highlights: [
      "Appraisal Cycle Setup & Scheduling",
      "Form Designer & Rubric Management",
      "Enterprise Score Distribution",
    ],
    gradientBg: "from-blue-500/10 via-indigo-500/5 to-transparent",
    borderTheme: "border-indigo-200 hover:border-indigo-400",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    avatarColor: "bg-indigo-100 text-indigo-700",
  },
  {
    roleTitle: "Mentor / Tech Manager",
    badgeLabel: "TEAM EVALUATOR",
    name: "Marcus Rodriguez",
    designation: "Engineering Manager / Mentor",
    department: "Engineering",
    email: "marcus.tech@company.com",
    username: "manager_marcus",
    description:
      "Mentors team members, aligns sprint goals, approves milestone evidence, conducts 1-on-1s, and completes manager ratings.",
    highlights: [
      "Goal Assignment & Evidence Verification",
      "1-on-1 Performance Check-ins",
      "Manager Appraisal Rating & Feedback",
    ],
    gradientBg: "from-amber-500/10 via-orange-500/5 to-transparent",
    borderTheme: "border-amber-200 hover:border-amber-400",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    avatarColor: "bg-amber-100 text-amber-700",
  },
  {
    roleTitle: "Employee / Intern",
    badgeLabel: "SELF-REVIEWER",
    name: "Alex Chen",
    designation: "Software Engineering Intern",
    department: "Frontend Engineering",
    email: "alex.dev@company.com",
    username: "intern_alex",
    description:
      "Tracks daily milestones, submits code deliverables as evidence, requests peer feedback, and fills out self-evaluations.",
    highlights: [
      "Personal KPI & Goal Progress",
      "Proof of Work Evidence Uploads",
      "Self-Review & Feedback Inbox",
    ],
    gradientBg: "from-emerald-500/10 via-teal-500/5 to-transparent",
    borderTheme: "border-emerald-200 hover:border-emerald-400",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    avatarColor: "bg-emerald-100 text-emerald-700",
  },
];

export const ImpersonationTabContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [impersonateUser] = useImpersonateUserMutation();

  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const { data: users = [], isLoading: isUsersLoading } =
    useGetSuperAdminUsersQuery();

  const handleLoginAs = async (target: {
    userId?: string;
    employeeId?: string | number;
    email?: string;
    username?: string;
    displayName: string;
  }) => {
    const key = target.email || target.username || String(target.userId || target.employeeId);
    if (activeTarget) return;
    setActiveTarget(key);

    try {
      const res = await impersonateUser({
        userId: target.userId,
        employeeId: target.employeeId,
        email: target.email,
        username: target.username,
      }).unwrap();

      dispatch(startImpersonation(res));
      toast.success(`Switched view to ${target.displayName}`);
      navigate("/dashboard");
    } catch (err: any) {
      const msg =
        err?.data?.message || err?.message || "Failed to switch user account.";
      toast.error(msg);
    } finally {
      setActiveTarget(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Exclude current logged in user and other super admins
      if (u.role === "SUPER_ADMIN" || u.isSuperUser) return false;
      if (String(u.id) === String(currentUser?.id)) return false;

      // Role filter
      if (roleFilter !== "ALL") {
        if (roleFilter === "EMPLOYEE" && !["EMPLOYEE", "INTERN"].includes(u.role)) {
          return false;
        }
        if (roleFilter !== "EMPLOYEE" && u.role !== roleFilter) {
          return false;
        }
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.fullName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, searchQuery, currentUser?.id]);

  return (
    <div className="space-y-6">
      {/* ── Banner: Context & Security Notice ── */}
      <div className="rounded-2xl p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-purple-800/40">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                ONE-CLICK WORKFLOW PREVIEWS
              </span>
              <span className="text-xs text-purple-200">
                Role Testing & Verification
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              User Impersonation & Demo Personas (View-As Mode)
            </h3>
            <p className="text-xs text-purple-200/90 max-w-2xl mt-0.5">
              Switch immediately into any role to experience dashboards, submit reviews, or verify permission boundaries first-hand. An amber banner remains pinned at the top for instant return.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-amber-200 bg-amber-950/40 px-3.5 py-2 rounded-xl border border-amber-500/30 self-start md:self-auto">
          <ShieldAlert size={14} className="text-amber-400 shrink-0" />
          <span>Every action is logged under your Super Admin audit record.</span>
        </div>
      </div>

      {/* ── Section 1: Featured Demo Personas (HR, Mentor, Employee) ── */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users size={16} className="text-purple-600" />
              Standard Demo Personas
            </h4>
            <p className="text-xs text-slate-500">
              Pre-configured test personas with sample goals, appraisal cycles, and performance data.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEMO_PERSONAS.map((persona) => {
            const isLoadingThis = activeTarget === persona.email || activeTarget === persona.username;

            return (
              <div
                key={persona.email}
                className={`relative flex flex-col justify-between rounded-2xl p-5 bg-white border ${persona.borderTheme} shadow-2xs hover:shadow-md transition-all group`}
              >
                <div className="space-y-3.5">
                  {/* Top Bar: Role Badge & Icon */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${persona.badgeColor}`}
                    >
                      {persona.badgeLabel}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {persona.roleTitle}
                    </span>
                  </div>

                  {/* Persona Identity Info */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${persona.avatarColor} border border-slate-200/80 shrink-0`}
                    >
                      {persona.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-sm font-bold text-slate-900 truncate">
                        {persona.name}
                      </h5>
                      <p className="text-xs text-slate-500 truncate">
                        {persona.designation}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {persona.email}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {persona.description}
                  </p>

                  {/* Highlights Bullet Points */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Key Capabilities
                    </span>
                    {persona.highlights.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[11px] text-slate-600"
                      >
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        <span className="truncate">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() =>
                      handleLoginAs({
                        email: persona.email,
                        username: persona.username,
                        displayName: `${persona.name} (${persona.roleTitle})`,
                      })
                    }
                    disabled={isLoadingThis || !!activeTarget}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
                  >
                    {isLoadingThis ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <LogIn size={14} />
                    )}
                    <span>Login As {persona.name.split(" ")[0]}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Search & Switch to Any Team Member ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck size={16} className="text-indigo-600" />
              Switch to Any Organization Member
            </h4>
            <p className="text-xs text-slate-500">
              Impersonate any specific employee, manager, or HR teammate from the active organization roster.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Box */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, department..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-56 sm:w-64 focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Role Filter Pills */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
              {(["ALL", "HR", "MANAGER", "EMPLOYEE"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    roleFilter === r
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {r === "ALL" ? "All" : r === "EMPLOYEE" ? "Employees" : r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Table / Cards */}
        {isUsersLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-purple-600" />
            Loading organization roster...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No matching team members found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Team Member</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Department & Designation</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isBusy =
                    activeTarget === u.email ||
                    activeTarget === u.username ||
                    activeTarget === u.id;

                  const roleBadgeColor =
                    u.role === "HR"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : u.role === "MANAGER"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200";

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {(u.fullName || u.username || "U")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {u.fullName || u.username}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${roleBadgeColor}`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <div className="font-medium">
                          {u.designation || "Staff Member"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {u.department || "General"}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            u.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleLoginAs({
                              userId: u.id,
                              email: u.email,
                              username: u.username,
                              displayName: u.fullName || u.username,
                            })
                          }
                          disabled={isBusy || !!activeTarget}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs transition-colors border border-purple-200 disabled:opacity-60 cursor-pointer"
                        >
                          {isBusy ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <LogIn size={12} />
                          )}
                          <span>Login As</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImpersonationTabContent;
