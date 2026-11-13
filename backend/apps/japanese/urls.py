from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    JapaneseLearningPlanViewSet, JapaneseTopicViewSet, JapaneseMaterialViewSet,
    JapanesePracticeResultViewSet, JLPTAttemptViewSet, JLPTEligibilityRecordViewSet,
    JapaneseEvaluationViewSet, JapaneseEvalCriterionViewSet, JapaneseEvalRatingViewSet,
    JapaneseBatchViewSet, JapaneseDashboardView, JapaneseInternsView,
)

router = DefaultRouter()
router.register(r'batches', JapaneseBatchViewSet, basename='japanese-batch')
router.register(r'learning-plans', JapaneseLearningPlanViewSet, basename='japanese-plan')
router.register(r'topics', JapaneseTopicViewSet, basename='japanese-topic')
router.register(r'materials', JapaneseMaterialViewSet, basename='japanese-material')
router.register(r'practice-results', JapanesePracticeResultViewSet, basename='japanese-practice')
router.register(r'jlpt-attempts', JLPTAttemptViewSet, basename='jlpt-attempt')
router.register(r'jlpt-eligibility', JLPTEligibilityRecordViewSet, basename='jlpt-eligibility')
router.register(r'evaluations', JapaneseEvaluationViewSet, basename='japanese-evaluation')
router.register(r'eval-criteria', JapaneseEvalCriterionViewSet, basename='japanese-eval-criterion')
router.register(r'eval-ratings', JapaneseEvalRatingViewSet, basename='japanese-eval-rating')

urlpatterns = [
    path('dashboard/', JapaneseDashboardView.as_view(), name='japanese-dashboard'),
    path('assigned-interns/', JapaneseInternsView.as_view(), name='japanese-assigned-interns'),
    path('', include(router.urls)),
]
