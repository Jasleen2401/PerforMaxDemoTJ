import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  useDownloadReportMutation,
  useGetAppraisalStatusReportQuery,
  useGetKpiAchievementReportQuery,
  useGetOrganizationPerformanceTrendQuery,
  useGetPerformanceByDepartmentQuery,
  useGetPerformanceDistributionQuery,
  useGetPerformancePotentialMatrixQuery,
  useGetPerformanceRankingReportQuery,
  useGetTeamPerformanceBreakdownQuery,
} from '../../features/report/reportApi';
import { useGetCyclesQuery } from '../../features/appraisal/appraisalApi';
import { useGetDepartmentsQuery } from '../../features/org/departmentApi';
import { FilterBar } from '../../components/analytics/FilterBar';
import { QuickInsights, SelectCyclePrompt, SummaryCards, type SummaryMetricItem } from '../../components/analytics/SummaryPanels';
import {
  AppraisalCompletionCard,
  DepartmentHeatmap,
  KpiAchievementChart,
  PerformanceDistributionCard,
  PerformancePotentialMatrixCard,
  PerformanceTrendChart,
  TeamPerformanceBreakdownCard,
} from '../../components/analytics/ChartCards';
import {
  PerformanceRankingTable,
  UnderPerformanceRankingTable,
} from '../../components/analytics/RankingAndPip';
import {
  calculateCompletionRate,
  formatScore,
  isValidId,
  transformPieData,
  isMockDistribution,
} from '../../utils/reportUtils';
import type { FilterState } from '../../types/reports';

