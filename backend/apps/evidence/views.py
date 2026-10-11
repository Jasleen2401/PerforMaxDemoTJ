import os
from django.http import FileResponse
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.accounts.permissions import IsManager
from apps.evidence.models import EvidenceSubmission
from apps.evidence.serializers import EvidenceSubmissionSerializer, ReviewEvidenceSerializer

class EvidenceSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = EvidenceSubmissionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['goal', 'task', 'employee', 'review_status']
    search_fields = ['title', 'description', 'goal__title', 'task__title', 'employee__first_name']
    ordering_fields = ['created_at', 'review_status']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return EvidenceSubmission.objects.none()

        base_qs = EvidenceSubmission.objects.select_related('employee__user', 'goal', 'task', 'reviewed_by').all()

        if user.is_super_admin or user.is_hr:
            return base_qs

        if user.is_manager:
            return base_qs.filter(Q(employee__manager=user) | Q(employee__user=user))

        # Intern sees only their submitted evidence
        return base_qs.filter(employee__user=user)

    def perform_create(self, serializer):
        user = self.request.user
        if not hasattr(user, 'profile'):
            raise permissions.exceptions.PermissionDenied("User profile not found.")
        goal = serializer.validated_data.get('goal')
        task = serializer.validated_data.get('task')
        if not goal and not task:
            raise permissions.exceptions.PermissionDenied("Evidence must be associated with an assigned goal or task.")
        if goal and goal.employee != user.profile:
            raise permissions.exceptions.PermissionDenied("You can only submit evidence for your own assigned goals.")
        if task and task.intern != user.profile:
            raise permissions.exceptions.PermissionDenied("You can only submit evidence for your own assigned tasks.")
        serializer.save(employee=user.profile)

    @action(detail=True, methods=['get'], url_path='download')
    def download_file(self, request, pk=None):
        """Securely stream evidence file to authorized users only."""
        evidence = self.get_object()
        if not evidence.file_attachment:
            return Response(
                {"detail": "No file attachment found for this evidence submission."},
                status=status.HTTP_404_NOT_FOUND
            )
        try:
            filename = os.path.basename(evidence.file_attachment.name)
            response = FileResponse(evidence.file_attachment.open('rb'), as_attachment=True, filename=filename)
            return response
        except FileNotFoundError:
            return Response(
                {"detail": "File not found on storage server."},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], permission_classes=[IsManager], url_path='review')
    def review_submission(self, request, pk=None):
        """Manager or HR reviews and approves/rejects submitted evidence."""
        evidence = self.get_object()
        user = request.user

        # Ensure manager manages this employee or is HR
        if not (user.is_hr or user.is_super_admin or evidence.employee.manager == user):
            return Response(
                {"detail": "You do not have permission to review this evidence."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ReviewEvidenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        evidence.review_status = serializer.validated_data['review_status']
        evidence.review_notes = serializer.validated_data.get('review_notes', '')
        evidence.reviewed_by = user
        evidence.reviewed_at = timezone.now()
        evidence.save()

        return Response(EvidenceSubmissionSerializer(evidence).data, status=status.HTTP_200_OK)
