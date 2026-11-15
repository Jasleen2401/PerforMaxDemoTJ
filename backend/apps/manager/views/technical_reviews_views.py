from decimal import Decimal
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.evidence.models import EvidenceSubmission
from apps.performance.models import (
    PerformanceCycle,
    CycleStatus,
    TechnicalCapabilityParameter,
    TechnicalCapabilityReview,
    CycleEvaluatorAssignment,
    EvaluatorSectionType,
)
from apps.employees.models import EmployeeProfile
from apps.accounts.models import UserRole
from .base import IsManagerUser


# =====================================================================
# M-05: REVIEW TECHNICAL CAPABILITY
# =====================================================================
class ManagerTechnicalReviewsView(APIView):
    """
    Feature M-05: Review Technical Capability
    Review the intern/employee against configured technical capability parameters.
    Save or submit technical assessments with mentor observations and evidence links.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        emp_id = request.query_params.get('employee_id') or request.query_params.get('employeeId')
        if not emp_id:
            return Response({'code': 400, 'message': 'employee_id parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = EmployeeProfile.objects.filter(
            Q(id__iexact=str(emp_id)) |
            Q(user__id__iexact=str(emp_id)) |
            Q(employee_code__iexact=str(emp_id))
        ).first()

        if not profile:
            return Response({'code': 404, 'message': 'Intern/Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_hr_admin = (
            getattr(request.user, 'is_hr', False) or
            getattr(request.user, 'is_super_admin', False) or
            getattr(request.user, 'role', '') in [UserRole.SUPER_ADMIN, UserRole.HR] or
            request.user.is_staff or
            request.user.is_superuser
        )

        if not is_hr_admin:
            is_direct_manager = (profile.manager == request.user)
            is_assigned_evaluator = CycleEvaluatorAssignment.objects.filter(
                participant__employee=profile,
                evaluator=request.user,
                section=EvaluatorSectionType.TECHNICAL
            ).exists()
            if not is_direct_manager and not is_assigned_evaluator:
                return Response({
                    'code': 403,
                    'message': 'You can only view technical capabilities for employees assigned to you or reporting directly to you.'
                }, status=status.HTTP_403_FORBIDDEN)

        params = TechnicalCapabilityParameter.objects.filter(is_active=True).order_by('category', 'name')
        existing_reviews = {
            str(r.parameter_id): r
            for r in TechnicalCapabilityReview.objects.filter(employee=profile)
        }

        # Also grab submitted evidence to easily link
        submitted_evidence = EvidenceSubmission.objects.filter(employee=profile).values('id', 'title', 'external_url')

        data = []
        scores = []
        for p in params:
            rev = existing_reviews.get(str(p.id))
            score_val = float(rev.score) if rev and rev.score else 0.0
            if rev and rev.score:
                scores.append(score_val)

            data.append({
                'parameterId': str(p.id),
                'name': p.name,
                'category': p.category,
                'description': p.description,
                'benchmarkScore': float(p.benchmark_score),
                'weight': float(p.weight),
                'review': {
                    'id': str(rev.id) if rev else None,
                    'score': score_val,
                    'mentorAssessment': rev.mentor_assessment if rev else '',
                    'evidenceUrl': rev.evidence_url if rev else '',
                    'status': rev.status if rev else 'DRAFT',
                    'updatedAt': rev.updated_at.strftime('%Y-%m-%d %H:%M') if rev else None,
                }
            })

        avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0

        return Response({
            'code': 200,
            'message': 'Technical capability parameters and reviews loaded.',
            'data': {
                'employeeId': str(profile.id),
                'employeeName': profile.full_name,
                'employeeCode': profile.employee_code,
                'averageScore': avg_score,
                'parameters': data,
                'availableEvidence': list(submitted_evidence)
            }
        })

    def post(self, request):
        """
        TM-05: Save Draft vs. Finalize Ratings
        - Save Draft: stores to DB, allows later edits.
        - Finalize (LOCKED_FOR_APPRAISAL): Validates all 8 criteria scored (1.0-10.0) with evidence citations,
          computes 60% Weighted Technical Score, locks matrix.
        - If any score < 6.0: prompts IDP coaching pipeline recommendation.
        """
        emp_id = request.data.get('employee_id') or request.data.get('employeeId')
        raw_status = request.data.get('status', 'DRAFT').upper()
        reviews_list = request.data.get('reviews', [])
        if not reviews_list and ('parameter_id' in request.data or 'parameterId' in request.data):
            reviews_list = [request.data]

        if not emp_id or not reviews_list:
            return Response(
                {'code': 400, 'message': 'employee_id and reviews array or review parameter are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        profile = EmployeeProfile.objects.filter(
            Q(id__iexact=str(emp_id)) |
            Q(user__id__iexact=str(emp_id)) |
            Q(employee_code__iexact=str(emp_id))
        ).first()

        if not profile:
            return Response({'code': 404, 'message': 'Intern/Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_hr_admin = (
            getattr(request.user, 'is_hr', False) or
            getattr(request.user, 'is_super_admin', False) or
            getattr(request.user, 'role', '') in [UserRole.SUPER_ADMIN, UserRole.HR] or
            request.user.is_staff or
            request.user.is_superuser
        )

        if not is_hr_admin:
            is_assigned_evaluator = CycleEvaluatorAssignment.objects.filter(
                participant__employee=profile,
                evaluator=request.user,
                section=EvaluatorSectionType.TECHNICAL
            ).exists()
            if not is_assigned_evaluator:
                return Response({
                    'code': 403,
                    'message': 'Direct manager relationship alone does not grant permission to review technical capabilities. You must be explicitly assigned as the Technical evaluator by HR or Super Admin.'
                }, status=status.HTTP_403_FORBIDDEN)

        active_cycle = PerformanceCycle.objects.filter(status='ACTIVE').first() or PerformanceCycle.objects.first()

        if active_cycle and active_cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            return Response({
                'code': 400,
                'error': 'CYCLE_CLOSED',
                'message': f"Cannot submit or modify technical assessments for a cycle in '{active_cycle.get_status_display()}' status."
            }, status=status.HTTP_400_BAD_REQUEST)

        is_finalizing = raw_status in ['FINALIZE', 'FINALIZED', 'LOCKED_FOR_APPRAISAL', 'SUBMITTED']
        stored_status = 'LOCKED_FOR_APPRAISAL' if is_finalizing else 'SAVED_DRAFT'

        all_params = list(TechnicalCapabilityParameter.objects.filter(is_active=True))
        all_param_ids = {str(p.id) for p in all_params}

        # Validate mandatory evidence/justification and numerical range (1.0 - 10.0)
        submitted_param_ids = set()
        low_score_detected = False
        total_weighted_points = Decimal('0.00')
        total_weights = Decimal('0.00')

        for item in reviews_list:
            pid = str(item.get('parameter_id') or item.get('parameterId') or '')
            score_val = float(item.get('score') or 0.0)
            assessment = (item.get('mentor_assessment') or item.get('mentorAssessment') or item.get('notes') or '').strip()
            evidence_url = (item.get('evidence_url') or item.get('evidenceUrl') or '').strip()

            if is_finalizing and score_val <= 0:
                return Response({
                    'code': 400,
                    'message': f'System blocks finalization: All parameters must be assigned a score between 1.0 and 10.0.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if score_val > 0 and not assessment and not evidence_url:
                return Response({
                    'code': 400,
                    'message': 'Security & Integrity Rule: Numerical scores cannot be entered without at least one linked evidence reference or justification comment.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if score_val < 6.0 and score_val > 0:
                low_score_detected = True

            submitted_param_ids.add(pid)

        if is_finalizing and len(all_param_ids) > 0 and not all_param_ids.issubset(submitted_param_ids):
            missing_count = len(all_param_ids - submitted_param_ids)
            return Response({
                'code': 400,
                'message': f'System blocks finalization: {missing_count} mandatory criteria lack rating. All 8 core competencies must be scored before locking matrix.'
            }, status=status.HTTP_400_BAD_REQUEST)

        saved_count = 0
        for item in reviews_list:
            param_id = item.get('parameter_id') or item.get('parameterId')
            score = Decimal(str(min(10.0, max(0.0, float(item.get('score', 0))))))
            assessment = item.get('mentor_assessment') or item.get('mentorAssessment') or item.get('notes', '')
            evidence_url = item.get('evidence_url') or item.get('evidenceUrl', '')

            param = TechnicalCapabilityParameter.objects.filter(id=param_id).first()
            if not param:
                continue

            TechnicalCapabilityReview.objects.update_or_create(
                parameter=param,
                employee=profile,
                cycle=active_cycle,
                defaults={
                    'reviewer': request.user,
                    'score': score,
                    'mentor_assessment': assessment,
                    'evidence_url': evidence_url,
                    'status': stored_status,
                }
            )
            saved_count += 1
            weight = param.weight or Decimal('12.50')
            total_weighted_points += (score / Decimal('10.00')) * weight
            total_weights += weight

        # 60% Weighted Technical Score calculation
        weighted_60_tech_score = round(float(total_weighted_points * Decimal('0.60')), 2) if total_weights > 0 else 0.0

        action_word = "finalized and locked for appraisal" if is_finalizing else "saved as draft"
        return Response({
            'code': 200,
            'message': f'Technical capability assessment successfully {action_word} for {profile.full_name} ({saved_count} criteria scored).',
            'data': {
                'employeeId': str(profile.id),
                'status': stored_status,
                'savedParametersCount': saved_count,
                'weighted60Score': weighted_60_tech_score,
                'suggestIdpPipeline': low_score_detected,
                'idpPrompt': 'Score < 6.0 detected on core competency. Initiate Support & Coaching Pipeline (IDP)?' if low_score_detected else None
            }
        })

