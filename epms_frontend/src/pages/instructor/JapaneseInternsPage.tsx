// src/pages/instructor/JapaneseInternsPage.tsx
import React, { useState } from "react";
import {
  Users,
  Search,
  AlertCircle,
  FileCheck,
  Eye,
  Plus,
} from "lucide-react";
import { useGetJapaneseInternsQuery } from "../../features/japanese/japaneseApi";
import { JapaneseInternDetailModal } from "../../components/instructor/JapaneseInternDetailModal";
import { ConductJapaneseEvaluationModal } from "../../components/instructor/ConductJapaneseEvaluationModal";
import { CreateLearningPlanModal } from "../../components/instructor/CreateLearningPlanModal";
import type { JapaneseAssignedIntern } from "../../features/japanese/types";

export const JapaneseInternsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: interns = [], isLoading } = useGetJapaneseInternsQuery({
    q: searchTerm || undefined,
    jlpt_level: levelFilter || undefined,
    status: statusFilter || undefined,
  });

  const [selectedIntern, setSelectedIntern] = useState<JapaneseAssignedIntern | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const handleOpenDetail = (intern: JapaneseAssignedIntern) => {
    setSelectedIntern(intern);
    setIsDetailModalOpen(true);
  };

  const handleEvaluate = (intern: JapaneseAssignedIntern) => {
    setSelectedIntern(intern);
    setIsEvalModalOpen(true);
  };

  const handleManagePlan = (intern: JapaneseAssignedIntern) => {
    setSelectedIntern(intern);
    setIsPlanModalOpen(true);
  };

  const internsDropdown = interns.map((i) => ({
    id: i.id,
    fullName: i.fullName,
    employeeCode: i.employeeCode,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Users size={14} /> Assigned Intern Roster
          </div>
          <h1 className="text-xl font-bold text-gray-900">Intern Japanese Trajectory</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitor Japanese progress, curriculum completion, evaluation status, and JLPT targets.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedIntern(null);
            setIsPlanModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 cursor-pointer"
        >
          <Plus size={16} />
          Create Learning Plan
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by intern name, code (INT-001), or email..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:border-blue-500 bg-gray-50/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-medium"
          >
            <option value="">All JLPT Targets</option>
            <option value="N5">Target N5</option>
            <option value="N4">Target N4</option>
            <option value="N3">Target N3</option>
            <option value="N2">Target N2</option>
            <option value="N1">Target N1</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-blue-500 bg-white font-medium"
          >
            <option value="">All Evaluation Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="DRAFT">Draft</option>
            <option value="RETURNED">Returned by HR</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="ACCEPTED">Accepted</option>
          </select>
        </div>
      </div>

      {/* Interns Cards / Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400 text-xs">Loading assigned interns...</div>
      ) : interns.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-gray-200/80 p-8 space-y-2">
          <Users size={36} className="text-gray-300 mx-auto mb-2" />
          <div className="font-bold text-gray-700 text-sm">No interns found matching filter</div>
          <p className="text-xs text-gray-400">Try clearing the search query or changing filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {interns.map((intern) => {
            const isReturned = intern.evaluation?.status === "RETURNED";
            return (
              <div
                key={intern.id}
                className={`bg-white rounded-3xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                  isReturned ? "border-rose-300 ring-1 ring-rose-300" : "border-gray-200/80"
                }`}
              >
                {/* Intern Profile Header */}
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-200 shrink-0">
                        {intern.fullName?.[0]?.toUpperCase() || "I"}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors">
                          {intern.fullName}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {intern.employeeCode} • {intern.department}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isReturned
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : intern.evaluation?.status === "ACCEPTED"
                          ? "bg-emerald-100 text-emerald-700"
                          : intern.evaluation?.status === "SUBMITTED"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {intern.evaluation?.statusDisplay || intern.evaluation?.status || "Pending"}
                    </span>
                  </div>

                  {/* Return Reason Alert */}
                  {isReturned && (
                    <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] leading-tight flex items-start gap-1.5">
                      <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>HR Return Note:</strong> {intern.evaluation?.returnReason}
                      </div>
                    </div>
                  )}

                  {/* Plan & Target Info */}
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Curriculum Plan:</span>
                      <span className="font-semibold text-gray-800 truncate max-w-[170px]" title={intern.plan?.title}>
                        {intern.plan?.title || "No Active Plan"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">JLPT Target:</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {intern.plan?.targetLevel || intern.jlpt.requiredLevel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Evaluation Score:</span>
                      <span className="font-bold text-gray-900">
                        {intern.evaluation?.overallScore !== null && intern.evaluation?.overallScore !== undefined
                          ? `${intern.evaluation.overallScore} / 10`
                          : "Not evaluated"}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 font-medium">Exercise Completion</span>
                      <span className="font-bold text-gray-700">{intern.progress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${intern.progress.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenDetail(intern)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-xl hover:bg-gray-100 cursor-pointer"
                  >
                    <Eye size={14} /> Profile
                  </button>

                  <button
                    onClick={() => handleEvaluate(intern)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      isReturned
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    <FileCheck size={14} />
                    {isReturned ? "Revise" : "Evaluate"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {isDetailModalOpen && (
        <JapaneseInternDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          intern={selectedIntern}
          onEvaluate={(intern) => {
            setSelectedIntern(intern);
            setIsEvalModalOpen(true);
          }}
          onManagePlan={(intern) => {
            setSelectedIntern(intern);
            setIsPlanModalOpen(true);
          }}
        />
      )}

      {isEvalModalOpen && selectedIntern && (
        <ConductJapaneseEvaluationModal
          isOpen={isEvalModalOpen}
          onClose={() => {
            setIsEvalModalOpen(false);
            setSelectedIntern(null);
          }}
          internId={selectedIntern.id}
          internName={selectedIntern.fullName}
        />
      )}

      {isPlanModalOpen && (
        <CreateLearningPlanModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          interns={internsDropdown}
          defaultInternId={selectedIntern?.id}
        />
      )}
    </div>
  );
};

export default JapaneseInternsPage;
