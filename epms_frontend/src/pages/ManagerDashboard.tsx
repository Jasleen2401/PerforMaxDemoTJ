import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, CheckCircle2, AlertCircle, HelpCircle, TrendingUp, Layers, Briefcase, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { useGetManagerDashboardQuery } from '../features/dashboard/dashboardApi';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import ChartCard from '../components/dashboard/ChartCard';
import TaskPanel from '../components/dashboard/TaskPanel';
import { scoreToColor, progressToColor} from '../constants/dashboardColors';
import EmployeeDashboard from './EmployeeDashboard';

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'team' | 'personal'>('team');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [performanceFilter, setPerformanceFilter] = useState<'active' | 'top10' | 'all'>('active');
  const { data, isLoading, error, refetch } = useGetManagerDashboardQuery();

  const handleRefreshTeam = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Team dashboard refreshed successfully!");
    } catch {
      toast.error("Failed to refresh team dashboard.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const rawPerformance = data?.teamPerformance || [];
  const evaluatedCount = React.useMemo(() => {
    return rawPerformance.filter((m: any) => m.hasAppraisal || (m.score > 0 && m.score !== 38.75)).length;
  }, [rawPerformance]);

  const displayPerformance = React.useMemo(() => {
    if (!rawPerformance.length) return [];
    if (performanceFilter === 'active') {
      const active = rawPerformance.filter((m: any) => m.hasAppraisal || (m.score > 0 && m.score !== 38.75));
      return active.length > 0 ? active : rawPerformance.slice(0, 10);
    }
    if (performanceFilter === 'top10') {
      return [...rawPerformance].sort((a, b) => b.score - a.score).slice(0, 10);
    }
    return rawPerformance;
  }, [rawPerformance, performanceFilter]);

  const isScrollable = performanceFilter === 'all' && displayPerformance.length > 8;
  const scrollWidth = React.useMemo(() => {
    return isScrollable ? Math.max(800, displayPerformance.length * 36) : undefined;
  }, [isScrollable, displayPerformance.length]);

  if (isLoading) return <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>Loading dashboard...</div>;
  if (error) return <div className="py-16 text-center" style={{ color: "#791F1F", fontSize: 13 }}>Error loading manager dashboard.</div>;

  return (
    <div className="space-y-4">
      {/* Premium Tab Selector */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-1.5 flex gap-2 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold tracking-tight transition-all duration-300 cursor-pointer ${
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
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold tracking-tight transition-all duration-300 cursor-pointer ${
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
        <EmployeeDashboard
          onScopeSwitch={() => setActiveTab('team')}
          scopeLabel="Tech Manager Scope"
          onRefreshParent={handleRefreshTeam}
        />
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>Team management</h1>
            <p style={{ fontSize: 13, color: "#9EA3B0", marginTop: 2 }}>Manage your direct reports and their performance cycles.</p>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Refresh Data Button */}
            <button
              onClick={handleRefreshTeam}
              disabled={isRefreshing}
              className={`p-2 rounded-xl bg-white border border-[#e4ddf5] text-[#625d78] hover:text-[#6d3fea] hover:bg-[#f3eeff] transition-all shadow-2xs cursor-pointer ${
                isRefreshing ? 'opacity-70 cursor-wait' : ''
              }`}
              title="Refresh team dashboard data"
              aria-label="Refresh team dashboard data"
            >
              <RefreshCw size={18} className={`transition-transform ${isRefreshing ? "animate-spin text-[#6d3fea]" : ""}`} />
            </button>

            {/* Scope Badge */}
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className="flex items-center gap-1.5 bg-[#f3eeff] hover:bg-[#ebdfff] text-[#5526d9] font-bold text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-xl border border-[#c7b5f5] hover:border-[#a88ff0] shadow-2xs transition-all cursor-pointer group"
              title="Click to switch to personal contributor scope"
            >
              <ShieldCheck size={13} className="text-[#6d3fea] group-hover:scale-110 transition-transform" />
              <span>Tech Manager Scope</span>
            </button>
          </div>
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardStatCard
          title="Team size"
          value={data?.teamSize ?? 0}
          subtitle="View team directory"
          icon={<Users size={15} />}
          color="blue"
          onClick={() => navigate('/manager/mentees')}
        />
        <DashboardStatCard
          title="Reviews completed"
          value={`${data?.reviewsCompleted ?? 0}/${data?.totalReviews ?? 0}`}
          subtitle="Track appraisal cycle"
          icon={<CheckCircle2 size={15} />}
          color="green"
          onClick={() => navigate('/appraisal')}
        />
        <DashboardStatCard
          title="Pending reviews"
          value={data?.pendingReviews ?? 0}
          subtitle="Action required"
          icon={<AlertCircle size={15} />}
          color="orange"
          onClick={() => navigate('/manager/mentees')}
        />
        <DashboardStatCard
          title="Feedback requests"
          value={data?.feedbackRequests ?? 0}
          subtitle="Continuous feedback"
          icon={<HelpCircle size={15} />}
          color="purple"
          onClick={() => navigate('/continuous-feedback')}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-w-0">
          <ChartCard
            title="Team performance overview"
            action={
              <div className="flex items-center gap-1 bg-gray-100/90 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPerformanceFilter('active')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    performanceFilter === 'active'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Evaluated ({evaluatedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPerformanceFilter('top10')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    performanceFilter === 'top10'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Top 10
                </button>
                <button
                  type="button"
                  onClick={() => setPerformanceFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    performanceFilter === 'all'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  All ({rawPerformance.length})
                </button>
              </div>
            }
          >
            {displayPerformance.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
                <Users size={28} className="text-gray-300 mb-2" />
                <p className="text-xs font-semibold">No performance data available</p>
                <p className="text-[11px] text-gray-400">Team evaluations will appear here once appraisals are scored.</p>
              </div>
            ) : isScrollable ? (
              <div className="w-full h-full overflow-x-auto overflow-y-hidden pb-2">
                <div style={{ width: scrollWidth, minWidth: scrollWidth, height: 275 }}>
                  <ResponsiveContainer width="100%" height={275} debounce={50}>
                    <BarChart
                      data={displayPerformance}
                      margin={{ top: 15, right: 15, left: -5, bottom: 25 }}
                      barCategoryGap="15%"
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F6" />
                      <XAxis
                        dataKey="name"
                        stroke="#6B7280"
                        fontSize={11}
                        fontWeight={500}
                        tickLine={false}
                        axisLine={{ stroke: '#E5E7EB' }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={40}
                      />
                      <YAxis
                        stroke="#9EA3B0"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        cursor={{ fill: "#F5F6F8" }}
                        contentStyle={{
                          borderRadius: 10,
                          border: "1px solid #E4E6EC",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                      <Bar
                        dataKey="score"
                        radius={[6, 6, 0, 0]}
                        barSize={22}
                        isAnimationActive={false}
                      >
                        {displayPerformance.map((entry, index) => (
                          <Cell key={`cell-${entry.name || index}`} fill={scoreToColor(entry.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="w-full h-full overflow-hidden">
                <ResponsiveContainer width="100%" height={300} debounce={50}>
                  <BarChart
                    data={displayPerformance}
                    margin={{ top: 15, right: 15, left: -5, bottom: displayPerformance.length > 5 ? 25 : 5 }}
                    barCategoryGap="25%"
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F6" />
                    <XAxis
                      dataKey="name"
                      stroke="#6B7280"
                      fontSize={11}
                      fontWeight={500}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB' }}
                      interval={0}
                      angle={displayPerformance.length > 5 ? -20 : 0}
                      textAnchor={displayPerformance.length > 5 ? 'end' : 'middle'}
                      height={displayPerformance.length > 5 ? 35 : 25}
                    />
                    <YAxis
                      stroke="#9EA3B0"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      cursor={{ fill: "#F5F6F8" }}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #E4E6EC",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    />
                    <Bar
                      dataKey="score"
                      radius={[6, 6, 0, 0]}
                      barSize={36}
                      isAnimationActive={false}
                    >
                      {displayPerformance.map((entry, index) => (
                        <Cell key={`cell-${entry.name || index}`} fill={scoreToColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>

        <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <TrendingUp size={15} style={{ color: "#1A56DB" }} aria-hidden="true" />
            <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>Team KPI progress</p>
          </div>
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {data?.teamKpis.map((kpi, idx) => (
              <div key={idx}>
                <div className="flex justify-between" style={{ marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: "#5A6070" }}>{kpi.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>
                    {typeof kpi.progress === 'number' ? Number(kpi.progress).toFixed(1) : kpi.progress}%
                  </span>
                </div>
                <div style={{ height: 6, background: "#EEF0F6", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(0, Number(kpi.progress) || 0))}%`,
                      borderRadius: 3,
                      background: progressToColor(Number(kpi.progress) || 0),
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
            subtitle="View analytics"
            icon={<TrendingUp size={15} />}
            color="blue"
            onClick={() => navigate('/analytics')}
          />
          <DashboardStatCard
            title="Company average score"
            value={data?.companyAvgScore?.toFixed(1) ?? 'N/A'}
            subtitle="Organization benchmark"
            icon={<TrendingUp size={15} />}
            color="green"
            onClick={() => navigate('/analytics')}
          />
        </div>
      )}

      {/* At-Risk Employees */}
      {data?.atRiskEmployees && data.atRiskEmployees.length > 0 && (
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
            <AlertTriangle size={15} style={{ color: "#E24B4A" }} aria-hidden="true" />
            <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>At-risk employees</p>
          </div>
          <div className="space-y-2">
            {data.atRiskEmployees.map((emp, idx) => (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                onClick={() => navigate('/pip')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/pip'); } }}
                className="flex items-center justify-between p-2 rounded cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: "#FCEBEB" }}
                title="View Performance Improvement Plans"
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
          <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 12 }}>Awaiting self-assessments ({data.pendingSelfAssessmentNames.length})</p>
          <div className="space-y-1">
            {data.pendingSelfAssessmentNames.map((name, idx) => (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                onClick={() => navigate('/appraisal')}
                style={{ fontSize: 12, color: "#5A6070", paddingLeft: 8, cursor: 'pointer' }}
                className="hover:text-blue-600 transition-colors"
                title="View Appraisal Cycles"
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
        viewAllLink="/manager/mentees"
        onTaskClick={() => navigate('/manager/mentees')}
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
