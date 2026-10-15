from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MIRAIProgramViewSet,
    MIRAIStageRecordViewSet,
    MIRAICheckpointViewSet,
    Q4PanelValidationViewSet,
    PPODecisionViewSet,
)

router = DefaultRouter()
router.register(r'programs', MIRAIProgramViewSet, basename='mirai-program')
router.register(r'stages', MIRAIStageRecordViewSet, basename='mirai-stage')
router.register(r'checkpoints', MIRAICheckpointViewSet, basename='mirai-checkpoint')
router.register(r'panels', Q4PanelValidationViewSet, basename='mirai-panel')
router.register(r'ppo', PPODecisionViewSet, basename='mirai-ppo')

urlpatterns = [
    path('', include(router.urls)),
]
