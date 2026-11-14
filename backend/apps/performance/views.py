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
    CycleCompetency,
    CycleEvaluatorAssignment,
    EvaluatorSectionType,
    CompetencySection,
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
    CycleCompetencySerializer,
    CycleEvaluatorAssignmentSerializer,
    AssignEvaluatorSerializer,
    AppraisalSerializer,
    SubmitAppraisalSerializer,
    PerformanceImprovementPlanSerializer,
    RecognitionRewardSerializer,
)
from apps.employees.models import EmployeeProfile, EmploymentStatus
from apps.japanese.models import JapaneseEvaluation, JapaneseBatch, JapaneseEvalCriterion
from apps.performance.services.scoring import ScoringService
from apps.accounts.permissions import IsHR, IsManager, is_admin_user
from apps.accounts.models import User, UserRole
from rest_framework.exceptions import PermissionDenied, ValidationError

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
        if self.action in [
            'create', 'update', 'partial_update', 'destroy',
            'activate', 'enroll_participants', 'unenroll_participant',
            'eligible_interns', 'assign_evaluator', 'auto_assign_evaluators'
        ]:
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

        # 8. Technical Competencies Configuration & 100% Weight Calibration
        tech_comps = cycle.competencies.filter(section=CompetencySection.TECHNICAL, is_active=True)
        tech_count = tech_comps.count()
        tech_sum = sum((c.weight for c in tech_comps), Decimal('0.00'))
        tech_configured = (tech_count >= 1 and tech_sum == Decimal('100.00'))
        checklist['technical_competencies_configured'] = tech_configured
        checklist['technical_competencies_count'] = tech_count
        checklist['technical_weight_total'] = float(tech_sum)
        if tech_count == 0:
            errors.append("Technical competencies must be configured before activation (none found).")
        elif tech_sum != Decimal('100.00'):
            errors.append(f"Technical competency weights must sum to exactly 100.00% (currently {tech_sum}% across {tech_count} competencies).")

        # 9. Behavioral Competencies Configuration & 100% Weight Calibration
        behav_comps = cycle.competencies.filter(section=CompetencySection.BEHAVIORAL, is_active=True)
        behav_count = behav_comps.count()
        behav_sum = sum((c.weight for c in behav_comps), Decimal('0.00'))
        behav_configured = (behav_count >= 1 and behav_sum == Decimal('100.00'))
        checklist['behavioral_competencies_configured'] = behav_configured
        checklist['behavioral_competencies_count'] = behav_count
        checklist['behavioral_weight_total'] = float(behav_sum)
        if behav_count == 0:
            errors.append("Behavioral competencies must be configured before activation (none found).")
        elif behav_sum != Decimal('100.00'):
            errors.append(f"Behavioral competency weights must sum to exactly 100.00% (currently {behav_sum}% across {behav_count} competencies).")

        # 10. Evaluator Assignments (Technical & Behavioral for all participants)
        enrolled_participants = list(cycle.participants.select_related('employee').all())
        participant_pks = [p.id for p in enrolled_participants]

        if participant_count > 0:
            tech_assigned = set(
                CycleEvaluatorAssignment.objects.filter(
                    cycle=cycle,
                    participant_id__in=participant_pks,
                    section=EvaluatorSectionType.TECHNICAL,
                    evaluator__isnull=False
                ).values_list('participant_id', flat=True)
            )
            tech_missing = participant_count - len(tech_assigned)
            checklist['technical_evaluators_assigned'] = (tech_missing == 0)
            checklist['technical_evaluators_missing_count'] = tech_missing
            if tech_missing > 0:
                errors.append(f"Mandatory Technical evaluators must be assigned for all participants ({tech_missing} unassigned).")

            behav_assigned = set(
                CycleEvaluatorAssignment.objects.filter(
                    cycle=cycle,
                    participant_id__in=participant_pks,
                    section=EvaluatorSectionType.BEHAVIORAL,
                    evaluator__isnull=False
                ).values_list('participant_id', flat=True)
            )
            behav_missing = participant_count - len(behav_assigned)
            checklist['behavioral_evaluators_assigned'] = (behav_missing == 0)
            checklist['behavioral_evaluators_missing_count'] = behav_missing
            if behav_missing > 0:
                errors.append(f"Mandatory Behavioral evaluators must be assigned for all participants ({behav_missing} unassigned).")
        else:
            checklist['technical_evaluators_assigned'] = False
            checklist['technical_evaluators_missing_count'] = 0
            checklist['behavioral_evaluators_assigned'] = False
            checklist['behavioral_evaluators_missing_count'] = 0

        # 11. Japanese Track Criteria & Evaluators (if japanese_evaluation_mandatory is True)
        if cycle.japanese_evaluation_mandatory is True:
            jp_criteria = cycle.japanese_criteria.all()
            jp_count = jp_criteria.count()
            jp_sum = sum((c.weight for c in jp_criteria), Decimal('0.00'))
            jp_crit_valid = (jp_count >= 1 and jp_sum == Decimal('100.00'))
            checklist['japanese_criteria_configured'] = jp_crit_valid
            checklist['japanese_criteria_count'] = jp_count
            checklist['japanese_weight_total'] = float(jp_sum)
            if jp_count == 0:
                errors.append("Japanese evaluation criteria must be configured before activation when Japanese evaluation is mandatory.")
            elif jp_sum != Decimal('100.00'):
                errors.append(f"Japanese evaluation criteria weights must sum to exactly 100.00% (currently {jp_sum}% across {jp_count} criteria).")

            if participant_count > 0:
                try:
                    jp_assignments = CycleEvaluatorAssignment.objects.filter(
                        cycle=cycle,
                        participant_id__in=participant_pks,
                        section=EvaluatorSectionType.JAPANESE,
                        evaluator__isnull=False
                    ).select_related('participant__employee', 'evaluator')

                    jp_valid_pks = set()
                    for asgn in jp_assignments:
                        intern_batches = asgn.participant.employee.japanese_batches.all()
                        if asgn.evaluator.assigned_japanese_batches.filter(id__in=intern_batches).exists():
                            jp_valid_pks.add(asgn.participant_id)

                    jp_missing = participant_count - len(jp_valid_pks)
                except Exception:
                    jp_missing = participant_count

                checklist['japanese_evaluators_assigned'] = (jp_missing == 0)
                checklist['japanese_evaluators_missing_count'] = jp_missing
                if jp_missing > 0:
                    errors.append(f"Valid Japanese instructors must be assigned for all participants when Japanese evaluation is mandatory ({jp_missing} unassigned or invalid).")
            else:
                checklist['japanese_evaluators_assigned'] = False
                checklist['japanese_evaluators_missing_count'] = 0
        else:
            checklist['japanese_criteria_configured'] = True
            checklist['japanese_evaluators_assigned'] = True
            checklist['japanese_evaluators_missing_count'] = 0

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

    @action(detail=True, methods=['get', 'post'], url_path='competencies', permission_classes=[permissions.IsAuthenticated])
    def cycle_competencies(self, request, pk=None):
        cycle = self.get_object()

        if request.method == 'GET':
            section = request.query_params.get('section')
            qs = cycle.competencies.all()
            if section:
                qs = qs.filter(section=section)
            qs = qs.order_by('section', 'order', 'name')

            include_summary = (
                request.query_params.get('include_summary') == 'true' or
                request.query_params.get('format') == 'detailed'
            )
            if include_summary:
                tech_comps = cycle.competencies.filter(section=CompetencySection.TECHNICAL, is_active=True)
                behav_comps = cycle.competencies.filter(section=CompetencySection.BEHAVIORAL, is_active=True)
                tech_sum = sum((c.weight for c in tech_comps), Decimal('0.00'))
                behav_sum = sum((c.weight for c in behav_comps), Decimal('0.00'))
                return Response({
                    "cycle_id": str(cycle.id),
                    "cycle_name": cycle.name,
                    "results": CycleCompetencySerializer(qs, many=True).data,
                    "summary": {
                        "technical_weight_total": float(tech_sum),
                        "behavioral_weight_total": float(behav_sum),
                        "is_technical_balanced": tech_sum == Decimal('100.00'),
                        "is_behavioral_balanced": behav_sum == Decimal('100.00'),
                        "technical_count": tech_comps.count(),
                        "behavioral_count": behav_comps.count(),
                    }
                }, status=status.HTTP_200_OK)

            return Response(CycleCompetencySerializer(qs, many=True).data, status=status.HTTP_200_OK)

        # POST: HR only
        if not (is_admin_user(request.user) or getattr(request.user, 'role', '') in [UserRole.HR, UserRole.SUPER_ADMIN]):
            raise PermissionDenied("Only HR and Super Admins can configure cycle competencies.")

        if cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            return Response(
                {"detail": f"Cannot add competencies to a cycle in '{cycle.get_status_display()}' status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        payload = request.data
        if isinstance(payload, list):
            created_comps = []
            with transaction.atomic():
                for item in payload:
                    item_data = item.copy() if hasattr(item, 'copy') else dict(item)
                    item_data['cycle'] = str(cycle.id)
                    serializer = CycleCompetencySerializer(data=item_data)
                    serializer.is_valid(raise_exception=True)
                    created_comps.append(serializer.save(cycle=cycle))
            return Response(CycleCompetencySerializer(created_comps, many=True).data, status=status.HTTP_201_CREATED)

        item_data = payload.copy() if hasattr(payload, 'copy') else dict(payload)
        item_data['cycle'] = str(cycle.id)
        serializer = CycleCompetencySerializer(data=item_data)
        serializer.is_valid(raise_exception=True)
        comp = serializer.save(cycle=cycle)
        return Response(CycleCompetencySerializer(comp).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete', 'patch'], url_path=r'competencies/(?P<competency_id>[^/.]+)', permission_classes=[IsHR])
    def cycle_competency_detail(self, request, pk=None, competency_id=None):
        cycle = self.get_object()
        if cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            return Response(
                {"detail": f"Cannot modify competencies on a cycle in '{cycle.get_status_display()}' status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            comp = CycleCompetency.objects.get(cycle=cycle, id=competency_id)
        except CycleCompetency.DoesNotExist:
            return Response({"detail": "Competency not found in this cycle."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'DELETE':
            if comp.technical_reviews.exists():
                return Response(
                    {
                        "error": "HISTORICAL_REVIEWS_EXIST",
                        "detail": f"Cannot delete competency '{comp.name}': it is referenced by {comp.technical_reviews.count()} existing technical review(s)."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            comp.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = CycleCompetencySerializer(comp, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='evaluators', permission_classes=[permissions.IsAuthenticated])
    def evaluator_matrix(self, request, pk=None):
        cycle = self.get_object()
        participants = cycle.participants.select_related(
            'employee', 'employee__user', 'employee__department', 'employee__manager'
        ).prefetch_related(
            'employee__japanese_batches__instructors',
            'evaluator_assignments__evaluator'
        ).order_by('employee__first_name', 'employee__last_name')

        assignments_qs = CycleEvaluatorAssignment.objects.filter(cycle=cycle).select_related('evaluator', 'assigned_by')
        asgn_map = {}
        for a in assignments_qs:
            asgn_map[(a.participant_id, a.section)] = a

        jp_evals_qs = JapaneseEvaluation.objects.filter(cycle=cycle).select_related('evaluator')
        jp_eval_map = {e.intern_id: e for e in jp_evals_qs}

        matrix_rows = []
        tech_assigned_count = 0
        behav_assigned_count = 0
        jp_assigned_count = 0
        ambiguous_jp_count = 0
        fully_assigned_count = 0

        for p in participants:
            emp = p.employee
            tech_asgn = asgn_map.get((p.id, EvaluatorSectionType.TECHNICAL))
            behav_asgn = asgn_map.get((p.id, EvaluatorSectionType.BEHAVIORAL))
            jp_asgn = asgn_map.get((p.id, EvaluatorSectionType.JAPANESE))

            if tech_asgn and tech_asgn.evaluator:
                tech_assigned_count += 1
            if behav_asgn and behav_asgn.evaluator:
                behav_assigned_count += 1

            batches_data = []
            all_batch_instructors = set()
            try:
                emp_batches = emp.japanese_batches.all()
                for b in emp_batches:
                    instructors_data = []
                    for inst in b.instructors.all():
                        instructors_data.append({
                            "id": str(inst.id),
                            "username": inst.username,
                            "full_name": inst.get_full_name(),
                            "email": inst.email
                        })
                        all_batch_instructors.add(inst)
                    batches_data.append({
                        "id": str(b.id),
                        "name": b.name,
                        "code": b.code,
                        "instructors": instructors_data
                    })
            except Exception:
                pass

            jp_inst_count = len(all_batch_instructors)
            jp_eval_record = jp_eval_map.get(emp.id)

            if cycle.japanese_evaluation_mandatory is False:
                jp_badge = 'NOT_REQUIRED'
            elif jp_asgn and jp_asgn.evaluator:
                jp_badge = 'ASSIGNED'
                jp_assigned_count += 1
            elif jp_inst_count > 1:
                jp_badge = 'AMBIGUOUS'
                ambiguous_jp_count += 1
            elif jp_inst_count == 1:
                jp_badge = 'UNASSIGNED'
            else:
                jp_badge = 'NO_BATCH_INSTRUCTOR'

            has_tech = bool(tech_asgn and tech_asgn.evaluator)
            has_behav = bool(behav_asgn and behav_asgn.evaluator)
            has_jp = bool(jp_asgn and jp_asgn.evaluator) if cycle.japanese_evaluation_mandatory is True else True

            if has_tech and has_behav and has_jp:
                fully_assigned_count += 1

            matrix_rows.append({
                "participant_id": str(p.id),
                "employee_id": str(emp.id),
                "employee_code": emp.employee_code,
                "full_name": emp.full_name,
                "email": emp.email,
                "designation": emp.designation,
                "department": emp.department.name if emp.department else '',
                "manager": {
                    "id": str(emp.manager.id),
                    "username": emp.manager.username,
                    "full_name": emp.manager.get_full_name(),
                    "email": emp.manager.email
                } if emp.manager else None,
                "japanese_batches": batches_data,
                "batch_instructors_count": jp_inst_count,
                "assignments": {
                    "technical": CycleEvaluatorAssignmentSerializer(tech_asgn).data if tech_asgn else None,
                    "behavioral": CycleEvaluatorAssignmentSerializer(behav_asgn).data if behav_asgn else None,
                    "japanese": CycleEvaluatorAssignmentSerializer(jp_asgn).data if jp_asgn else None,
                },
                "japanese_status": {
                    "status_badge": jp_badge,
                    "evaluation_status": jp_eval_record.status if jp_eval_record else None,
                    "overall_score": str(jp_eval_record.overall_language_score) if jp_eval_record and jp_eval_record.overall_language_score is not None else None,
                    "submitted_at": jp_eval_record.submitted_at.isoformat() if jp_eval_record and jp_eval_record.submitted_at else None,
                },
                "is_fully_assigned": bool(has_tech and has_behav and has_jp)
            })

        mentors_qs = User.objects.filter(
            Q(role__in=[UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN, 'ADMIN']) |
            Q(is_staff=True) |
            Q(is_superuser=True)
        ).distinct().order_by('username')

        available_mentors = [
            {"id": str(m.id), "username": m.username, "full_name": m.get_full_name(), "email": m.email, "role": m.role}
            for m in mentors_qs
        ]

        try:
            instructors_qs = User.objects.filter(
                assigned_japanese_batches__isnull=False
            ).distinct().order_by('username')

            available_instructors = [
                {"id": str(inst.id), "username": inst.username, "full_name": inst.get_full_name(), "email": inst.email}
                for inst in instructors_qs
            ]
        except Exception:
            available_instructors = []

        return Response({
            "cycle_id": str(cycle.id),
            "cycle_name": cycle.name,
            "status": cycle.status,
            "japanese_mandatory": cycle.japanese_evaluation_mandatory,
            "summary": {
                "total_participants": participants.count(),
                "fully_assigned_count": fully_assigned_count,
                "technical_assigned_count": tech_assigned_count,
                "behavioral_assigned_count": behav_assigned_count,
                "japanese_assigned_count": jp_assigned_count,
                "ambiguous_japanese_count": ambiguous_jp_count,
                "unassigned_count": participants.count() - fully_assigned_count
            },
            "matrix": matrix_rows,
            "available_mentors": available_mentors,
            "available_instructors": available_instructors
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='evaluators/assign', permission_classes=[IsHR])
    def assign_evaluator(self, request, pk=None):
        cycle = self.get_object()
        if cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            return Response(
                {"detail": f"Cannot modify evaluator assignments on a cycle in '{cycle.get_status_display()}' status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AssignEvaluatorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            participant = CycleParticipant.objects.select_related('employee').get(cycle=cycle, id=data['participant_id'])
        except CycleParticipant.DoesNotExist:
            return Response({"detail": "Participant not found in this cycle."}, status=status.HTTP_404_NOT_FOUND)

        section = data['section']
        evaluator_id = data.get('evaluator_id')
        is_mandatory = data.get('is_mandatory', True)

        if not evaluator_id:
            CycleEvaluatorAssignment.objects.filter(
                cycle=cycle,
                participant=participant,
                section=section
            ).delete()
            return Response({
                "message": f"Evaluator unassigned for {section}.",
                "unassigned": True,
                "participant_id": str(participant.id),
                "section": section
            }, status=status.HTTP_200_OK)

        try:
            evaluator = User.objects.get(id=evaluator_id)
        except User.DoesNotExist:
            return Response({"detail": "Evaluator user not found."}, status=status.HTTP_404_NOT_FOUND)

        if section == EvaluatorSectionType.JAPANESE:
            intern_batches = participant.employee.japanese_batches.all()
            if not intern_batches.exists():
                return Response(
                    {"detail": f"Intern '{participant.employee.full_name}' is not enrolled in any Japanese batch."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            is_valid_instructor = evaluator.assigned_japanese_batches.filter(id__in=intern_batches).exists()
            if not is_valid_instructor:
                return Response(
                    {"detail": f"Evaluator '{evaluator.get_full_name()}' must be an assigned Japanese instructor for this intern's batch."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif section in [EvaluatorSectionType.TECHNICAL, EvaluatorSectionType.BEHAVIORAL, EvaluatorSectionType.HR_BEHAVIORAL]:
            is_eligible = (
                evaluator.role in [UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN, 'ADMIN'] or
                evaluator.is_staff or evaluator.is_superuser
            )
            if not is_eligible:
                return Response(
                    {"detail": f"Evaluator '{evaluator.get_full_name()}' must have a Mentor, Manager, or HR role."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        assignment, created = CycleEvaluatorAssignment.objects.update_or_create(
            cycle=cycle,
            participant=participant,
            section=section,
            defaults={
                'evaluator': evaluator,
                'is_mandatory': is_mandatory,
                'assigned_by': request.user
            }
        )

        return Response({
            "message": "Evaluator successfully assigned.",
            "created": created,
            "assignment": CycleEvaluatorAssignmentSerializer(assignment).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='evaluators/auto-assign', permission_classes=[IsHR])
    def auto_assign_evaluators(self, request, pk=None):
        cycle = self.get_object()
        if cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            return Response(
                {"detail": f"Cannot modify evaluator assignments on a cycle in '{cycle.get_status_display()}' status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        participants = cycle.participants.select_related(
            'employee', 'employee__manager', 'employee__user'
        ).prefetch_related('employee__japanese_batches__instructors').all()

        tech_assigned = 0
        behav_assigned = 0
        jp_assigned = 0
        ambiguous_jp = 0
        manual_preserved = 0
        details = []

        existing_assignments = {
            (a.participant_id, a.section): a
            for a in CycleEvaluatorAssignment.objects.filter(cycle=cycle).select_related('evaluator')
        }

        with transaction.atomic():
            for p in participants:
                emp = p.employee
                row_detail = {
                    "participant_id": str(p.id),
                    "employee_name": emp.full_name,
                    "technical": None,
                    "behavioral": None,
                    "japanese": None
                }

                # 1. Technical Evaluation Assignment
                existing_tech = existing_assignments.get((p.id, EvaluatorSectionType.TECHNICAL))
                if existing_tech and existing_tech.evaluator:
                    tech_assigned += 1
                    if emp.manager and existing_tech.evaluator_id != emp.manager.id:
                        row_detail["technical"] = f"PRESERVED_MANUAL ({existing_tech.evaluator.username} differs from manager {emp.manager.username})"
                        manual_preserved += 1
                    else:
                        row_detail["technical"] = f"PRESERVED ({existing_tech.evaluator.username})"
                elif emp.manager:
                    CycleEvaluatorAssignment.objects.create(
                        cycle=cycle,
                        participant=p,
                        section=EvaluatorSectionType.TECHNICAL,
                        evaluator=emp.manager,
                        is_mandatory=True,
                        assigned_by=request.user
                    )
                    tech_assigned += 1
                    row_detail["technical"] = f"Assigned to {emp.manager.username}"
                else:
                    row_detail["technical"] = "UNASSIGNED (No manager configured)"

                # 2. Behavioral Evaluation Assignment
                existing_behav = existing_assignments.get((p.id, EvaluatorSectionType.BEHAVIORAL))
                if existing_behav and existing_behav.evaluator:
                    behav_assigned += 1
                    if emp.manager and existing_behav.evaluator_id != emp.manager.id:
                        row_detail["behavioral"] = f"PRESERVED_MANUAL ({existing_behav.evaluator.username} differs from manager {emp.manager.username})"
                        manual_preserved += 1
                    else:
                        row_detail["behavioral"] = f"PRESERVED ({existing_behav.evaluator.username})"
                elif emp.manager:
                    CycleEvaluatorAssignment.objects.create(
                        cycle=cycle,
                        participant=p,
                        section=EvaluatorSectionType.BEHAVIORAL,
                        evaluator=emp.manager,
                        is_mandatory=True,
                        assigned_by=request.user
                    )
                    behav_assigned += 1
                    row_detail["behavioral"] = f"Assigned to {emp.manager.username}"
                else:
                    row_detail["behavioral"] = "UNASSIGNED (No manager configured)"

                # 3. Japanese -> unique instructor across intern's batches
                if cycle.japanese_evaluation_mandatory is not False:
                    existing_jp = existing_assignments.get((p.id, EvaluatorSectionType.JAPANESE))
                    if existing_jp and existing_jp.evaluator:
                        jp_assigned += 1
                        try:
                            batch_instructors = User.objects.filter(
                                assigned_japanese_batches__in=emp.japanese_batches.all()
                            ).distinct()
                            b_ids = set(batch_instructors.values_list('id', flat=True))
                            if existing_jp.evaluator_id not in b_ids:
                                row_detail["japanese"] = f"PRESERVED_MANUAL ({existing_jp.evaluator.username} - outside batch)"
                                manual_preserved += 1
                            elif len(b_ids) > 1:
                                row_detail["japanese"] = f"PRESERVED_MANUAL ({existing_jp.evaluator.username} selected from {len(b_ids)} instructors)"
                                manual_preserved += 1
                            else:
                                row_detail["japanese"] = f"PRESERVED ({existing_jp.evaluator.username})"
                        except Exception:
                            row_detail["japanese"] = f"PRESERVED ({existing_jp.evaluator.username})"
                    else:
                        try:
                            batch_instructors = User.objects.filter(
                                assigned_japanese_batches__in=emp.japanese_batches.all()
                            ).distinct()
                            b_count = batch_instructors.count()

                            if b_count == 1:
                                inst = batch_instructors.first()
                                CycleEvaluatorAssignment.objects.create(
                                    cycle=cycle,
                                    participant=p,
                                    section=EvaluatorSectionType.JAPANESE,
                                    evaluator=inst,
                                    is_mandatory=True,
                                    assigned_by=request.user
                                )
                                jp_assigned += 1
                                row_detail["japanese"] = f"Assigned to {inst.username}"
                            elif b_count > 1:
                                ambiguous_jp += 1
                                row_detail["japanese"] = f"AMBIGUOUS ({b_count} instructors in intern's batches)"
                            else:
                                row_detail["japanese"] = "UNASSIGNED (No instructor in batches)"
                        except Exception:
                            row_detail["japanese"] = "UNASSIGNED"

                details.append(row_detail)

        return Response({
            "message": "Auto-assignment completed successfully.",
            "total_participants": participants.count(),
            "technical_assigned": tech_assigned,
            "behavioral_assigned": behav_assigned,
            "japanese_assigned": jp_assigned,
            "ambiguous_japanese_count": ambiguous_jp,
            "unassigned_count": participants.count() - tech_assigned,
            "preserved_manual_count": manual_preserved,
            "details": details
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


class CycleCompetencyViewSet(viewsets.ModelViewSet):
    serializer_class = CycleCompetencySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['cycle', 'section', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['order', 'weight', 'name', 'created_at']

    def get_queryset(self):
        qs = CycleCompetency.objects.select_related('cycle')
        cycle_id = self.request.query_params.get('cycle')
        if cycle_id:
            qs = qs.filter(cycle_id=cycle_id)
        section = self.request.query_params.get('section')
        if section:
            qs = qs.filter(section=section)
        return qs.order_by('section', 'order', 'name')

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsHR()]
    def perform_create(self, serializer):
        cycle = serializer.validated_data.get('cycle')
        if cycle and cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            raise PermissionDenied("Cannot add competencies to a finalized or closed cycle.")
        serializer.save()

    def perform_update(self, serializer):
        cycle = serializer.instance.cycle
        if cycle and cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            raise PermissionDenied("Cannot modify competencies on a finalized or closed cycle.")
        serializer.save()

    def perform_destroy(self, instance):
        cycle = instance.cycle
        if cycle and cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            raise PermissionDenied("Cannot delete competencies from a finalized or closed cycle.")
        if instance.technical_reviews.exists():
            raise ValidationError(
                f"Cannot delete competency '{instance.name}': it is referenced by {instance.technical_reviews.count()} existing technical review(s)."
            )
        instance.delete()


class CycleEvaluatorAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = CycleEvaluatorAssignmentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['cycle', 'participant', 'section', 'is_mandatory']
    search_fields = ['participant__employee__first_name', 'participant__employee__last_name', 'evaluator__username']
    ordering_fields = ['section', 'created_at']

    def get_queryset(self):
        qs = CycleEvaluatorAssignment.objects.select_related(
            'cycle', 'participant', 'participant__employee', 'evaluator', 'assigned_by'
        )
        cycle_id = self.request.query_params.get('cycle')
        if cycle_id:
            qs = qs.filter(cycle_id=cycle_id)
        participant_id = self.request.query_params.get('participant')
        if participant_id:
            qs = qs.filter(participant_id=participant_id)
        section = self.request.query_params.get('section')
        if section:
            qs = qs.filter(section=section)
        return qs

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsHR()]