const AnalyticsDashboard = () => {
  const [filters, setFilters] = useState<FilterState>({ selectedCycle: '', selectedDept: '' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { selectedCycle, selectedDept } = filters;
  const hasCycle = isValidId(selectedCycle);
  const departmentId = isValidId(selectedDept) ? selectedDept : undefined;

  const { data: cycles } = useGetCyclesQuery();
  const { data: departments } = useGetDepartmentsQuery();

  useEffect(() => {
    if (!selectedCycle && cycles && cycles.length > 0) {
      const active = cycles.find((c: any) => c.status === 'ACTIVE' || c.isActive) || cycles[0];
      const cId = (active as any).cycleId ?? (active as any).id;
      if (cId !== undefined && cId !== null && cId !== '') {
        setFilters((current) => ({ ...current, selectedCycle: Number(cId) || cId }));
      }
    }
  }, [cycles, selectedCycle]);

  // Selected cycle object for status and contextual details
  const selectedCycleObj = useMemo(() => {
    if (!cycles || !hasCycle) return undefined;
    return cycles.find((c: any) => Number((c as any).cycleId ?? (c as any).id) === Number(selectedCycle));
  }, [cycles, hasCycle, selectedCycle]);

  // API Queries wired to active cycle and department
  const appraisalStatusQuery = useGetAppraisalStatusReportQuery(Number(selectedCycle), { skip: !hasCycle });
  const kpiReportQuery = useGetKpiAchievementReportQuery({ cycleId: Number(selectedCycle), departmentId }, { skip: !hasCycle });
  const rankingReportQuery = useGetPerformanceRankingReportQuery(Number(selectedCycle), { skip: !hasCycle });
  const distributionReportQuery = useGetPerformanceDistributionQuery({ cycleId: Number(selectedCycle), departmentId }, { skip: !hasCycle });
  const departmentReportQuery = useGetPerformanceByDepartmentQuery(Number(selectedCycle), { skip: !hasCycle });
  const trendReportQuery = useGetOrganizationPerformanceTrendQuery(6, { skip: !hasCycle });
  const matrixReportQuery = useGetPerformancePotentialMatrixQuery(Number(selectedCycle), { skip: !hasCycle });
  const teamBreakdownQuery = useGetTeamPerformanceBreakdownQuery({ cycleId: Number(selectedCycle), departmentId }, { skip: !hasCycle });

  const [downloadReport] = useDownloadReportMutation();

  const handleCycleChange = useCallback((value: number | '') => {
    setFilters((current) => ({ ...current, selectedCycle: value }));
  }, []);

  const handleDeptChange = useCallback((value: number | '') => {
    setFilters((current) => ({ ...current, selectedDept: value }));
  }, []);

  const handleExportRoster = useCallback(async () => {
    setIsExporting(true);
    try {
      await downloadReport({
        endpoint: 'employee-roster',
        params: { cycleId: selectedCycle, format: 'excel' },
        fileName: `Employee_Directory_Roster.xlsx`,
      }).unwrap();
      toast.success('Employee directory roster export downloaded.');
    } catch {
      toast.error('Failed to export employee roster.');
    } finally {
      setIsExporting(false);
    }
  }, [downloadReport, selectedCycle]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (hasCycle) {
        await Promise.all([
          appraisalStatusQuery.refetch(),
          kpiReportQuery.refetch(),
          rankingReportQuery.refetch(),
          distributionReportQuery.refetch(),
          departmentReportQuery.refetch(),
          trendReportQuery.refetch(),
          matrixReportQuery.refetch(),
          teamBreakdownQuery.refetch(),
        ]);
      }
      toast.success('Analytics refreshed.');
    } catch {
      toast.error('Some analytics could not be refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  }, [
    appraisalStatusQuery,
    departmentReportQuery,
    distributionReportQuery,
    hasCycle,
    kpiReportQuery,
    matrixReportQuery,
    rankingReportQuery,
    teamBreakdownQuery,
    trendReportQuery,
  ]);

  const appraisalPieData = useMemo(
    () => transformPieData(appraisalStatusQuery.data?.data),
    [appraisalStatusQuery.data],
  );

  // Key metrics calculation strictly based on verified data
  const summaryMetrics: SummaryMetricItem[] = useMemo(() => {
    const rawRate = calculateCompletionRate(
      appraisalStatusQuery.data?.data?.completed,
      appraisalStatusQuery.data?.data?.totalEmployees,
    );
    const isMock = isMockDistribution(
      distributionReportQuery.data?.data?.mean,
      distributionReportQuery.data?.data?.sampleSize
    );
    const meanScore = !isMock ? distributionReportQuery.data?.data?.mean : null;
    const sampleSize = !isMock ? distributionReportQuery.data?.data?.sampleSize : null;
    const totalEmployees = appraisalStatusQuery.data?.data?.totalEmployees || 0;
    const completedCount = appraisalStatusQuery.data?.data?.completed || 0;

    return [
      {
        label: 'Appraisal Completion',
        value: rawRate !== null ? `${rawRate}%` : 'N/A',
        sublabel: totalEmployees
          ? `${completedCount} of ${totalEmployees} completed`
          : 'Pending evaluations',
        icon: 'completion',
        isAvailable: rawRate !== null,
        isLoading: appraisalStatusQuery.isFetching,
      },
      {
        label: 'Average Score',
        value: meanScore != null && sampleSize ? `${formatScore(meanScore)}%` : 'N/A',
        sublabel: sampleSize ? `Across ${sampleSize} scored employees` : 'Pending evaluation',
        icon: 'score',
        isAvailable: meanScore != null && Boolean(sampleSize),
        isLoading: distributionReportQuery.isFetching,
      },
      {
        label: 'Finalized Appraisals',
        value: completedCount > 0 ? String(completedCount) : '0',
        sublabel: totalEmployees ? `Out of ${totalEmployees} total under review` : 'No reviews recorded',
        icon: 'status',
        isAvailable: Boolean(totalEmployees),
        isLoading: appraisalStatusQuery.isFetching,
      },
      {
        label: 'Cycle Status',
        value: selectedCycleObj ? (selectedCycleObj.status || (selectedCycleObj.isActive ? 'Active' : 'Closed')) : (hasCycle ? 'Active' : 'N/A'),
        sublabel: selectedCycleObj ? (selectedCycleObj.cycleName || (selectedCycleObj as any).name || 'Review cycle') : 'Choose a cycle above',
        icon: 'status',
        isAvailable: hasCycle,
        isLoading: false,
      },
    ];
  }, [
    appraisalStatusQuery.data,
    appraisalStatusQuery.isFetching,
    distributionReportQuery.data,
    distributionReportQuery.isFetching,
    hasCycle,
    selectedCycleObj,
  ]);

  // Derived factual quick insights
  const insights = useMemo(() => {
    const rawRate = calculateCompletionRate(
      appraisalStatusQuery.data?.data?.completed,
      appraisalStatusQuery.data?.data?.totalEmployees,
    );
    const isMock = isMockDistribution(
      distributionReportQuery.data?.data?.mean,
      distributionReportQuery.data?.data?.sampleSize
    );
    const meanScore = !isMock ? distributionReportQuery.data?.data?.mean : null;
    const sampleSize = !isMock ? distributionReportQuery.data?.data?.sampleSize : null;
    const completed = appraisalStatusQuery.data?.data?.completed || 0;
    const total = appraisalStatusQuery.data?.data?.totalEmployees || 0;

    return [
      rawRate !== null
        ? `${rawRate}% appraisal completion (${completed} of ${total} finalized) for this cycle.`
        : 'Appraisal completion data will update as employee reviews are completed.',
      meanScore != null && sampleSize
        ? `Organization mean score is ${formatScore(meanScore)}% across ${sampleSize} scored employees.`
        : 'Performance score distribution is pending graded appraisal submissions.',
      hasCycle
        ? `Selected cycle: ${selectedCycleObj?.cycleName || (selectedCycleObj as any)?.name || 'Review cycle in progress'}.`
        : 'Select an appraisal cycle to analyze organization performance outcomes.',
    ];
  }, [appraisalStatusQuery.data, distributionReportQuery.data, hasCycle, selectedCycleObj]);

  return (
    <div className="space-y-4 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100/80">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Performance Analytics</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">Track appraisal outcomes, score distributions, and performance across teams and review cycles.</p>
        </div>
      </div>

      {/* Cycle & Department Filter Bar */}
      <FilterBar
        cycles={cycles}
        departments={departments}
        selectedCycle={selectedCycle}
        selectedDept={selectedDept}
        isRefreshing={isRefreshing}
        isExporting={isExporting}
        onCycleChange={handleCycleChange}
        onDeptChange={handleDeptChange}
        onRefresh={handleRefresh}
        onExportRoster={handleExportRoster}
      />

      {!hasCycle ? (
        <SelectCyclePrompt />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          {/* 1. Key Metrics & Quick Insights */}
          <SummaryCards metrics={summaryMetrics} />
          <QuickInsights insights={insights} />

          {/* 2. Appraisal Completion Status & KPI Achievement Distribution */}
          <AppraisalCompletionCard
            data={appraisalStatusQuery.data?.data}
            pieData={appraisalPieData}
            loading={appraisalStatusQuery.isFetching}
            isError={appraisalStatusQuery.isError}
          />

          <KpiAchievementChart
            data={kpiReportQuery.data?.data}
            loading={kpiReportQuery.isFetching}
            isError={kpiReportQuery.isError}
          />

          {/* 3. Performance Distribution & Department Performance Heatmap */}
          <PerformanceDistributionCard data={distributionReportQuery.data?.data} />
          <DepartmentHeatmap data={departmentReportQuery.data?.data} />

          {/* 4. Performance Trend */}
          <PerformanceTrendChart data={trendReportQuery.data?.data} />

          {/* 5. Performance-Potential Matrix (9-Box) */}
          <PerformancePotentialMatrixCard data={matrixReportQuery.data?.data} />

          {/* 6. Top Performers and Under Performers Leaderboards */}
          <PerformanceRankingTable
            data={rankingReportQuery.data?.data}
            loading={rankingReportQuery.isFetching}
            isError={rankingReportQuery.isError}
          />

          <UnderPerformanceRankingTable
            data={rankingReportQuery.data?.data}
            loading={rankingReportQuery.isFetching}
            isError={rankingReportQuery.isError}
          />

          {/* 7. Team Performance Breakdown */}
          <div className="lg:col-span-12">
            <TeamPerformanceBreakdownCard 
              data={teamBreakdownQuery.data?.data}
              loading={teamBreakdownQuery.isFetching}
              isError={teamBreakdownQuery.isError}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
