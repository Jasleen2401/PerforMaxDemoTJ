// src/pages/instructor/JapaneseInstructorDashboard.tsx
import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Users,
  Layers,
  ClipboardCheck,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  X,
  Calendar,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Clock,
  Award,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  useGetJapaneseDashboardQuery,
  useGetJapaneseBatchesQuery,
  useGetJapaneseInternsQuery,
  useGetJapaneseEvaluationsQuery,
} from "../../features/japanese/japaneseApi";

type CardKey = "interns" | "batches" | "evaluations" | "progress";

const PURPLE_SHADES = ["#6D3FEA", "#7B50F0", "#5526D9", "#9878EE", "#8B5CF6", "#A78BFA"];

export const JapaneseInstructorDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Primary live queries
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    isFetching: isDashboardFetching,
    isError,
    refetch: refetchDashboard,
  } = useGetJapaneseDashboardQuery();

  const { data: batches = [], refetch: refetchBatches } = useGetJapaneseBatchesQuery();
  const { data: internsList = [], refetch: refetchInterns } = useGetJapaneseInternsQuery();
  const { data: evaluationsList = [], refetch: refetchEvaluations } = useGetJapaneseEvaluationsQuery();

  const [activeDetailCard, setActiveDetailCard] = useState<CardKey | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDetailCard(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchDashboard(),
        refetchBatches(),
        refetchInterns(),
        refetchEvaluations(),
      ]);
      toast.success("Workspace analytics updated.");
    } catch {
      toast.error("Failed to refresh dashboard data.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Safe data arrays
  const rawBatches = useMemo(() => (Array.isArray(batches) ? batches : []), [batches]);
  const safeInterns = useMemo(() => (Array.isArray(internsList) ? internsList : []), [internsList]);
  const safeEvaluations = useMemo(() => (Array.isArray(evaluationsList) ? evaluationsList : []), [evaluationsList]);

  // Live overview metrics
  const overview = dashboardData?.overview;
  const activeCycle = dashboardData?.activeCycle;

  const totalInterns = overview?.totalInterns ?? safeInterns.length;
  const assignedBatchesCount = overview?.assignedBatches ?? rawBatches.length;
  const avgProgress = overview?.avgProgress ?? 0;
  const reviewedExercises = overview?.reviewedExercises ?? 0;
  const totalExercises = overview?.totalExercises ?? 0;

  // Normalized assigned batches list
  const normalizedBatches = useMemo(() => {
    if (rawBatches.length > 0) {
      return rawBatches.map((b) => ({
        id: b.id,
        name: b.name || "Unnamed Batch",
        cohort: b.cohort || "Cohort",
        internsCount: b.interns_count ?? b.assigned_interns?.length ?? 0,
        creatorRole:
          b.creator?.role_display ||
          (b.creator?.role === "HR" ? "HR Partner" : "Super Admin"),
      }));
    }
    if (dashboardData?.batches && Array.isArray(dashboardData.batches) && dashboardData.batches.length > 0) {
      return dashboardData.batches.map((b) => ({
        id: b.id,
        name: b.name || "Unnamed Batch",
        cohort: b.cohort || "Cohort",
        internsCount: b.internsCount ?? 0,
        creatorRole: b.creatorRole || "Super Admin",
      }));
    }
    return [];
  }, [rawBatches, dashboardData?.batches]);

  // Normalized pending evaluations list
  const pendingEvaluations = useMemo(() => {
    if (safeEvaluations.length > 0) {
      return safeEvaluations
        .filter((ev) => ["DRAFT", "PENDING"].includes(ev.status))
        .map((ev) => ({
          id: ev.id,
          internName: ev.intern_name || "Intern",
          internCode: ev.intern_code || "",
          status: ev.status === "DRAFT" ? "DRAFT" : "PENDING",
        }));
    }
    return [];
  }, [safeEvaluations]);

  const pendingCount =
    dashboardData?.evaluations_summary?.pending ??
    pendingEvaluations.filter((e) => e.status === "PENDING").length;
  const draftCount =
    dashboardData?.evaluations_summary?.draft ??
    pendingEvaluations.filter((e) => e.status === "DRAFT").length;
  const pendingEvalsCount =
    overview?.pendingEvaluations ?? pendingEvaluations.length;

  // -------------------------------------------------------------------------
  // Section A: Batch Performance Overview Data
  // -------------------------------------------------------------------------
  const batchPerformanceData = useMemo(() => {
    if (normalizedBatches.length === 0) {
      return [{ fullName: "No Batches", shortName: "None", avgScore: 0, internsCount: 0 }];
    }
    return normalizedBatches.map((batch) => {
      const rawBatch = rawBatches.find((b) => b && b.id === batch.id);
      const assignedList = Array.isArray(rawBatch?.assigned_interns) ? rawBatch.assigned_interns : [];
      const internIds = new Set(assignedList.map((i) => String(i.id)));
      const internNames = new Set(assignedList.map((i) => i.fullName));

      const evals = safeEvaluations.filter(
        (ev) =>
          (ev.intern && internIds.has(String(ev.intern))) ||
          (ev.intern_name && internNames.has(ev.intern_name))
      );

      let avgScore = 0;
      if (evals.length > 0) {
        const scores = evals
          .map((e) => Number(e.overall_language_score))
          .filter((s) => !isNaN(s) && s > 0);
        if (scores.length > 0) {
          avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
      }

      if (avgScore === 0) {
        const batchInternObjs = safeInterns.filter((i) => internIds.has(String(i.id)));
        if (batchInternObjs.length > 0) {
          const sumProg = batchInternObjs.reduce((acc, cur) => acc + (cur.progress?.percentage || 0), 0);
          avgScore = Math.round(sumProg / batchInternObjs.length);
        } else {
          avgScore = overview?.avgProgress ? Math.round(overview.avgProgress) : 0;
        }
      }

      return {
        fullName: batch.name,
        shortName: batch.name.length > 13 ? batch.name.substring(0, 11) + "…" : batch.name,
        avgScore: Math.min(100, Math.max(0, avgScore)),
        internsCount: batch.internsCount || 0,
      };
    });
  }, [normalizedBatches, rawBatches, safeEvaluations, safeInterns, overview?.avgProgress]);

  // -------------------------------------------------------------------------
  // Section B: Learning Progress Data
  // -------------------------------------------------------------------------
  const learningProgressMetrics = useMemo(() => {
    const langProgress = overview?.avgProgress ?? 0;
    const practiceReviewed = overview?.reviewedExercises ?? 0;
    const practiceTotal = overview?.totalExercises ?? 0;
    const practicePercent =
      practiceTotal > 0
        ? Math.round((practiceReviewed / practiceTotal) * 100)
        : Math.min(100, Math.round(langProgress * 0.9));

    const jlptSummary = dashboardData?.jlpt_summary;
    const totalJLPT =
      (jlptSummary?.meetsRequirement ?? 0) +
      (jlptSummary?.inProgress ?? 0) +
      (jlptSummary?.pendingVerification ?? 0) +
      (jlptSummary?.notStarted ?? 0);
    const jlptReadiness =
      totalJLPT > 0
        ? Math.round(
            (((jlptSummary?.meetsRequirement ?? 0) + (jlptSummary?.pendingVerification ?? 0)) / totalJLPT) * 100
          )
        : 65;

    const overall = Math.round(langProgress * 0.5 + practicePercent * 0.3 + jlptReadiness * 0.2);

    return [
      {
        label: "Japanese Language Learning",
        sublabel: `${langProgress}% syllabus completed`,
        percentage: langProgress,
        color: "bg-purple-600",
      },
      {
        label: "Technical & Practice Reviews",
        sublabel: `${practiceReviewed} of ${practiceTotal} exercises reviewed`,
        percentage: practicePercent,
        color: "bg-indigo-600",
      },
      {
        label: "Overall Learning Progress",
        sublabel: "Combined cohort progress milestone",
        percentage: overall,
        color: "bg-emerald-600",
      },
    ];
  }, [overview, dashboardData?.jlpt_summary]);

  // -------------------------------------------------------------------------
  // Section C: Evaluation Status Donut Data
  // -------------------------------------------------------------------------
  const evaluationDonutData = useMemo(() => {
    const rawPending = dashboardData?.evaluations_summary?.pending ?? 0;
    const rawDraft = dashboardData?.evaluations_summary?.draft ?? 0;
    const rawSubmitted = dashboardData?.evaluations_summary?.submitted ?? 0;
    const rawCompleted = dashboardData?.evaluations_summary?.accepted ?? 0;

    const actualPending =
      rawPending > 0 ? rawPending : safeEvaluations.filter((e) => e.status === "PENDING").length;
    const actualDraft =
      rawDraft > 0 ? rawDraft : safeEvaluations.filter((e) => e.status === "DRAFT").length;
    const actualSubmitted =
      rawSubmitted > 0 ? rawSubmitted : safeEvaluations.filter((e) => e.status === "SUBMITTED" || e.status === "RESUBMITTED").length;
    const actualCompleted =
      rawCompleted > 0 ? rawCompleted : safeEvaluations.filter((e) => e.status === "ACCEPTED").length;

    const total = actualPending + actualDraft + actualSubmitted + actualCompleted;

    const segments = [
      { name: "Pending", value: actualPending, color: "#F59E0B" },
      { name: "Draft", value: actualDraft, color: "#8B5CF6" },
      { name: "Submitted", value: actualSubmitted, color: "#3B82F6" },
      { name: "Completed", value: actualCompleted, color: "#10B981" },
    ];

    const activeSegments = segments.filter((s) => s.value > 0);

    return {
      total: total > 0 ? total : 0,
      segments: activeSegments.length > 0
        ? activeSegments
        : [{ name: "No Evaluations", value: 1, color: "#E2E8F0" }],
      raw: {
        pending: actualPending,
        draft: actualDraft,
        submitted: actualSubmitted,
        completed: actualCompleted,
      },
    };
  }, [dashboardData?.evaluations_summary, safeEvaluations]);

  // -------------------------------------------------------------------------
  // Section D: Batch-wise Intern Distribution Data
  // -------------------------------------------------------------------------
  const batchDistributionData = useMemo(() => {
    if (normalizedBatches.length === 0) {
      return [{ fullName: "No Batches", shortName: "None", cohort: "", internsCount: 0 }];
    }
    return normalizedBatches.map((batch) => ({
      fullName: batch.name,
      shortName: batch.name.length > 14 ? batch.name.substring(0, 12) + "…" : batch.name,
      cohort: batch.cohort,
      internsCount: batch.internsCount || 0,
    }));
  }, [normalizedBatches]);

  if (isDashboardLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] space-y-3">
        <div className="w-8 h-8 rounded-full border-3 border-purple-600 border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading Japanese Instructor Workspace...</p>
      </div>
    );
  }

  if (isError || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] p-6 text-center">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 max-w-md shadow-xs space-y-3">
          <AlertTriangle className="text-rose-600 mx-auto" size={28} />
          <h3 className="text-sm font-bold text-rose-950">Unable to load dashboard</h3>
          <p className="text-xs text-rose-700">
            Failed to retrieve live instructor metrics. Please verify network connectivity or authentication.
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-start overflow-y-auto lg:overflow-hidden select-none pb-1">
      {/* Top Heading & Quick Controls Bar (compact height ~32px) */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
            Dashboard Overview
          </h1>
          {activeCycle?.name && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-semibold">
              <Calendar size={11} className="text-purple-500" />
              {activeCycle.name}
            </span>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isDashboardFetching}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200/80 hover:border-purple-300 text-xs font-semibold text-slate-700 hover:text-purple-700 shadow-2xs transition-all cursor-pointer"
          title="Refresh Analytics"
        >
          <RefreshCw
            size={12}
            className={isRefreshing || isDashboardFetching ? "animate-spin text-purple-600" : "text-slate-500"}
          />
          <span className="hidden sm:inline">
            {isRefreshing || isDashboardFetching ? "Updating..." : "Refresh"}
          </span>
        </button>
      </div>

      {/* Row 1: Four Compact Rectangular Metric Cards (height ~66px) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-2.5 shrink-0">
        {/* Card 1: Total Interns */}
        <div
          onClick={() => setActiveDetailCard("interns")}
          className="h-[66px] bg-white rounded-2xl border border-slate-200/80 hover:border-purple-300 shadow-2xs hover:shadow-xs transition-all px-3 py-2 flex items-center justify-between cursor-pointer group"
          title="Click to view assigned interns"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                Total Interns
              </span>
              <div className="text-lg font-black text-slate-900 leading-tight">
                {totalInterns}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 flex items-center gap-1 text-[11px] font-semibold text-purple-600 group-hover:text-purple-700">
            <span>{assignedBatchesCount} batches</span>
            <ChevronRight size={13} className="text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Card 2: Assigned Batches */}
        <div
          onClick={() => setActiveDetailCard("batches")}
          className="h-[66px] bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all px-3 py-2 flex items-center justify-between cursor-pointer group"
          title="Click to view assigned batches"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Layers size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                Assigned Batches
              </span>
              <div className="text-lg font-black text-slate-900 leading-tight">
                {assignedBatchesCount}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-700">
            <span>{totalInterns} enrolled</span>
            <ChevronRight size={13} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Card 3: Pending Evaluations */}
        <div
          onClick={() => setActiveDetailCard("evaluations")}
          className="h-[66px] bg-white rounded-2xl border border-slate-200/80 hover:border-amber-300 shadow-2xs hover:shadow-xs transition-all px-3 py-2 flex items-center justify-between cursor-pointer group"
          title="Click to view pending evaluations"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ClipboardCheck size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                Pending Evaluations
              </span>
              <div className="text-lg font-black text-slate-900 leading-tight">
                {pendingEvalsCount}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 flex items-center gap-1 text-[11px] font-semibold text-amber-700 group-hover:text-amber-800">
            <span>{draftCount > 0 ? `${draftCount} drafts` : `${pendingCount} pending`}</span>
            <ChevronRight size={13} className="text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Card 4: Learning Progress */}
        <div
          onClick={() => setActiveDetailCard("progress")}
          className="h-[66px] bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-xs transition-all px-3 py-2 flex items-center justify-between cursor-pointer group"
          title="Click to view learning progress details"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <TrendingUp size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                Learning Progress
              </span>
              <div className="text-lg font-black text-slate-900 leading-tight">
                {avgProgress}%
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 group-hover:text-emerald-700">
            <span>{reviewedExercises}/{totalExercises} rev.</span>
            <ChevronRight size={13} className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>

      {/* Row 2: Analytics - Batch Performance (Left) & Evaluation Status Donut (Right) (height ~245px) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 mb-2.5 h-auto lg:h-[245px] shrink-0">
        {/* Section A: Batch Performance Overview */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between shrink-0 mb-1">
            <div>
              <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                Batch Performance Overview
              </h2>
              <p className="text-[10px] text-slate-400">
                Average evaluation scores across assigned training batches
              </p>
            </div>
            <Link
              to="/japanese/batches"
              className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
            >
              Batches Hub <ArrowRight size={11} />
            </Link>
          </div>

          <div className="w-full h-[180px] min-w-0">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={batchPerformanceData}
                margin={{ top: 8, right: 15, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 9, fill: "#94A3B8" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-md text-xs">
                          <p className="font-bold text-slate-900">{d.fullName}</p>
                          <p className="text-purple-600 font-semibold mt-0.5">
                            Average Score: {d.avgScore}/100
                          </p>
                          <p className="text-slate-400 text-[10px]">
                            Interns Enrolled: {d.internsCount}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avgScore" radius={[4, 4, 0, 0]} maxBarSize={38}>
                  {batchPerformanceData.map((_, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={PURPLE_SHADES[index % PURPLE_SHADES.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section C: Evaluation Status Donut */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between shrink-0 mb-1">
            <div>
              <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                Evaluation Status
              </h2>
              <p className="text-[10px] text-slate-400">Appraisal cycle completion</p>
            </div>
            <Link
              to="/japanese/evaluations"
              className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
            >
              Evaluations <ArrowRight size={11} />
            </Link>
          </div>

          <div className="relative w-full h-[155px] min-w-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={155}>
              <PieChart>
                <Pie
                  data={evaluationDonutData.segments}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={66}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {evaluationDonutData.segments.map((entry, index) => (
                    <Cell key={`donut-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-md text-xs">
                          <span className="font-bold text-slate-900">{d.name}: </span>
                          <span className="font-bold text-purple-600">{d.value}</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-slate-900 leading-none">
                {evaluationDonutData.total}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Total
              </span>
            </div>
          </div>

          {/* Compact Legend */}
          <div className="flex items-center justify-center gap-3 pt-1 border-t border-slate-100 text-[10px] shrink-0">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-slate-600">Pending ({evaluationDonutData.raw.pending})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-slate-600">Draft ({evaluationDonutData.raw.draft})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-slate-600">Submitted ({evaluationDonutData.raw.submitted})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Done ({evaluationDonutData.raw.completed})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Analytics - Learning Progress Bars (Left) & Batch Intern Distribution (Right) (height ~245px) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 h-auto lg:h-[245px] shrink-0">
        {/* Section B: Learning Progress (Horizontal Progress Bars) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between shrink-0 mb-1">
            <div>
              <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                Learning Progress
              </h2>
              <p className="text-[10px] text-slate-400">Curriculum & milestone completion</p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
              {avgProgress}% Avg
            </span>
          </div>

          <div className="space-y-3.5 my-auto flex-1 flex flex-col justify-center">
            {learningProgressMetrics.map((metric, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{metric.label}</span>
                  <span className="font-bold text-slate-900">{metric.percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                  <div
                    className={`h-2 rounded-full ${metric.color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(0, metric.percentage))}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400">{metric.sublabel}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section D: Batch-wise Intern Distribution */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between shrink-0 mb-1">
            <div>
              <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                Batch-wise Intern Distribution
              </h2>
              <p className="text-[10px] text-slate-400">Headcount per training cohort</p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              {totalInterns} Total
            </span>
          </div>

          <div className="w-full h-[180px] min-w-0">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                layout="vertical"
                data={batchDistributionData}
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 9, fill: "#94A3B8" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={110}
                  tick={{ fontSize: 10, fill: "#475569" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-md text-xs">
                          <p className="font-bold text-slate-900">{d.fullName}</p>
                          <p className="text-indigo-600 font-semibold mt-0.5">
                            Interns: {d.internsCount}
                          </p>
                          <p className="text-slate-400 text-[10px]">Cohort: {d.cohort}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="internsCount"
                  fill="#7B50F0"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                >
                  {batchDistributionData.map((_, index) => (
                    <Cell
                      key={`h-bar-${index}`}
                      fill={PURPLE_SHADES[(index + 1) % PURPLE_SHADES.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interactive Detail Modal / Flyout when a KPI card is clicked */}
      {activeDetailCard && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveDetailCard(null)}
        >
          <div
            className="bg-white rounded-3xl border border-purple-200 shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  {activeDetailCard === "interns" && <Users size={16} />}
                  {activeDetailCard === "batches" && <Layers size={16} />}
                  {activeDetailCard === "evaluations" && <ClipboardCheck size={16} />}
                  {activeDetailCard === "progress" && <TrendingUp size={16} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activeDetailCard === "interns" && `Assigned Interns (${safeInterns.length})`}
                    {activeDetailCard === "batches" && `Assigned Batches (${normalizedBatches.length})`}
                    {activeDetailCard === "evaluations" && `Pending Evaluations (${pendingEvaluations.length})`}
                    {activeDetailCard === "progress" && `Learning Progress Breakdown`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeDetailCard === "interns" && "Learner profiles and curriculum completion"}
                    {activeDetailCard === "batches" && "Active cohorts managed by HR and Super Admin"}
                    {activeDetailCard === "evaluations" && "Appraisals awaiting review or HR revision"}
                    {activeDetailCard === "progress" && "Cohort and intern syllabus metrics"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveDetailCard(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {/* Interns List */}
              {activeDetailCard === "interns" && (
                safeInterns.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No interns currently assigned.
                  </div>
                ) : (
                  safeInterns.map((intern) => (
                    <div
                      key={intern.id}
                      className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {intern.fullName?.[0]?.toUpperCase() || "I"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {intern.fullName}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {intern.employeeCode} • {intern.department || "Engineering"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          {intern.progress?.percentage ?? 0}%
                        </span>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* Batches List */}
              {activeDetailCard === "batches" && (
                normalizedBatches.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No batches assigned.
                  </div>
                ) : (
                  normalizedBatches.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{b.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          {b.cohort}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{b.internsCount} Interns</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-700">
                          Created by {b.creatorRole}
                        </span>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* Evaluations List */}
              {activeDetailCard === "evaluations" && (
                pendingEvaluations.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <CheckCircle2 size={24} className="mx-auto mb-1 text-emerald-500" />
                    All evaluations are up to date!
                  </div>
                ) : (
                  pendingEvaluations.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{ev.internName}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            ev.status === "DRAFT"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {ev.status}
                        </span>
                      </div>
                      <div className="pt-1 flex items-center justify-end">
                        <Link
                          to={`/japanese/evaluations?evaluationId=${ev.id}`}
                          onClick={() => setActiveDetailCard(null)}
                          className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                        >
                          {ev.status === "DRAFT" ? "Continue Draft" : "Evaluate"} <ArrowRight size={11} />
                        </Link>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* Progress Breakdown */}
              {activeDetailCard === "progress" && (
                safeInterns.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No progress records found.
                  </div>
                ) : (
                  safeInterns.map((intern) => (
                    <div
                      key={intern.id}
                      className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{intern.fullName}</span>
                        <span className="font-extrabold text-emerald-700">
                          {intern.progress?.percentage ?? 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${intern.progress?.percentage ?? 0}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>
                          {intern.progress?.completed ?? 0} of {intern.progress?.total ?? 0} topics
                        </span>
                        <span className="font-semibold text-purple-700">
                          Target: {intern.plan?.targetLevel || "N5"}
                        </span>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 flex items-center justify-end shrink-0 bg-slate-50/50">
              {activeDetailCard === "interns" && (
                <Link
                  to="/japanese/batches"
                  onClick={() => setActiveDetailCard(null)}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                >
                  Manage Interns in Batches <ArrowRight size={12} />
                </Link>
              )}
              {activeDetailCard === "batches" && (
                <Link
                  to="/japanese/batches"
                  onClick={() => setActiveDetailCard(null)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  Go to Batches Workspace <ArrowRight size={12} />
                </Link>
              )}
              {activeDetailCard === "evaluations" && (
                <Link
                  to="/japanese/evaluations"
                  onClick={() => setActiveDetailCard(null)}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1"
                >
                  Open Evaluations Hub <ArrowRight size={12} />
                </Link>
              )}
              {activeDetailCard === "progress" && (
                <Link
                  to="/japanese/feedback"
                  onClick={() => setActiveDetailCard(null)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                >
                  View Feedback & Coaching <ArrowRight size={12} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JapaneseInstructorDashboard;
