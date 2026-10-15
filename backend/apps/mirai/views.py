from rest_framework import viewsets, permissions
from .models import MIRAIProgram, MIRAIStageRecord, MIRAICheckpoint, Q4PanelValidation, PPODecision
from .serializers import (
    MIRAIProgramSerializer,
    MIRAIStageRecordSerializer,
    MIRAICheckpointSerializer,
    Q4PanelValidationSerializer,
    PPODecisionSerializer,
)


class MIRAIProgramViewSet(viewsets.ModelViewSet):
    queryset = MIRAIProgram.objects.all()
    serializer_class = MIRAIProgramSerializer
    permission_classes = [permissions.IsAuthenticated]


class MIRAIStageRecordViewSet(viewsets.ModelViewSet):
    queryset = MIRAIStageRecord.objects.all()
    serializer_class = MIRAIStageRecordSerializer
    permission_classes = [permissions.IsAuthenticated]


class MIRAICheckpointViewSet(viewsets.ModelViewSet):
    queryset = MIRAICheckpoint.objects.all()
    serializer_class = MIRAICheckpointSerializer
    permission_classes = [permissions.IsAuthenticated]


class Q4PanelValidationViewSet(viewsets.ModelViewSet):
    queryset = Q4PanelValidation.objects.all()
    serializer_class = Q4PanelValidationSerializer
    permission_classes = [permissions.IsAuthenticated]


class PPODecisionViewSet(viewsets.ModelViewSet):
    queryset = PPODecision.objects.all()
    serializer_class = PPODecisionSerializer
    permission_classes = [permissions.IsAuthenticated]
