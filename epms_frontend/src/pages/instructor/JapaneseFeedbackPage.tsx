// src/pages/instructor/JapaneseFeedbackPage.tsx
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  Plus,
  Eye,
  EyeOff,
  Search,
  RefreshCw,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  FileCheck,
  User,
  CornerDownRight,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  useGetJapaneseFeedbacksQuery,
  useGetJapaneseInternsQuery,
  useGetJapaneseBatchesQuery,
  useAddFeedbackCommentMutation,
  usePublishJapaneseFeedbackMutation,
} from "../../features/japanese/japaneseApi";
import { ProvideJapaneseFeedbackModal } from "../../components/instructor/ProvideJapaneseFeedbackModal";
import type { JapaneseFeedback } from "../../features/japanese/types";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  COACHING: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  CONSTRUCTIVE: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  TRAINING: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  POSITIVE: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  PRAISE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  SUGGESTION: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  OBSERVATION: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
};

export const JapaneseFeedbackPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [selectedSubBatch, setSelectedSubBatch] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedVisibility, setSelectedVisibility] = useState<string>("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Queries
  const {
    data: feedbackItems = [],
    isLoading,
    isFetching,
    refetch,
  } = useGetJapaneseFeedbacksQuery();
  const { data: batches = [] } = useGetJapaneseBatchesQuery();
  const { data: interns = [] } = useGetJapaneseInternsQuery();

  // Mutations
  const [addComment, { isLoading: isAddingComment }] = useAddFeedbackCommentMutation();
  const [publishFeedback, { isLoading: isPublishing }] = usePublishJapaneseFeedbackMutation();

  // Local state for inline replies per feedback ID
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Feedback feed updated.");
    } catch {
      toast.error("Failed to refresh feedback.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Batches
  const mainBatches = useMemo(() => batches.filter((b) => !b.parent_batch), [batches]);
  const subBatches = useMemo(() => {
    if (selectedBatch === "ALL") return batches.filter((b) => !!b.parent_batch);
    const parent = batches.find((b) => b.code === selectedBatch || b.id === selectedBatch);
    if (!parent) return [];
    return batches.filter((b) => b.parent_batch === parent.id);
  }, [batches, selectedBatch]);

  // Overview metric counts
  const counts = useMemo(() => {
    const total = feedbackItems.length;
    const drafts = feedbackItems.filter((f) => f.status === "DRAFT").length;
    const attention = feedbackItems.filter(
      (f) =>
        f.feedback_type === "CONSTRUCTIVE" ||
        f.feedback_type === "TRAINING" ||
        f.feedback_type === "COACHING"
    ).length;
    const totalReplies = feedbackItems.reduce((acc, f) => acc + (f.comments?.length || 0), 0);
    return { total, drafts, attention, totalReplies };
  }, [feedbackItems]);

  // Filtering
  const filteredFeedbacks = useMemo(() => {
    return feedbackItems.filter((item) => {
      // Status filter
      if (selectedStatus !== "ALL" && item.status !== selectedStatus) return false;

      // Visibility filter
      if (selectedVisibility !== "ALL" && item.visibility !== selectedVisibility) return false;

      // Category filter
      if (selectedCategory !== "ALL" && item.feedback_type !== selectedCategory) return false;

      // Batch filter
      if (selectedBatch !== "ALL") {
        const bCode = item.batch_code || "";
        const bName = item.batch_name || "";
        if (
          !bCode.toLowerCase().includes(selectedBatch.toLowerCase()) &&
          !bName.toLowerCase().includes(selectedBatch.toLowerCase())
        ) {
          return false;
        }
      }

      // Sub-batch filter
      if (selectedSubBatch !== "ALL") {
        const sbCode = item.sub_batch_code || "";
        const sbName = item.sub_batch_name || "";
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
          item.recipient_name?.toLowerCase().includes(term) ||
          item.recipient_full_name?.toLowerCase().includes(term) ||
          item.recipient_code?.toLowerCase().includes(term) ||
          item.recipient_email?.toLowerCase().includes(term);
        const msgMatch = item.message?.toLowerCase().includes(term);
        const commentMatch = item.comments?.some((c) => c.comment.toLowerCase().includes(term));
        if (!internMatch && !msgMatch && !commentMatch) return false;
      }

      return true;
    });
  }, [
    feedbackItems,
    selectedStatus,
    selectedVisibility,
    selectedCategory,
    selectedBatch,
    selectedSubBatch,
    searchTerm,
  ]);

  const hasActiveFilters =
    selectedBatch !== "ALL" ||
    selectedSubBatch !== "ALL" ||
    selectedCategory !== "ALL" ||
    selectedStatus !== "ALL" ||
    selectedVisibility !== "ALL" ||
    searchTerm.trim().length > 0;

  const resetFilters = () => {
    setSelectedBatch("ALL");
    setSelectedSubBatch("ALL");
    setSelectedCategory("ALL");
    setSelectedStatus("ALL");
    setSelectedVisibility("ALL");
    setSearchTerm("");
  };

  const toggleComments = (id: string) => {
    setExpandedComments((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePublish = async (id: string) => {
    try {
      await publishFeedback(id).unwrap();
      toast.success("Feedback published to intern dashboard!");
    } catch {
      toast.error("Failed to publish feedback.");
    }
  };

  const handleSendComment = async (feedbackId: string) => {
    const text = replyTexts[feedbackId]?.trim();
    if (!text) return;

    try {
      await addComment({ feedbackId, comment: text }).unwrap();
      toast.success("Reply posted to thread.");
      setReplyTexts((prev) => ({ ...prev, [feedbackId]: "" }));
      // Ensure comments section is expanded
      setExpandedComments((prev) => ({ ...prev, [feedbackId]: true }));
    } catch {
      toast.error("Failed to post comment.");
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
            <MessageSquare size={14} /> Continuous Development & Mentorship
          </div>
          <h1 className="text-xl font-bold text-slate-900">Developmental Feedback & Guidance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deliver continuous guidance, track intern replies, and support language mastery throughout the cycle.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isFetching}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh feed"
          >
            <RefreshCw
              size={16}
              className={`${isRefreshing || isFetching ? "animate-spin text-purple-600" : ""}`}
            />
          </button>

          <button
            onClick={() => setIsFeedbackModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-200 cursor-pointer transition-all"
          >
            <Plus size={16} />
            Provide Guidance
          </button>
        </div>
      </div>

      {/* 4 Interactive Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Feedback Given */}
        <div
          onClick={() => setSelectedStatus("ALL")}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-purple-200 hover:bg-purple-50/20 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
              Feedback Given
            </span>
            <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <MessageSquare size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.total}</div>
          <div className="text-[11px] text-purple-600 mt-1 font-medium">
            Total guidance entries recorded
          </div>
        </div>

        {/* Drafts */}
        <div
          onClick={() => setSelectedStatus("DRAFT")}
          className={`cursor-pointer transition-all rounded-3xl p-5 border shadow-xs ${
            selectedStatus === "DRAFT"
              ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400"
              : "bg-white border-slate-200/80 hover:border-amber-200 hover:bg-amber-50/20"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Draft Guidance
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900">{counts.drafts}</div>
          <div className="text-[11px] text-amber-600 mt-1 font-medium">
            Pending publication to intern
          </div>
        </div>

        {/* Requiring Attention / Constructive */}
        <div
          onClick={() => setSelectedCategory("CONSTRUCTIVE")}
          className={`cursor-pointer transition-all rounded-3xl p-5 border shadow-xs ${
            selectedCategory === "CONSTRUCTIVE"
              ? "bg-rose-50 border-rose-300 ring-2 ring-rose-400"
              : "bg-white border-slate-200/80 hover:border-rose-200 hover:bg-rose-50/20"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              Constructive Focus
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertCircle size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-900">{counts.attention}</div>
          <div className="text-[11px] text-rose-600 mt-1 font-medium">
            Coaching & remedial practice areas
          </div>
        </div>

        {/* Intern Replies */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
              Intern Replies
            </span>
            <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <CornerDownRight size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-900">{counts.totalReplies}</div>
          <div className="text-[11px] text-indigo-600 mt-1 font-medium">
            Interactive follow-up discussions
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by intern, code, or keyword..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-purple-500 focus:outline-none bg-slate-50/60"
            />
          </div>

          {/* Main Batch */}
          <div>
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

          {/* Sub-Batch */}
          <div>
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

          {/* Category */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:border-purple-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="COACHING">Coaching</option>
              <option value="CONSTRUCTIVE">Constructive</option>
              <option value="TRAINING">Training</option>
              <option value="POSITIVE">Positive</option>
              <option value="PRAISE">Praise</option>
              <option value="SUGGESTION">Suggestion</option>
              <option value="OBSERVATION">Observation</option>
            </select>
          </div>

          {/* Status & Visibility */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:border-purple-500 focus:outline-none"
            >
              <option value="ALL">Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer shrink-0 transition-colors"
                title="Reset filters"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Summary Tags */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Showing <strong className="text-slate-800">{filteredFeedbacks.length}</strong> of{" "}
            <strong className="text-slate-800">{feedbackItems.length}</strong> guidance entries
          </div>
          <div className="flex items-center gap-2">
            {selectedStatus !== "ALL" && (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                Status: {selectedStatus}
              </span>
            )}
            {selectedCategory !== "ALL" && (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                Category: {selectedCategory}
              </span>
            )}
            {selectedBatch !== "ALL" && (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                Batch: {selectedBatch}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Feed */}
      {isLoading ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          <RefreshCw size={24} className="animate-spin text-purple-600 mx-auto mb-3" />
          <div className="text-xs font-semibold text-slate-600">Loading guidance feed from server...</div>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 space-y-3">
          <MessageSquare size={40} className="text-slate-300 mx-auto" />
          <div className="font-bold text-slate-800 text-sm">No feedback records found</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try adjusting your search criteria or click "Provide Guidance" to record new mentorship for an intern.
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
        <div className="space-y-4">
          {filteredFeedbacks.map((item) => {
            const isDraft = item.status === "DRAFT";
            const isVisible = item.visibility === "PUBLIC";
            const catStyle = CATEGORY_COLORS[item.feedback_type] || CATEGORY_COLORS.OBSERVATION;
            const commentsCount = item.comments?.length || 0;
            const isExpanded = expandedComments[item.id] ?? (commentsCount > 0);

            const initials =
              (item.recipient_full_name || item.recipient_name)
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "IN";

            const formattedDate = item.created_at
              ? new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "";

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4 transition-all hover:border-purple-200"
              >
                {/* Card Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-purple-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                      {initials}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        {item.recipient_full_name || item.recipient_name || "Intern"}
                        {item.recipient_id && (
                          <Link
                            to={`/employees/${item.recipient_id}/profile`}
                            className="text-slate-400 hover:text-purple-600 transition-colors"
                            title="View intern profile"
                          >
                            <ExternalLink size={12} />
                          </Link>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {item.recipient_code || "ID N/A"}
                        {item.recipient_email ? ` • ${item.recipient_email}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Batch Chip */}
                    {item.batch_name && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10.5px] border border-slate-200">
                        {item.batch_name} {item.sub_batch_code ? `(${item.sub_batch_code})` : ""}
                      </span>
                    )}

                    {/* Category Chip */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10.5px] border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                    >
                      {item.feedback_type}
                    </span>

                    {/* Visibility Badge */}
                    {isVisible ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Eye size={12} /> Visible to Intern
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        <EyeOff size={12} /> Confidential
                      </span>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isDraft
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-purple-100 text-purple-800 border border-purple-200"
                      }`}
                    >
                      {item.status}
                    </span>

                    {/* Draft Publish Action */}
                    {isDraft && (
                      <button
                        onClick={() => handlePublish(item.id)}
                        disabled={isPublishing}
                        className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-xs cursor-pointer transition-all ml-1"
                      >
                        Publish Now
                      </button>
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div className="space-y-1">
                  <div className="text-[10.5px] uppercase font-bold text-purple-900 tracking-wider flex items-center gap-1">
                    <Sparkles size={13} className="text-purple-600" />
                    Guidance & Actionable Advice:
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed bg-purple-50/40 p-4 rounded-2xl border border-purple-100/80">
                    {item.message}
                  </p>
                </div>

                {/* Threaded Discussion Section */}
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleComments(item.id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-purple-600 cursor-pointer transition-colors"
                    >
                      <CornerDownRight size={14} className="text-purple-500" />
                      <span>
                        Conversation Thread ({commentsCount}{" "}
                        {commentsCount === 1 ? "reply" : "replies"})
                      </span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <div className="text-[11px] text-slate-400">
                      Logged {formattedDate} by {item.sender_name || "Instructor Tanaka"}
                    </div>
                  </div>

                  {/* Comments list if expanded */}
                  {isExpanded && (
                    <div className="space-y-2.5 pl-3 border-l-2 border-purple-200 pt-1">
                      {commentsCount === 0 ? (
                        <div className="text-[11px] text-slate-400 italic py-1">
                          No replies in this thread yet. Send a follow-up comment below.
                        </div>
                      ) : (
                        item.comments.map((comment) => {
                          const isInstructorAuthor =
                            comment.author_name?.toLowerCase().includes("tanaka") ||
                            comment.author_name?.toLowerCase().includes("instructor");

                          return (
                            <div
                              key={comment.id}
                              className={`p-3 rounded-2xl text-xs space-y-1 ${
                                isInstructorAuthor
                                  ? "bg-purple-50/70 border border-purple-100 ml-4"
                                  : "bg-slate-50 border border-slate-200/80 mr-4"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <User size={12} className={isInstructorAuthor ? "text-purple-600" : "text-slate-500"} />
                                  {comment.author_name}
                                  {isInstructorAuthor && (
                                    <span className="text-[9.5px] px-1.5 py-0.2 rounded-sm bg-purple-100 text-purple-700 font-semibold">
                                      Instructor
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10.5px] text-slate-400">
                                  {comment.created_at
                                    ? new Date(comment.created_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : ""}
                                </span>
                              </div>
                              <p className="text-slate-700 leading-relaxed">{comment.comment}</p>
                            </div>
                          );
                        })
                      )}

                      {/* Inline Reply Box for Instructor */}
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          value={replyTexts[item.id] || ""}
                          onChange={(e) =>
                            setReplyTexts((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendComment(item.id);
                            }
                          }}
                          placeholder="Reply to intern or add follow-up note..."
                          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 bg-slate-50/60"
                        />
                        <button
                          onClick={() => handleSendComment(item.id)}
                          disabled={isAddingComment || !replyTexts[item.id]?.trim()}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
                        >
                          <Send size={13} />
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isFeedbackModalOpen && (
        <ProvideJapaneseFeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
        />
      )}
    </div>
  );
};

export default JapaneseFeedbackPage;
