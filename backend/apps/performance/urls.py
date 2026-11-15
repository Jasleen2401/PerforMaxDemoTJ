from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.performance.views import (
    PerformanceCycleViewSet,
    CycleParticipantViewSet,
    CycleCompetencyViewSet,
    CycleEvaluatorAssignmentViewSet,
    EvaluationCriterionViewSet,
    AppraisalViewSet,
    PerformanceImprovementPlanViewSet,
    RecognitionRewardViewSet,
    TechnicalCapabilityReviewViewSet,
    BehavioralCapabilityReviewViewSet,
    TechnicalEvaluationView,
    BehavioralEvaluationView,
    EvaluationSummaryView,
    MentorAssignedEvaluationsView,
)

router = DefaultRouter()
router.register(r'cycles', PerformanceCycleViewSet, basename='performancecycle')
router.register(r'participants', CycleParticipantViewSet, basename='cycleparticipant')
router.register(r'competencies', CycleCompetencyViewSet, basename='cyclecompetency')
router.register(r'evaluators', CycleEvaluatorAssignmentViewSet, basename='cycleevaluatorassignment')
router.register(r'criteria', EvaluationCriterionViewSet, basename='evaluationcriterion')
router.register(r'appraisals', AppraisalViewSet, basename='appraisal')
router.register(r'pips', PerformanceImprovementPlanViewSet, basename='pip')
router.register(r'rewards', RecognitionRewardViewSet, basename='recognitionreward')
router.register(r'technical-reviews', TechnicalCapabilityReviewViewSet, basename='technicalcapabilityreview')
router.register(r'behavioral-reviews', BehavioralCapabilityReviewViewSet, basename='behavioralcapabilityreview')

from apps.manager.views import ManagerTalentRadarPPOView, ManagerTechnicalReviewsView

urlpatterns = [
    path('evaluations/mentor/assigned/', MentorAssignedEvaluationsView.as_view(), name='mentor_assigned_evaluations'),
    path('evaluations/technical/', TechnicalEvaluationView.as_view(), name='technical_evaluation'),
    path('evaluations/behavioral/', BehavioralEvaluationView.as_view(), name='behavioral_evaluation'),
    path('evaluations/summary/', EvaluationSummaryView.as_view(), name='evaluation_summary'),
    path('verdict/', ManagerTalentRadarPPOView.as_view(), name='performance_verdict'),
    path('ratings/', ManagerTechnicalReviewsView.as_view(), name='performance_ratings'),
    path('', include(router.urls)),
]

