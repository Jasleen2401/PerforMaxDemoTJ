// src/pages/instructor/JLPTTrackingPage.tsx
import React, { useState } from "react";
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
  Info,
} from "lucide-react";
import {
  useGetJLPTAttemptsQuery,
  useGetJLPTEligibilityQuery,
  useGetJapaneseInternsQuery,
} from "../../features/japanese/japaneseApi";
import { RecordJLPTAttemptModal } from "../../components/instructor/RecordJLPTAttemptModal";
import { VerifyJLPTModal } from "../../components/instructor/VerifyJLPTModal";
import type { JLPTAttempt } from "../../features/japanese/types";

export const JLPTTrackingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"ATTEMPTS" | "ELIGIBILITY">("ATTEMPTS");
  const [filterVerification, setFilterVerification] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: attempts = [], isLoading: isLoadingAttempts } = useGetJLPTAttemptsQuery();
  const { data: eligibilityRecords = [], isLoading: isLoadingEligibility } = useGetJLPTEligibilityQuery();
  const { data: interns = [] } = useGetJapaneseInternsQuery();

  const [selectedAttempt, setSelectedAttempt] = useState<JLPTAttempt | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const handleVerify = (attempt: JLPTAttempt) => {
    setSelectedAttempt(attempt);
    setIsVerifyModalOpen(true);
  };

  const internsDropdown = interns.map((i) => ({
    id: i.id,
    fullName: i.fullName,
    employeeCode: i.employeeCode,
  }));

  const filteredAttempts = attempts.filter((att) => {
    if (filterVerification === "PENDING" && att.verified) return false;
    if (filterVerification === "VERIFIED" && !att.verified) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const internMatch = att.intern_name?.toLowerCase().includes(term) || att.intern_code?.toLowerCase().includes(term);
      if (!internMatch) return false;
    }
    return true;
  });

  const unverifiedCount = attempts.filter((a) => !a.verified).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Award size={14} /> Japanese Language Proficiency Test
          </div>
          <h1 className="text-xl font-bold text-gray-900">JLPT Certification & Eligibility</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Log official test attempts, verify submitted score certificates, and validate cycle eligibility.
          </p>
        </div>

        <button
          onClick={() => setIsRecordModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 cursor-pointer"
        >
          <Plus size={16} />
          Record New Exam Attempt
        </button>
      </div>

      {/* Policy Separation Notice Banner */}
      <div className="p-4 rounded-3xl bg-indigo-50/70 border border-indigo-200 flex items-start gap-3">
        <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <strong>MIRAI Program Architecture Reminder:</strong> JLPT examination status is tracked separately from the 60/40 cycle evaluation scoring. JLPT targets serve as mandatory gating milestones for phase transition and permanent conversion readiness, while evaluation ratings reflect continuous practical Japanese performance.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("ATTEMPTS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "ATTEMPTS"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Award size={15} />
          Official Exam Attempts ({attempts.length})
          {unverifiedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black">
              {unverifiedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("ELIGIBILITY")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "ELIGIBILITY"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <ShieldCheck size={15} />
          Cycle Eligibility Matrix ({eligibilityRecords.length})
        </button>
      </div>

      {/* Tab 1: Attempts View */}
      {activeTab === "ATTEMPTS" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row gap-3 justify-between">
            <div className="flex items-center gap-1.5">
              {[
                { id: "ALL", label: "All Attempts" },
                { id: "PENDING", label: `Pending Verification (${unverifiedCount})` },
                { id: "VERIFIED", label: "Verified Only" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterVerification(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterVerification === f.id
                      ? "bg-gray-900 text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search intern name or code..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:border-blue-500 bg-gray-50/50"
              />
            </div>
          </div>

          {isLoadingAttempts ? (
            <div className="py-20 text-center text-gray-400 text-xs">Loading exam attempts...</div>
          ) : filteredAttempts.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-gray-200/80 p-8 space-y-2">
              <Award size={36} className="text-gray-300 mx-auto mb-2" />
              <div className="font-bold text-gray-700 text-sm">No exam attempts found</div>
              <p className="text-xs text-gray-400">Click "Record New Exam Attempt" to log an exam result.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Intern</th>
                      <th className="py-4 px-4">Level</th>
                      <th className="py-4 px-4">Exam Date</th>
                      <th className="py-4 px-4">Result</th>
                      <th className="py-4 px-4">Score</th>
                      <th className="py-4 px-4">Verification</th>
                      <th className="py-4 px-4">Notes</th>
                      <th className="py-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAttempts.map((att) => {
                      const isPending = !att.verified;
                      return (
                        <tr key={att.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6 font-semibold text-gray-900">
                            <div>{att.intern_name || "Intern"}</div>
                            <div className="text-[11px] text-gray-400 font-normal">{att.intern_code}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                              JLPT {att.level}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-600 font-medium">{att.exam_date}</td>
                          <td className="py-4 px-4">
                            {att.passed === true ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 size={14} /> Passed
                              </span>
                            ) : att.passed === false ? (
                              <span className="text-rose-600 font-semibold flex items-center gap-1">
                                <XCircle size={14} /> Failed
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Pending</span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-bold text-gray-900">
                            {att.score !== null && att.score !== undefined ? `${att.score} / 180` : "-"}
                          </td>
                          <td className="py-4 px-4">
                            {att.verified ? (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Verified
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                Pending Check
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 max-w-xs text-gray-500 truncate" title={att.notes || ""}>
                            {att.notes || "-"}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleVerify(att)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                                isPending
                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                  : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              {isPending ? "Verify Attempt" : "Re-Verify"}
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

      {/* Tab 2: Eligibility Matrix View */}
      {activeTab === "ELIGIBILITY" && (
        <div className="space-y-4">
          {isLoadingEligibility ? (
            <div className="py-20 text-center text-gray-400 text-xs">Loading eligibility matrix...</div>
          ) : eligibilityRecords.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-gray-200/80 p-8 space-y-2">
              <ShieldCheck size={36} className="text-gray-300 mx-auto mb-2" />
              <div className="font-bold text-gray-700 text-sm">No eligibility records configured</div>
              <p className="text-xs text-gray-400">Records will populate based on active cohort requirements.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Intern</th>
                      <th className="py-4 px-4">Performance Cycle</th>
                      <th className="py-4 px-4">Mandatory Level</th>
                      <th className="py-4 px-4">Eligibility Status</th>
                      <th className="py-4 px-4">Audit Notes</th>
                      <th className="py-4 px-6">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {eligibilityRecords.map((el) => {
                      const meetsReq = el.eligibility_status === "MEETS_REQUIREMENT";
                      const isPending = el.eligibility_status === "PENDING_VERIFICATION";
                      return (
                        <tr key={el.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6 font-semibold text-gray-900">
                            <div>{el.intern_name || "Intern"}</div>
                            <div className="text-[11px] text-gray-400 font-normal">{el.intern_code}</div>
                          </td>
                          <td className="py-4 px-4 text-gray-600 font-medium">
                            {el.cycle_name || "Active Cycle"}
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                              Target {el.required_level}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                meetsReq
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isPending
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {el.eligibility_status_display || el.eligibility_status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            {el.notes || "Standard cohort trajectory"}
                          </td>
                          <td className="py-4 px-6 text-gray-400">
                            {el.updated_at ? new Date(el.updated_at).toLocaleDateString() : "-"}
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

      {/* Modals */}
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
