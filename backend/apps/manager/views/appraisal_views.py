from decimal import Decimal
from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.performance.models import Appraisal, AppraisalRating, AppraisalStatus, EvaluationCriterion, PerformanceCycle
from apps.employees.models import EmployeeProfile
from .base import IsManagerUser, get_manager_reports_qs


# =====================================================================
# M-09, M-10, M-11: CONDUCT, SAVE, AND SUBMIT PERFORMANCE REVIEW
# =====================================================================
class ManagerAppraisalSubmissionsView(APIView):
    """
    Feature M-09: Conduct Performance Review
    Feature M-10: Save Review (Draft)
    Feature M-11: Submit Review
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_ids = [p.id for p in direct_reports]

        appraisals = Appraisal.objects.filter(
            employee__id__in=report_ids
        ).select_related('employee__user', 'cycle', 'reviewer').order_by('-created_at')

        data = [{
            'id': str(a.id),
            'employeeId': str(a.employee.id),
            'employeeName': a.employee.full_name,
            'employeeCode': a.employee.employee_code,
            'cycleId': str(a.cycle.id),
            'cycleName': a.cycle.name,
            'status': a.status,
            'statusDisplay': a.get_status_display(),
            'overallScore': float(a.overall_score) if a.overall_score else None,
            'selfComments': a.self_comments,
            'reviewerComments': a.reviewer_comments,
            'submittedAt': a.submitted_at.strftime('%Y-%m-%d %H:%M') if a.submitted_at else None,
        } for a in appraisals]

        return Response({'code': 200, 'data': data})

    def post(self, request):
        emp_id = request.data.get('employee_id') or request.data.get('employeeId')
        cycle_id = request.data.get('cycle_id') or request.data.get('cycleId')
        score = request.data.get('overall_score') or request.data.get('overallScore') or request.data.get('score')
        comments = request.data.get('reviewer_comments') or request.data.get('finalComment') or request.data.get('comments', '')
        submit = bool(request.data.get('submit', False))

        if not emp_id:
            return Response({'code': 400, 'message': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = EmployeeProfile.objects.filter(
            Q(id__iexact=str(emp_id)) | Q(user__id__iexact=str(emp_id)) | Q(employee_code__iexact=str(emp_id))
        ).first()

        if not profile:
            return Response({'code': 404, 'message': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        cycle = None
        if cycle_id:
            cycle = PerformanceCycle.objects.filter(id=str(cycle_id)).first()
        if not cycle:
            cycle = PerformanceCycle.objects.filter(status='ACTIVE').first() or PerformanceCycle.objects.first()

        appraisal, created = Appraisal.objects.get_or_create(
            employee=profile,
            cycle=cycle,
            defaults={
                'reviewer': request.user,
                'status': AppraisalStatus.SUBMITTED if submit else AppraisalStatus.DRAFT,
                'overall_score': Decimal(str(score)) if score is not None else None,
                'reviewer_comments': comments,
                'submitted_at': timezone.now() if submit else None,
            }
        )

        if not created:
            if score is not None:
                appraisal.overall_score = Decimal(str(score))
            if comments:
                appraisal.reviewer_comments = comments
            appraisal.reviewer = request.user
            appraisal.status = AppraisalStatus.SUBMITTED if submit else AppraisalStatus.DRAFT
            if submit:
                appraisal.submitted_at = timezone.now()
            appraisal.save()

        return Response({
            'code': 201 if created else 200,
            'message': f"Review {'submitted' if submit else 'saved as draft'} successfully.",
            'data': {
                'id': str(appraisal.id),
                'employeeId': str(profile.id),
                'status': appraisal.status,
                'overallScore': float(appraisal.overall_score) if appraisal.overall_score else None,
            }
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ManagerSaveAppraisalDraftView(APIView):
    """
    Feature M-10: Save Review
    Progressively save incomplete review as a draft to continue later.
    """
    permission_classes = [IsManagerUser]

    def post(self, request, pk):
        appraisal = Appraisal.objects.filter(id=pk).first()
        if not appraisal:
            return Response({'code': 404, 'message': 'Appraisal not found.'}, status=status.HTTP_404_NOT_FOUND)

        ratings_data = request.data.get('ratings', [])
        comments = request.data.get('reviewer_comments') or request.data.get('finalComment', '')

        if comments:
            appraisal.reviewer_comments = comments

        appraisal.status = AppraisalStatus.DRAFT
        appraisal.reviewer = request.user
        appraisal.save()

        # Update or create individual criterion ratings
        for r in ratings_data:
            criterion_id = r.get('criterion_id') or r.get('criterionId') or r.get('questionId')
            score = r.get('score') or r.get('ratingValue', 0)
            note = r.get('comments') or r.get('comment', '')

            criterion = EvaluationCriterion.objects.filter(
                Q(id__iexact=str(criterion_id)) | Q(name__icontains=str(criterion_id))
            ).first()

            if criterion:
                AppraisalRating.objects.update_or_create(
                    appraisal=appraisal,
                    criterion=criterion,
                    defaults={'score': Decimal(str(score)), 'comments': note}
                )

        return Response({
            'code': 200,
            'message': 'Review draft saved successfully. You can continue anytime.',
            'data': {'id': str(appraisal.id), 'status': appraisal.status}
        })


class ManagerSubmitAppraisalView(APIView):
    """
    Feature M-11: Submit Review
    Finalize the Mentor's review for the next stage of the evaluation process.
    """
    permission_classes = [IsManagerUser]

    def post(self, request, pk):
        appraisal = Appraisal.objects.filter(id=pk).first()
        if not appraisal:
            return Response({'code': 404, 'message': 'Appraisal not found.'}, status=status.HTTP_404_NOT_FOUND)

        comments = request.data.get('reviewer_comments') or request.data.get('finalComment', '')
        if comments:
            appraisal.reviewer_comments = comments

        ratings = appraisal.ratings.all()
        if ratings.exists():
            # Compute weighted overall score
            total_weighted = Decimal('0.00')
            total_weight = Decimal('0.00')
            for r in ratings:
                total_weighted += r.score * (r.criterion.weight / Decimal('100.00'))
                total_weight += r.criterion.weight
            appraisal.overall_score = round(total_weighted, 2)
        elif not appraisal.overall_score:
            score = request.data.get('overall_score') or request.data.get('score')
            if score is not None:
                appraisal.overall_score = Decimal(str(score))
            else:
                appraisal.overall_score = Decimal('85.00')

        appraisal.status = AppraisalStatus.SUBMITTED
        appraisal.reviewer = request.user
        appraisal.submitted_at = timezone.now()
        appraisal.save()

        return Response({
            'code': 200,
            'message': f'Performance review submitted for {appraisal.employee.full_name}. Overall Score: {appraisal.overall_score}',
            'data': {
                'id': str(appraisal.id),
                'status': appraisal.status,
                'overallScore': float(appraisal.overall_score),
                'submittedAt': appraisal.submitted_at.strftime('%Y-%m-%d %H:%M'),
            }
        })
