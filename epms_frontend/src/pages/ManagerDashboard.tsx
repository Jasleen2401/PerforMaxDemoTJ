import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, CheckCircle2, AlertCircle, HelpCircle, TrendingUp, Layers, Briefcase, AlertTriangle, ArrowRight } from 'lucide-react';
import { useGetManagerDashboardQuery } from '../features/dashboard/dashboardApi';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import ChartCard from '../components/dashboard/ChartCard';
import TaskPanel from '../components/dashboard/TaskPanel';
import { scoreToColor, progressToColor} from '../constants/dashboardColors';
import EmployeeDashboard from './EmployeeDashboard';

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'team' | 'personal'>('team');
  const { data, isLoading, error } = useGetManagerDashboardQuery();

  if (isLoading) return <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>Loading dashboard...</div>;
  if (error) return <div className="py-16 text-center" style={{ color: "#791F1F", fontSize: 13 }}>Error loading manager dashboard.</div>;

  return (
    <div className="space-y-4">
      {/* Premium Tab Selector */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-1.5 flex gap-2 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold tracking-tight transition-all duration-300 ${
            activeTab === 'team'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Layers size={14} />
          Team Overview
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold tracking-tight transition-all duration-300 ${
            activeTab === 'personal'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Briefcase size={14} />
          My Performance
        </button>
      </div>

      {activeTab === 'personal' ? (
        <EmployeeDashboard />
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>Team management</h1>
        <p style={{ fontSize: 13, color: "#9EA3B0", marginTop: 2 }}>Manage your direct reports and their performance cycles.</p>
      </div>

      {/* Mentor & Manager Operations Hub Banner (M-01 to M-12) */}
      <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-slate-50 border border-indigo-100/90 rounded-2xl p-4.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-indigo-100">
            <Users size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-indigo-950">Mentor & Manager Operations Center</h3>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                M-01 to M-12
              </span>
            </div>
            <p className="text-xs text-indigo-700/80 mt-0.5">
              Supervise assigned mentees, assign tasks, evaluate technical capability parameters, and verify evidence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/manager/mentees"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            Assigned Mentees (M-01)
          </Link>
          <Link
            to="/manager/tasks"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold text-xs transition-all shadow-2xs cursor-pointer"
          >
            Tasks (M-02, M-03)
          </Link>
          <Link
            to="/manager/technical-capabilities"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold text-xs transition-all shadow-2xs cursor-pointer"
          >
            Technical (M-04, M-05)
          </Link>
          <Link
            to="/manager/evidence"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold text-xs transition-all shadow-2xs cursor-pointer"
          >
            Evidence (M-06)
          </Link>
        </div>
      </div>

      {/* Interactive Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardStatCard
          title="Team size"
          value={data?.teamSize ?? 0}
          icon={<Users size={16} />}
          color="blue"
          subtitle="View assigned mentees →"
          onClick={() => navigate('/manager/mentees')}
        />
        <DashboardStatCard
          title="Reviews completed"
          value={`${data?.reviewsCompleted ?? 0}/${data?.totalReviews ?? 0}`}
          icon={<CheckCircle2 size={16} />}
          color="green"
          subtitle="View evaluations →"
          onClick={() => navigate('/appraisal', { state: { activeTab: 'team', statusFilter: 'FINALIZED' } })}
        />
        <DashboardStatCard
          title="Pending reviews"
          value={data?.pendingReviews ?? 0}
          icon={<AlertCircle size={16} />}
          color="orange"
          subtitle="Conduct pending reviews →"
          onClick={() => navigate('/appraisal', { state: { activeTab: 'team', statusFilter: 'PENDING' } })}
        />
        <DashboardStatCard
          title="Feedback requests"
          value={data?.feedbackRequests ?? 0}
          icon={<HelpCircle size={16} />}
          color="purple"
          subtitle="Review evidence & feedback →"
          onClick={() => navigate('/manager/evidence')}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard
            title="Team performance overview"
            action={
              <button
                onClick={() => navigate('/manager/mentees')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>View Mentees</span>
                <ArrowRight size={12} />
              </button>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.teamPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F6" />
                <XAxis dataKey="name" stroke="#9EA3B0" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9EA3B0" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "#F5F6F8" }} contentStyle={{ borderRadius: 8, border: "0.5px solid #E4E6EC", boxShadow: "none", fontSize: 12 }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {data?.teamPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={scoreToColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div className="flex items-center gap-2">
              <TrendingUp size={15} style={{ color: "#1A56DB" }} aria-hidden="true" />
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", margin: 0 }}>Team KPI progress</p>
            </div>
            <button
              onClick={() => navigate('/manager/tasks')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
            {data?.teamKpis.map((kpi, idx) => (
              <div
                key={idx}
                onClick={() => navigate('/manager/tasks')}
                className="cursor-pointer group p-1.5 -mx-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                title="Click to view tasks"
              >
                <div className="flex justify-between" style={{ marginBottom: 4 }}>
                  <span className="group-hover:text-blue-600 transition-colors" style={{ fontSize: 12, color: "#5A6070" }}>{kpi.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{Math.round(kpi.progress)}%</span>
                </div>
                <div style={{ height: 6, background: "#EEF0F6", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${kpi.progress}%`,
                      borderRadius: 3,
                      background: progressToColor(kpi.progress),
                    }}
                  />
                </div>
              </div>
            ))}
            {(!data?.teamKpis || data.teamKpis.length === 0) && (
              <p style={{ fontSize: 13, color: "#9EA3B0" }}>No KPI data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Team vs Company Comparison */}
      {(data?.teamAvgScore !== undefined || data?.companyAvgScore !== undefined) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DashboardStatCard
            title="Team average score"
            value={data?.teamAvgScore?.toFixed(1) ?? 'N/A'}
            icon={<TrendingUp size={15} />}
            color="blue"
            subtitle="View team performance pulse →"
            onClick={() => navigate('/performance-history/manager')}
          />
          <DashboardStatCard
            title="Company average score"
            value={data?.companyAvgScore?.toFixed(1) ?? 'N/A'}
            icon={<TrendingUp size={15} />}
            color="green"
            subtitle="View organization benchmarks →"
            onClick={() => navigate('/performance-history/manager')}
          />
        </div>
      )}

      {/* At-Risk Employees */}
      {data?.atRiskEmployees && data.atRiskEmployees.length > 0 && (
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} style={{ color: "#E24B4A" }} aria-hidden="true" />
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", margin: 0 }}>At-risk employees</p>
            </div>
            <button
              onClick={() => navigate('/manager/mentees')}
              className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
            >
              Intervene →
            </button>
          </div>
          <div className="space-y-2">
            {data.atRiskEmployees.map((emp, idx) => (
              <div
                key={idx}
                onClick={() => navigate('/manager/mentees', { state: { search: emp.name } })}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-rose-100/70 transition-colors cursor-pointer"
                style={{ background: "#FCEBEB" }}
              >
                <span style={{ fontSize: 12, color: "#111827", fontWeight: 500 }}>{emp.name}</span>
                <span style={{ fontSize: 11, color: "#E24B4A", fontWeight: 600 }}>↓ {Math.abs(emp.delta || 0).toFixed(1)} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Self-Assessments */}
      {data?.pendingSelfAssessmentNames && data.pendingSelfAssessmentNames.length > 0 && (
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", margin: 0 }}>
              Awaiting self-assessments ({data.pendingSelfAssessmentNames.length})
            </p>
            <button
              onClick={() => navigate('/appraisal', { state: { activeTab: 'team', statusFilter: 'PENDING' } })}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View in Appraisals</span>
              <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {data.pendingSelfAssessmentNames.slice(0, 18).map((name, idx) => (
              <div
                key={idx}
                onClick={() => navigate('/manager/mentees', { state: { search: name } })}
                className="text-xs text-slate-600 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200/60 rounded-lg p-2 truncate transition-colors cursor-pointer"
                title={`Click to view ${name}`}
              >
                • {name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks */}
      <TaskPanel
        title="Urgent team reviews"
        onViewAll={() => navigate('/manager/evidence')}
        onTaskClick={() => navigate('/manager/evidence')}
        tasks={data?.urgentReviews.map(t => ({
          id: t.id,
          title: t.title,
          deadline: t.deadline,
          priority: t.priority as 'High' | 'Medium' | 'Low',
        })) ?? []}
      />
      </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
