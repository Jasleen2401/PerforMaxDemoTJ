// src/pages/instructor/JapaneseBatchesPage.tsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  Search,
  Users,
  ArrowRight,
  ArrowLeft,
  X,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  Award,
  ChevronRight,
  User,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { toast } from "react-toastify";
import { useGetJapaneseBatchesQuery } from "../../features/japanese/japaneseApi";
import type { JapaneseBatch, JapaneseSubBatch, JapaneseAssignedIntern } from "../../features/japanese/types";

export const JapaneseBatchesPage: React.FC = () => {
  const navigate = useNavigate();

  // Filters state
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [mainBatchFilter, setMainBatchFilter] = useState<string>("ALL");
  const [subBatchFilter, setSubBatchFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const {
    data: batches = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetJapaneseBatchesQuery();

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Batches data updated.");
    } catch {
      toast.error("Failed to refresh batches.");
    }
  };

  const handleClearFilters = () => {
    setMainBatchFilter("ALL");
    setSubBatchFilter("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
  };

  const hasActiveFilters =
    mainBatchFilter !== "ALL" ||
    subBatchFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    searchQuery.trim().length > 0;

  // Filtered batches calculation
  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      // 1. Main Batch Filter
      if (mainBatchFilter !== "ALL") {
        const matchesCode = batch.code.toLowerCase() === mainBatchFilter.toLowerCase();
        const matchesName = batch.name.toLowerCase().includes(mainBatchFilter.toLowerCase());
        if (!matchesCode && !matchesName) return false;
      }

      // 2. Sub-Batch Filter
      if (subBatchFilter !== "ALL") {
        const hasSubBatch = batch.sub_batches?.some(
          (sb) =>
            sb.code.toLowerCase() === subBatchFilter.toLowerCase() ||
            sb.name.toLowerCase().includes(subBatchFilter.toLowerCase())
        );
        if (!hasSubBatch) return false;
      }

      // 3. Status Filter
      if (statusFilter !== "ALL") {
        if (batch.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }

      // 4. Search Filter (by intern name, batch name, batch code)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesBatchName = batch.name.toLowerCase().includes(q);
        const matchesBatchCode = batch.code.toLowerCase().includes(q);
        const matchesSubBatch = batch.sub_batches?.some(
          (sb) => sb.name.toLowerCase().includes(q) || sb.code.toLowerCase().includes(q)
        );
        const matchesIntern = batch.assigned_interns?.some(
          (intern) =>
            intern.fullName.toLowerCase().includes(q) ||
            intern.employeeCode.toLowerCase().includes(q)
        );

        if (!matchesBatchName && !matchesBatchCode && !matchesSubBatch && !matchesIntern) {
          return false;
        }
      }

      return true;
    });
  }, [batches, mainBatchFilter, subBatchFilter, statusFilter, searchQuery]);

  // Total count of matching interns
  const totalMatchingInterns = useMemo(() => {
    return filteredBatches.reduce((acc, b) => acc + (b.interns_count || 0), 0);
  }, [filteredBatches]);

  // Selected batch for detail view
  const currentSelectedBatch = useMemo(() => {
    if (!selectedBatchId) return null;
    return batches.find((b) => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  // Handle navigating to an intern's profile
  const handleViewProfile = (internId: string) => {
    navigate(`/employees/${internId}/profile`);
  };

  return (
    <div className="space-y-4 pb-10">
      {/* 1. Compact Header (No large gradient banner) */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Batches
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View your assigned batches, explore sub-batches, and manage intern progress.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 hover:border-purple-300 text-xs font-semibold text-slate-700 hover:text-purple-700 shadow-2xs transition-all cursor-pointer"
          title="Refresh Batches"
        >
          <RefreshCw
            size={13}
            className={isFetching ? "animate-spin text-purple-600" : "text-slate-500"}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* 2. Compact Filter Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by intern name, batch name, or code..."
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

          {/* Main Batch Filter Dropdown */}
          <div>
            <select
              value={mainBatchFilter}
              onChange={(e) => {
                setMainBatchFilter(e.target.value);
                // Reset sub-batch if it doesn't match
                if (e.target.value !== "ALL" && subBatchFilter !== "ALL") {
                  const prefix = e.target.value.replace("BATCH-", "").replace("Batch ", "");
                  if (!subBatchFilter.startsWith(prefix)) {
                    setSubBatchFilter("ALL");
                  }
                }
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

          {/* Sub-Batch Filter Dropdown */}
          <div>
            <select
              value={subBatchFilter}
              onChange={(e) => setSubBatchFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-600 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">All Sub-Batches</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
              <option value="D1">D1</option>
              <option value="D2">D2</option>
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-purple-600 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Upcoming">Upcoming</option>
            </select>
          </div>
        </div>

        {/* Filter Stats & Reset */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
          <span className="font-medium text-[11.5px]">
            Showing <strong className="text-slate-800">{filteredBatches.length}</strong> batches (
            <strong className="text-purple-700">{totalMatchingInterns}</strong> interns)
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

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 text-center animate-pulse space-y-3">
          <div className="w-8 h-8 rounded-full border-3 border-purple-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading authorized training batches...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl max-w-lg mx-auto">
          <AlertTriangle className="text-rose-600 mx-auto mb-2" size={24} />
          <p className="text-sm font-bold text-rose-900">Failed to load batches</p>
          <p className="text-xs text-rose-700 mt-1">Please check your network or credentials.</p>
          <button
            onClick={handleRefresh}
            className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <Layers size={36} className="mx-auto text-slate-300" />
          <h3 className="text-sm font-bold text-slate-800">No Matching Batches Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No training batches match your current filter and search criteria.
          </p>
          <button
            onClick={handleClearFilters}
            className="px-4 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : currentSelectedBatch ? (
        /* ========================================================================= */
        /* 5. Detailed Batch View (When a main batch is selected)                    */
        /* ========================================================================= */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Back Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedBatchId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-purple-700 hover:border-purple-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <ArrowLeft size={13} /> Back to All Batches
            </button>

            <span className="text-xs text-slate-400 font-medium">
              Cohort: {currentSelectedBatch.cohort}
            </span>
          </div>

          {/* Batch Overview Card */}
          <div className="bg-white rounded-3xl border border-purple-100/90 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase">
                    {currentSelectedBatch.code}
                  </span>
                  <span
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                      currentSelectedBatch.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : currentSelectedBatch.status === "Completed"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {currentSelectedBatch.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {currentSelectedBatch.name} – Overview
                </h2>
                {currentSelectedBatch.description && (
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    {currentSelectedBatch.description}
                  </p>
                )}
              </div>

              {/* Progress Metric Badge */}
              <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100/80 shrink-0 text-right min-w-[140px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                  Overall Learning Progress
                </div>
                <div className="text-xl font-black text-purple-900 mt-0.5">
                  {currentSelectedBatch.assigned_interns && currentSelectedBatch.assigned_interns.length > 0
                    ? Math.round(
                        currentSelectedBatch.assigned_interns.reduce(
                          (acc, i) => acc + (i.progress?.percentage || 0),
                          0
                        ) / currentSelectedBatch.assigned_interns.length
                      )
                    : 0}%
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Interns
                </span>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {currentSelectedBatch.interns_count || 0}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Sub-Batches
                </span>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {currentSelectedBatch.sub_batches?.length || 2} Sub-Batches
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Curriculum Track
                </span>
                <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                  Business Japanese & QA
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Cohort Year
                </span>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  {currentSelectedBatch.cohort}
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Batch Sections (e.g. Sub-Batch A1 and Sub-Batch A2) */}
          <div className="space-y-4">
            {(currentSelectedBatch.sub_batches || []).map((subBatch) => {
              // If a sub-batch filter is active, only show the matching sub-batch
              if (
                subBatchFilter !== "ALL" &&
                subBatch.code.toLowerCase() !== subBatchFilter.toLowerCase()
              ) {
                return null;
              }

              const interns = subBatch.assigned_interns || [];
              const subAvgProgress =
                interns.length > 0
                  ? Math.round(
                      interns.reduce((acc, i) => acc + (i.progress?.percentage || 0), 0) /
                        interns.length
                    )
                  : 0;

              return (
                <div
                  key={subBatch.id || subBatch.code}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden"
                >
                  {/* Sub-Batch Section Header */}
                  <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center shrink-0">
                        {subBatch.code}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {subBatch.name}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {interns.length} assigned {interns.length === 1 ? "intern" : "interns"} • Average Progress: {subAvgProgress}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                        Sub-Batch {subBatch.code}
                      </span>
                    </div>
                  </div>

                  {/* Interns Table / List */}
                  <div className="p-4">
                    {interns.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No interns currently assigned to this sub-batch.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 text-[10.5px] uppercase tracking-wider">
                              <th className="pb-2.5 font-bold">Intern Name</th>
                              <th className="pb-2.5 font-bold">Intern ID</th>
                              <th className="pb-2.5 font-bold">Department</th>
                              <th className="pb-2.5 font-bold">Learning Progress</th>
                              <th className="pb-2.5 font-bold">Evaluation Status</th>
                              <th className="pb-2.5 font-bold text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {interns.map((intern) => (
                              <tr
                                key={intern.id}
                                className="hover:bg-slate-50/70 transition-colors group"
                              >
                                {/* Intern Name */}
                                <td className="py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                                      {intern.fullName?.[0]?.toUpperCase() || "I"}
                                    </div>
                                    <div>
                                      <button
                                        onClick={() => handleViewProfile(intern.id)}
                                        className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors cursor-pointer text-left"
                                        title="View employee profile"
                                      >
                                        {intern.fullName}
                                      </button>
                                      <div className="text-[10px] text-slate-400">
                                        Target: {intern.plan?.targetLevel || "N4"}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Intern ID */}
                                <td className="py-3 font-semibold text-slate-700">
                                  {intern.employeeCode}
                                </td>

                                {/* Department */}
                                <td className="py-3 text-slate-500">
                                  {intern.department || "Engineering"}
                                </td>

                                {/* Individual Learning Progress */}
                                <td className="py-3">
                                  <div className="space-y-1 w-32">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-bold text-slate-800">
                                        {intern.progress?.percentage ?? 0}%
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {intern.progress?.completed ?? 0}/{intern.progress?.total ?? 0} topics
                                      </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                                        style={{ width: `${intern.progress?.percentage ?? 0}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                {/* Evaluation Status */}
                                <td className="py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                      intern.evaluation?.status === "RETURNED"
                                        ? "bg-rose-100 text-rose-700"
                                        : intern.evaluation?.status === "DRAFT"
                                        ? "bg-amber-100 text-amber-700"
                                        : intern.evaluation?.status === "ACCEPTED"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : intern.evaluation?.status === "SUBMITTED"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {intern.evaluation?.status || "PENDING"}
                                  </span>
                                </td>

                                {/* Action: View Profile */}
                                <td className="py-3 text-right">
                                  <button
                                    onClick={() => handleViewProfile(intern.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
                                  >
                                    <span>Profile</span>
                                    <ArrowRight size={11} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 4. Main Batch Cards Grid (Batch A, Batch B, Batch C, Batch D)             */
        /* ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredBatches.map((batch) => {
            const internsCount = batch.interns_count || batch.assigned_interns?.length || 0;
            const subBatchesCount = batch.sub_batches?.length || 2;
            const interns = batch.assigned_interns || [];
            const avgProgress =
              interns.length > 0
                ? Math.round(
                    interns.reduce((acc, i) => acc + (i.progress?.percentage || 0), 0) /
                      interns.length
                  )
                : 0;

            const isBatchActive = batch.status === "Active";
            const isBatchCompleted = batch.status === "Completed";

            return (
              <div
                key={batch.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all p-5 flex flex-col justify-between group cursor-pointer"
                onClick={() => setSelectedBatchId(batch.id)}
              >
                <div className="space-y-3">
                  {/* Card Header: Code + Status Badge */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold tracking-wide uppercase mb-1">
                        {batch.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                        {batch.name}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isBatchActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isBatchCompleted
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {batch.status}
                    </span>
                  </div>

                  {/* Sub-batches indicator */}
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">
                      {subBatchesCount} Sub-Batches:
                    </span>
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                      {batch.sub_batches?.map((sb) => sb.code).join(", ") || "A1, A2"}
                    </span>
                  </div>

                  {/* Interns Count */}
                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <Users size={12} className="text-slate-400" />
                      Total Interns
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {internsCount}
                    </span>
                  </div>

                  {/* Small Learning Progress Indicator */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Avg Progress</span>
                      <span className="font-bold text-slate-800">{avgProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${avgProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-purple-600 group-hover:text-purple-700">
                    View Interns
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ChevronRight size={13} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JapaneseBatchesPage;
