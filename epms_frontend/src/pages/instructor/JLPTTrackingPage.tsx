// src/pages/instructor/JLPTTrackingPage.tsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  RotateCcw,
  RefreshCw,
  Users,
  TrendingUp,
  X,
  ChevronRight,
  Calendar,
  ArrowUpRight,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  useGetJLPTAttemptsQuery,
  useGetJLPTEligibilityQuery,
  useGetJapaneseInternsQuery,
  useGetJapaneseBatchesQuery,
} from "../../features/japanese/japaneseApi";
import { RecordJLPTAttemptModal } from "../../components/instructor/RecordJLPTAttemptModal";
import { VerifyJLPTModal } from "../../components/instructor/VerifyJLPTModal";
import type {
  JLPTAttempt,
  JLPTEligibilityRecord,
  JapaneseAssignedIntern,
  JLPTLevel,
} from "../../features/japanese/types";

export const JLPTTrackingPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<"ATTEMPTS" | "ELIGIBILITY">("ATTEMPTS");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [mainBatchFilter, setMainBatchFilter] = useState("ALL");
  const [subBatchFilter, setSubBatchFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [resultFilter, setResultFilter] = useState("ALL"); // ALL, PASSED, FAILED, SCHEDULED
  const [verificationFilter, setVerificationFilter] = useState("ALL"); // ALL, VERIFIED, PENDING

  // Modals State
  const [selectedAttempt, setSelectedAttempt] = useState<JLPTAttempt | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [detailIntern, setDetailIntern] = useState<JapaneseAssignedIntern | null>(null);
  const [detailInternId, setDetailInternId] = useState<string | null>(null);

  // Live Data Queries
  const {
    data: attempts = [],
    isLoading: isLoadingAttempts,
    isFetching: isFetchingAttempts,
    refetch: refetchAttempts,
  } = useGetJLPTAttemptsQuery();

  const {
    data: eligibilityRecords = [],
    isLoading: isLoadingEligibility,
    isFetching: isFetchingEligibility,
    refetch: refetchEligibility,
  } = useGetJLPTEligibilityQuery();

  const {
    data: interns = [],
    isLoading: isLoadingInterns,
    refetch: refetchInterns,
  } = useGetJapaneseInternsQuery();

  const {
    data: batches = [],
    refetch: refetchBatches,
  } = useGetJapaneseBatchesQuery();

  const isFetchingAll = isFetchingAttempts || isFetchingEligibility;

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchAttempts(),
        refetchEligibility(),
        refetchInterns(),
        refetchBatches(),
      ]);
      toast.success("JLPT data synchronized.");
    } catch {
      toast.error("Failed to refresh JLPT records.");
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setMainBatchFilter("ALL");
    setSubBatchFilter("ALL");
    setLevelFilter("ALL");
    setResultFilter("ALL");
    setVerificationFilter("ALL");
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    mainBatchFilter !== "ALL" ||
    subBatchFilter !== "ALL" ||
    levelFilter !== "ALL" ||
    resultFilter !== "ALL" ||
    verificationFilter !== "ALL";

  // Sub-batch options depending on selected main batch
  const availableSubBatches = useMemo(() => {
    if (mainBatchFilter === "ALL") {
      return ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2"];
    }
    const cleanPrefix = mainBatchFilter.replace("BATCH-", "").replace("Batch ", "").trim();
    return [`${cleanPrefix}1`, `${cleanPrefix}2`];
  }, [mainBatchFilter]);

  // Intern map by ID for fast lookup
  const internsMap = useMemo(() => {
    const map = new Map<string, JapaneseAssignedIntern>();
    interns.forEach((intern) => {
      map.set(intern.id, intern);
    });
    return map;
  }, [interns]);

  // Overview Metrics calculation from live records
  const metrics = useMemo(() => {
    const totalInternsCount = interns.length || 16;

    // Passed N5 count
    const passedN5 = new Set<string>();
    // Passed N4 count
    const passedN4 = new Set<string>();
    // Targeting or passed N3
    const targetingOrPassedN3 = new Set<string>();

    attempts.forEach((att) => {
      if (att.passed) {
        if (att.level === "N5") passedN5.add(att.intern);
        if (att.level === "N4") {
          passedN4.add(att.intern);
          passedN5.add(att.intern); // Implies N5 baseline
        }
        if (att.level === "N3") {
          targetingOrPassedN3.add(att.intern);
          passedN4.add(att.intern);
          passedN5.add(att.intern);
        }
      }
    });

    eligibilityRecords.forEach((el) => {
      if (el.required_level === "N3") {
        targetingOrPassedN3.add(el.intern);
      }
      if (el.current_level === "N5") passedN5.add(el.intern);
      if (el.current_level === "N4") {
        passedN4.add(el.intern);
        passedN5.add(el.intern);
      }
      if (el.current_level === "N3") {
        targetingOrPassedN3.add(el.intern);
        passedN4.add(el.intern);
        passedN5.add(el.intern);
      }
    });

    // Scheduled or upcoming attempts (passed === null)
    const upcomingCount = attempts.filter((a) => a.passed === null).length;
    // Unverified attempts
    const unverifiedCount = attempts.filter((a) => !a.verified).length;

    return {
      totalTracked: totalInternsCount,
      n5Passed: passedN5.size,
      n4PassedOrTarget: passedN4.size,
      n3Progress: targetingOrPassedN3.size,
      upcomingAssessments: upcomingCount,
      unverifiedCount,
    };
  }, [interns, attempts, eligibilityRecords]);

  // Level Distribution breakdown
  const levelDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      N5: 0,
      N4: 0,
      N3: 0,
      N2: 0,
      N1: 0,
    };

    attempts.forEach((att) => {
      if (att.level && counts[att.level] !== undefined) {
        counts[att.level] += 1;
      }
    });

    const totalAttempts = attempts.length || 1;
    return [
      { level: "N5", count: counts.N5, pct: Math.round((counts.N5 / totalAttempts) * 100), label: "Foundation" },
      { level: "N4", count: counts.N4, pct: Math.round((counts.N4 / totalAttempts) * 100), label: "Intermediate" },
      { level: "N3", count: counts.N3, pct: Math.round((counts.N3 / totalAttempts) * 100), label: "Advanced Business" },
      { level: "N2", count: counts.N2, pct: Math.round((counts.N2 / totalAttempts) * 100), label: "Pre-Fluent" },
      { level: "N1", count: counts.N1, pct: Math.round((counts.N1 / totalAttempts) * 100), label: "Native Fluency" },
    ];
  }, [attempts]);

  // Filtered Attempts List
  const filteredAttempts = useMemo(() => {
    return attempts.filter((att) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const internMatch =
          att.intern_name?.toLowerCase().includes(q) ||
          att.intern_code?.toLowerCase().includes(q) ||
          att.intern_email?.toLowerCase().includes(q) ||
          att.notes?.toLowerCase().includes(q);
        if (!internMatch) return false;
      }

      // 2. Main Batch Filter
      if (mainBatchFilter !== "ALL") {
        const cleanMain = mainBatchFilter.replace("BATCH-", "").replace("Batch ", "").toUpperCase();
        const code = (att.batch_code || att.batch_name || "").toUpperCase();
        if (!code.includes(cleanMain)) return false;
      }

      // 3. Sub-Batch Filter
      if (subBatchFilter !== "ALL") {
        const targetSub = subBatchFilter.toUpperCase();
        const code = (att.sub_batch_code || att.sub_batch_name || "").toUpperCase();
        if (!code.includes(targetSub)) return false;
      }

      // 4. Level Filter
      if (levelFilter !== "ALL" && att.level !== levelFilter) {
        return false;
      }

      // 5. Result Filter
      if (resultFilter === "PASSED" && att.passed !== true) return false;
      if (resultFilter === "FAILED" && att.passed !== false) return false;
      if (resultFilter === "SCHEDULED" && att.passed !== null) return false;

      // 6. Verification Filter
      if (verificationFilter === "VERIFIED" && !att.verified) return false;
      if (verificationFilter === "PENDING" && att.verified) return false;

      return true;
    });
  }, [
    attempts,
    searchQuery,
    mainBatchFilter,
    subBatchFilter,
    levelFilter,
    resultFilter,
    verificationFilter,
  ]);

  // Filtered Eligibility Records
  const filteredEligibility = useMemo(() => {
    return eligibilityRecords.filter((el) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const internMatch =
          el.intern_name?.toLowerCase().includes(q) ||
          el.intern_code?.toLowerCase().includes(q) ||
          el.intern_email?.toLowerCase().includes(q) ||
          el.notes?.toLowerCase().includes(q);
        if (!internMatch) return false;
      }

      // 2. Main Batch Filter
      if (mainBatchFilter !== "ALL") {
        const cleanMain = mainBatchFilter.replace("BATCH-", "").replace("Batch ", "").toUpperCase();
        const code = (el.batch_code || el.batch_name || "").toUpperCase();
        if (!code.includes(cleanMain)) return false;
      }

      // 3. Sub-Batch Filter
      if (subBatchFilter !== "ALL") {
        const targetSub = subBatchFilter.toUpperCase();
        const code = (el.sub_batch_code || el.sub_batch_name || "").toUpperCase();
        if (!code.includes(targetSub)) return false;
      }

      // 4. Level Filter
      if (levelFilter !== "ALL" && el.required_level !== levelFilter) {
        return false;
      }

      // 5. Status Filter
      if (resultFilter !== "ALL") {
        if (resultFilter === "PASSED" && el.eligibility_status !== "MEETS_REQUIREMENT") return false;
        if (resultFilter === "SCHEDULED" && el.eligibility_status !== "IN_PROGRESS" && el.eligibility_status !== "NOT_STARTED") return false;
      }

      // 6. Verification Filter
      if (verificationFilter === "VERIFIED" && el.eligibility_status !== "MEETS_REQUIREMENT") return false;
      if (verificationFilter === "PENDING" && el.eligibility_status !== "PENDING_VERIFICATION") return false;

      return true;
    });
  }, [
    eligibilityRecords,
    searchQuery,
    mainBatchFilter,
    subBatchFilter,
    levelFilter,
    resultFilter,
    verificationFilter,
  ]);

  // Verification modal handler
  const handleVerify = (attempt: JLPTAttempt) => {
    setSelectedAttempt(attempt);
    setIsVerifyModalOpen(true);
  };

  // Intern Detail Modal Handler
  const handleOpenInternDetail = (internId: string) => {
    const found = internsMap.get(internId) || null;
    setDetailIntern(found);
    setDetailInternId(internId);
  };

  // Dropdown options for Record Attempt modal
  const internsDropdown = useMemo(() => {
    return interns.map((i) => ({
      id: i.id,
      fullName: i.fullName,
      employeeCode: i.employeeCode,
    }));
  }, [interns]);

  // Detail Modal Attempts for the selected intern
  const internDetailAttempts = useMemo(() => {
    if (!detailInternId) return [];
    return attempts.filter((a) => a.intern === detailInternId);
  }, [attempts, detailInternId]);

  const internDetailEligibility = useMemo(() => {
    if (!detailInternId) return null;
    return eligibilityRecords.find((el) => el.intern === detailInternId) || null;
  }, [eligibilityRecords, detailInternId]);

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Header (Compact, no large banner) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            JLPT Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor intern certification progress, track official exam attempts, and verify JLPT qualifications.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isFetchingAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200/80 hover:border-purple-300 text-xs font-semibold text-slate-700 hover:text-purple-700 shadow-2xs transition-all cursor-pointer"
            title="Refresh JLPT records"
          >
            <RefreshCw
              size={13}
              className={isFetchingAll ? "animate-spin text-purple-600" : "text-slate-500"}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs shadow-purple-200 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Record New Exam Attempt</span>
          </button>
        </div>
      </div>

      {/* 2. Five Compact Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Interns Tracked */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              Total Tracked
            </span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Users size={14} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {metrics.totalTracked}
          </div>
          <p className="text-[10.5px] text-slate-400 mt-0.5">Across 4 cohorts</p>
        </div>

        {/* N5 Progress */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              N5 Milestone
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Award size={14} />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-800 mt-1">
            {metrics.n5Passed}
          </div>
          <p className="text-[10.5px] text-slate-400 mt-0.5">Passed / baseline</p>
        </div>

        {/* N4 Progress */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              N4 Target Track
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="text-xl font-black text-blue-800 mt-1">
            {metrics.n4PassedOrTarget}
          </div>
          <p className="text-[10.5px] text-slate-400 mt-0.5">Intermediate level</p>
        </div>

        {/* N3 Progress */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              N3 Advanced
            </span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="text-xl font-black text-indigo-800 mt-1">
            {metrics.n3Progress}
          </div>
          <p className="text-[10.5px] text-slate-400 mt-0.5">Accelerated track</p>
        </div>

        {/* Upcoming Assessments & Pending Checks */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              Upcoming & Checks
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-slate-900">
              {metrics.upcomingAssessments}
            </span>
            {metrics.unverifiedCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                {metrics.unverifiedCount} to verify
              </span>
            )}
          </div>
          <p className="text-[10.5px] text-slate-400 mt-0.5">Scheduled sessions</p>
        </div>
      </div>

      {/* 3. JLPT Level Distribution Visual Progress Card */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Award size={13} className="text-purple-600" />
              JLPT Level Distribution & Cohort Readiness
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Breakdown of official exam attempts across proficiency levels (N5 to N1).
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10.5px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              Total Logged Attempts: <strong>{attempts.length}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3.5">
          {levelDistribution.map((item) => (
            <div
              key={item.level}
              className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-purple-900 bg-purple-100/80 px-2 py-0.5 rounded-lg">
                  {item.level}
                </span>
                <span className="text-sm font-black text-slate-900">
                  {item.count}
                </span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{item.label}</span>
                  <span className="font-semibold text-slate-600">{item.pct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search intern name, code, or email..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Main Batch Filter */}
          <div>
            <select
              value={mainBatchFilter}
              onChange={(e) => {
                setMainBatchFilter(e.target.value);
                setSubBatchFilter("ALL");
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-600 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">All Batches</option>
              <option value="BATCH-A">Batch A</option>
              <option value="BATCH-B">Batch B</option>
              <option value="BATCH-C">Batch C</option>
              <option value="BATCH-D">Batch D</option>
            </select>
          </div>

          {/* Sub-Batch Filter */}
          <div>
            <select
              value={subBatchFilter}
              onChange={(e) => setSubBatchFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-600 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">All Sub-Batches</option>
              {availableSubBatches.map((sb) => (
                <option key={sb} value={sb}>
                  Sub-Batch {sb}
                </option>
              ))}
            </select>
          </div>

          {/* JLPT Level Filter */}
          <div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-600 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">All Levels</option>
              <option value="N5">JLPT N5</option>
              <option value="N4">JLPT N4</option>
              <option value="N3">JLPT N3</option>
              <option value="N2">JLPT N2</option>
              <option value="N1">JLPT N1</option>
            </select>
          </div>

          {/* Assessment Status / Verification Filter */}
          <div>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-600 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">All Verifications</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="PENDING">Pending Verification</option>
            </select>
          </div>
        </div>

        {/* Filter Stats & Reset */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
          <span className="font-medium text-[11.5px]">
            {activeTab === "ATTEMPTS" ? (
              <>
                Showing <strong className="text-slate-800">{filteredAttempts.length}</strong> of{" "}
                <strong className="text-purple-700">{attempts.length}</strong> official exam attempts
              </>
            ) : (
              <>
                Showing <strong className="text-slate-800">{filteredEligibility.length}</strong> of{" "}
                <strong className="text-purple-700">{eligibilityRecords.length}</strong> cycle records
              </>
            )}
          </span>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
            >
              <RotateCcw size={11} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* 5. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("ATTEMPTS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "ATTEMPTS"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Award size={14} />
          Official Exam Attempts ({filteredAttempts.length})
          {metrics.unverifiedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black">
              {metrics.unverifiedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("ELIGIBILITY")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "ELIGIBILITY"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <ShieldCheck size={14} />
          Cycle Eligibility Matrix ({filteredEligibility.length})
        </button>
      </div>

      {/* 6. TAB 1: Official Exam Attempts */}
      {activeTab === "ATTEMPTS" && (
        <div className="space-y-4">
          {isLoadingAttempts ? (
            <div className="py-20 text-center animate-pulse space-y-3">
              <div className="w-8 h-8 rounded-full border-3 border-purple-600 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading JLPT attempts...</p>
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <Award size={36} className="mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">No Exam Attempts Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No exam attempts match your current filter and search criteria.
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  Clear All Filters
                </button>
              ) : (
                <button
                  onClick={() => setIsRecordModalOpen(true)}
                  className="px-4 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors"
                >
                  Record New Exam Attempt
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Intern</th>
                      <th className="py-3.5 px-4">Batch</th>
                      <th className="py-3.5 px-4">Level</th>
                      <th className="py-3.5 px-4">Exam Date</th>
                      <th className="py-3.5 px-4">Result</th>
                      <th className="py-3.5 px-4">Score</th>
                      <th className="py-3.5 px-4">Verification</th>
                      <th className="py-3.5 px-4">Notes</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttempts.map((att) => {
                      const isPending = !att.verified;
                      const batchDisplay = att.batch_name
                        ? `${att.batch_name.replace("Batch ", "")}${att.sub_batch_code ? ` • ${att.sub_batch_code}` : ""}`
                        : "—";

                      return (
                        <tr
                          key={att.id}
                          className="hover:bg-purple-50/30 transition-colors group cursor-pointer"
                          onClick={() => handleOpenInternDetail(att.intern)}
                        >
                          {/* Intern Info */}
                          <td className="py-3.5 px-5 font-semibold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {att.intern_name?.[0]?.toUpperCase() || "I"}
                              </div>
                              <div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/employees/${att.intern}/profile`);
                                  }}
                                  className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors text-left flex items-center gap-1 cursor-pointer"
                                  title="View employee profile"
                                >
                                  <span>{att.intern_name || "Intern"}</span>
                                  <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 text-purple-600" />
                                </button>
                                <div className="text-[10.5px] text-slate-400 font-normal">
                                  {att.intern_code}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Batch & Sub-Batch */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              {batchDisplay}
                            </span>
                          </td>

                          {/* JLPT Level */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md text-xs">
                              JLPT {att.level}
                            </span>
                          </td>

                          {/* Exam Date */}
                          <td className="py-3.5 px-4 text-slate-600 font-medium">
                            {att.exam_date}
                          </td>

                          {/* Result */}
                          <td className="py-3.5 px-4">
                            {att.passed === true ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 size={13} /> Passed
                              </span>
                            ) : att.passed === false ? (
                              <span className="text-rose-600 font-semibold flex items-center gap-1">
                                <XCircle size={13} /> Failed
                              </span>
                            ) : (
                              <span className="text-slate-500 font-medium flex items-center gap-1">
                                <Clock size={13} className="text-amber-500" /> Scheduled
                              </span>
                            )}
                          </td>

                          {/* Score */}
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {att.score !== null && att.score !== undefined ? (
                              <span className="text-slate-800">
                                {att.score} <span className="text-[10px] text-slate-400 font-normal">/ 180</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>

                          {/* Verification Status */}
                          <td className="py-3.5 px-4">
                            {att.verified ? (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Verified
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-max">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Pending Check
                              </span>
                            )}
                          </td>

                          {/* Notes */}
                          <td className="py-3.5 px-4 max-w-xs text-slate-500 truncate" title={att.notes || ""}>
                            {att.notes || "—"}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending ? (
                                <button
                                  onClick={() => handleVerify(att)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-xs cursor-pointer"
                                >
                                  Verify Attempt
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenInternDetail(att.intern)}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold transition-all cursor-pointer"
                                >
                                  Details
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. TAB 2: Cycle Eligibility Matrix */}
      {activeTab === "ELIGIBILITY" && (
        <div className="space-y-4">
          {isLoadingEligibility ? (
            <div className="py-20 text-center animate-pulse space-y-3">
              <div className="w-8 h-8 rounded-full border-3 border-purple-600 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading cycle eligibility records...</p>
            </div>
          ) : filteredEligibility.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <ShieldCheck size={36} className="mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">No Eligibility Records Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No eligibility requirements match your active filter selection.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Intern</th>
                      <th className="py-3.5 px-4">Batch</th>
                      <th className="py-3.5 px-4">Cycle</th>
                      <th className="py-3.5 px-4">Mandatory Target</th>
                      <th className="py-3.5 px-4">Current Verified Level</th>
                      <th className="py-3.5 px-4">Eligibility Status</th>
                      <th className="py-3.5 px-4">Audit Notes</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEligibility.map((el) => {
                      const meetsReq = el.eligibility_status === "MEETS_REQUIREMENT";
                      const isPending = el.eligibility_status === "PENDING_VERIFICATION";
                      const batchDisplay = el.batch_name
                        ? `${el.batch_name.replace("Batch ", "")}${el.sub_batch_code ? ` • ${el.sub_batch_code}` : ""}`
                        : "—";

                      return (
                        <tr
                          key={el.id}
                          className="hover:bg-purple-50/30 transition-colors group cursor-pointer"
                          onClick={() => handleOpenInternDetail(el.intern)}
                        >
                          {/* Intern */}
                          <td className="py-3.5 px-5 font-semibold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {el.intern_name?.[0]?.toUpperCase() || "I"}
                              </div>
                              <div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/employees/${el.intern}/profile`);
                                  }}
                                  className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors text-left flex items-center gap-1 cursor-pointer"
                                  title="View employee profile"
                                >
                                  <span>{el.intern_name || "Intern"}</span>
                                  <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 text-purple-600" />
                                </button>
                                <div className="text-[10.5px] text-slate-400 font-normal">
                                  {el.intern_code}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Batch */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              {batchDisplay}
                            </span>
                          </td>

                          {/* Performance Cycle */}
                          <td className="py-3.5 px-4 text-slate-600 font-medium">
                            {el.cycle_name || "Active Cycle"}
                          </td>

                          {/* Target Level */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                              Target {el.required_level}
                            </span>
                          </td>

                          {/* Current Verified Level */}
                          <td className="py-3.5 px-4">
                            {el.current_level ? (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                                JLPT {el.current_level}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">None yet</span>
                            )}
                          </td>

                          {/* Eligibility Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                meetsReq
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isPending
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {el.eligibility_status_display || el.eligibility_status}
                            </span>
                          </td>

                          {/* Audit Notes */}
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={el.notes || ""}>
                            {el.notes || "Standard trajectory"}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenInternDetail(el.intern)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold transition-all cursor-pointer"
                            >
                              View History
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. Intern Detailed JLPT History Modal */}
      {detailInternId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center">
                  <Award size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {detailIntern?.fullName || internDetailAttempts[0]?.intern_name || "Intern"} – JLPT Journey
                  </h2>
                  <p className="text-xs text-slate-500">
                    ID: {detailIntern?.employeeCode || internDetailAttempts[0]?.intern_code} •{" "}
                    Cohort: {detailIntern?.batchName || internDetailAttempts[0]?.batch_name || "Japanese Training Cohort"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setDetailInternId(null);
                  setDetailIntern(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Status Overview Banner */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl">
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase">Target Level</span>
                  <div className="text-sm font-black text-purple-900 mt-0.5">
                    {internDetailEligibility?.required_level || "N4"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase">Current Status</span>
                  <div className="text-xs font-bold text-purple-900 mt-0.5">
                    {internDetailEligibility?.eligibility_status_display || "Active"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase">Total Attempts</span>
                  <div className="text-sm font-black text-purple-900 mt-0.5">
                    {internDetailAttempts.length}
                  </div>
                </div>
              </div>

              {/* Attempts Timeline / History Table */}
              <div>
                <h3 className="font-bold text-slate-900 text-xs mb-2">Examination Attempts History</h3>
                {internDetailAttempts.length === 0 ? (
                  <p className="text-slate-400 italic py-4 text-center">No official attempts recorded yet.</p>
                ) : (
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10.5px] text-slate-400 uppercase font-bold border-b border-slate-100">
                        <tr>
                          <th className="py-2.5 px-3">Level</th>
                          <th className="py-2.5 px-3">Exam Date</th>
                          <th className="py-2.5 px-3">Score</th>
                          <th className="py-2.5 px-3">Result</th>
                          <th className="py-2.5 px-3">Verification</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {internDetailAttempts.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-bold text-purple-700">JLPT {att.level}</td>
                            <td className="py-2.5 px-3 text-slate-600">{att.exam_date}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {att.score !== null ? `${att.score}/180` : "—"}
                            </td>
                            <td className="py-2.5 px-3">
                              {att.passed === true ? (
                                <span className="text-emerald-700 font-bold">Passed</span>
                              ) : att.passed === false ? (
                                <span className="text-rose-600 font-semibold">Failed</span>
                              ) : (
                                <span className="text-amber-600 font-medium">Scheduled</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {att.verified ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                  Verified
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {!att.verified && (
                                <button
                                  onClick={() => handleVerify(att)}
                                  className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10.5px] cursor-pointer"
                                >
                                  Verify
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Quick Link to Full Employee Profile */}
              <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                <button
                  onClick={() => {
                    const id = detailInternId;
                    setDetailInternId(null);
                    setDetailIntern(null);
                    if (id) navigate(`/employees/${id}/profile`);
                  }}
                  className="flex items-center gap-1.5 font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>Open Full Intern Profile</span>
                </button>

                <button
                  onClick={() => {
                    setDetailInternId(null);
                    setDetailIntern(null);
                  }}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Verify Modal */}
      {isVerifyModalOpen && selectedAttempt && (
        <VerifyJLPTModal
          isOpen={isVerifyModalOpen}
          onClose={() => {
            setIsVerifyModalOpen(false);
            setSelectedAttempt(null);
          }}
          attempt={selectedAttempt}
        />
      )}

      {/* 10. Record Exam Attempt Modal */}
      {isRecordModalOpen && (
        <RecordJLPTAttemptModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          interns={internsDropdown}
        />
      )}
    </div>
  );
};

export default JLPTTrackingPage;
