from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    JapaneseLearningPlan, JapaneseTopic, JapaneseMaterial,
    JapanesePracticeResult, JLPTAttempt, JLPTEligibilityRecord,
    JapaneseEvaluation, JapaneseEvalCriterion, JapaneseEvalRating,
    EvaluationStatus,
)
from .serializers import (
    JapaneseLearningPlanSerializer, JapaneseTopicSerializer,
    JapaneseMaterialSerializer, JapanesePracticeResultSerializer,
    JLPTAttemptSerializer, JLPTEligibilityRecordSerializer,
    JapaneseEvaluationSerializer, JapaneseEvalCriterionSerializer,
    JapaneseEvalRatingSerializer,
)


class IsHROrInstructor(permissions.BasePermission):
    """Allow HR, Super Admin, or designated Japanese Instructor."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.role in ('HR', 'SUPER_ADMIN', 'MANAGER')


class JapaneseLearningPlanViewSet(viewsets.ModelViewSet):
    serializer_class = JapaneseLearningPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = JapaneseLearningPlan.objects.select_related('intern', 'cycle', 'instructor')
        if user.role == 'INTERN':
            return qs.filter(intern__user=user)
        # HR/Manager/Admin see all or filter by cycle
        cycle_id = self.request.query_params.get('cycle')
        if cycle_id:
            qs = qs.filter(cycle_id=cycle_id)
        intern_id = self.request.query_params.get('intern')
        if intern_id:
            qs = qs.filter(intern_id=intern_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)


class JapaneseTopicViewSet(viewsets.ModelViewSet):
    serializer_class = JapaneseTopicSerializer
    permission_classes = [IsHROrInstructor]

    def get_queryset(self):
        qs = JapaneseTopic.objects.select_related('plan')
        plan_id = self.request.query_params.get('plan')
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        return qs


class JapaneseMaterialViewSet(viewsets.ModelViewSet):
    serializer_class = JapaneseMaterialSerializer
    permission_classes = [IsHROrInstructor]

    def get_queryset(self):
        qs = JapaneseMaterial.objects.select_related('topic')
        topic_id = self.request.query_params.get('topic')
        if topic_id:
            qs = qs.filter(topic_id=topic_id)
        return qs


class JapanesePracticeResultViewSet(viewsets.ModelViewSet):
    serializer_class = JapanesePracticeResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = JapanesePracticeResult.objects.select_related('intern', 'topic', 'material')
        if user.role == 'INTERN':
            return qs.filter(intern__user=user)
        intern_id = self.request.query_params.get('intern')
        if intern_id:
            qs = qs.filter(intern_id=intern_id)
        return qs

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Intern submits a practice result."""
        obj = self.get_object()
        if obj.intern.user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        obj.status = 'SUBMITTED'
        obj.submitted_at = timezone.now()
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Instructor reviews a practice result."""
        obj = self.get_object()
        obj.status = 'REVIEWED'
        obj.instructor_remarks = request.data.get('instructor_remarks', obj.instructor_remarks)
        obj.reviewed_by = request.user
        obj.reviewed_at = timezone.now()
        obj.save()
        return Response(self.get_serializer(obj).data)


class JLPTAttemptViewSet(viewsets.ModelViewSet):
    serializer_class = JLPTAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = JLPTAttempt.objects.select_related('intern', 'verified_by')
        if user.role == 'INTERN':
            return qs.filter(intern__user=user)
        intern_id = self.request.query_params.get('intern')
        if intern_id:
            qs = qs.filter(intern_id=intern_id)
        return qs

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Instructor/HR verifies a JLPT result."""
        obj = self.get_object()
        obj.verified = True
        obj.verified_by = request.user
        obj.verified_at = timezone.now()
        obj.passed = request.data.get('passed', obj.passed)
        obj.notes = request.data.get('notes', obj.notes)
        obj.save()
        return Response(self.get_serializer(obj).data)


class JLPTEligibilityRecordViewSet(viewsets.ModelViewSet):
    serializer_class = JLPTEligibilityRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = JLPTEligibilityRecord.objects.select_related('intern', 'cycle', 'linked_attempt')
        if user.role == 'INTERN':
            return qs.filter(intern__user=user)
        cycle_id = self.request.query_params.get('cycle')
        if cycle_id:
            qs = qs.filter(cycle_id=cycle_id)
        return qs


class JapaneseEvaluationViewSet(viewsets.ModelViewSet):
    serializer_class = JapaneseEvaluationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = JapaneseEvaluation.objects.select_related('intern', 'cycle', 'evaluator').prefetch_related('ratings')
        if user.role == 'INTERN':
            # Interns only see published/accepted evaluations (not private remarks)
            return qs.filter(intern__user=user, status=EvaluationStatus.ACCEPTED)
        if user.role == 'MANAGER':
            # Instructors see evaluations they own
            return qs.filter(evaluator=user)
        # HR / Admin see all
        cycle_id = self.request.query_params.get('cycle')
        if cycle_id:
            qs = qs.filter(cycle_id=cycle_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(evaluator=self.request.user)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Instructor submits evaluation to HR."""
        obj = self.get_object()
        if obj.evaluator != request.user and request.user.role not in ('HR', 'SUPER_ADMIN'):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        if obj.status not in (EvaluationStatus.DRAFT, EvaluationStatus.RETURNED, EvaluationStatus.RESUBMITTED):
            return Response({'error': f'Cannot submit from status: {obj.status}'}, status=status.HTTP_400_BAD_REQUEST)
        new_status = EvaluationStatus.RESUBMITTED if obj.status == EvaluationStatus.RETURNED else EvaluationStatus.SUBMITTED
        obj.status = new_status
        obj.submitted_at = timezone.now()
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def return_to_instructor(self, request, pk=None):
        """HR returns evaluation to instructor for revision."""
        if request.user.role not in ('HR', 'SUPER_ADMIN'):
            return Response({'error': 'Only HR can return evaluations'}, status=status.HTTP_403_FORBIDDEN)
        obj = self.get_object()
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'error': 'A return reason is required'}, status=status.HTTP_400_BAD_REQUEST)
        obj.status = EvaluationStatus.RETURNED
        obj.return_reason = reason
        obj.returned_at = timezone.now()
        obj.returned_by = request.user
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """HR accepts evaluation as part of the review package."""
        if request.user.role not in ('HR', 'SUPER_ADMIN'):
            return Response({'error': 'Only HR can accept evaluations'}, status=status.HTTP_403_FORBIDDEN)
        obj = self.get_object()
        obj.status = EvaluationStatus.ACCEPTED
        obj.save()
        return Response(self.get_serializer(obj).data)


class JapaneseEvalCriterionViewSet(viewsets.ModelViewSet):
    serializer_class = JapaneseEvalCriterionSerializer
    permission_classes = [IsHROrInstructor]

    def get_queryset(self):
        qs = JapaneseEvalCriterion.objects.select_related('cycle')
        cycle_id = self.request.query_params.get('cycle')
        if cycle_id:
            qs = qs.filter(cycle_id=cycle_id)
        return qs


class JapaneseEvalRatingViewSet(viewsets.ModelViewSet):
    serializer_class = JapaneseEvalRatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = JapaneseEvalRating.objects.select_related('evaluation', 'criterion')
        evaluation_id = self.request.query_params.get('evaluation')
        if evaluation_id:
            qs = qs.filter(evaluation_id=evaluation_id)
        return qs
