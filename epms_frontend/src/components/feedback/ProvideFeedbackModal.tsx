import React, { useState, useEffect } from "react";
import { X, ThumbsUp, ThumbsDown, Star, Award, Eye, MessageSquare, ChevronDown, ShieldAlert } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks/useAuth";
import { useGetAssignedMenteesQuery } from "../../features/manager/managerApi";

interface EmployeeOption {
  id: string | number;
  employeeCode: string;
  staffName: string;
  avatarUrl?: string;
  designation?: string;
}

export interface EditingFeedbackData {
  id: string;
  recipientId?: string;
  recipient_name?: string;
  employeeName?: string;
  category?: string;
  feedback_type?: string;
  message?: string;
  is_anonymous?: boolean;
}

interface ProvideFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultEmployeeId?: string | number;
  employees?: EmployeeOption[];
  editingFeedback?: EditingFeedbackData | null;
}

export const CATEGORIES = [
  {
    key: "POSITIVE",
    label: "Positive",
    icon: ThumbsUp,
    activeBg: "#EAF8F1",
    activeBorder: "#22C55E",
    activeText: "#15803D",
    headerBg: "#EAF8F1",
    iconColor: "#22C55E",
  },
  {
    key: "NEGATIVE",
    label: "Negative",
    icon: ThumbsDown,
    activeBg: "#FFF1F2",
    activeBorder: "#F43F5E",
    activeText: "#BE123C",
    headerBg: "#FFF1F2",
    iconColor: "#F43F5E",
  },
  {
    key: "CONSTRUCTIVE",
    label: "Rating",
    icon: Star,
    activeBg: "#FFFBEB",
    activeBorder: "#F59E0B",
    activeText: "#B45309",
    headerBg: "#FEF3C7",
    iconColor: "#F59E0B",
  },
  {
    key: "REWARDS",
    label: "Rewards",
    icon: Award,
    activeBg: "#FEFCE8",
    activeBorder: "#EAB308",
    activeText: "#A16207",
    headerBg: "#FEF9C3",
    iconColor: "#EAB308",
  },
  {
    key: "OBSERVATION",
    label: "Observation",
    icon: Eye,
    activeBg: "#F8FAFC",
    activeBorder: "#94A3B8",
    activeText: "#475569",
    headerBg: "#F1F5F9",
    iconColor: "#64748B",
  },
  {
    key: "PROGRESS",
    label: "Progress",
    icon: MessageSquare,
    activeBg: "#EFF6FF",
    activeBorder: "#3B82F6",
    activeText: "#1D4ED8",
    headerBg: "#DBEAFE",
    iconColor: "#3B82F6",
  },
];

