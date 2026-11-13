// src/pages/instructor/JapaneseFeedbackPage.tsx
import React, { useState } from "react";
import {
  MessageSquare,
  Plus,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";
import {
  useGetJapaneseEvaluationsQuery,
  useGetJapaneseInternsQuery,
} from "../../features/japanese/japaneseApi";
import { ProvideJapaneseFeedbackModal } from "../../components/instructor/ProvideJapaneseFeedbackModal";

export const JapaneseFeedbackPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: evaluations = [], isLoading } = useGetJapaneseEvaluationsQuery();
  const { data: interns = [] } = useGetJapaneseInternsQuery();

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const internsDropdown = interns.map((i) => ({
    id: i.id,
    fullName: i.fullName,
    employeeCode: i.employeeCode,
  }));

  // Evaluations containing developmental feedback or remarks
  const feedbackItems = evaluations.filter((e) => e.developmental_feedback || e.instructor_remarks);

  const filteredItems = feedbackItems.filter((item) => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const internMatch = item.intern_name?.toLowerCase().includes(term) || item.intern_code?.toLowerCase().includes(term);
      const contentMatch =
        item.developmental_feedback?.toLowerCase().includes(term) ||
        item.instructor_remarks?.toLowerCase().includes(term);
      if (!internMatch && !contentMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <MessageSquare size={14} /> Continuous Guidance & Notes
          </div>
          <h1 className="text-xl font-bold text-gray-900">Japanese Developmental Feedback</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Deliver actionable developmental guidance and track confidential notes per intern.
          </p>
        </div>

        <button
          onClick={() => setIsFeedbackModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 cursor-pointer"
        >
          <Plus size={16} />
          Provide Guidance
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search feedback by intern name, code, or keyword..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:border-blue-500 bg-gray-50/50"
          />
        </div>
      </div>

      {/* Feedback Feed */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400 text-xs">Loading feedback entries...</div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-gray-200/80 p-8 space-y-2">
          <MessageSquare size={36} className="text-gray-300 mx-auto mb-2" />
          <div className="font-bold text-gray-700 text-sm">No feedback records found</div>
          <p className="text-xs text-gray-400">Click "Provide Guidance" to log developmental advice for an intern.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    {item.intern_name?.[0]?.toUpperCase() || "I"}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{item.intern_name}</div>
                    <div className="text-[11px] text-gray-400">
                      {item.intern_code} • {item.cycle_name || "Active Cycle"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.is_developmental_feedback_visible ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <Eye size={13} /> Visible to Intern
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      <EyeOff size={13} /> Private to Instructor
                    </span>
                  )}
                </div>
              </div>

              {item.developmental_feedback && (
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">
                    Developmental Guidance:
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed bg-blue-50/40 p-3.5 rounded-2xl border border-blue-100">
                    {item.developmental_feedback}
                  </p>
                </div>
              )}

              {item.instructor_remarks && (
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                    Confidential Instructor Notes (HR & Calibration View):
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed bg-amber-50/50 p-3 rounded-2xl border border-amber-100 italic">
                    {item.instructor_remarks}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                <span>Status: <strong className="text-gray-700 uppercase">{item.status}</strong></span>
                {item.updated_at && (
                  <span>Last Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isFeedbackModalOpen && (
        <ProvideJapaneseFeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          interns={internsDropdown}
        />
      )}
    </div>
  );
};

export default JapaneseFeedbackPage;
