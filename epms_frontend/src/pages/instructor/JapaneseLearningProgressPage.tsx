// src/pages/instructor/JapaneseLearningProgressPage.tsx
import React, { useState } from "react";
import {
  Activity,
  Clock,
  ExternalLink,
  Search,
} from "lucide-react";
import { useGetJapanesePracticeResultsQuery } from "../../features/japanese/japaneseApi";
import { ReviewPracticeModal } from "../../components/instructor/ReviewPracticeModal";
import type { JapanesePracticeResult } from "../../features/japanese/types";

export const JapaneseLearningProgressPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: practices = [], isLoading } = useGetJapanesePracticeResultsQuery();

  const [selectedPractice, setSelectedPractice] = useState<JapanesePracticeResult | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const handleOpenReview = (practice: JapanesePracticeResult) => {
    setSelectedPractice(practice);
    setIsReviewModalOpen(true);
  };

  const filteredPractices = practices.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const internMatch = p.intern_name?.toLowerCase().includes(term) || p.intern_code?.toLowerCase().includes(term);
      const topicMatch = p.topic_title?.toLowerCase().includes(term);
      if (!internMatch && !topicMatch) return false;
    }
    return true;
  });

  const submittedCount = practices.filter((p) => p.status === "SUBMITTED").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Activity size={14} /> Practice & Homework Submissions
          </div>
          <h1 className="text-xl font-bold text-gray-900">Learning Progress & Submissions</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Review submitted grammar assignments, vocabulary quizzes, and provide grading feedback.
          </p>
        </div>

        {submittedCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <Clock size={16} className="text-amber-600" />
            {submittedCount} Submissions Awaiting Review
          </div>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by intern name, code, or topic..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:border-blue-500 bg-gray-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "SUBMITTED", "REVIEWED", "ASSIGNED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {st === "ALL" ? "All Exercises" : st === "SUBMITTED" ? "Submitted (Pending)" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Submissions Table */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400 text-xs">Loading exercise submissions...</div>
      ) : filteredPractices.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-gray-200/80 p-8 space-y-2">
          <Activity size={36} className="text-gray-300 mx-auto mb-2" />
          <div className="font-bold text-gray-700 text-sm">No exercises found</div>
          <p className="text-xs text-gray-400">All submissions are up to date or no exercises match filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Intern</th>
                  <th className="py-4 px-4">Topic / Exercise</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Score</th>
                  <th className="py-4 px-4">Evidence</th>
                  <th className="py-4 px-4">Instructor Feedback</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPractices.map((p) => {
                  const isPendingReview = p.status === "SUBMITTED";
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 font-semibold text-gray-900">
                        <div>{p.intern_name || "Intern"}</div>
                        <div className="text-[11px] text-gray-400 font-normal">{p.intern_code}</div>
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-800">
                        <div>{p.topic_title || "General Topic"}</div>
                        {p.material_title && (
                          <div className="text-[11px] text-gray-400">{p.material_title}</div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            p.status === "REVIEWED"
                              ? "bg-emerald-100 text-emerald-800"
                              : p.status === "SUBMITTED"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-gray-900">
                        {p.score !== null && p.score !== undefined ? (
                          <span className="text-emerald-700">
                            {p.score} / {p.max_score}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {p.external_url ? (
                          <a
                            href={p.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                          >
                            <ExternalLink size={12} /> View File
                          </a>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="py-4 px-4 max-w-xs text-gray-600 truncate" title={p.instructor_remarks || ""}>
                        {p.instructor_remarks || <span className="text-gray-400 italic">No remarks</span>}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleOpenReview(p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                            isPendingReview
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {isPendingReview ? "Grade & Review" : "Edit Review"}
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

      {/* Review Modal */}
      {isReviewModalOpen && selectedPractice && (
        <ReviewPracticeModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedPractice(null);
          }}
          practice={selectedPractice}
        />
      )}
    </div>
  );
};

export default JapaneseLearningProgressPage;
