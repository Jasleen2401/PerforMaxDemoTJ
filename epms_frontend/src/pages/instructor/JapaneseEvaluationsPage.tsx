// src/pages/instructor/JapaneseEvaluationsPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  ClipboardCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Send,
  Plus,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Clock,
  ExternalLink,
  Award,
  Layers,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  useGetJapaneseEvaluationsQuery,
  useGetJapaneseInternsQuery,
  useGetJapaneseBatchesQuery,
} from "../../features/japanese/japaneseApi";
import { ConductJapaneseEvaluationModal } from "../../components/instructor/ConductJapaneseEvaluationModal";
import type { JapaneseEvaluation, EvaluationStatus } from "../../features/japanese/types";

export const JapaneseEvaluationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status") || "ALL";
  const urlEvalId = searchParams.get("evaluationId");

  const [activeStatus, setActiveStatus] = useState<string>(urlStatus);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [selectedSubBatch, setSelectedSubBatch] = useState<string>("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: evaluations = [],
    isLoading,
    isFetching,
    refetch,
  } = useGetJapaneseEvaluationsQuery();
  const { data: batches = [] } = useGetJapaneseBatchesQuery();

  const [selectedEval, setSelectedEval] = useState<JapaneseEvaluation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Auto-open modal if evaluationId is present in URL
  useEffect(() => {
    if (urlEvalId && evaluations.length > 0) {
      const match = evaluations.find((e) => e.id === urlEvalId);
      if (match) {
        setSelectedEval(match);
        setIsModalOpen(true);
      }
    }
  }, [urlEvalId, evaluations]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Evaluations updated.");
    } catch {
      toast.error("Failed to refresh evaluations.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setActiveStatus(status);
    setSearchParams((prev) => {
      if (status === "ALL") {
        prev.delete("status");
      } else {
        prev.set("status", status);
      }
      return prev;
    });
  };

  const handleOpenEvaluation = (evalObj: JapaneseEvaluation) => {
    setSelectedEval(evalObj);
    setIsModalOpen(true);
  };

  // Status-based counts
  const counts = useMemo(() => {
    const returned = evaluations.filter((e) => e.status === "RETURNED").length;
    const drafts = evaluations.filter((e) => e.status === "DRAFT" || e.status === "PENDING").length;
    const submitted = evaluations.filter(
      (e) => e.status === "SUBMITTED" || e.status === "RESUBMITTED"
    ).length;
    const accepted = evaluations.filter((e) => e.status === "ACCEPTED").length;
    return { returned, drafts, submitted, accepted, total: evaluations.length };
  }, [evaluations]);

  // Main batches and sub-batches
  const mainBatches = useMemo(() => {
    return batches.filter((b) => !b.parent_batch);
  }, [batches]);

  const subBatches = useMemo(() => {
    if (selectedBatch === "ALL") {
      return batches.filter((b) => !!b.parent_batch);
    }
    const parent = batches.find((b) => b.code === selectedBatch || b.id === selectedBatch);
    if (!parent) return [];
    return batches.filter((b) => b.parent_batch === parent.id);
  }, [batches, selectedBatch]);

  // Filtered evaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((ev) => {
      // Status filter
      if (activeStatus === "RETURNED" && ev.status !== "RETURNED") return false;
      if (activeStatus === "DRAFT" && ev.status !== "DRAFT" && ev.status !== "PENDING") return false;
      if (
        activeStatus === "SUBMITTED" &&
        ev.status !== "SUBMITTED" &&
        ev.status !== "RESUBMITTED"
      )
        return false;
      if (activeStatus === "ACCEPTED" && ev.status !== "ACCEPTED") return false;

      // Batch filter
      if (selectedBatch !== "ALL") {
        const bCode = ev.batch_code || "";
        const bName = ev.batch_name || "";
        if (
          !bCode.toLowerCase().includes(selectedBatch.toLowerCase()) &&
          !bName.toLowerCase().includes(selectedBatch.toLowerCase())
        ) {
          return false;
        }
      }

      // Sub-batch filter
      if (selectedSubBatch !== "ALL") {
        const sbCode = ev.sub_batch_code || "";
        const sbName = ev.sub_batch_name || "";
        if (
          !sbCode.toLowerCase().includes(selectedSubBatch.toLowerCase()) &&
          !sbName.toLowerCase().includes(selectedSubBatch.toLowerCase())
        ) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const internMatch =
          ev.intern_name?.toLowerCase().includes(term) ||
          ev.intern_code?.toLowerCase().includes(term) ||
          ev.intern_email?.toLowerCase().includes(term);
        const reasonMatch = ev.return_reason?.toLowerCase().includes(term);
        if (!internMatch && !reasonMatch) return false;
      }

      return true;
    });
  }, [evaluations, activeStatus, selectedBatch, selectedSubBatch, searchTerm]);

  const hasActiveFilters =
    activeStatus !== "ALL" ||
    selectedBatch !== "ALL" ||
    selectedSubBatch !== "ALL" ||
    searchTerm.trim().length > 0;

  const resetFilters = () => {
    setActiveStatus("ALL");
    setSelectedBatch("ALL");
    setSelectedSubBatch("ALL");
    setSearchTerm("");
    setSearchParams((prev) => {
      prev.delete("status");
      return prev;
    });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
            <ClipboardCheck size={14} /> Language Assessments & Calibration
          </div>
          <h1 className="text-xl font-bold text-slate-900">Language Evaluations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate intern Japanese proficiency, manage evaluation drafts, and review revisions returned by HR.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isFetching}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh evaluations"
          >
            <RefreshCw
              size={16}
              className={`${isRefreshing || isFetching ? "animate-spin text-purple-600" : ""}`}
            />
          </button>

          <button
            onClick={() => {
              setSelectedEval(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-200 cursor-pointer transition-all"
          >
            <Plus size={16} />
            New Evaluation Draft
          </button>
        </div>
      </div>

      {/* Returned Evaluations Priority Alert Banner */}
      {counts.returned > 0 && activeStatus !== "RETURNED" && (
        <div className="bg-rose-50/90 border border-rose-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-900">
                {counts.returned} Evaluation{counts.returned > 1 ? "s" : ""} Returned by HR for Revision
              </div>
              <p className="text-[11px] text-rose-700">
                Action required: Update remarks, calibration scores, or specific guidance and resubmit to HR.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleStatusFilterChange("RETURNED")}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer shrink-0 transition-all"
          >
            Review Returned ({counts.returned})
          </button>
        </div>
      )}

      {/* 4 Interactive Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Returned by HR */}
        <div
          onClick={() =>
            handleStatusFilterChange(activeStatus === "RETURNED" ? "ALL" : "RETURNED")
          }
          className={`cursor-pointer transition-all rounded-3xl p-5 border shadow-xs ${
            activeStatus === "RETURNED"
              ? "bg-rose-50 border-rose-300 ring-2 ring-rose-400"
              : "bg-white border-slate-200/80 hover:border-rose-200 hover:bg-rose-50/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              Returned by HR
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldAlert size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-900">{counts.returned}</div>
          <div className="text-[11px] text-rose-600 mt-1 font-medium">
            {counts.returned > 0 ? "Requires revision & resubmission" : "No revisions pending"}
          </div>
        </div>

        {/* Drafts / Pending */}
        <div
          onClick={() => handleStatusFilterChange(activeStatus === "DRAFT" ? "ALL" : "DRAFT")}
          className={`cursor-pointer transition-all rounded-3xl p-5 border shadow-xs ${
            activeStatus === "DRAFT"
              ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400"
              : "bg-white border-slate-200/80 hover:border-amber-200 hover:bg-amber-50/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Draft / In Progress
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900">{counts.drafts}</div>
          <div className="text-[11px] text-amber-600 mt-1 font-medium">
            Unfinished evaluation drafts
          </div>
        </div>

        {/* Submitted to HR */}
        <div
          onClick={() =>
            handleStatusFilterChange(activeStatus === "SUBMITTED" ? "ALL" : "SUBMITTED")
          }
          className={`cursor-pointer transition-all rounded-3xl p-5 border shadow-xs ${
            activeStatus === "SUBMITTED"
              ? "bg-blue-50 border-blue-300 ring-2 ring-blue-400"
              : "bg-white border-slate-200/80 hover:border-blue-200 hover:bg-blue-50/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
              Submitted to HR
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Send size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-900">{counts.submitted}</div>
          <div className="text-[11px] text-blue-600 mt-1 font-medium">
            Awaiting HR review & acceptance
          </div>
        </div>

        {/* Accepted & Completed */}
        <div
          onClick={() =>
            handleStatusFilterChange(activeStatus === "ACCEPTED" ? "ALL" : "ACCEPTED")
          }
          className={`cursor-pointer transition-all rounded-3xl p-5 border shadow-xs ${
            activeStatus === "ACCEPTED"
              ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400"
              : "bg-white border-slate-200/80 hover:border-emerald-200 hover:bg-emerald-50/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Accepted / Published
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900">{counts.accepted}</div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">
            Calibrated & officially released
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by intern name, employee ID, email, or notes..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-purple-500 focus:outline-none bg-slate-50/60"
            />
          </div>

          {/* Main Batch Filter */}
          <div className="w-full md:w-44">
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(e.target.value);
                setSelectedSubBatch("ALL");
              }}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:border-purple-500 focus:outline-none"
            >
              <option value="ALL">All Batches</option>
              {mainBatches.map((b) => (
                <option key={b.id} value={b.code}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Sub-Batch Filter */}
          <div className="w-full md:w-44">
            <select
              value={selectedSubBatch}
              onChange={(e) => setSelectedSubBatch(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:border-purple-500 focus:outline-none"
            >
              <option value="ALL">All Sub-Batches</option>
              {subBatches.map((sb) => (
                <option key={sb.id} value={sb.code}>
                  {sb.name} ({sb.code})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-44">
            <select
              value={activeStatus}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:border-purple-500 focus:outline-none"
            >
              <option value="ALL">All Statuses ({counts.total})</option>
              <option value="RETURNED">Returned by HR ({counts.returned})</option>
              <option value="DRAFT">Draft / Pending ({counts.drafts})</option>
              <option value="SUBMITTED">Submitted to HR ({counts.submitted})</option>
              <option value="ACCEPTED">Accepted / Published ({counts.accepted})</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-semibold cursor-pointer shrink-0 transition-colors"
            >
              <X size={14} />
              Reset
            </button>
          )}
        </div>

        {/* Filter Summary Tags */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Showing <strong className="text-slate-800">{filteredEvaluations.length}</strong> of{" "}
            <strong className="text-slate-800">{evaluations.length}</strong> evaluations
          </div>
          <div className="flex items-center gap-2">
            {activeStatus !== "ALL" && (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                Status: {activeStatus}
              </span>
            )}
            {selectedBatch !== "ALL" && (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                Batch: {selectedBatch}
              </span>
            )}
            {selectedSubBatch !== "ALL" && (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                Sub-Batch: {selectedSubBatch}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Evaluations Table */}
      {isLoading ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          <RefreshCw size={24} className="animate-spin text-purple-600 mx-auto mb-3" />
          <div className="text-xs font-semibold text-slate-600">Loading evaluations from server...</div>
        </div>
      ) : filteredEvaluations.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 space-y-3">
          <ClipboardCheck size={40} className="text-slate-300 mx-auto" />
          <div className="font-bold text-slate-800 text-sm">No evaluations found matching criteria</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try resetting your filters or click "New Evaluation Draft" to initiate an evaluation for an intern.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Intern</th>
                  <th className="py-4 px-4">Batch / Sub-Batch</th>
                  <th className="py-4 px-4">Performance Cycle</th>
                  <th className="py-4 px-4">Overall Score</th>
                  <th className="py-4 px-4">Criteria Rated</th>
                  <th className="py-4 px-4">Status & Notes</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvaluations.map((ev) => {
                  const isReturned = ev.status === "RETURNED";
                  const isDraft = ev.status === "DRAFT" || ev.status === "PENDING";
                  const isAccepted = ev.status === "ACCEPTED";
                  const isSubmitted = ev.status === "SUBMITTED" || ev.status === "RESUBMITTED";

                  const scoreNum =
                    ev.overall_language_score !== null && ev.overall_language_score !== undefined
                      ? Number(ev.overall_language_score)
                      : null;

                  return (
                    <tr
                      key={ev.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isReturned ? "bg-rose-50/35" : ""
                      }`}
                    >
                      {/* Intern column */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-linear-to-br from-purple-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {ev.intern_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase() || "IN"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {ev.intern_name || "Intern"}
                              {ev.intern_id && (
                                <Link
                                  to={`/employees/${ev.intern_id}/profile`}
                                  className="text-slate-400 hover:text-purple-600 transition-colors"
                                  title="View employee profile"
                                >
                                  <ExternalLink size={12} />
                                </Link>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {ev.intern_code || "ID N/A"} • {ev.intern_email || ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Batch & Sub-Batch */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10.5px] border border-purple-100">
                            {ev.batch_code || "Batch"}
                          </span>
                          {ev.sub_batch_code && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10.5px] border border-slate-200">
                              {ev.sub_batch_code}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {ev.batch_name || "Assigned Batch"}
                        </div>
                      </td>

                      {/* Cycle */}
                      <td className="py-4 px-4 text-slate-700 font-medium">
                        {ev.cycle_name || "H1 2025 Performance Appraisal"}
                      </td>

                      {/* Overall Score */}
                      <td className="py-4 px-4">
                        {scoreNum !== null ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-black px-2 py-0.5 rounded-lg ${
                                scoreNum >= 8.0
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : scoreNum >= 6.5
                                  ? "bg-purple-50 text-purple-800 border border-purple-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {scoreNum.toFixed(2)}
                            </span>
                            <span className="text-[10.5px] text-slate-400">/ 10.0</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unscored Draft</span>
                        )}
                      </td>

                      {/* Criteria Rated */}
                      <td className="py-4 px-4 text-slate-600 font-medium">
                        <div className="flex items-center gap-1">
                          <Award size={13} className="text-purple-500" />
                          <span>{ev.ratings?.length || 0} / 4 criteria</span>
                        </div>
                      </td>

                      {/* Status & Return Notes */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              isReturned
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : isAccepted
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : isSubmitted
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-amber-100 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {isReturned && <ShieldAlert size={11} />}
                            {isAccepted && <CheckCircle2 size={11} />}
                            {isSubmitted && <Send size={11} />}
                            {isDraft && <Clock size={11} />}
                            {ev.status_display || ev.status}
                          </span>

                          {isReturned && ev.return_reason && (
                            <div
                              className="text-[11px] text-rose-700 bg-rose-100/60 p-1.5 rounded-lg border border-rose-200 line-clamp-2 max-w-xs"
                              title={ev.return_reason}
                            >
                              <strong>HR Note:</strong> {ev.return_reason}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleOpenEvaluation(ev)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 ${
                            isReturned
                              ? "bg-rose-600 hover:bg-rose-700 text-white"
                              : isDraft
                              ? "bg-amber-500 hover:bg-amber-600 text-white"
                              : "bg-purple-600 hover:bg-purple-700 text-white"
                          }`}
                        >
                          <FileCheck size={13} />
                          {isReturned
                            ? "Revise & Resubmit"
                            : isDraft
                            ? "Continue Draft"
                            : "View Evaluation"}
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

      {/* Evaluation Modal */}
      {isModalOpen && (
        <ConductJapaneseEvaluationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEval(null);
            setSearchParams((prev) => {
              prev.delete("evaluationId");
              return prev;
            });
          }}
          evaluation={selectedEval}
        />
      )}
    </div>
  );
};

export default JapaneseEvaluationsPage;