export const ProvideFeedbackModal: React.FC<ProvideFeedbackModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultEmployeeId,
  employees = [],
  editingFeedback = null,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string | number>(defaultEmployeeId || "");
  const [feedbackText, setFeedbackText] = useState(
    "Your performance this quarter has been excellent. You consistently meet your goals and demonstrate a strong work ethic. Keep up the great work!"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("POSITIVE");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER' || (user as any)?.isManager;
  const { data: assignedMentees = [] } = useGetAssignedMenteesQuery(undefined, { skip: !isManager });

  const assignedIds = new Set([
    ...assignedMentees.map((m) => String(m.id)),
    ...assignedMentees.map((m) => String(m.userId)),
    ...assignedMentees.map((m) => String(m.employeeCode).toLowerCase()),
  ]);

  // For manager, strictly restrict candidate employees to assigned mentees
  let candidateList: EmployeeOption[] = employees;
  if (isManager && candidateList.length > 0) {
    candidateList = candidateList.filter(
      (e) => assignedIds.has(String(e.id)) || assignedIds.has(String(e.employeeCode).toLowerCase())
    );
  }

  if (isManager && candidateList.length === 0 && assignedMentees.length > 0) {
    candidateList = assignedMentees.map((m) => ({
      id: m.userId || m.id,
      employeeCode: m.employeeCode,
      staffName: m.fullName || `${m.firstName} ${m.lastName}`.trim(),
      designation: m.designation,
    }));
  }

  // Fallback demo employee list if none passed (only for admin/HR)
  const employeeList: EmployeeOption[] =
    candidateList.length > 0
      ? candidateList
      : isManager
      ? []
      : [
          { id: "ZY192", employeeCode: "ZY192", staffName: "Robert Johnson", designation: "Software Developer" },
          { id: "INT-2025-001", employeeCode: "INT-2025-001", staffName: "Alex Chen", designation: "Backend Software Intern" },
          { id: "713", employeeCode: "713", staffName: "Jothi S", designation: "Senior Software Engineer" },
        ];

  useEffect(() => {
    if (editingFeedback) {
      setFeedbackText(editingFeedback.message || "");
      setSelectedCategory(editingFeedback.category || editingFeedback.feedback_type || "POSITIVE");
      setIsAnonymous(Boolean(editingFeedback.is_anonymous));
    } else {
      setFeedbackText(
        "Your performance this quarter has been excellent. You consistently meet your goals and demonstrate a strong work ethic. Keep up the great work!"
      );
      setSelectedCategory("POSITIVE");
      setIsAnonymous(false);
    }
  }, [editingFeedback, isOpen]);

  useEffect(() => {
    if (defaultEmployeeId && employeeList.some((e) => String(e.id) === String(defaultEmployeeId))) {
      setSelectedEmpId(defaultEmployeeId);
    } else if (employeeList.length > 0 && (!selectedEmpId || !employeeList.some((e) => String(e.id) === String(selectedEmpId)))) {
      setSelectedEmpId(employeeList[0].id);
    }
  }, [defaultEmployeeId, employeeList, selectedEmpId]);

  if (!isOpen) return null;

  const currentEmployee =
    employeeList.find((e) => String(e.id) === String(selectedEmpId) || e.employeeCode === String(selectedEmpId)) ||
    employeeList[0];

  const handlePost = async () => {
    const isEditing = Boolean(editingFeedback?.id);
    if (!isEditing && isManager && employeeList.length === 0) {
      toast.error("You can only provide feedback to employees assigned to you by HR or Super Admin.");
      return;
    }
    if (!feedbackText.trim()) {
      toast.error("Please enter feedback text.");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("accessToken") || "";
      const targetEmp = currentEmployee?.id || selectedEmpId || defaultEmployeeId;
      const url = isEditing ? `/api/feedbacks/${editingFeedback!.id}/` : "/api/feedbacks/";
      const method = isEditing ? "PUT" : "POST";

      const payload = isEditing
        ? {
            category: selectedCategory,
            feedback_type: selectedCategory,
            feedbackType: selectedCategory,
            message: feedbackText.trim(),
            description: feedbackText.trim(),
          }
        : {
            recipientId: targetEmp,
            employeeId: targetEmp,
            recipient_id: targetEmp,
            category: selectedCategory,
            feedback_type: selectedCategory,
            feedbackType: selectedCategory,
            message: feedbackText.trim(),
            description: feedbackText.trim(),
            is_anonymous: isAnonymous,
          };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.detail || (isEditing ? "Failed to update feedback" : "Failed to post feedback"));
      }

      toast.success(isEditing ? "Feedback updated successfully!" : "Feedback posted successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Could not save feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="w-full max-w-[540px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        style={{ animation: "fadeIn 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">
            {editingFeedback ? "Edit Feedback" : "Provide Feedback"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Select Employee Card or Restricted Notice or Edit Info */}
          {editingFeedback ? (
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
              <div className="text-xs text-slate-700">
                Editing feedback for:{" "}
                <span className="font-bold text-indigo-700">
                  {editingFeedback.recipient_name || editingFeedback.employeeName || currentEmployee?.staffName || "Team Member"}
                </span>
              </div>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Edit Mode
              </span>
            </div>
          ) : isManager && employeeList.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 text-xs">
              <ShieldAlert size={20} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <div className="font-bold text-amber-900 text-sm mb-0.5">Feedback Restricted</div>
                As a Tech Manager, you can only provide feedback to employees assigned to you by HR or Super Admin. This employee is not currently assigned to you.
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">Select Employee</label>
                {isManager && (
                  <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                    Assigned Direct Reports Only
                  </span>
                )}
              </div>
              <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all text-left shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-medium text-sm overflow-hidden shrink-0 shadow-sm">
                    {currentEmployee?.avatarUrl ? (
                      <img src={currentEmployee.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      currentEmployee?.staffName?.charAt(0) || "U"
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">
                      {currentEmployee?.employeeCode} - {currentEmployee?.staffName}
                    </div>
                    {currentEmployee?.designation && (
                      <div className="text-xs text-slate-500">{currentEmployee.designation}</div>
                    )}
                  </div>
                </div>
                <ChevronDown size={18} className="text-slate-400" />
              </button>

              {/* Dropdown Options */}
              {isDropdownOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1">
                  {employeeList.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setSelectedEmpId(emp.id);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700 shrink-0">
                        {emp.staffName?.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          {emp.employeeCode} - {emp.staffName}
                        </div>
                        {emp.designation && <div className="text-xs text-slate-400">{emp.designation}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Feedback Card with Textarea and Category Pills */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
              placeholder="Type feedback here..."
              className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
            />

            {/* 6 Category Pills matching media_1789919618447.png */}
            <div className="grid grid-cols-3 gap-2.5">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden"
                    style={{
                      background: isSelected ? cat.activeBg : "#FFFFFF",
                      borderColor: isSelected ? cat.activeBorder : "#E2E8F0",
                      boxShadow: isSelected ? `0 0 0 2px ${cat.activeBorder}30` : "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    {/* Top colored notch/header aesthetic matching screenshot */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5 opacity-60"
                      style={{ background: cat.headerBg }}
                    />
                    <IconComponent
                      size={20}
                      className="mb-1.5 transition-transform"
                      style={{
                        color: isSelected ? cat.iconColor : "#64748B",
                        transform: isSelected ? "scale(1.1)" : "scale(1)",
                      }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: isSelected ? cat.activeText : "#334155" }}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anonymous Checkbox and Post Action */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700">Anonymous</span>
            </label>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePost}
                disabled={isSubmitting || (!editingFeedback && isManager && employeeList.length === 0)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
                style={{ backgroundColor: "#4338CA" }}
              >
                {isSubmitting
                  ? editingFeedback
                    ? "Saving..."
                    : "Posting..."
                  : editingFeedback
                  ? "Save Changes"
                  : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvideFeedbackModal;
