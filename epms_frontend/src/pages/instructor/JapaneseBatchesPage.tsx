import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  Search,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Award,
  BookOpen,
  X,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useGetJapaneseBatchesQuery } from "../../features/japanese/japaneseApi";
import type { JapaneseBatch, JapaneseAssignedIntern } from "../../features/japanese/types";

export const JapaneseBatchesPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "HR" | "SUPER_ADMIN">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<JapaneseBatch | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const {
    data: batches = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetJapaneseBatchesQuery({
    creator_role: activeFilter === "ALL" ? undefined : activeFilter,
    q: searchQuery.trim() || undefined,
  });

  const handleOpenBatch = (batch: JapaneseBatch) => {
    setSelectedBatch(batch);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedBatch(null);
  };

  // Filter counts
  const hrCount = batches.filter((b) => b.creator?.role === "HR").length;
  const adminCount = batches.filter((b) => b.creator?.role === "SUPER_ADMIN").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Branded Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-linear-to-r from-blue-900 via-indigo-900 to-purple-900 p-7 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 pointer-events-none select-none">
          <Layers size={220} />
        </div>
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-purple-200 text-[11px] font-bold tracking-wider uppercase backdrop-blur-xs">
              Japanese Training Program
            </span>
            <span className="text-xs text-purple-200/80">• Authorized Cohorts</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>Training Batches</span>
          </h1>
          <p className="text-xs text-purple-200 max-w-xl leading-relaxed">
            Review authorized intern batches created by HR and Super Admin. Inspect cohort assignments, track curriculum progress, and review JLPT preparedness.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
            title="Refresh Batches"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Creator Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === "ALL"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Batches ({batches.length})
          </button>

          <button
            onClick={() => setActiveFilter("HR")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === "HR"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-purple-50 text-purple-700 hover:bg-purple-100"
            }`}
          >
            <ShieldCheck size={14} />
            <span>HR-Created</span>
            {activeFilter === "ALL" && (
              <span className="text-[10px] bg-purple-200/70 text-purple-900 px-1.5 py-0.2 rounded-full">
                {hrCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFilter("SUPER_ADMIN")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === "SUPER_ADMIN"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <ShieldCheck size={14} />
            <span>Super Admin-Created</span>
            {activeFilter === "ALL" && (
              <span className="text-[10px] bg-blue-200/70 text-blue-900 px-1.5 py-0.2 rounded-full">
                {adminCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search batches by name or cohort..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Batches Grid */}
      {isLoading ? (
        <div className="py-20 text-center animate-pulse space-y-3">
          <div className="w-10 h-10 rounded-full border-3 border-purple-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-semibold text-gray-500">Loading authorized batches...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl max-w-lg mx-auto">
          <p className="text-sm font-bold text-rose-900">Failed to load batches</p>
          <p className="text-xs text-rose-700 mt-1">Please check your network or credentials.</p>
        </div>
      ) : batches.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 shadow-xs space-y-3">
          <Layers size={40} className="mx-auto text-gray-300" />
          <h3 className="text-base font-bold text-gray-800">No Batches Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchQuery || activeFilter !== "ALL"
              ? "No batches match your selected search or creator filter criteria."
              : "No Japanese training batches have been assigned to your instructor account yet."}
          </p>
          {(searchQuery || activeFilter !== "ALL") && (
            <button
              onClick={() => {
                setActiveFilter("ALL");
                setSearchQuery("");
              }}
              className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((batch) => {
            const isHRCreated = batch.creator?.role === "HR";
            const internsCount = batch.interns_count || batch.assigned_interns?.length || 0;
            const interns = batch.assigned_interns || [];
            const avgProgress =
              interns.length > 0
                ? Math.round(
                    interns.reduce((acc, i) => acc + (i.progress?.percentage || 0), 0) /
                      interns.length
                  )
                : 0;

            const meetsRequirementCount = interns.filter(
              (i) => i.jlpt?.eligibilityStatus === "MEETS_REQUIREMENT"
            ).length;

            return (
              <div
                key={batch.id}
                className="bg-white rounded-3xl border border-gray-200/90 shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold tracking-wide uppercase mb-1.5">
                        {batch.cohort || "MIRAI Cohort 2026"}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                        {batch.name}
                      </h3>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 group-hover:text-purple-600 group-hover:bg-purple-50 transition-colors shrink-0">
                      <Layers size={18} />
                    </div>
                  </div>

                  {batch.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {batch.description}
                    </p>
                  )}

                  {/* Creator Info Pill */}
                  <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Created By:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                          isHRCreated
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        <ShieldCheck size={11} />
                        {batch.creator?.role_display || (isHRCreated ? "HR Partner" : "Super Admin")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-700">
                      <span className="font-semibold truncate">
                        {batch.creator?.name || "System Admin"}
                      </span>
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(batch.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Batch Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100/60">
                      <div className="text-[11px] font-medium text-indigo-700 flex items-center gap-1 mb-1">
                        <Users size={12} />
                        Assigned Interns
                      </div>
                      <div className="text-lg font-black text-indigo-900">{internsCount}</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100/60">
                      <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1 mb-1">
                        <Award size={12} />
                        Avg Japanese Progress
                      </div>
                      <div className="text-lg font-black text-emerald-900">{avgProgress}%</div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-5 mt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium">
                    {meetsRequirementCount} of {internsCount} JLPT Qualified
                  </span>
                  <button
                    onClick={() => handleOpenBatch(batch)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer group-hover:scale-[1.02]"
                  >
                    <span>Open Batch</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Governance Disclaimer Pill */}
      <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center gap-3 text-xs text-purple-900">
        <ShieldCheck size={18} className="text-purple-600 shrink-0" />
        <div>
          <strong className="font-bold">Role-Based Governance:</strong> Training batches are created and managed exclusively by <strong>HR Partners</strong> and <strong>Super Admins</strong>. Japanese Instructors hold authorized view permissions for designated cohorts to evaluate intern language proficiency.
        </div>
      </div>

      {/* Batch Details Modal */}
      {isDetailModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-linear-to-r from-blue-900 via-indigo-900 to-purple-900 text-white flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-purple-200 text-[10.5px] font-bold uppercase">
                    {selectedBatch.cohort || "MIRAI Cohort 2026"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/30 text-white text-[10.5px] font-semibold">
                    Created by {selectedBatch.creator?.role_display || "HR"}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white">{selectedBatch.name}</h2>
                <p className="text-xs text-purple-200/90 mt-1 max-w-lg">
                  {selectedBatch.description || "Authorized Japanese language training batch."}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Creator & Metadata Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="text-[11px] text-gray-500 font-medium">Batch Creator</div>
                  <div className="font-bold text-gray-900 mt-0.5">
                    {selectedBatch.creator?.name || "System Admin"}
                  </div>
                  <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                    {selectedBatch.creator?.role_display || "HR Partner"}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="text-[11px] text-gray-500 font-medium">Date Created</div>
                  <div className="font-bold text-gray-900 mt-0.5">
                    {new Date(selectedBatch.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="text-[11px] text-gray-500 font-medium">Total Interns</div>
                  <div className="font-bold text-gray-900 mt-0.5">
                    {selectedBatch.assigned_interns?.length || selectedBatch.interns_count || 0} Interns
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="text-[11px] text-gray-500 font-medium">Curriculum Track</div>
                  <div className="font-bold text-gray-900 mt-0.5 truncate">
                    Business Japanese
                  </div>
                </div>
              </div>

              {/* Assigned Interns Roster */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Users size={16} className="text-purple-600" />
                    <span>Assigned Interns & Language Progress</span>
                  </h4>
                  <span className="text-xs text-gray-500">
                    {selectedBatch.assigned_interns?.length || 0} interns enrolled
                  </span>
                </div>

                {(!selectedBatch.assigned_interns || selectedBatch.assigned_interns.length === 0) ? (
                  <div className="p-6 text-center text-gray-400 text-xs italic bg-gray-50 rounded-2xl border border-gray-100">
                    No interns assigned to this batch.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedBatch.assigned_interns.map((intern: JapaneseAssignedIntern) => {
                      const progressPct = intern.progress?.percentage || 0;
                      const jlptStatus = intern.jlpt?.eligibilityStatus;

                      return (
                        <div
                          key={intern.id}
                          className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/70 hover:bg-purple-50/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-xs">
                                {intern.fullName}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-200 text-gray-700">
                                {intern.employeeCode}
                              </span>
                              <span className="text-[11px] text-gray-500">• {intern.designation}</span>
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {intern.plan?.title ? (
                                <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                                  <BookOpen size={12} className="text-purple-600" />
                                  {intern.plan.title} (Target: {intern.plan.targetLevel})
                                </span>
                              ) : (
                                <span className="italic text-gray-400">No active plan assigned</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            {/* Progress bar */}
                            <div className="w-28 text-right">
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="text-gray-500 font-medium">Progress</span>
                                <span className="font-bold text-gray-900">{progressPct}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-purple-600 h-1.5 rounded-full transition-all"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>

                            {/* JLPT Badge */}
                            <span
                              className={`px-2 py-1 rounded-xl text-[10px] font-bold ${
                                jlptStatus === "MEETS_REQUIREMENT"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : jlptStatus === "PENDING_VERIFICATION"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {intern.jlpt?.eligibilityStatusDisplay || "In Progress"}
                            </span>

                            {/* Evaluation Status */}
                            <Link
                              to={`/japanese/evaluations`}
                              className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:text-purple-700 hover:border-purple-300 transition-colors flex items-center gap-1 shrink-0"
                            >
                              <span>Evaluate</span>
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Batch ID: <code className="font-mono text-[11px]">{selectedBatch.id}</code>
              </span>
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JapaneseBatchesPage;
