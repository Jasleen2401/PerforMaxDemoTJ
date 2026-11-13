// src/pages/instructor/JapaneseEvaluationsPage.tsx
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
} from "lucide-react";
import {
  useGetJapaneseEvaluationsQuery,
  useGetJapaneseInternsQuery,
} from "../../features/japanese/japaneseApi";
import { ConductJapaneseEvaluationModal } from "../../components/instructor/ConductJapaneseEvaluationModal";
import type { JapaneseEvaluation, EvaluationStatus } from "../../features/japanese/types";

export const JapaneseEvaluationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status") || "ALL";
  const urlEvalId = searchParams.get("evaluationId");

  const [activeTab, setActiveTab] = useState<string>(urlStatus);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: evaluations = [], isLoading } = useGetJapaneseEvaluationsQuery();
  const { data: interns = [] } = useGetJapaneseInternsQuery();

  const [selectedEval, setSelectedEval] = useState<JapaneseEvaluation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If URL has evaluationId, auto-open that evaluation in modal
  useEffect(() => {
    if (urlEvalId && evaluations.length > 0) {
      const match = evaluations.find((e) => e.id === urlEvalId);
      if (match) {
        setSelectedEval(match);
        setIsModalOpen(true);
      }
    }
  }, [urlEvalId, evaluations]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      if (tab === "ALL") {
        prev.delete("status");
      } else {
        prev.set("status", tab);
      }
      return prev;
    });
  };

  const handleOpenEvaluation = (evalObj: JapaneseEvaluation) => {
    setSelectedEval(evalObj);
    setIsModalOpen(true);
  };

  const filteredEvaluations = evaluations.filter((ev) => {
    if (activeTab === "RETURNED" && ev.status !== "RETURNED") return false;
    if (activeTab === "DRAFT" && ev.status !== "DRAFT" && ev.status !== "PENDING") return false;
    if (activeTab === "SUBMITTED" && ev.status !== "SUBMITTED" && ev.status !== "RESUBMITTED") return false;
    if (activeTab === "ACCEPTED" && ev.status !== "ACCEPTED") return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const internMatch = ev.intern_name?.toLowerCase().includes(term) || ev.intern_code?.toLowerCase().includes(term);
      if (!internMatch) return false;
    }
    return true;
  });

  const returnedEvals = evaluations.filter((e) => e.status === "RETURNED");
  const draftCount = evaluations.filter((e) => e.status === "DRAFT" || e.status === "PENDING").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <ClipboardCheck size={14} /> Japanese Performance Evaluations
          </div>
          <h1 className="text-xl font-bold text-gray-900">Cycle Language Evaluations</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Assess HR-configured Japanese competencies, manage drafts, and resolve evaluations returned by HR.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedEval(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 cursor-pointer"
        >
          <Plus size={16} />
          New Evaluation Draft
        </button>
      </div>

      {/* Returned Evaluations Priority Alert */}
      {returnedEvals.length > 0 && activeTab !== "RETURNED" && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="text-rose-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-rose-900">
                {returnedEvals.length} Evaluation(s) Returned by HR for Revision
              </div>
              <p className="text-[11px] text-rose-700">
                Action required: Update remarks or scores and resubmit to HR.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleTabChange("RETURNED")}
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
          >
            Review Returned
          </button>
        </div>
      )}

      {/* Tabs and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row gap-3 justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "ALL", label: `All (${evaluations.length})` },
            { id: "RETURNED", label: `Returned by HR (${returnedEvals.length})` },
            { id: "DRAFT", label: `Draft / Pending (${draftCount})` },
            { id: "SUBMITTED", label: "Submitted to HR" },
            { id: "ACCEPTED", label: "Accepted / Published" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? tab.id === "RETURNED"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by intern name..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:border-blue-500 bg-gray-50/50"
          />
        </div>
      </div>

      {/* Evaluations Table */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400 text-xs">Loading evaluations...</div>
      ) : filteredEvaluations.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-gray-200/80 p-8 space-y-2">
          <ClipboardCheck size={36} className="text-gray-300 mx-auto mb-2" />
          <div className="font-bold text-gray-700 text-sm">No evaluations found in this view</div>
          <p className="text-xs text-gray-400">Select another tab or click "New Evaluation Draft".</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Intern</th>
                  <th className="py-4 px-4">Cycle</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Overall Score</th>
                  <th className="py-4 px-4">Criteria Rated</th>
                  <th className="py-4 px-4">HR Feedback / Notes</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEvaluations.map((ev) => {
                  const isReturned = ev.status === "RETURNED";
                  return (
                    <tr
                      key={ev.id}
                      className={`hover:bg-gray-50/50 transition-colors ${
                        isReturned ? "bg-rose-50/40" : ""
                      }`}
                    >
                      <td className="py-4 px-6 font-semibold text-gray-900">
                        <div>{ev.intern_name || "Intern"}</div>
                        <div className="text-[11px] text-gray-400 font-normal">{ev.intern_code}</div>
                      </td>
                      <td className="py-4 px-4 text-gray-600 font-medium">
                        {ev.cycle_name || "Active Cycle"}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isReturned
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : ev.status === "ACCEPTED"
                              ? "bg-emerald-100 text-emerald-700"
                              : ev.status === "SUBMITTED" || ev.status === "RESUBMITTED"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {ev.status_display || ev.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-gray-900">
                        {ev.overall_language_score !== null && ev.overall_language_score !== undefined ? (
                          <span className="text-base text-indigo-900 font-black">
                            {ev.overall_language_score}{" "}
                            <span className="text-xs text-gray-400 font-normal">/ 10.0</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 font-normal italic">Draft</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {ev.ratings?.length || 0} criteria scored
                      </td>
                      <td className="py-4 px-4 max-w-xs text-xs truncate">
                        {isReturned ? (
                          <span className="text-rose-700 font-medium flex items-center gap-1" title={ev.return_reason}>
                            <AlertCircle size={13} className="shrink-0" />
                            {ev.return_reason || "Revisions requested by HR"}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No return remarks</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleOpenEvaluation(ev)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                            isReturned
                              ? "bg-rose-600 hover:bg-rose-700 text-white"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          <FileCheck size={13} className="inline mr-1" />
                          {isReturned ? "Revise & Resubmit" : "Open Evaluation"}
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
