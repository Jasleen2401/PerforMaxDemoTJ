import uuid
from decimal import Decimal
from django.utils import timezone
from django.db import transaction, connection
from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.performance.models import (
    PerformanceCycle,
    CycleParticipant,
    CycleStatus,
    EvaluationCriterion,
    TechnicalCapabilityReview,
    Appraisal,
    AppraisalRating,
    AppraisalType,
    AppraisalStatus,
    PerformanceImprovementPlan,
    RecognitionReward,
)
from apps.performance.serializers import (
    PerformanceCycleSerializer,
    CycleParticipantSerializer,
    EligibleInternSerializer,
    EvaluationCriterionSerializer,
    AppraisalSerializer,
    SubmitAppraisalSerializer,
    PerformanceImprovementPlanSerializer,
    RecognitionRewardSerializer,
)
from apps.employees.models import EmployeeProfile, EmploymentStatus
from apps.japanese.models import JapaneseEvaluation
from apps.performance.services.scoring import ScoringService
from apps.accounts.permissions import IsHR, IsManager
from apps.accounts.models import UserRole
from rest_framework.exceptions import PermissionDenied

class PerformanceCycleViewSet(viewsets.ModelViewSet):
    serializer_class = PerformanceCycleSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['name', 'description']
    ordering_fields = ['start_date', 'end_date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return PerformanceCycle.objects.none()

        is_hr_admin = getattr(user, 'is_super_admin', False) or getattr(user, 'is_hr', False) or getattr(user, 'role', '') in ['SUPER_ADMIN', 'HR']
        if is_hr_admin:
            return PerformanceCycle.objects.select_related('created_by').prefetch_related('goals', 'participants').all()

        active_statuses = [
            CycleStatus.ACTIVE,
            CycleStatus.IN_PROGRESS,
            CycleStatus.REVIEW_PERIOD,
            CycleStatus.READY_FOR_HR_REVIEW,
            CycleStatus.FINALIZED,
            CycleStatus.PUBLISHED,
            CycleStatus.CLOSED,
        ]

        if getattr(user, 'role', '') == 'INTERN':
            return PerformanceCycle.objects.filter(
                participants__employee__user=user,
                status__in=active_statuses
            ).distinct().select_related('created_by').prefetch_related('goals')

        return PerformanceCycle.objects.filter(
            status__in=active_statuses
        ).select_related('created_by').prefetch_related('goals')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'activate', 'enroll_participants', 'unenroll_participant', 'eligible_interns']:
            return [IsHR()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        cycle = self.get_object()
        if cycle.status != CycleStatus.DRAFT:
            return Response(
                {"detail": f"Only cycles in DRAFT status can be deleted. Current status is '{cycle.get_status_display()}'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        cycle = self.get_object()
        if cycle.status in [CycleStatus.ACTIVE, CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            if 'technical_weight' in request.data or 'behavioral_weight' in request.data:
                return Response(
                    {"detail": "Cannot modify scoring weights on an active or closed cycle."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['get'], url_path='readiness', permission_classes=[permissions.IsAuthenticated])
    def readiness(self, request, pk=None):
        cycle = self.get_object()
        errors = []
        checklist = {}

        # 1. Name & Dates
        has_name = bool(cycle.name and cycle.name.strip())
        checklist['name_valid'] = has_name
        if not has_name:
            errors.append("Cycle name is required.")

        has_dates = bool(cycle.start_date and cycle.end_date and cycle.end_date >= cycle.start_date)
        checklist['dates_valid'] = has_dates
        if not cycle.start_date or not cycle.end_date:
            errors.append("Cycle start date and end date must both be specified.")
        elif cycle.end_date < cycle.start_date:
            errors.append("Cycle end date must be on or after start date.")

        # 2. MIRAI Quarter
        has_quarter = bool(cycle.mirai_stage)
        checklist['quarter_designated'] = has_quarter
        if not has_quarter:
            errors.append("MIRAI program quarter (Q1–Q4) must be designated.")

        # 3. Weights
        tw = cycle.technical_weight or Decimal('0.00')
        bw = cycle.behavioral_weight or Decimal('0.00')
        weights_sum = tw + bw
        weights_balanced = (weights_sum == Decimal('100.00'))
        checklist['weights_balanced'] = weights_balanced
        if not weights_balanced:
            errors.append(f"Technical ({tw}%) and Behavioral ({bw}%) weights must sum to exactly 100.00% (currently {weights_sum}%).")

        # 4. Rating Scale
        scale_valid = bool(cycle.rating_scale_max and cycle.rating_scale_max > Decimal('0.0'))
        checklist['scale_valid'] = scale_valid
        if not scale_valid:
            errors.append("Rating scale maximum must be greater than 0.")

        # 5. Deadlines
        has_deadlines = bool(cycle.self_assessment_deadline and cycle.evaluator_deadline)
        checklist['deadlines_populated'] = has_deadlines
        if not cycle.self_assessment_deadline:
            errors.append("Self-assessment deadline must be specified before activation.")
        if not cycle.evaluator_deadline:
            errors.append("Evaluator review deadline must be specified before activation.")

        deadlines_sequence_valid = True
        if cycle.start_date and cycle.end_date:
            if cycle.self_assessment_deadline and not (cycle.start_date <= cycle.self_assessment_deadline <= cycle.end_date):
                deadlines_sequence_valid = False
                errors.append("Self-assessment deadline must fall within cycle start and end dates.")
            if cycle.evaluator_deadline:
                if not (cycle.start_date <= cycle.evaluator_deadline <= cycle.end_date):
                    deadlines_sequence_valid = False
                    errors.append("Evaluator deadline must fall within cycle start and end dates.")
                if cycle.self_assessment_deadline and cycle.evaluator_deadline < cycle.self_assessment_deadline:
                    deadlines_sequence_valid = False
                    errors.append("Evaluator review deadline must be on or after self-assessment deadline.")
            if cycle.evidence_deadline:
                if not (cycle.start_date <= cycle.evidence_deadline <= cycle.end_date):
                    deadlines_sequence_valid = False
                    errors.append("Evidence deadline must fall within cycle start and end dates.")
        checklist['deadlines_sequence_valid'] = deadlines_sequence_valid

        # 6. Participants
        participant_count = cycle.participants.count()
        has_participants = (participant_count >= 1)
        checklist['participants_enrolled'] = has_participants
        checklist['participant_count'] = participant_count
        if not has_participants:
            errors.append("Cannot activate cycle: At least one intern must be enrolled in the cohort.")

        # 7. Explicit Japanese Mandatory Decision (Mandatory or Not Mandatory)
        japanese_configured = (cycle.japanese_evaluation_mandatory is not None)
        checklist['japanese_mandatory_explicit'] = japanese_configured
        if not japanese_configured:
            errors.append("Japanese evaluation requirement must be explicitly configured as either Mandatory or Not Mandatory before activation.")

        is_ready = (len(errors) == 0)
        return Response({
            "cycle_id": str(cycle.id),
            "cycle_name": cycle.name,
            "current_status": cycle.status,
            "is_ready": is_ready,
            "readiness_errors": errors,
            "checklist": checklist
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='activate', permission_classes=[IsHR])
    def activate(self, request, pk=None):
        cycle = self.get_object()
        readiness_resp = self.readiness(request, pk=pk)
        readiness_data = readiness_resp.data

        if not readiness_data.get('is_ready', False):
            return Response({
                "error": "ACTIVATION_READINESS_FAILED",
                "message": "Cycle does not meet all activation readiness requirements.",
                "readiness_errors": readiness_data.get('readiness_errors', [])
            }, status=status.HTTP_400_BAD_REQUEST)

        # Default evidence deadline to self_assessment_deadline if omitted
        if not cycle.evidence_deadline and cycle.self_assessment_deadline:
            cycle.evidence_deadline = cycle.self_assessment_deadline

        cycle.status = CycleStatus.ACTIVE
        cycle.save()

        return Response({
            "message": "Performance cycle successfully activated.",
            "status": cycle.status,
            "activated_at": timezone.now().isoformat(),
            "data": PerformanceCycleSerializer(cycle).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='participants', permission_classes=[permissions.IsAuthenticated])
    def list_participants(self, request, pk=None):
        cycle = self.get_object()
        user = request.user
        is_hr_admin = getattr(user, 'is_super_admin', False) or getattr(user, 'is_hr', False) or getattr(user, 'role', '') in ['SUPER_ADMIN', 'HR']

        qs = CycleParticipant.objects.filter(cycle=cycle).select_related(
            'employee', 'employee__user', 'employee__department', 'employee__manager', 'added_by', 'cycle'
        )

        if not is_hr_admin:
            if getattr(user, 'role', '') == 'MANAGER':
                qs = qs.filter(employee__manager=user)
            elif getattr(user, 'role', '') == 'INTERN':
                qs = qs.filter(employee__user=user)
            else:
                qs = qs.none()

        serializer = CycleParticipantSerializer(qs, many=True)
        return Response({
            "count": qs.count(),
            "results": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='enroll', permission_classes=[IsHR])
    def enroll_participants(self, request, pk=None):
        cycle = self.get_object()
        if cycle.status not in [CycleStatus.DRAFT, CycleStatus.VALIDATING]:
            return Response(
                {"detail": f"Cannot enroll participants into a cycle in '{cycle.get_status_display()}' status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_employee_ids = request.data.get('employee_ids', [])
        if not isinstance(raw_employee_ids, list) or len(raw_employee_ids) == 0:
            return Response(
                {"detail": "employee_ids must be a non-empty list of employee UUIDs."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Database engine lock where supported (e.g. PostgreSQL)
        if connection.features.has_select_for_update:
            PerformanceCycle.objects.select_for_update().get(id=cycle.id)

        existing_enrolled = set(
            CycleParticipant.objects.filter(cycle=cycle).values_list('employee_id', flat=True)
        )

        valid_employees = {
            emp.id: emp for emp in EmployeeProfile.objects.filter(id__in=raw_employee_ids).select_related('user', 'department', 'manager')
        }

        results = []
        enrolled_count = 0
        skipped_count = 0
        failed_count = 0

        for emp_id_str in raw_employee_ids:
            try:
                emp_uuid = uuid.UUID(str(emp_id_str))
            except (ValueError, TypeError):
                results.append({
                    "employee_id": str(emp_id_str),
                    "status": "FAILED",
                    "reason": "Invalid UUID format"
                })
                failed_count += 1
                continue

            emp = valid_employees.get(emp_uuid)
            if not emp:
                results.append({
                    "employee_id": str(emp_id_str),
                    "status": "FAILED",
                    "reason": "EmployeeProfile not found"
                })
                failed_count += 1
                continue

            is_intern = bool(getattr(emp, 'user', None) and emp.user.role == 'INTERN')
            is_active = emp.employment_status in [EmploymentStatus.ACTIVE, EmploymentStatus.PROBATION]
            if not (is_intern and is_active):
                results.append({
                    "employee_id": str(emp_id_str),
                    "employee_name": emp.full_name,
                    "status": "FAILED",
                    "reason": f"Employee is not an eligible intern (Role: {getattr(emp.user, 'role', 'None')}, Status: {emp.employment_status})"
                })
                failed_count += 1
                continue

            if emp_uuid in existing_enrolled:
                results.append({
                    "employee_id": str(emp_id_str),
                    "employee_name": emp.full_name,
                    "status": "SKIPPED",
                    "reason": "Already enrolled in this cycle"
                })
                skipped_count += 1
                continue

            try:
                with transaction.atomic():
                    part = CycleParticipant.objects.create(
                        cycle=cycle,
                        employee=emp,
                        added_by=request.user
                    )
                    existing_enrolled.add(emp_uuid)
                    enrolled_count += 1
                    results.append({
                        "employee_id": str(emp_id_str),
                        "employee_name": emp.full_name,
                        "status": "ENROLLED",
                        "mentor_assigned": bool(emp.manager_id),
                        "participant_id": str(part.id)
                    })
            except Exception as e:
                skipped_count += 1
                results.append({
                    "employee_id": str(emp_id_str),
                    "employee_name": emp.full_name,
                    "status": "SKIPPED",
                    "reason": f"Constraint conflict or duplicate: {str(e)}"
                })

        return Response({
            "cycle_id": str(cycle.id),
            "enrolled_count": enrolled_count,
            "skipped_count": skipped_count,
            "failed_count": failed_count,
            "results": results
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], url_path=r'participants/(?P<participant_id>[^/.]+)', permission_classes=[IsHR])
    def unenroll_participant(self, request, pk=None, participant_id=None):
        cycle = self.get_object()
        if cycle.status not in [CycleStatus.DRAFT, CycleStatus.VALIDATING]:
            return Response(
                {"detail": f"Cannot unenroll participants from a cycle in '{cycle.get_status_display()}' status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            participant = CycleParticipant.objects.get(cycle=cycle, id=participant_id)
        except CycleParticipant.DoesNotExist:
            return Response({"detail": "Participant not found in this cycle."}, status=status.HTTP_404_NOT_FOUND)

        employee = participant.employee
        has_appraisal = Appraisal.objects.filter(cycle=cycle, employee=employee).exists()
        has_ratings = AppraisalRating.objects.filter(appraisal__cycle=cycle, appraisal__employee=employee).exists()
        has_tech_review = TechnicalCapabilityReview.objects.filter(cycle=cycle, employee=employee).exists()
        has_japanese = JapaneseEvaluation.objects.filter(cycle=cycle, intern=employee).exists()

        if has_appraisal or has_ratings or has_tech_review or has_japanese:
            return Response(
                {
                    "error": "HISTORICAL_RECORDS_EXIST",
                    "detail": (
                        f"Cannot unenroll participant '{employee.full_name}' ({employee.employee_code}): "
                        "formal evaluation, rating, or appraisal records have already been generated for this cycle."
                    )
                },
                status=status.HTTP_409_CONFLICT
            )

        participant.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='eligible-interns', permission_classes=[IsHR])
    def eligible_interns(self, request):
        qs = EmployeeProfile.objects.filter(
            user__role='INTERN',
            employment_status__in=[EmploymentStatus.ACTIVE, EmploymentStatus.PROBATION]
        ).select_related('user', 'department', 'manager')

        exclude_cycle_id = request.query_params.get('exclude_cycle_id')
        if exclude_cycle_id:
            enrolled_emp_ids = CycleParticipant.objects.filter(cycle_id=exclude_cycle_id).values_list('employee_id', flat=True)
            qs = qs.exclude(id__in=enrolled_emp_ids)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(employee_code__icontains=search) |
                Q(user__email__icontains=search)
            )

        department = request.query_params.get('department')
        if department:
            qs = qs.filter(Q(department__id=department) | Q(department__name__icontains=department))

        serializer = EligibleInternSerializer(qs, many=True)
        return Response({
            "count": qs.count(),
            "results": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='create-template', permission_classes=[permissions.IsAuthenticated])
    def create_template(self, request):
        """Creates an appraisal cycle template matching media_1789919691069.png."""
        if not (request.user.is_super_admin or request.user.is_hr):
            return Response({'code': 403, 'message': 'Only Admins and HR can create appraisal templates.'}, status=status.HTTP_403_FORBIDDEN)

        name = request.data.get('template_name') or request.data.get('name')
        description = request.data.get('description', '')
        stages = request.data.get('stages', {})
        post_processes = request.data.get('post_processes', {})

        if not name:
            return Response({'code': 400, 'message': 'Template name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        from datetime import date, timedelta
        start = date.today()
        end = start + timedelta(days=90)

        desc_full = description
        stage_summary = []
        if stages.get('self_appraisal', True):
            stage_summary.append("Self Appraisal")
        if stages.get('manager_review', True):
            stage_summary.append("Manager Review")

        proc_summary = []
        if post_processes.get('normalisation', True):
            proc_summary.append("Normalisation")
        if post_processes.get('salary_hike', True):
            proc_summary.append("Salary Hike")

        if stage_summary:
            desc_full += f" | Stages: {', '.join(stage_summary)}"
        if proc_summary:
            desc_full += f" | Post-processes: {', '.join(proc_summary)}"

        cycle = PerformanceCycle.objects.create(
            name=name,
            description=desc_full,
            start_date=start,
            end_date=end,
            status='ACTIVE',
            created_by=request.user
        )

        return Response({
            'code': 201,
            'message': f'Appraisal template "{name}" successfully created!',
            'data': PerformanceCycleSerializer(cycle).data
        }, status=status.HTTP_201_CREATED)


class EvaluationCriterionViewSet(viewsets.ModelViewSet):
    queryset = EvaluationCriterion.objects.all()
    serializer_class = EvaluationCriterionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['weight', 'name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHR()]
        return [permissions.IsAuthenticated()]

class AppraisalViewSet(viewsets.ModelViewSet):
    serializer_class = AppraisalSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['cycle', 'employee', 'appraisal_type', 'status']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_code', 'cycle__name']
    ordering_fields = ['created_at', 'overall_score', 'status']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Appraisal.objects.none()

        base_qs = Appraisal.objects.select_related(
            'employee__user', 'cycle', 'reviewer'
        ).prefetch_related('ratings__criterion').all()

        if user.is_super_admin or user.is_hr:
            return base_qs

        if user.is_manager:
            return base_qs.filter(
                Q(employee__manager=user) | Q(reviewer=user) | Q(employee__user=user)
            )

        # Interns see their own self assessments anytime, but only PUBLISHED manager appraisals!
        return base_qs.filter(
            Q(employee__user=user, appraisal_type=AppraisalType.SELF) |
            Q(employee__user=user, status=AppraisalStatus.PUBLISHED)
        )

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == UserRole.MANAGER and not (user.is_hr or user.is_super_admin or user.is_staff):
            emp = serializer.validated_data.get('employee')
            if emp and emp.manager != user:
                raise PermissionDenied('You can only give reviews to employees assigned to you by HR or Super Admin.')
        serializer.save(reviewer=self.request.user)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_appraisal(self, request, pk=None):
        """Submit self-assessment or manager evaluation."""
        appraisal = self.get_object()
        user = request.user

        # Permission check
        is_self = (appraisal.appraisal_type == AppraisalType.SELF and appraisal.employee.user == user)
        is_mgr = (appraisal.appraisal_type == AppraisalType.MANAGER and (appraisal.employee.manager == user or user.is_hr))

        if not (is_self or is_mgr or user.is_super_admin):
            return Response(
                {"detail": "You do not have permission to submit this appraisal."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = SubmitAppraisalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comments = serializer.validated_data.get('comments', '')
        ratings_data = serializer.validated_data.get('ratings', [])

        if appraisal.appraisal_type == AppraisalType.SELF:
            appraisal.self_comments = comments
        else:
            appraisal.reviewer_comments = comments
            appraisal.reviewer = user

        # Update or create ratings
        for r in ratings_data:
            try:
                crit = EvaluationCriterion.objects.get(id=r['criterion_id'])
                AppraisalRating.objects.update_or_create(
                    appraisal=appraisal,
                    criterion=crit,
                    defaults={
                        'score': r['score'],
                        'comments': r.get('comments', '')
                    }
                )
            except EvaluationCriterion.DoesNotExist:
                continue

        appraisal.status = AppraisalStatus.SUBMITTED
        appraisal.submitted_at = timezone.now()
        appraisal.save()

        return Response(AppraisalSerializer(appraisal).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsHR], url_path='publish')
    def publish_appraisal(self, request, pk=None):
        """HR publishes final evaluation with verified composite score."""
        appraisal = self.get_object()

        # Compute overall score via ScoringService
        calculation = ScoringService.calculate_cycle_score(appraisal.employee, appraisal.cycle)
        appraisal.overall_score = Decimal(str(calculation['overall_score']))
        appraisal.status = AppraisalStatus.PUBLISHED
        appraisal.published_at = timezone.now()

        final_notes = request.data.get('final_comments', '')
        if final_notes:
            appraisal.final_comments = final_notes
        appraisal.save()

        resp_data = AppraisalSerializer(appraisal).data
        resp_data['score_calculation'] = calculation
        return Response(resp_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='score-breakdown')
    def score_breakdown(self, request, pk=None):
        """Returns reproducible mathematical breakdown of employee scores for this cycle."""
        appraisal = self.get_object()
        calculation = ScoringService.calculate_cycle_score(appraisal.employee, appraisal.cycle)
        return Response(calculation, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='re-review', permission_classes=[permissions.IsAuthenticated])
    def re_review(self, request, pk=None):
        """Super Admin / HR can reopen appraisals for re-review (notebook requirement)."""
        if not (request.user.is_super_admin or request.user.is_hr):
            return Response({'code': 403, 'message': 'Only Admins and HR can reopen appraisals for re-review.'}, status=status.HTTP_403_FORBIDDEN)

        appraisal = self.get_object()
        appraisal.status = AppraisalStatus.DRAFT
        appraisal.save(update_fields=['status'])
        return Response({
            'code': 200,
            'message': f'Appraisal for {appraisal.employee.full_name} has been reopened for re-review.',
            'data': AppraisalSerializer(appraisal).data
        })


class PerformanceImprovementPlanViewSet(viewsets.ModelViewSet):
    serializer_class = PerformanceImprovementPlanSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['employee', 'status']
    search_fields = ['employee__first_name', 'employee__last_name', 'reason', 'objectives']
    ordering_fields = ['start_date', 'end_date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return PerformanceImprovementPlan.objects.none()

        base_qs = PerformanceImprovementPlan.objects.select_related('employee__user', 'created_by').all()

        if user.is_super_admin or user.is_hr:
            return base_qs

        if user.is_manager:
            return base_qs.filter(Q(employee__manager=user) | Q(employee__user=user))

        return base_qs.filter(employee__user=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManager()]
        return [permissions.IsAuthenticated()]

class RecognitionRewardViewSet(viewsets.ModelViewSet):
    queryset = RecognitionReward.objects.select_related('recipient', 'awarded_by').all()
    serializer_class = RecognitionRewardSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['recipient', 'awarded_by']
    search_fields = ['title', 'description', 'recipient__username']
    ordering_fields = ['awarded_at']

    def perform_create(self, serializer):
        serializer.save(awarded_by=self.request.user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManager()]
        return [permissions.IsAuthenticated()]


class CycleParticipantViewSet(viewsets.ModelViewSet):
    serializer_class = CycleParticipantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return CycleParticipant.objects.none()

        is_hr_admin = getattr(user, 'is_super_admin', False) or getattr(user, 'is_hr', False) or getattr(user, 'role', '') in ['SUPER_ADMIN', 'HR']
        qs = CycleParticipant.objects.select_related(
            'cycle', 'employee', 'employee__user', 'employee__department', 'employee__manager', 'added_by'
        )

        cycle_id = self.request.query_params.get('cycle_id')
        if cycle_id:
            qs = qs.filter(cycle_id=cycle_id)

        if is_hr_admin:
            return qs

        if getattr(user, 'role', '') == 'MANAGER':
            return qs.filter(employee__manager=user)

        if getattr(user, 'role', '') == 'INTERN':
            return qs.filter(employee__user=user)

        return qs.none()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHR()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        participant = self.get_object()
        cycle = participant.cycle
        employee = participant.employee

        if cycle.status not in [CycleStatus.DRAFT, CycleStatus.VALIDATING]:
            return Response(
                {"detail": f"Cannot unenroll participants from a cycle in '{cycle.get_status_display()}' status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        has_appraisal = Appraisal.objects.filter(cycle=cycle, employee=employee).exists()
        has_ratings = AppraisalRating.objects.filter(appraisal__cycle=cycle, appraisal__employee=employee).exists()
        has_tech_review = TechnicalCapabilityReview.objects.filter(cycle=cycle, employee=employee).exists()
        has_japanese = JapaneseEvaluation.objects.filter(cycle=cycle, intern=employee).exists()

        if has_appraisal or has_ratings or has_tech_review or has_japanese:
            return Response(
                {
                    "error": "HISTORICAL_RECORDS_EXIST",
                    "detail": (
                        f"Cannot unenroll participant '{employee.full_name}' ({employee.employee_code}): "
                        "formal evaluation, rating, or appraisal records have already been generated for this cycle."
                    )
                },
                status=status.HTTP_409_CONFLICT
            )

        participant.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
