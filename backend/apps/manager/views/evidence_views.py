from decimal import Decimal
from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.goals.models import Goal, GoalStatus
from .base import IsManagerUser, get_manager_reports_qs


# =====================================================================
# TM-04: EVIDENCE & DELIVERABLE VERIFICATION / AUDIT
# =====================================================================
class ManagerEvidenceView(APIView):
    """
    Feature TM-04: Evidence & Deliverable Verification / Audit
    Audit intern work proof (code repositories, pull requests, technical documentation,
    test coverages) and make explicit quality determinations.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_ids = [p.id for p in direct_reports]

        evidence_qs = EvidenceSubmission.objects.filter(
            employee__id__in=report_ids
        ).select_related('employee__user', 'goal', 'reviewed_by').order_by('-created_at')

        emp_filter = request.query_params.get('employee_id') or request.query_params.get('employeeId')
        status_filter = request.query_params.get('status')

        if emp_filter:
            evidence_qs = evidence_qs.filter(
                Q(employee__id__iexact=str(emp_filter)) |
                Q(employee__user__id__iexact=str(emp_filter))
            )

        if status_filter and status_filter.upper() != 'ALL':
            evidence_qs = evidence_qs.filter(review_status=status_filter.upper())

        data = [{
            'id': str(e.id),
            'employeeId': str(e.employee.id),
            'employeeName': e.employee.full_name,
            'employeeEmail': e.employee.user.email,
            'employeeCode': e.employee.employee_code,
            'goalTitle': e.goal.title if e.goal else 'General Milestone Deliverable',
            'goalId': str(e.goal.id) if e.goal else None,
            'taskTitle': e.goal.title if e.goal else 'General Milestone Deliverable',
            'taskId': str(e.goal.id) if e.goal else None,
            'expectedEvidenceType': e.goal.expected_evidence_type if e.goal else 'CODE_PR',
            'linkedCompetency': e.goal.linked_competency if e.goal else 'Technical Problem Solving & Debugging',
            'title': e.title,
            'description': e.description,
            'externalUrl': e.external_url,
            'fileAttachment': e.file_attachment.url if e.file_attachment else None,
            'version': e.version if hasattr(e, 'version') else 1,
            'isLockedForAppraisal': e.is_locked_for_appraisal if hasattr(e, 'is_locked_for_appraisal') else False,
            'reviewStatus': e.review_status,
            'reviewStatusDisplay': e.get_review_status_display(),
            'reviewNotes': e.review_notes,
            'reviewedByName': (e.reviewed_by.profile.full_name if hasattr(e.reviewed_by, 'profile') else e.reviewed_by.username) if e.reviewed_by else None,
            'reviewedAt': e.reviewed_at.strftime('%Y-%m-%d %H:%M') if e.reviewed_at else None,
            'createdAt': e.created_at.strftime('%Y-%m-%d %H:%M'),
        } for e in evidence_qs]

        return Response({
            'code': 200,
            'message': 'Evidence submissions retrieved successfully.',
            'data': data
        })


class ManagerEvidenceDecisionView(APIView):
    """
    Feature TM-04: Review Decision for Submitted Evidence
    Three-way decision:
      - ACCEPT (VERIFIED): Transitions task to COMPLETED, locks evidence in appraisal package.
      - REQUEST CHANGES (CHANGES_REQUESTED): Reopens task for mentee (IN_PROGRESS).
      - REJECT (REJECTED): Rejects deliverable with mandatory rationale.
      - INVALID_ARTIFACT: Flags corrupt/broken deliverable.
    """
    permission_classes = [IsManagerUser]

    def post(self, request, pk):
        evidence = EvidenceSubmission.objects.filter(id=pk).first()
        if not evidence:
            return Response({'code': 404, 'message': 'Evidence submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        raw_status = request.data.get('status', 'VERIFIED').upper()
        notes = (
            request.data.get('review_notes') or
            request.data.get('remarks') or
            request.data.get('notes') or
            ''
        ).strip()

        # Map frontend/aliases to valid status
        status_map = {
            'ACCEPT': EvidenceReviewStatus.VERIFIED,
            'APPROVED': EvidenceReviewStatus.VERIFIED,
            'VERIFIED': EvidenceReviewStatus.VERIFIED,
            'REQUEST_CHANGES': EvidenceReviewStatus.CHANGES_REQUESTED,
            'CHANGES_REQUESTED': EvidenceReviewStatus.CHANGES_REQUESTED,
            'REVISION_REQUESTED': EvidenceReviewStatus.CHANGES_REQUESTED,
            'REJECT': EvidenceReviewStatus.REJECTED,
            'REJECTED': EvidenceReviewStatus.REJECTED,
            'INVALID_ARTIFACT': EvidenceReviewStatus.INVALID_ARTIFACT,
        }

        new_status = status_map.get(raw_status, raw_status)
        if not hasattr(EvidenceReviewStatus, new_status):
            return Response({'code': 400, 'message': f'Invalid evidence status: {raw_status}'}, status=status.HTTP_400_BAD_REQUEST)

        # TM-04 Security & Integrity: Verification requires verified_by_id, verified_at, and evaluation remarks
        if not notes:
            notes = f"Evidence decision: {new_status} by mentor {request.user.username}"

        evidence.review_status = new_status
        evidence.review_notes = notes
        evidence.reviewed_by = request.user
        evidence.reviewed_at = timezone.now()

        # State Transition Rules & Invariants (Section 6)
        if new_status in [EvidenceReviewStatus.VERIFIED, EvidenceReviewStatus.APPROVED]:
            evidence.is_locked_for_appraisal = True
            if evidence.goal:
                evidence.goal.status = GoalStatus.COMPLETED
                evidence.goal.completion_percentage = Decimal('100.00')
                evidence.goal.is_blocked = False
                evidence.goal.save()
        elif new_status == EvidenceReviewStatus.CHANGES_REQUESTED:
            evidence.is_locked_for_appraisal = False
            if evidence.goal:
                evidence.goal.status = GoalStatus.IN_PROGRESS
                if evidence.goal.completion_percentage == Decimal('100.00'):
                    evidence.goal.completion_percentage = Decimal('80.00')
                evidence.goal.save()
        elif new_status == EvidenceReviewStatus.INVALID_ARTIFACT:
            if evidence.goal:
                evidence.goal.is_blocked = True
                evidence.goal.blocked_reason = f"Artifact invalid: {notes}"
                evidence.goal.save()

        evidence.save()

        return Response({
            'code': 200,
            'message': f'Evidence successfully marked as {evidence.get_review_status_display()}.',
            'data': {
                'id': str(evidence.id),
                'reviewStatus': evidence.review_status,
                'reviewStatusDisplay': evidence.get_review_status_display(),
                'isLockedForAppraisal': evidence.is_locked_for_appraisal,
                'reviewNotes': evidence.review_notes,
                'taskStatus': evidence.goal.status if evidence.goal else None,
            }
        })

