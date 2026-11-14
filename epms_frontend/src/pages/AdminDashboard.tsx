import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Lock,
  Activity,
  Bell,
  Building2,
  RefreshCw,
  CheckCircle2,
  LogIn,
  Loader2,
  Database,
  History,
  Search,
  Sparkles,
  ArrowRight,
  Shield,
  UserCheck,
} from 'lucide-react';
import {
  useGetAdminDashboardQuery,
  useGetUnreadNotificationsCountQuery,
} from '../features/dashboard/dashboardApi';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch } from '../hooks/reduxHooks';
import { startImpersonation } from '../features/auth/authSlice';
import {
  useImpersonateUserMutation,
  useGetSuperAdminUsersQuery,
} from '../features/superadmin/superadminRoleApi';
import { toast } from 'react-toastify';
import { formatAuditDateTime } from '../utils/timeUtils';

interface DemoPersona {
  roleTitle: string;
  badgeLabel: string;
  name: string;
  designation: string;
  email: string;
  username: string;
  badgeColor: string;
  avatarColor: string;
  borderColor: string;
  summary: string;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    roleTitle: 'HR Partner',
    badgeLabel: 'PEOPLE OPS',
    name: 'Sarah Davis',
    designation: 'Senior HR Business Partner',
    email: 'sarah.hr@company.com',
    username: 'hr_sarah',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    avatarColor: 'bg-indigo-100 text-indigo-800',
    borderColor: 'border-indigo-200 hover:border-indigo-400',
    summary: 'Appraisal cycles, form templates, and 360 feedback reviews.',
  },
  {
    roleTitle: 'Tech Manager / Mentor',
    badgeLabel: 'TEAM EVALUATOR',
    name: 'Marcus Rodriguez',
    designation: 'Engineering Manager & Mentor',
    email: 'marcus.tech@company.com',
    username: 'manager_marcus',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    avatarColor: 'bg-amber-100 text-amber-800',
    borderColor: 'border-amber-200 hover:border-amber-400',
    summary: 'Goal alignments, 1-on-1 check-ins, and milestone ratings.',
  },
  {
    roleTitle: 'Employee / Intern',
    badgeLabel: 'CONTRIBUTOR',
    name: 'Alex Chen',
    designation: 'Software Engineering Intern',
    email: 'alex.dev@company.com',
    username: 'intern_alex',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    avatarColor: 'bg-emerald-100 text-emerald-800',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
    summary: 'Milestone evidence, daily sprint tasks, and self-evaluations.',
  },
];

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAuth();

  const [activeImpersonating, setActiveImpersonating] = useState<string | null>(null);
  const [searchMember, setSearchMember] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const {
    data: adminData,
    refetch: refetchAdmin,
    isFetching: isAdminFetching,
  } = useGetAdminDashboardQuery();

  const { data: unreadNotifs } = useGetUnreadNotificationsCountQuery();
  const { data: orgUsers = [], isLoading: isOrgUsersLoading } = useGetSuperAdminUsersQuery();
  const [impersonateUser] = useImpersonateUserMutation();

  const handleLoginAs = async (target: {
    userId?: string;
    employeeId?: string | number;
    email?: string;
    username?: string;
    name: string;
  }) => {
    const key = target.email || target.username || String(target.userId || target.employeeId);
    if (activeImpersonating) return;
    setActiveImpersonating(key);

    try {
      const res = await impersonateUser({
        userId: target.userId,
        employeeId: target.employeeId,
        email: target.email,
        username: target.username,
      }).unwrap();

      dispatch(startImpersonation(res));
      toast.success(`Logged in as ${target.name}`);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to switch user account.';
      toast.error(msg);
    } finally {
      setActiveImpersonating(null);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!searchMember.trim()) return [];
    const q = searchMember.toLowerCase();
    return orgUsers
      .filter((u) => {
        if (u.role === 'SUPER_ADMIN' || u.isSuperUser) return false;
        if (String(u.id) === String(currentUser?.id)) return false;
        return (
          u.fullName?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.designation?.toLowerCase().includes(q)
        );
      })
      .slice(0, 5);
  }, [searchMember, orgUsers, currentUser?.id]);

  const activeCount = adminData?.activeUsers ?? 0;
  const lockedCount = adminData?.lockedAccounts ?? 0;
  const totalEmployees = adminData?.totalEmployees ?? 0;
  const activeRate = totalEmployees > 0 ? Math.round((activeCount / totalEmployees) * 100) : 100;

  return (
    <div className="min-h-screen bg-[#f8f9fe] p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── 1. Top Clean Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0">
                <Shield className="text-purple-700" size={20} />
              </span>
              Super Admin Control Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              User Impersonation • Enterprise Access Security • System Health
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* System Online Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Operational</span>
            </div>

            {/* Notifications Pill */}
            <button
              onClick={() => navigate('/superadmin/notifications')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-purple-700 hover:border-purple-300 transition-colors text-xs font-medium cursor-pointer shadow-2xs"
            >
              <Bell size={14} />
              <span>Announcements</span>
              {Boolean(unreadNotifs?.unread_count) && (
                <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {unreadNotifs?.unread_count}
                </span>
              )}
            </button>

            {/* Refresh Telemetry */}
            <button
              onClick={() => refetchAdmin()}
              disabled={isAdminFetching}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              title="Refresh"
            >
              <RefreshCw size={14} className={isAdminFetching ? 'animate-spin text-purple-600' : ''} />
            </button>

            {/* Admin Badge */}
            <span className="px-3 py-1.5 rounded-xl bg-purple-700 text-white text-xs font-bold uppercase tracking-wider shadow-2xs">
              Super Admin
            </span>
          </div>
        </div>

        {/* ── 2. Featured Section: Login As (Demo Personas) ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-purple-50 text-purple-700">
                  <LogIn size={16} />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Login As (View-As Mode)
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  One-Click Access
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Experience Performax from the perspective of each role. A sticky top banner allows you to return to Admin anytime.
              </p>
            </div>
          </div>

          {/* 3 Featured Persona Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEMO_PERSONAS.map((persona) => {
              const isCurrentBusy =
                activeImpersonating === persona.email || activeImpersonating === persona.username;

              return (
                <div
                  key={persona.email}
                  className={`flex flex-col justify-between rounded-xl p-4 border ${persona.borderColor} bg-slate-50/40 hover:bg-white hover:shadow-xs transition-all`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${persona.badgeColor}`}>
                        {persona.badgeLabel}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {persona.roleTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${persona.avatarColor} shrink-0`}>
                        {persona.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {persona.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {persona.email}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {persona.summary}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() =>
                        handleLoginAs({
                          email: persona.email,
                          username: persona.username,
                          name: `${persona.name} (${persona.roleTitle})`,
                        })
                      }
                      disabled={isCurrentBusy || !!activeImpersonating}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white hover:bg-purple-50 text-purple-700 hover:text-purple-800 border border-purple-200 font-semibold text-xs transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
                    >
                      {isCurrentBusy ? (
                        <Loader2 size={13} className="animate-spin text-purple-700" />
                      ) : (
                        <LogIn size={13} />
                      )}
                      <span>Login As {persona.name.split(' ')[0]}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Search for Any Member */}
          <div className="pt-2 border-t border-slate-100 relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchMember}
                  onChange={(e) => {
                    setSearchMember(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Or search any employee to login as them (e.g. Elena, Liam, Maya)..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() => navigate('/employees')}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                Full Employee List →
              </button>
            </div>

            {/* Instant Search Dropdown */}
            {isSearchOpen && searchMember.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-30 p-2 space-y-1 max-h-64 overflow-y-auto">
                {filteredMembers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No matching users found.
                  </div>
                ) : (
                  filteredMembers.map((m) => {
                    const isBusy = activeImpersonating === m.email || activeImpersonating === m.id;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-[11px] shrink-0">
                            {(m.fullName || m.username || 'U')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 truncate block">
                              {m.fullName || m.username}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate block">
                              {m.email} &bull; {m.role}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsSearchOpen(false);
                            handleLoginAs({
                              userId: m.id,
                              email: m.email,
                              username: m.username,
                              name: m.fullName || m.username,
                            });
                          }}
                          disabled={isBusy}
                          className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-semibold hover:bg-purple-100 transition-colors shrink-0 cursor-pointer"
                        >
                          {isBusy ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
                          <span>Login As</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Core Admin Navigation Modules (4 Clean Cards) ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={16} className="text-purple-600" />
              Core Governance Modules
            </h3>
            <span className="text-xs text-slate-400">Quick direct access</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Module 1: Employees */}
            <div
              onClick={() => navigate('/employees')}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Users size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  Employee Directory
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Manage accounts, passwords, activate/deactivate, and lock access.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {activeCount} Active / {totalEmployees} Total
                </span>
                <span className="text-purple-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
            </div>

            {/* Module 2: Roles & Permissions */}
            <div
              onClick={() => navigate('/superadmin/roles-permissions')}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  Roles & Permissions (RBAC)
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Configure granular role matrices for HR, Managers, and Interns.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Granular RBAC
                </span>
                <span className="text-purple-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
            </div>

            {/* Module 3: Record Management */}
            <div
              onClick={() => navigate('/admin/records')}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Database size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  Record Management
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Review system records, attention queues, and exception routing.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  System Records
                </span>
                <span className="text-purple-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
            </div>

            {/* Module 4: Audit Logs */}
            <div
              onClick={() => navigate('/audit-logs')}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <History size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  System Audit Logs
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Immutable security action logs with actor identities and IP addresses.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Immutable Trail
                </span>
                <span className="text-purple-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Clean System Health & Recent Activity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Account Health Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity size={15} className="text-purple-600" />
              Account Health Overview
            </h4>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">Active Accounts</span>
                  <span className="text-emerald-700 font-bold">{activeCount} ({activeRate}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${activeRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">Locked / Suspended</span>
                  <span className="text-rose-700 font-bold">{lockedCount}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all"
                    style={{ width: `${totalEmployees > 0 ? (lockedCount / totalEmployees) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-50">
                  <span className="text-[11px] text-slate-400">Total Departments</span>
                  <div className="font-bold text-slate-900 text-base mt-0.5">
                    {adminData?.totalDepartments ?? 0}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50">
                  <span className="text-[11px] text-slate-400">Managers / Mentors</span>
                  <div className="font-bold text-slate-900 text-base mt-0.5">
                    {adminData?.totalManagers ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Security Activity Stream */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield size={15} className="text-purple-600" />
                Security & Administrative Stream
              </h4>
              <button
                type="button"
                onClick={() => navigate('/audit-logs')}
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Trail</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="space-y-2.5">
              {adminData?.recentActivities && adminData.recentActivities.length > 0 ? (
                adminData.recentActivities.slice(0, 4).map((act, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-900">{act.action}</span>
                        <span className="text-slate-500 ml-1.5 font-normal">by {act.user}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0 ml-2">
                      {formatAuditDateTime(act.timestamp)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-500 p-3 rounded-xl bg-slate-50">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  <span>No security alerts or unusual activity detected. All systems operating normally.</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
