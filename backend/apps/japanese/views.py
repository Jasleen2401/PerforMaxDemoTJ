from django.utils import timezone
from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.employees.models import EmployeeProfile
from apps.performance.models import PerformanceCycle, CycleStatus
from .models import (
    JapaneseLearningPlan, JapaneseTopic, JapaneseMaterial,
    JapanesePracticeResult, JLPTAttempt, JLPTEligibilityRecord,
    JapaneseEvaluation, JapaneseEvalCriterion, JapaneseEvalRating,
    JapaneseBatch, EvaluationStatus,
)
from .serializers import (
    JapaneseLearningPlanSerializer, JapaneseTopicSerializer,
    JapaneseMaterialSerializer, JapanesePracticeResultSerializer,
    JLPTAttemptSerializer, JLPTEligibilityRecordSerializer,
    JapaneseEvaluationSerializer, JapaneseEvalCriterionSerializer,
    JapaneseEvalRatingSerializer, JapaneseBatchSerializer,
)


class IsHROrInstructor(permissions.BasePermission):
    """Allow HR, Super Admin, or designated Japanese Instructor."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and (
            request.user.role in ('HR', 'SUPER_ADMIN', 'MANAGER', 'INSTRUCTOR') or
            request.user.is_superuser
        )


class IsHROrSuperAdmin(permissions.BasePermission):
    """Allow only HR or Super Admin to create, update, or delete batches."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and (
            request.user.role in ('HR', 'SUPER_ADMIN') or
            request.user.is_superuser
        )


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
        if 'score' in request.data and request.data['score'] is not None:
            obj.score = request.data['score']
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
        if 'passed' in request.data:
            obj.passed = request.data['passed']
        if 'score' in request.data and request.data['score'] is not None:
            obj.score = request.data['score']
        obj.notes = request.data.get('notes', obj.notes)
        obj.save()

        # Update or create matching JLPTEligibilityRecord
        cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).first()
        if cycle:
            eligibility_record, _ = JLPTEligibilityRecord.objects.get_or_create(
                intern=obj.intern,
                cycle=cycle,
                defaults={'required_level': obj.level}
            )
            if obj.passed:
                eligibility_record.eligibility_status = 'MEETS_REQUIREMENT'
            else:
                eligibility_record.eligibility_status = 'DOES_NOT_MEET'
            eligibility_record.linked_attempt = obj
            eligibility_record.updated_by = request.user
            eligibility_record.save()

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
            return qs.filter(intern__user=user, status=EvaluationStatus.ACCEPTED)
        if user.role in ('MANAGER', 'INSTRUCTOR'):
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


