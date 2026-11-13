import { memo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { Download, FileSpreadsheet, FileText, Gauge, ChevronDown, ChevronRight } from 'lucide-react';
import { DashboardCard, EmptyState, SkeletonBlock } from './DashboardPrimitives';
import { chartPalette, DASHBOARD_COLORS, DASHBOARD_BORDER, dashboardStyles } from '../../styles/dashboardStyles';
import {
  calculateCompletionRate,
  formatScore,
  getScoreTone,
  transformGoalData,
  isMockEmployee,
  isMockDistribution,
  isMockTrend,
  isMockDepartmentList,
  type PieDatum,
} from '../../utils/reportUtils';
import type {
  AppraisalStatusReportDTO,
  DepartmentAnalyticsDTO,
  Feedback360SummaryAnalyticsDTO,
  GoalCompletionReportDTO,
  KpiAchievementReportDTO,
  PerformanceDistributionReportDTO,
  PerformancePotentialMatrixDTO,
  PerformanceTrendPointDTO,
  DepartmentBreakdownDTO,
} from '../../types/report';

interface DownloadButtonProps {
  label?: string;
  iconOnly?: boolean;
  tone?: 'primary' | 'success' | 'plain';
  ariaLabel: string;
  onClick: () => void;
}

const DownloadButton = ({ label, iconOnly, tone = 'plain', ariaLabel, onClick }: DownloadButtonProps) => {
  const isPrimary = tone === 'primary';
  const isSuccess = tone === 'success';
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        width: iconOnly ? 28 : 'auto',
        minHeight: 28,
        padding: iconOnly ? 0 : '4px 10px',
        background: isPrimary ? DASHBOARD_COLORS.primarySoft : isSuccess ? DASHBOARD_COLORS.successSoft : 'transparent',
        color: isPrimary ? DASHBOARD_COLORS.primary : isSuccess ? DASHBOARD_COLORS.success : DASHBOARD_COLORS.subtle,
        border: isPrimary ? `1px solid ${DASHBOARD_COLORS.primaryBorder}` : isSuccess ? `1px solid ${DASHBOARD_COLORS.successBorder}` : 'none',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {isSuccess ? <FileSpreadsheet size={11} /> : isPrimary ? <FileText size={11} /> : <Download size={15} />}
      {!iconOnly && label}
    </button>
  );
};

// ─── 1. Appraisal Completion Status Card ──────────────────────────────────────

