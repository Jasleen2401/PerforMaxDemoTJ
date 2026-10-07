import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  Shield,
  ShieldCheck,
  Users,
  LayoutDashboard,
  Lock,
  Activity,
  Calendar,
  Bell,
  Building2,
  BarChart3,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useGetAdminDashboardQuery } from '../features/dashboard/dashboardApi';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import ChartCard from '../components/dashboard/ChartCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import QuickActionPanel, { type Action } from '../components/dashboard/QuickActionPanel';
import { alertColors } from '../constants/dashboardColors';
import { formatAuditDateTime, formatAuditDateValue } from '../utils/timeUtils';

const PIE_COLORS = ['#639922', '#E24B4A', '#BA7517'];

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch, isFetching } = useGetAdminDashboardQuery();

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p style={{ color: '#9EA3B0', fontSize: 13 }}>Initializing system administration telemetry…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center space-y-3">
        <p style={{ color: '#791F1F', fontSize: 14, fontWeight: 500 }}>Error loading administrative telemetry.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const userStats = [
    { name: 'Active', value: data?.activeUsers ?? 0 },
    { name: 'Locked', value: data?.lockedAccounts ?? 0 },
    { name: 'Inactive', value: Math.max(0, (data?.totalEmployees ?? 0) - (data?.activeUsers ?? 0) - (data?.lockedAccounts ?? 0)) },
  ];

  const quickActions: Action[] = [
    {
      id: '1',
      label: 'Announcement Hub',
      icon: <Bell size={18} />,
      onClick: () => navigate('/superadmin/notifications'),
      color: 'bg-purple-100 text-purple-700',
    },
    {
      id: '2',
      label: 'Roles & Access',
      icon: <ShieldCheck size={18} />,
      onClick: () => navigate('/superadmin/roles-permissions'),
      color: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: '3',
      label: 'Employee Directory',
      icon: <Users size={18} />,
      onClick: () => navigate('/employees'),
      color: 'bg-blue-100 text-blue-700',
    },
    {
      id: '4',
      label: 'Org Departments',
      icon: <Building2 size={18} />,
      onClick: () => navigate('/departments'),
      color: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: '5',
      label: 'Strategic Analytics',
      icon: <BarChart3 size={18} />,
      onClick: () => navigate('/analytics'),
      color: 'bg-amber-100 text-amber-700',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center shrink-0">
            <Shield size={18} className="text-purple-700" aria-hidden="true" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>System Administration</h1>
            <p style={{ fontSize: 13, color: '#9EA3B0', marginTop: 1 }}>Global system health, governance, and security overview.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-xs"
            title="Refresh dashboard metrics"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin text-purple-600' : 'text-slate-500'} />
            <span>{isFetching ? 'Syncing…' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => navigate('/superadmin/notifications')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-xs"
          >
            <Bell size={13} />
            <span>Broadcast Alert</span>
          </button>
        </div>
      </div>

      {/* Interactive Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardStatCard
          title="Total Employees"
          value={data?.totalEmployees ?? 0}
          icon={<Users size={16} />}
          color="blue"
          subtitle="View employee roster →"
          onClick={() => navigate('/employees')}
        />
        <DashboardStatCard
          title="Departments"
          value={data?.totalDepartments ?? 0}
          icon={<LayoutDashboard size={16} />}
          color="indigo"
          subtitle="Manage departments →"
          onClick={() => navigate('/departments')}
        />
        <DashboardStatCard
          title="Active cycles"
          value={data?.activeCycles ?? 0}
          icon={<Calendar size={16} />}
          color="green"
          subtitle="Cycle timelines →"
          onClick={() => navigate('/financial-years')}
        />
        <DashboardStatCard
          title="Locked accounts"
          value={data?.lockedAccounts ?? 0}
          icon={<Lock size={16} />}
          color="red"
          subtitle="Access & RBAC →"
          onClick={() => navigate('/superadmin/roles-permissions')}
        />
      </div>

      {/* Quick Actions Panel */}
      <QuickActionPanel actions={quickActions} />

      {/* Charts & Security Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User Account Status Chart */}
        <div className="lg:col-span-1">
          <ChartCard title="User account status">
            <div className="flex flex-col h-full justify-between">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={userStats} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                      {userStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '0.5px solid #E4E6EC', boxShadow: 'none', fontSize: 12 }} />
                    <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: 11, color: '#9EA3B0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Clickable Quick Filters */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => navigate('/employees')}
                  className="flex items-center gap-1.5 text-slate-600 hover:text-purple-700 font-medium py-1 px-2 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{data?.activeUsers ?? 0} Active</span>
                  <ArrowRight size={11} className="opacity-60" />
                </button>
                <button
                  onClick={() => navigate('/superadmin/roles-permissions')}
                  className="flex items-center gap-1.5 text-slate-600 hover:text-purple-700 font-medium py-1 px-2 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>{data?.lockedAccounts ?? 0} Locked</span>
                  <ArrowRight size={11} className="opacity-60" />
                </button>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Security Alerts Panel */}
        <div className="lg:col-span-2" style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield size={16} style={{ color: '#791F1F' }} aria-hidden="true" />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Security Alerts</p>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-64">
            {data?.securityAlerts && data.securityAlerts.length > 0 ? (
              data.securityAlerts.map((alert, idx) => {
                const colors = alertColors[alert.severity] || alertColors.LOW;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3"
                    style={{ background: colors.bg, border: `0.5px solid ${colors.border}`, borderRadius: 8, padding: '10px 12px' }}
                  >
                    <div style={{ background: colors.bg, borderRadius: 6, padding: 4, flexShrink: 0 }}>
                      <Activity size={13} style={{ color: colors.text }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap justify-between gap-1" style={{ marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{alert.event}</span>
                        <span style={{ fontSize: 11, color: colors.text, opacity: 0.7, fontFamily: 'monospace' }}>
                          {formatAuditDateTime(alert.timestamp)}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: colors.text, opacity: 0.85 }}>{alert.details}</p>
                      <span style={{ fontSize: 11, fontWeight: 500, color: colors.text, marginTop: 4, display: 'inline-block' }}>
                        Severity: {alert.severity}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-7 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-sm font-semibold text-slate-800">All Systems Normal & Fully Secure</h4>
                <p className="text-xs text-slate-500 max-w-md mt-1 mb-4 leading-relaxed">
                  No active security breaches, locked account anomalies, or unauthorized privilege elevation detected across the enterprise perimeter.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => navigate('/superadmin/roles-permissions')}
                    className="text-xs font-semibold px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <ShieldCheck size={13} />
                    <span>RBAC Permissions Matrix</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active cycle info */}
      {data?.activeCycleName && (
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-purple-600" />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Active Appraisal Cycle</p>
            </div>
            <button
              onClick={() => navigate('/financial-years')}
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 hover:underline"
            >
              <span>Manage Quarters & Cycles</span>
              <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
            <div>
              <span style={{ fontSize: 11, color: '#9EA3B0', display: 'block', marginBottom: 2 }}>Cycle name</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{data.activeCycleName}</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#9EA3B0', display: 'block', marginBottom: 2 }}>Start date</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{formatAuditDateValue(data.cycleStartDate)}</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#9EA3B0', display: 'block', marginBottom: 2 }}>End date</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{formatAuditDateValue(data.cycleEndDate)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Security metrics */}
      {(data?.failedLoginsLast24h !== undefined || data?.accountsCreatedThisMonth !== undefined) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <DashboardStatCard
            title="Failed logins (24h)"
            value={data?.failedLoginsLast24h ?? 0}
            icon={<Activity size={15} />}
            color="red"
            subtitle="Perimeter security status"
          />
          <DashboardStatCard
            title="Accounts created (this month)"
            value={data?.accountsCreatedThisMonth ?? 0}
            icon={<Users size={15} />}
            color="green"
            subtitle="View employee roster →"
            onClick={() => navigate('/employees')}
          />
          <DashboardStatCard
            title="Accounts deactivated (this month)"
            value={data?.accountsDeactivatedThisMonth ?? 0}
            icon={<Lock size={15} />}
            color="orange"
            subtitle="Review inactive users →"
            onClick={() => navigate('/superadmin/roles-permissions')}
          />
        </div>
      )}

      {/* Activity feed */}
      <ActivityFeed
        activities={
          data?.recentActivities?.map((act, idx) => ({
            id: idx,
            user: act.user,
            action: act.action,
            module: act.module,
            timestamp: act.timestamp,
          })) ?? []
        }
      />
    </div>
  );
};

export default AdminDashboard;