# ---------------------------------------------------------------------------
# JapaneseBatchViewSet — Batch navigation and management
# ---------------------------------------------------------------------------
class JapaneseBatchViewSet(viewsets.ModelViewSet):
    serializer_class = JapaneseBatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        # Instructors can only view batches, cannot create/update/delete
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHROrSuperAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        # Japanese Instructors only see batches assigned to them
        if user.role == 'INSTRUCTOR':
            qs = JapaneseBatch.objects.filter(instructors=user)
        elif user.role in ('HR', 'SUPER_ADMIN') or user.is_superuser:
            qs = JapaneseBatch.objects.all()
        else:
            qs = JapaneseBatch.objects.filter(instructors=user)

        # Filters by main vs sub-batch
        parent_id = self.request.query_params.get('parent')
        if parent_id:
            qs = qs.filter(parent_batch_id=parent_id)
        else:
            is_sub = self.request.query_params.get('sub')
            if is_sub == 'true' or is_sub == '1':
                qs = qs.filter(parent_batch__isnull=False)
            elif is_sub == 'all':
                pass
            else:
                # Default: list main batches
                qs = qs.filter(parent_batch__isnull=True)

        # Status filter
        status_param = self.request.query_params.get('status')
        if status_param and status_param.upper() != 'ALL':
            qs = qs.filter(status__iexact=status_param)

        # Filters to distinguish batches created by HR vs Super Admin (retained for backward compatibility)
        creator_role = self.request.query_params.get('creator_role') or self.request.query_params.get('creatorRole')
        if creator_role:
            qs = qs.filter(created_by__role=creator_role.upper())

        # Search filter
        q = self.request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(
                models.Q(name__icontains=q) |
                models.Q(code__icontains=q) |
                models.Q(cohort__icontains=q) |
                models.Q(description__icontains=q) |
                models.Q(sub_batches__name__icontains=q) |
                models.Q(sub_batches__code__icontains=q) |
                models.Q(interns__full_name__icontains=q) |
                models.Q(sub_batches__interns__full_name__icontains=q)
            )

        return qs.prefetch_related(
            'instructors', 'interns',
            'sub_batches', 'sub_batches__interns',
            'interns__japanese_learning_plans',
            'interns__japanese_evaluations',
            'interns__japanese_practice_results',
            'interns__jlpt_attempts',
            'interns__jlpt_eligibility_records',
            'sub_batches__interns__japanese_learning_plans',
            'sub_batches__interns__japanese_evaluations',
            'sub_batches__interns__japanese_practice_results',
            'sub_batches__interns__jlpt_attempts',
            'sub_batches__interns__jlpt_eligibility_records',
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ---------------------------------------------------------------------------
# JapaneseDashboardView — aggregated live dashboard metrics for instructor
# ---------------------------------------------------------------------------
class JapaneseDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        cycle_id = request.query_params.get('cycle')
        if cycle_id:
            cycle = PerformanceCycle.objects.filter(id=cycle_id).first()
        else:
            cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).first()
            if not cycle:
                cycle = PerformanceCycle.objects.first()

        # Assigned Batches
        if user.role == 'INSTRUCTOR':
            assigned_batches = JapaneseBatch.objects.filter(instructors=user, parent_batch__isnull=True)
        else:
            assigned_batches = JapaneseBatch.objects.filter(parent_batch__isnull=True)

        assigned_batch_count = assigned_batches.count()

        # Interns
        if user.role == 'INSTRUCTOR' and assigned_batches.exists():
            all_batches = JapaneseBatch.objects.filter(
                models.Q(id__in=assigned_batches) | models.Q(parent_batch__in=assigned_batches)
            )
            interns_qs = EmployeeProfile.objects.filter(japanese_batches__in=all_batches).distinct()
        else:
            interns_qs = EmployeeProfile.objects.filter(user__role='INTERN')

        total_interns = interns_qs.count()

        # Plans
        plans_qs = JapaneseLearningPlan.objects.all()
        if cycle:
            plans_qs = plans_qs.filter(cycle=cycle)
        if user.role == 'INSTRUCTOR':
            plans_qs = plans_qs.filter(intern__in=interns_qs)
        active_plans = plans_qs.filter(is_active=True).count()

        # Practice Results
        practice_qs = JapanesePracticeResult.objects.filter(intern__in=interns_qs).select_related('intern', 'topic', 'material')
        total_exercises = practice_qs.count()
        submitted_exercises = practice_qs.filter(status='SUBMITTED').count()
        reviewed_exercises = practice_qs.filter(status='REVIEWED').count()

        # Evaluations
        evals_qs = JapaneseEvaluation.objects.filter(intern__in=interns_qs).select_related('intern', 'cycle', 'evaluator')
        if cycle:
            evals_qs = evals_qs.filter(cycle=cycle)

        # JLPT
        jlpt_attempts_qs = JLPTAttempt.objects.filter(intern__in=interns_qs).select_related('intern')
        eligibility_qs = JLPTEligibilityRecord.objects.filter(intern__in=interns_qs).select_related('intern', 'cycle')
        if cycle:
            eligibility_qs = eligibility_qs.filter(cycle=cycle)

        # Returned evaluations (urgent attention)
        returned_evals = [
            {
                'id': str(ev.id),
                'internId': str(ev.intern.id),
                'internName': ev.intern.full_name or ev.intern.user.username,
                'internCode': ev.intern.employee_code,
                'cycleName': ev.cycle.name,
                'status': ev.status,
                'returnReason': ev.return_reason,
                'returnedAt': ev.returned_at.isoformat() if ev.returned_at else None,
            }
            for ev in evals_qs.filter(status='RETURNED')
        ]

        # Pending Actions
        pending_actions = []
        for ev in returned_evals:
            pending_actions.append({
                'type': 'RETURNED_EVALUATION',
                'title': f'Evaluation Returned: {ev["internName"]}',
                'description': ev['returnReason'] or 'HR requested revisions on this evaluation.',
                'link': f'/japanese/evaluations?evaluationId={ev["id"]}',
                'severity': 'HIGH',
                'date': ev['returnedAt'],
            })

        for p in practice_qs.filter(status='SUBMITTED')[:5]:
            pending_actions.append({
                'type': 'PRACTICE_REVIEW',
                'title': f'Exercise Submitted: {p.intern.full_name or p.intern.user.username}',
                'description': f'Topic: {p.topic.title}',
                'link': '/japanese/evaluations',
                'severity': 'MEDIUM',
                'date': p.submitted_at.isoformat() if p.submitted_at else None,
            })

        for a in jlpt_attempts_qs.filter(verified=False)[:5]:
            pending_actions.append({
                'type': 'JLPT_VERIFICATION',
                'title': f'JLPT Verification: {a.intern.full_name or a.intern.user.username} ({a.level})',
                'description': f'Exam Date: {a.exam_date} — Result: {"Pass" if a.passed else ("Fail" if a.passed is False else "Pending")}',
                'link': '/japanese/jlpt',
                'severity': 'MEDIUM',
                'date': a.created_at.isoformat() if a.created_at else None,
            })

        # Upcoming deadlines
        upcoming_deadlines = []
        for pl in plans_qs.filter(target_date__isnull=False).order_by('target_date')[:6]:
            upcoming_deadlines.append({
                'id': str(pl.id),
                'title': pl.title,
                'internName': pl.intern.full_name or pl.intern.user.username,
                'targetLevel': pl.target_jlpt_level,
                'targetDate': str(pl.target_date),
            })

        # Batch summary for dashboard
        batch_summaries = []
        for b in assigned_batches[:6]:
            creator_role = b.created_by.role if b.created_by else 'SUPER_ADMIN'
            batch_summaries.append({
                'id': str(b.id),
                'name': b.name,
                'cohort': b.cohort,
                'internsCount': b.interns.count(),
                'creatorName': b.created_by.get_full_name() or b.created_by.username if b.created_by else 'System Admin',
                'creatorRole': 'HR Partner' if creator_role == 'HR' else 'Super Admin',
                'createdAt': b.created_at.strftime('%b %d, %Y'),
            })

        pending_eval_count = evals_qs.filter(status__in=[EvaluationStatus.PENDING, EvaluationStatus.DRAFT, EvaluationStatus.RETURNED]).count()

        data = {
            'overview': {
                'assignedBatches': assigned_batch_count,
                'totalInterns': total_interns,
                'pendingEvaluations': pending_eval_count,
                'activePlans': active_plans,
                'totalExercises': total_exercises,
                'submittedExercises': submitted_exercises,
                'reviewedExercises': reviewed_exercises,
                'avgProgress': round((reviewed_exercises / max(total_exercises, 1)) * 100, 1),
            },
            'evaluations_summary': {
                'total': evals_qs.count(),
                'pending': evals_qs.filter(status=EvaluationStatus.PENDING).count(),
                'draft': evals_qs.filter(status=EvaluationStatus.DRAFT).count(),
                'submitted': evals_qs.filter(status=EvaluationStatus.SUBMITTED).count(),
                'returned': evals_qs.filter(status=EvaluationStatus.RETURNED).count(),
                'accepted': evals_qs.filter(status=EvaluationStatus.ACCEPTED).count(),
            },
            'returned_evaluations': returned_evals,
            'jlpt_summary': {
                'meetsRequirement': eligibility_qs.filter(eligibility_status='MEETS_REQUIREMENT').count(),
                'pendingVerification': eligibility_qs.filter(eligibility_status='PENDING_VERIFICATION').count(),
                'inProgress': eligibility_qs.filter(eligibility_status='IN_PROGRESS').count(),
                'notStarted': eligibility_qs.filter(eligibility_status='NOT_STARTED').count(),
                'unverifiedAttempts': jlpt_attempts_qs.filter(verified=False).count(),
            },
            'pending_actions': pending_actions,
            'upcoming_deadlines': upcoming_deadlines,
            'batches': batch_summaries,
            'activeCycle': {
                'id': str(cycle.id) if cycle else None,
                'name': cycle.name if cycle else 'No Active Cycle',
            }
        }
        return Response(data)