export const AppraisalCompletionCard = memo(({
  data,
  pieData,
  loading,
  isError,
}: {
  data?: AppraisalStatusReportDTO;
  pieData: PieDatum[];
  loading: boolean;
  isError?: boolean;
}) => {
  const hasData = pieData.length > 0 && Boolean(data?.totalEmployees && data.totalEmployees > 0);
  const liveRate = calculateCompletionRate(data?.completed, data?.totalEmployees);

  return (
    <DashboardCard
      title="Appraisal Completion Status"
      className="lg:col-span-4"
      isError={isError}
    >
      <div style={{ ...dashboardStyles.chartHeightSm, position: 'relative' }}>
        {loading ? (
          <SkeletonBlock height={220} />
        ) : !hasData ? (
          <EmptyState
            title="No Appraisal Records"
            body="Appraisal completion statuses will populate once review cycles begin receiving submissions."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={50}
                outerRadius={72}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={
                      entry.name === 'Completed' ? '#059669' :
                      entry.name === 'In Progress' ? '#7C3AED' :
                      '#D97706'
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={dashboardStyles.tooltip}
                formatter={(value: any, name: any) => [`${value} employees`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {hasData && (
        <>
          <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-600 mt-2">
            {pieData.map((item) => {
              const color = item.name === 'Completed' ? 'bg-emerald-500' : item.name === 'In Progress' ? 'bg-purple-600' : 'bg-amber-500';
              return (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span>{item.name}: <strong>{item.value}</strong></span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <div style={{ padding: '8px 10px', background: DASHBOARD_COLORS.surfaceAlt, border: DASHBOARD_BORDER, borderRadius: 8 }}>
              <p style={{ fontSize: 11, color: DASHBOARD_COLORS.subtle, marginBottom: 2 }}>Total Employees</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: DASHBOARD_COLORS.ink }}>{data?.totalEmployees}</p>
            </div>
            <div style={{ padding: '8px 10px', background: DASHBOARD_COLORS.successSoft, border: `1px solid ${DASHBOARD_COLORS.successBorder}`, borderRadius: 8 }}>
              <p style={{ fontSize: 11, color: DASHBOARD_COLORS.success, marginBottom: 2 }}>Completion Rate</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: DASHBOARD_COLORS.success }}>
                {liveRate !== null ? `${liveRate}%` : 'N/A'}
              </p>
            </div>
          </div>
        </>
      )}
    </DashboardCard>
  );
});

// ─── 2. KPI Achievement Distribution ─────────────────────────────────────────

export const KpiAchievementChart = memo(({
  data,
  loading,
  isError,
}: {
  data?: KpiAchievementReportDTO[];
  loading: boolean;
  isError?: boolean;
}) => {
  const filteredData = data?.filter((item) => !isMockEmployee(item.employeeName));
  const hasData = Boolean(filteredData && filteredData.length > 0);

  return (
    <DashboardCard
      title="KPI Achievement Distribution"
      className="lg:col-span-8"
      isError={isError}
    >
      <div style={dashboardStyles.chartHeightMd}>
        {loading ? (
          <SkeletonBlock height={260} />
        ) : !hasData ? (
          <EmptyState
            title="No KPI Achievement Records"
            body="KPI achievement scores will calculate once employee targets are evaluated in this cycle."
          />
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredData} margin={{ top: 10, right: 10, bottom: 20, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={DASHBOARD_COLORS.grid} />
            <XAxis
              dataKey="employeeName"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }}
              interval={0}
              angle={-20}
              textAnchor="end"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              cursor={{ fill: DASHBOARD_COLORS.surfaceAlt }}
              contentStyle={dashboardStyles.tooltip}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as KpiAchievementReportDTO;
                return (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-md text-xs space-y-1">
                    <p className="font-bold text-slate-900">{row.employeeName}</p>
                    <p className="text-slate-500 font-medium">{row.departmentName}</p>
                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-4">
                      <span className="text-slate-600">Achievement:</span>
                      <span className="font-bold text-purple-700">{row.achievementPercentage}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-[11px] text-slate-500">
                      <span>Targets:</span>
                      <span>{row.completedCount} of {row.targetCount} completed</span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="achievementPercentage"
              fill={DASHBOARD_COLORS.primary}
              radius={[6, 6, 0, 0]}
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  </DashboardCard>
  );
});

// ─── 3. Performance Distribution Card ─────────────────────────────────────────

export const PerformanceDistributionCard = memo(({ data }: { data?: PerformanceDistributionReportDTO }) => {
  const isMock = isMockDistribution(data?.mean, data?.sampleSize);
  const hasBins = Boolean(!isMock && data?.bins?.length && data.bins.some(b => b.count > 0));
  const hasSampleSize = Boolean(!isMock && data?.sampleSize != null && data.sampleSize >= 2);

  return (
    <DashboardCard
      title="Performance Distribution"
      className="lg:col-span-5"
      action={<Gauge size={15} color={DASHBOARD_COLORS.subtle} />}
    >
      <div style={dashboardStyles.chartHeightSm}>
        {!hasBins ? (
          <EmptyState
            title="No Scored Employees"
            body="Score distribution will populate after appraisals are finalized and graded."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.bins} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={DASHBOARD_COLORS.grid} />
              <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }} allowDecimals={false} />
              <Tooltip
                contentStyle={dashboardStyles.tooltip}
                formatter={(val: any) => [`${val} employees`, 'Count']}
              />
              <Bar dataKey="count" fill="#D97706" radius={[6, 6, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
        {[
          ['Mean Score', hasSampleSize ? formatScore(data?.mean) : 'N/A'],
          ['Median Score', hasSampleSize ? formatScore(data?.median) : 'N/A'],
          ['Std Deviation', hasSampleSize ? formatScore(data?.standardDeviation) : 'N/A'],
        ].map(([label, value]) => (
          <div key={label} style={{ background: DASHBOARD_COLORS.surfaceAlt, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: DASHBOARD_COLORS.subtle, fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: DASHBOARD_COLORS.ink, marginTop: 2 }}>{value}</p>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
});

// ─── 4. Department Performance Heatmap ─────────────────────────────────────────

export const DepartmentHeatmap = memo(({ data }: { data?: DepartmentAnalyticsDTO[] }) => {
  const isMock = isMockDepartmentList(data);
  const displayData = isMock ? [] : (data || []);

  return (
    <DashboardCard title="Department Performance Heatmap" className="lg:col-span-7" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr style={{ background: DASHBOARD_COLORS.surfaceAlt }}>
              {['Department', 'Avg Score', 'Completion', 'PIP Count', 'Employees'].map((heading) => (
                <th key={heading} style={{ padding: '9px 12px', textAlign: heading === 'Department' ? 'left' : 'right', fontSize: 11, color: DASHBOARD_COLORS.subtle, fontWeight: 700, textTransform: 'uppercase' }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!displayData.length ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title="No Department Metrics Found"
                    body="Departmental aggregates will generate as team evaluations conclude."
                  />
                </td>
              </tr>
            ) : displayData.map((row) => {
              const score = Number(row.avgScore || 0);
              const tone = getScoreTone(score);
              return (
                <tr key={`${row.departmentName}-${row.rank || row.departmentId}`} style={{ borderBottom: `1px solid ${DASHBOARD_COLORS.grid}` }}>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: DASHBOARD_COLORS.ink, fontWeight: 600 }}>{row.departmentName}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <span style={{ ...tone, borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>
                      {row.avgScore != null ? formatScore(score) : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 500, color: DASHBOARD_COLORS.ink }}>
                    {row.completionRate != null ? `${formatScore(row.completionRate, 0)}%` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 500, color: row.pipCount > 0 ? DASHBOARD_COLORS.danger : DASHBOARD_COLORS.subtle }}>
                    {row.pipCount ?? '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 500, color: DASHBOARD_COLORS.ink }}>
                    {row.employeeCount ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
});

// ─── 5. Performance Trend Chart ───────────────────────────────────────────────

export const PerformanceTrendChart = memo(({
  data,
}: {
  data?: PerformanceTrendPointDTO[];
}) => {
  const isMock = isMockTrend(data);
  const hasSufficientHistory = Boolean(!isMock && data && data.length >= 2);

  return (
    <DashboardCard
      title="Performance Trend"
      className="lg:col-span-7"
    >
      <div style={dashboardStyles.chartHeightMd}>
        {!hasSufficientHistory ? (
          <EmptyState
            title="Insufficient Historical Records"
            body="Historical performance trends require data from at least two completed review cycles. Trends will plot automatically as future cycles conclude."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={DASHBOARD_COLORS.grid} />
              <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: DASHBOARD_COLORS.subtle }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }} domain={[0, 100]} />
              <Tooltip
                contentStyle={dashboardStyles.tooltip}
                formatter={(val: any, name: any) => [`${val}%`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="avgScore" name="Avg Score" stroke={DASHBOARD_COLORS.primary} strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="completionRate" name="Completion Rate" stroke={DASHBOARD_COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="pipResolutionRate" name="PIP Resolution" stroke={DASHBOARD_COLORS.warning} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </DashboardCard>
  );
});

// ─── 6. Goal Completion Card ──────────────────────────────────────────────────

export const GoalCompletionCard = memo(({ data }: { data?: GoalCompletionReportDTO }) => {
  const goalData = transformGoalData(data);
  const hasGoals = Boolean(data && data.total && data.total > 0);

  return (
    <DashboardCard title="Goal Completion Rate" className="lg:col-span-5">
      {!hasGoals ? (
        <EmptyState
          title="No Goal Records Found"
          body="Goal tracking metrics will populate once employee KPI goals are assigned for this cycle."
        />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <strong style={{ fontSize: 28, color: DASHBOARD_COLORS.ink }}>
              {data?.completionRate != null ? `${formatScore(data.completionRate, 0)}%` : 'N/A'}
            </strong>
            <span style={{ fontSize: 12, color: DASHBOARD_COLORS.subtle }}>
              {data?.completed || 0} / {data?.total || 0} goals completed
            </span>
          </div>

          <div style={{ height: 10, display: 'flex', borderRadius: 999, overflow: 'hidden', background: DASHBOARD_COLORS.surfaceAlt, marginBottom: 14 }}>
            {goalData.map((item) => (
              <div
                key={item.name}
                style={{
                  width: `${data?.total ? (item.value / data.total) * 100 : 0}%`,
                  background: item.color,
                }}
              />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {goalData.map((item) => (
              <div
                key={item.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: DASHBOARD_COLORS.surfaceAlt,
                  borderRadius: 8,
                  fontSize: 12,
                  color: DASHBOARD_COLORS.muted,
                }}
              >
                <span>{item.name}</span>
                <strong style={{ color: item.color }}>{item.value}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardCard>
  );
});

// ─── 7. Performance Potential Matrix ──────────────────────────────────────────

export const PerformancePotentialMatrixCard = memo(({ data }: { data?: PerformancePotentialMatrixDTO[] }) => {
  const realData = (data || []).filter((d) => !isMockEmployee(d.employeeName));
  const hasData = Boolean(realData.length > 0);
  const isTenScale = Boolean(hasData && realData.some(d => (d.performanceScore || 0) <= 10 && (d.potentialScore || 0) <= 10));
  const domain = isTenScale ? [0, 10] : [0, 100];
  const refLine = isTenScale ? 7.5 : 75;

  return (
    <DashboardCard title="Performance-Potential Matrix (9-Box)" className="lg:col-span-12">
      <div style={dashboardStyles.chartHeightLg}>
        {!hasData ? (
          <EmptyState
            title="No 9-Box Matrix Records"
            body="Performance and potential mappings will display once leadership evaluations are recorded for this cycle."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 15, right: 20, bottom: 15, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_COLORS.grid} />
              <XAxis
                type="number"
                dataKey="performanceScore"
                name="Performance"
                domain={domain}
                tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }}
                label={{ value: 'Performance Score', position: 'insideBottom', offset: -5, fontSize: 11, fill: DASHBOARD_COLORS.subtle }}
              />
              <YAxis
                type="number"
                dataKey="potentialScore"
                name="Potential"
                domain={domain}
                tick={{ fontSize: 11, fill: DASHBOARD_COLORS.subtle }}
                label={{ value: 'Potential Score', angle: -90, position: 'insideLeft', fontSize: 11, fill: DASHBOARD_COLORS.subtle }}
              />
              <ZAxis range={[70, 120]} />
              <ReferenceLine x={refLine} stroke={DASHBOARD_COLORS.primaryBorder} strokeDasharray="4 4" />
              <ReferenceLine y={refLine} stroke={DASHBOARD_COLORS.primaryBorder} strokeDasharray="4 4" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const pt = payload[0].payload as PerformancePotentialMatrixDTO;
                  return (
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-lg text-xs space-y-1">
                      <p className="font-bold text-slate-900">{pt.employeeName}</p>
                      <p className="text-slate-500">{pt.departmentName}</p>
                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-4">
                        <span className="text-slate-600">Quadrant:</span>
                        <span className="font-bold text-purple-700">{pt.quadrant || 'Evaluated'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-[11px] text-slate-500">
                        <span>Performance: <strong>{pt.performanceScore}</strong></span>
                        <span>Potential: <strong>{pt.potentialScore}</strong></span>
                      </div>
                    </div>
                  );
                }}
              />
              <Scatter data={realData} fill={DASHBOARD_COLORS.primary} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </DashboardCard>
  );
});

// ─── 8. Team Performance Breakdown Card ───────────────────────────────────────

export const TeamPerformanceBreakdownCard = memo(({
  data,
  loading,
  isError,
}: {
  data?: DepartmentBreakdownDTO[];
  loading: boolean;
  isError?: boolean;
}) => {
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  const toggleDept = (name: string) => setExpandedDepts(prev => ({ ...prev, [name]: !prev[name] }));
  const toggleTeam = (name: string) => setExpandedTeams(prev => ({ ...prev, [name]: !prev[name] }));

  const realDepts = (data || [])
    .map(dept => ({
      ...dept,
      teams: dept.teams
        .map(team => ({
          ...team,
          members: team.members.filter(m => !isMockEmployee(m.employeeName)),
        }))
        .filter(team => team.members.length > 0),
    }))
    .filter(dept => dept.teams.length > 0);

  return (
    <DashboardCard
      title="Team Performance Breakdown"
      isError={isError}
    >
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {loading ? (
          <SkeletonBlock height={300} />
        ) : !realDepts.length ? (
          <EmptyState
            title="No Team Breakdown Records"
            body="Team and individual appraisal breakdowns will display once manager evaluations are submitted."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {realDepts.map((dept) => (
              <div key={dept.departmentName} style={{ background: DASHBOARD_COLORS.surfaceAlt, borderRadius: 10, border: DASHBOARD_BORDER, overflow: 'hidden' }}>
                <div
                  onClick={() => toggleDept(dept.departmentName)}
                  style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: DASHBOARD_COLORS.surface }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {expandedDepts[dept.departmentName] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span style={{ fontWeight: 700, color: DASHBOARD_COLORS.ink, fontSize: 13 }}>{dept.departmentName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: DASHBOARD_COLORS.subtle }}>Avg Score:</span>
                    <span style={{ ...getScoreTone(dept.averageScore), padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                      {formatScore(dept.averageScore)}%
                    </span>
                  </div>
                </div>

                {expandedDepts[dept.departmentName] && (
                  <div style={{ padding: '0 0 12px 24px' }}>
                    {dept.teams.map((team) => (
                      <div key={team.teamName} style={{ marginTop: 8 }}>
                        <div
                          onClick={() => toggleTeam(team.teamName)}
                          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: DASHBOARD_BORDER }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {expandedTeams[team.teamName] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span style={{ fontWeight: 600, fontSize: 13, color: DASHBOARD_COLORS.ink }}>{team.teamName}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ ...getScoreTone(team.averageScore), padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                              {formatScore(team.averageScore)}%
                            </span>
                          </div>
                        </div>

                        {expandedTeams[team.teamName] && (
                          <div style={{ padding: '8px 16px 8px 32px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: 'left', fontSize: 11, color: DASHBOARD_COLORS.subtle, paddingBottom: 6 }}>Employee</th>
                                  <th style={{ textAlign: 'left', fontSize: 11, color: DASHBOARD_COLORS.subtle, paddingBottom: 6 }}>Role</th>
                                  <th style={{ textAlign: 'right', fontSize: 11, color: DASHBOARD_COLORS.subtle, paddingBottom: 6 }}>Score</th>
                                </tr>
                              </thead>
                              <tbody>
                                {team.members.map((member) => (
                                  <tr key={member.employeeId}>
                                    <td style={{ fontSize: 12, padding: '5px 0', color: DASHBOARD_COLORS.ink, fontWeight: 600 }}>{member.employeeName}</td>
                                    <td style={{ fontSize: 12, padding: '5px 0', color: DASHBOARD_COLORS.subtle }}>{member.role}</td>
                                    <td style={{ fontSize: 12, padding: '5px 0', textAlign: 'right', fontWeight: 700, color: DASHBOARD_COLORS.ink }}>
                                      {formatScore(member.averageScore)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardCard>
  );
});

// Legacy export retained for safe compatibility
export const Feedback360Card = memo(({ data }: { data?: Feedback360SummaryAnalyticsDTO }) => null);
