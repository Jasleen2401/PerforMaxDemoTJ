from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.performance.views import (
    PerformanceCycleViewSet,
    CycleParticipantViewSet,
    EvaluationCriterionViewSet,
    AppraisalViewSet,
    PerformanceImprovementPlanViewSet,
    RecognitionRewardViewSet,
)

router = DefaultRouter()
router.register(r'cycles', PerformanceCycleViewSet, basename='performancecycle')
router.register(r'participants', CycleParticipantViewSet, basename='cycleparticipant')
router.register(r'criteria', EvaluationCriterionViewSet, basename='evaluationcriterion')
router.register(r'appraisals', AppraisalViewSet, basename='appraisal')
router.register(r'pips', PerformanceImprovementPlanViewSet, basename='pip')
router.register(r'rewards', RecognitionRewardViewSet, basename='recognitionreward')

from apps.manager.views import ManagerTalentRadarPPOView, ManagerTechnicalReviewsView

urlpatterns = [
    path('verdict/', ManagerTalentRadarPPOView.as_view(), name='performance_verdict'),
    path('ratings/', ManagerTechnicalReviewsView.as_view(), name='performance_ratings'),
    path('', include(router.urls)),
]