# ---------------------------------------------------------------------------
# JapaneseInternsView — comprehensive assigned intern roster with Japanese stats
# ---------------------------------------------------------------------------
class JapaneseInternsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        q = request.query_params.get('q', '').strip().lower()
        batch = request.query_params.get('batch', '').strip()
        jlpt_level = request.query_params.get('jlpt_level', '').strip()
        status_filter = request.query_params.get('status', '').strip()
        cycle_id = request.query_params.get('cycle')

        qs = EmployeeProfile.objects.filter(user__role='INTERN').select_related(
            'user', 'department', 'manager'
        ).prefetch_related(
            'japanese_learning_plans',
            'japanese_evaluations',
            'japanese_practice_results',
            'jlpt_attempts',
            'jlpt_eligibility_records'
        )

        if user.role == 'INSTRUCTOR':
            assigned_batches = JapaneseBatch.objects.filter(instructors=user)
            if assigned_batches.exists():
                qs = qs.filter(japanese_batches__in=assigned_batches).distinct()

        if q:
            qs = qs.filter(
                models.Q(first_name__icontains=q) |
                models.Q(last_name__icontains=q) |
                models.Q(employee_code__icontains=q) |
                models.Q(user__email__icontains=q)
            )

        if batch:
            qs = qs.filter(
                models.Q(department__name__icontains=batch) |
                models.Q(japanese_batches__name__icontains=batch)
            )

        results = []
        for p in qs:
            plan = p.japanese_learning_plans.filter(is_active=True).first()
            if not plan and cycle_id:
                plan = p.japanese_learning_plans.filter(cycle_id=cycle_id).first()
            if not plan:
                plan = p.japanese_learning_plans.first()

            if jlpt_level and plan and plan.target_jlpt_level != jlpt_level:
                continue

            evaluation = p.japanese_evaluations.first()
            if status_filter and evaluation and evaluation.status != status_filter:
                continue

            eligibility = p.jlpt_eligibility_records.first()
            topics_count = plan.topics.count() if plan else 0
            practice_results = p.japanese_practice_results.all()
            completed_practice = practice_results.filter(status='REVIEWED').count()
            total_practice = practice_results.count()
            progress_pct = round((completed_practice / max(total_practice, 1)) * 100, 1) if total_practice > 0 else 0.0

            results.append({
                'id': str(p.id),
                'userId': str(p.user.id),
                'fullName': p.full_name or p.user.username,
                'employeeCode': p.employee_code,
                'email': p.user.email,
                'department': p.department.name if p.department else 'Language & Training',
                'managerName': p.manager.username if p.manager else 'Unassigned',
                'designation': p.designation or 'Intern',
                'plan': {
                    'id': str(plan.id) if plan else None,
                    'title': plan.title if plan else 'No Active Plan',
                    'targetLevel': plan.target_jlpt_level if plan else None,
                    'targetDate': str(plan.target_date) if plan and plan.target_date else None,
                    'topicsCount': topics_count,
                } if plan else None,
                'progress': {
                    'percentage': progress_pct,
                    'completed': completed_practice,
                    'total': total_practice,
                },
                'evaluation': {
                    'id': str(evaluation.id) if evaluation else None,
                    'status': evaluation.status if evaluation else 'NOT_ASSIGNED',
                    'statusDisplay': evaluation.get_status_display() if evaluation else 'Not Assigned',
                    'overallScore': float(evaluation.overall_language_score) if evaluation and evaluation.overall_language_score is not None else None,
                    'returnReason': evaluation.return_reason if evaluation and evaluation.status == 'RETURNED' else '',
                } if evaluation else None,
                'jlpt': {
                    'requiredLevel': eligibility.required_level if eligibility else (plan.target_jlpt_level if plan else 'N4'),
                    'eligibilityStatus': eligibility.eligibility_status if eligibility else 'NOT_STARTED',
                    'eligibilityStatusDisplay': eligibility.get_eligibility_status_display() if eligibility else 'Not Started',
                    'attemptsCount': p.jlpt_attempts.count(),
                    'lastAttemptPassed': p.jlpt_attempts.first().passed if p.jlpt_attempts.exists() else None,
                },
            })

        return Response(results)
