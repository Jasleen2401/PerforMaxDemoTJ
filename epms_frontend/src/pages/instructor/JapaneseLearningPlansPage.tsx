// src/pages/instructor/JapaneseLearningPlansPage.tsx
import React, { useState } from "react";
import {
  BookOpen,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  ExternalLink,
  Calendar,
} from "lucide-react";
import {
  useGetJapaneseLearningPlansQuery,
  useGetJapaneseInternsQuery,
} from "../../features/japanese/japaneseApi";
import { CreateLearningPlanModal } from "../../components/instructor/CreateLearningPlanModal";
import { AddTopicModal } from "../../components/instructor/AddTopicModal";
import { AddMaterialModal } from "../../components/instructor/AddMaterialModal";
import type { JapaneseLearningPlan } from "../../features/japanese/types";

export const JapaneseLearningPlansPage: React.FC = () => {
  const { data: plans = [], isLoading } = useGetJapaneseLearningPlansQuery();
  const { data: interns = [] } = useGetJapaneseInternsQuery();

  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  const [activePlanForTopic, setActivePlanForTopic] = useState<JapaneseLearningPlan | null>(null);
  const [activeTopicForMaterial, setActiveTopicForMaterial] = useState<{ id: string; title: string } | null>(null);

  const internsDropdown = interns.map((i) => ({
    id: i.id,
    fullName: i.fullName,
    employeeCode: i.employeeCode,
  }));

  const toggleExpand = (id: string) => {
    setExpandedPlanId((prev) => (prev === id ? null : id));
  };

  const handleOpenAddTopic = (plan: JapaneseLearningPlan) => {
    setActivePlanForTopic(plan);
    setIsTopicModalOpen(true);
  };

  const handleOpenAddMaterial = (topicId: string, topicTitle: string) => {
    setActiveTopicForMaterial({ id: topicId, title: topicTitle });
    setIsMaterialModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <BookOpen size={14} /> Curricula & Materials
          </div>
          <h1 className="text-xl font-bold text-gray-900">Japanese Learning Plans</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Organize structured learning modules, grammar drills, IT keigo topics, and exercise materials.
          </p>
        </div>

        <button
          onClick={() => setIsPlanModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 cursor-pointer"
        >
          <Plus size={16} />
          Create New Plan
        </button>
      </div>

      {/* Plans List */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400 text-xs">Loading learning plans...</div>
      ) : plans.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-gray-200/80 p-8 space-y-2">
          <BookOpen size={36} className="text-gray-300 mx-auto mb-2" />
          <div className="font-bold text-gray-700 text-sm">No learning plans found</div>
          <p className="text-xs text-gray-400">Click "Create New Plan" to design a curriculum for an intern.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const isExpanded = expandedPlanId === plan.id;
            const topicsCount = plan.topics?.length || 0;

            return (
              <div
                key={plan.id}
                className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden transition-all"
              >
                {/* Plan Header Bar */}
                <div
                  onClick={() => toggleExpand(plan.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <button className="text-gray-400 mt-1">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-base font-bold text-gray-900">{plan.title}</h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {plan.target_jlpt_level}
                        </span>
                        {plan.is_active && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Active Plan
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{plan.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs">
                    <div className="text-right">
                      <div className="font-semibold text-gray-800">
                        {plan.intern_name} ({plan.intern_code})
                      </div>
                      {plan.target_date && (
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                          <Calendar size={12} /> Target: {plan.target_date}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddTopic(plan);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 font-bold text-xs"
                    >
                      <Plus size={14} /> Add Topic
                    </button>
                  </div>
                </div>

                {/* Expanded Topics & Materials Accordion */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100 space-y-4 bg-gray-50/30">
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Curriculum Topics & Materials ({topicsCount})
                      </span>
                    </div>

                    {topicsCount === 0 ? (
                      <div className="p-4 rounded-2xl bg-white border border-dashed border-gray-200 text-center text-xs text-gray-400">
                        No topics added to this learning plan yet. Click "Add Topic" to begin structuring modules.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {plan.topics?.map((topic) => (
                          <div
                            key={topic.id}
                            className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                                  {topic.order}
                                </span>
                                <h3 className="font-bold text-gray-900 text-xs">{topic.title}</h3>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenAddMaterial(topic.id, topic.title)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                              >
                                <Plus size={13} /> Add Material
                              </button>
                            </div>

                            {/* Materials Sub-list */}
                            {topic.materials && topic.materials.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {topic.materials.map((mat) => (
                                  <div
                                    key={mat.id}
                                    className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText size={14} className="text-blue-600 shrink-0" />
                                      <div className="min-w-0">
                                        <div className="font-semibold text-gray-800 truncate" title={mat.title}>
                                          {mat.title}
                                        </div>
                                        <span className="text-[10px] text-gray-400 uppercase font-medium">
                                          {mat.material_type} • {mat.estimated_minutes} min
                                        </span>
                                      </div>
                                    </div>
                                    {mat.external_url && (
                                      <a
                                        href={mat.external_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 hover:text-blue-800 shrink-0 ml-2"
                                        title="Open resource"
                                      >
                                        <ExternalLink size={13} />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-gray-400 italic pl-8">
                                No study materials attached to this topic yet.
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {isPlanModalOpen && (
        <CreateLearningPlanModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          interns={internsDropdown}
        />
      )}

      {isTopicModalOpen && activePlanForTopic && (
        <AddTopicModal
          isOpen={isTopicModalOpen}
          onClose={() => {
            setIsTopicModalOpen(false);
            setActivePlanForTopic(null);
          }}
          planId={activePlanForTopic.id}
          planTitle={activePlanForTopic.title}
          defaultOrder={(activePlanForTopic.topics?.length || 0) + 1}
        />
      )}

      {isMaterialModalOpen && activeTopicForMaterial && (
        <AddMaterialModal
          isOpen={isMaterialModalOpen}
          onClose={() => {
            setIsMaterialModalOpen(false);
            setActiveTopicForMaterial(null);
          }}
          topicId={activeTopicForMaterial.id}
          topicTitle={activeTopicForMaterial.title}
        />
      )}
    </div>
  );
};

export default JapaneseLearningPlansPage;
