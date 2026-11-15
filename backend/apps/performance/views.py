import uuid
from decimal import Decimal
from django.utils import timezone
from django.db import transaction, connection
from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
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
    BehavioralCapabilityReview,
    Appraisal,
    AppraisalRating,
    AppraisalType,
    AppraisalStatus,
    PerformanceImprovementPlan,
    RecognitionReward,
    ScoringModel,
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
    TechnicalCapabilityReviewSerializer,
    BehavioralCapabilityReviewSerializer,
)
from apps.employees.models import EmployeeProfile, EmploymentStatus
from apps.japanese.models import JapaneseEvaluation, JapaneseBatch, JapaneseEvalCriterion
from apps.performance.services.scoring import ScoringService, IncompleteEvaluationError
from apps.accounts.permissions import IsHR, IsManager, is_admin_user
from apps.accounts.models import User, UserRole
from rest_framework.exceptions import PermissionDenied, ValidationError

def check_participant_readiness_10_gates(cycle, participant):
    """
    Validates all 10 gates of the shared readiness contract for an individual cycle participant.
    Mutually exclusive status precedence:
    1. PUBLISHED (Canonical MANAGER appraisal already published)
    2. BLOCKED (Configuration/governance/assignment blockers exist)
    3. DRAFT (Evaluation work incomplete without configuration blockers)
    4. READY_TO_PUBLISH (All 10 gates pass)
    """
    from apps.japanese.models import JapaneseEvaluation, EvaluationStatus
    from decimal import Decimal

    config_blockers = []
    eval_reasons = []

    # 1. Cycle publication eligibility (Gate 1)
    if cycle.status in [CycleStatus.DRAFT, CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
        config_blockers.append(f"Cycle '{cycle.name}' is in '{cycle.get_status_display()}' status and is not eligible for evaluation publication.")

    # Rating Scale Maximum Validation (Gate 1 Configuration)
    if not cycle.rating_scale_max or cycle.rating_scale_max <= Decimal('0.0'):
        config_blockers.append(f"Cycle '{cycle.name}' rating scale maximum is unconfigured or non-positive. Must be strictly greater than 0.")

    # 2. Participant Active Status (Gate 2)
    is_participant_active = getattr(participant, 'is_active', True)
    if hasattr(participant, 'employee'):
        emp = participant.employee
        if hasattr(emp, 'user') and emp.user and not emp.user.is_active:
            is_participant_active = False
        if hasattr(emp, 'employment_status') and emp.employment_status in ['TERMINATED', 'INACTIVE']:
            is_participant_active = False

    if not is_participant_active:
        config_blockers.append(f"Participant '{getattr(participant.employee, 'full_name', str(participant.id))}' is inactive and cannot be published.")

    # 3. Active Technical Competencies & 100.00% Weight Total (Gate 3)
    tech_comps = list(cycle.competencies.filter(section=CompetencySection.TECHNICAL, is_active=True).order_by('order', 'name'))
    tech_sum = sum((Decimal(str(c.weight)) for c in tech_comps), Decimal('0.00'))
    total_tech_comps = len(tech_comps)

    if total_tech_comps == 0:
        config_blockers.append(f"No active Technical competencies configured for cycle '{cycle.name}'.")
    elif tech_sum != Decimal('100.00'):
        config_blockers.append(f"Technical competency weights sum to {tech_sum}%, expected exactly 100.00% across active competencies.")

    # 4. Active Behavioral Competencies & 100.00% Weight Total (Gate 4)
    behav_comps = list(cycle.competencies.filter(section=CompetencySection.BEHAVIORAL, is_active=True).order_by('order', 'name'))
    behav_sum = sum((Decimal(str(c.weight)) for c in behav_comps), Decimal('0.00'))
    total_behav_comps = len(behav_comps)

    if total_behav_comps == 0:
        config_blockers.append(f"No active Behavioral competencies configured for cycle '{cycle.name}'.")
    elif behav_sum != Decimal('100.00'):
        config_blockers.append(f"Behavioral competency weights sum to {behav_sum}%, expected exactly 100.00% across active competencies.")

    # 5. Cycle Section Weights Sum (Gate 5)
    tw = cycle.technical_weight or Decimal('0.00')
    bw = cycle.behavioral_weight or Decimal('0.00')
    cycle_weights_sum = tw + bw
    if cycle_weights_sum != Decimal('100.00'):
        config_blockers.append(f"Technical ({tw}%) and Behavioral ({bw}%) section weights must sum to exactly 100.00% (currently {cycle_weights_sum}%).")

    # 6. Japanese Cycle Configuration & Criteria (Gate 6 & 7)
    japanese_mandatory = cycle.japanese_evaluation_mandatory
    if japanese_mandatory is None:
        config_blockers.append("Cycle Japanese evaluation requirement is unconfigured (None). Must be explicitly set to Mandatory (True) or Optional (False).")
    elif japanese_mandatory is True:
        jp_criteria = list(cycle.japanese_criteria.all())
        jp_crit_sum = sum((Decimal(str(c.weight)) for c in jp_criteria), Decimal('0.00'))
        if len(jp_criteria) == 0:
            config_blockers.append("Japanese evaluation criteria must be configured when Japanese evaluation is mandatory.")
        elif jp_crit_sum != Decimal('100.00'):
            config_blockers.append(f"Japanese evaluation criteria weights sum to {jp_crit_sum}%, expected exactly 100.00% across criteria.")

        # 7. Japanese Evaluation Acceptance (Gate 8)
        jp_eval = JapaneseEvaluation.objects.filter(cycle=cycle, intern=participant.employee).first()
        if not jp_eval:
            has_jp_inst = False
            try:
                for b in participant.employee.japanese_batches.all():
                    if b.instructors.exists():
                        has_jp_inst = True
                        break
            except Exception:
                pass
            has_jp_asgn = CycleEvaluatorAssignment.objects.filter(
                cycle=cycle, participant=participant, section=EvaluatorSectionType.JAPANESE, evaluator__isnull=False
            ).exists()
            if not has_jp_asgn and not has_jp_inst:
                config_blockers.append("Mandatory Japanese evaluation has no instructor or batch assigned.")
            else:
                config_blockers.append("Mandatory Japanese evaluation not started by instructor.")
        elif jp_eval.status != EvaluationStatus.ACCEPTED:
            config_blockers.append(f"Mandatory Japanese evaluation is not accepted (current status: {jp_eval.get_status_display()}).")

    # 8. Valid Evaluator Assignments (Gate 9)
    has_tech_asgn = CycleEvaluatorAssignment.objects.filter(
        cycle=cycle, participant=participant, section=EvaluatorSectionType.TECHNICAL, evaluator__isnull=False
    ).exists()
    if not has_tech_asgn:
        config_blockers.append("Missing required Technical evaluator assignment.")

    has_behav_asgn = CycleEvaluatorAssignment.objects.filter(
        cycle=cycle, participant=participant, section=EvaluatorSectionType.BEHAVIORAL, evaluator__isnull=False
    ).exists()
    if not has_behav_asgn:
        config_blockers.append("Missing required Behavioral evaluator assignment.")

    # 9. Review Submission & Score Integrity (Gate 10)
    scale_max = cycle.rating_scale_max if (cycle.rating_scale_max and cycle.rating_scale_max > Decimal('0.0')) else Decimal('5.0')
    emp = participant.employee
    active_tech_ids = {c.id for c in tech_comps}
    tech_reviews = list(TechnicalCapabilityReview.objects.filter(
        cycle=cycle, employee=emp, competency__in=tech_comps
    ))
    submitted_tech_ids = {
        r.competency_id for r in tech_reviews
        if r.status == 'SUBMITTED' and r.score is not None and Decimal('0.00') <= Decimal(str(r.score)) <= scale_max
    }
    scored_tech_ids = {
        r.competency_id for r in tech_reviews
        if r.score is not None and Decimal('0.00') <= Decimal(str(r.score)) <= scale_max
    }

    if total_tech_comps > 0:
        if not active_tech_ids.issubset(submitted_tech_ids):
            if len(scored_tech_ids) > 0 or len(tech_reviews) > 0:
                eval_reasons.append(f"Technical evaluation in progress ({len(submitted_tech_ids)} of {total_tech_comps} competencies submitted).")
            else:
                eval_reasons.append(f"Technical evaluation not started (0 of {total_tech_comps} competencies scored).")

    active_behav_ids = {c.id for c in behav_comps}
    behav_reviews = list(BehavioralCapabilityReview.objects.filter(
        cycle=cycle, employee=emp, competency__in=behav_comps
    ))
    submitted_behav_ids = {
        r.competency_id for r in behav_reviews
        if r.status == 'SUBMITTED' and r.score is not None and Decimal('0.00') <= Decimal(str(r.score)) <= scale_max
    }
    scored_behav_ids = {
        r.competency_id for r in behav_reviews
        if r.score is not None and Decimal('0.00') <= Decimal(str(r.score)) <= scale_max
    }

    if total_behav_comps > 0:
        if not active_behav_ids.issubset(submitted_behav_ids):
            if len(scored_behav_ids) > 0 or len(behav_reviews) > 0:
                eval_reasons.append(f"Behavioral evaluation in progress ({len(submitted_behav_ids)} of {total_behav_comps} competencies submitted).")
            else:
                eval_reasons.append(f"Behavioral evaluation not started (0 of {total_behav_comps} competencies scored).")

    config_blockers = list(dict.fromkeys(config_blockers))
    eval_reasons = list(dict.fromkeys(eval_reasons))
    all_blockers = list(dict.fromkeys(config_blockers + eval_reasons))

    mgr_appraisal = Appraisal.objects.filter(
        cycle=cycle, employee=emp, appraisal_type=AppraisalType.MANAGER
    ).first()
    is_published = bool(mgr_appraisal and mgr_appraisal.status == AppraisalStatus.PUBLISHED)

    if is_published:
        pub_status = 'PUBLISHED'
    elif len(config_blockers) > 0:
        pub_status = 'BLOCKED'
    elif len(eval_reasons) > 0:
        pub_status = 'DRAFT'
    else:
        pub_status = 'READY_TO_PUBLISH'

    is_ready = (pub_status == 'READY_TO_PUBLISH')
    return is_ready, pub_status, config_blockers, eval_reasons, all_blockers


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
            'eligible_interns', 'assign_evaluator', 'auto_assign_evaluators',
            'evaluation_progress', 'publish_participant_evaluation'
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
            has_tech = comp.technical_reviews.exists()
            has_behav = hasattr(comp, 'behavioral_reviews') and comp.behavioral_reviews.exists()
            if has_tech or has_behav:
                review_types = []
                if has_tech:
                    review_types.append(f"{comp.technical_reviews.count()} existing technical review(s)")
                if has_behav:
                    review_types.append(f"{comp.behavioral_reviews.count()} existing behavioral review(s)")
                return Response(
                    {
                        "error": "HISTORICAL_REVIEWS_EXIST",
                        "detail": f"Cannot delete competency '{comp.name}': it is referenced by {' and '.join(review_types)}."
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

    @action(detail=True, methods=['get'], url_path='evaluation-progress', permission_classes=[IsHR])
    def evaluation_progress(self, request, pk=None):
        """
        HR Evaluation Progress Dashboard endpoint.
        Returns cohort-wide progress across Technical, Behavioral, and Japanese tracks.
        Computes deterministic readiness_blockers and is_ready_for_review without N+1 queries.
        """
        cycle = self.get_object()

        from apps.japanese.models import JapaneseEvaluation, EvaluationStatus
        from apps.goals.models import Goal, GoalStatus

        # 1. Cycle Configuration Health
        tech_comps = list(
            cycle.competencies.filter(section=CompetencySection.TECHNICAL, is_active=True).order_by('order', 'name')
        )
        behav_comps = list(
            cycle.competencies.filter(section=CompetencySection.BEHAVIORAL, is_active=True).order_by('order', 'name')
        )

        tech_sum = sum((Decimal(str(c.weight)) for c in tech_comps), Decimal('0.00'))
        behav_sum = sum((Decimal(str(c.weight)) for c in behav_comps), Decimal('0.00'))
        tw = cycle.technical_weight or Decimal('0.00')
        bw = cycle.behavioral_weight or Decimal('0.00')
        cycle_weights_sum = tw + bw

        cycle_errors = []
        if len(tech_comps) == 0:
            cycle_errors.append(f"No active Technical competencies configured for cycle '{cycle.name}'.")
        elif tech_sum != Decimal('100.00'):
            cycle_errors.append(f"Technical competency weights sum to {tech_sum}%, expected exactly 100.00% across active competencies.")

        if len(behav_comps) == 0:
            cycle_errors.append(f"No active Behavioral competencies configured for cycle '{cycle.name}'.")
        elif behav_sum != Decimal('100.00'):
            cycle_errors.append(f"Behavioral competency weights sum to {behav_sum}%, expected exactly 100.00% across active competencies.")

        if cycle_weights_sum != Decimal('100.00'):
            cycle_errors.append(f"Technical ({tw}%) and Behavioral ({bw}%) section weights must sum to exactly 100.00% (currently {cycle_weights_sum}%).")

        japanese_mandatory = cycle.japanese_evaluation_mandatory
        if japanese_mandatory is None:
            cycle_errors.append("Cycle Japanese evaluation requirement is unconfigured (None). Must be explicitly set to Mandatory (True) or Optional (False).")
        elif japanese_mandatory is True:
            jp_criteria = list(cycle.japanese_criteria.all())
            jp_crit_sum = sum((Decimal(str(c.weight)) for c in jp_criteria), Decimal('0.00'))
            if len(jp_criteria) == 0:
                cycle_errors.append("Japanese evaluation criteria must be configured when Japanese evaluation is mandatory.")
            elif jp_crit_sum != Decimal('100.00'):
                cycle_errors.append(f"Japanese evaluation criteria weights sum to {jp_crit_sum}%, expected exactly 100.00% across criteria.")

        # 2. Bulk Fetch Participants & Related Data
        participants = list(
            cycle.participants.select_related(
                'employee', 'employee__user', 'employee__department', 'employee__manager'
            ).prefetch_related(
                'employee__japanese_batches__instructors'
            ).order_by('employee__first_name', 'employee__last_name')
        )

        emp_ids = [p.employee_id for p in participants]
        participant_pks = [p.id for p in participants]

        # Assignments: fetch all assignments for this cycle and order deterministically
        assignments_qs = CycleEvaluatorAssignment.objects.filter(
            cycle=cycle,
            participant_id__in=participant_pks,
            evaluator__isnull=False
        ).select_related('evaluator').order_by('-created_at', 'id')

        asgn_map = {}
        for a in assignments_qs:
            key = (a.participant_id, a.section)
            if key not in asgn_map:
                asgn_map[key] = a

        # Bulk fetch Technical & Behavioral Reviews
        tech_comp_ids = [c.id for c in tech_comps]
        behav_comp_ids = [c.id for c in behav_comps]

        tech_reviews_by_emp = {}
        if emp_ids and tech_comp_ids:
            tech_reviews_qs = TechnicalCapabilityReview.objects.filter(
                cycle=cycle,
                employee_id__in=emp_ids,
                competency_id__in=tech_comp_ids
            )
            for r in tech_reviews_qs:
                tech_reviews_by_emp.setdefault(r.employee_id, []).append(r)

        behav_reviews_by_emp = {}
        if emp_ids and behav_comp_ids:
            behav_reviews_qs = BehavioralCapabilityReview.objects.filter(
                cycle=cycle,
                employee_id__in=emp_ids,
                competency_id__in=behav_comp_ids
            )
            for r in behav_reviews_qs:
                behav_reviews_by_emp.setdefault(r.employee_id, []).append(r)

        # Bulk fetch Japanese Evaluations
        jp_eval_map = {}
        if emp_ids:
            jp_evals_qs = JapaneseEvaluation.objects.filter(
                cycle=cycle,
                intern_id__in=emp_ids
            ).select_related('evaluator')
            for e in jp_evals_qs:
                jp_eval_map[e.intern_id] = e

        # Bulk fetch Goals & Self-Assessments
        goals_by_emp = {}
        if emp_ids:
            goals_qs = Goal.objects.filter(cycle=cycle, employee_id__in=emp_ids)
            for g in goals_qs:
                goals_by_emp.setdefault(g.employee_id, []).append(g)

        self_appraisals_by_emp = {}
        if emp_ids:
            self_appraisals_qs = Appraisal.objects.filter(
                cycle=cycle,
                employee_id__in=emp_ids,
                appraisal_type=AppraisalType.SELF
            )
            for sa in self_appraisals_qs:
                self_appraisals_by_emp[sa.employee_id] = sa

        manager_appraisals_by_emp = {}
        if emp_ids:
            manager_appraisals_qs = Appraisal.objects.filter(
                cycle=cycle,
                employee_id__in=emp_ids,
                appraisal_type=AppraisalType.MANAGER
            )
            for ma in manager_appraisals_qs:
                manager_appraisals_by_emp[ma.employee_id] = ma

        # 3. Process Each Participant
        participants_data = []
        fully_ready_count = 0
        tech_summary = {'submitted': 0, 'in_progress': 0, 'not_started': 0, 'unassigned_evaluators': 0}
        behav_summary = {'submitted': 0, 'in_progress': 0, 'not_started': 0, 'unassigned_evaluators': 0}
        jp_summary = {
            'mode': 'MANDATORY' if japanese_mandatory is True else ('OPTIONAL' if japanese_mandatory is False else 'UNCONFIGURED'),
            'accepted': 0,
            'submitted_or_resubmitted': 0,
            'draft_or_pending': 0,
            'returned': 0,
            'not_started': 0,
            'no_evaluator_assigned': 0,
            'blocking_count': 0
        }

        total_tech_comps = len(tech_comps)
        total_behav_comps = len(behav_comps)
        tech_comp_map = {c.id: c for c in tech_comps}
        behav_comp_map = {c.id: c for c in behav_comps}
        rating_scale_max = cycle.rating_scale_max or Decimal('5.0')

        for p in participants:
            emp = p.employee
            blockers = list(cycle_errors)
            config_blockers = list(cycle_errors)
            eval_incomplete_reasons = []

            # --- Participant Active Status (Gate 2) ---
            p_is_active = getattr(p, 'is_active', True)
            if hasattr(emp, 'user') and emp.user and not emp.user.is_active:
                p_is_active = False
            if hasattr(emp, 'employment_status') and emp.employment_status in ['TERMINATED', 'INACTIVE']:
                p_is_active = False

            if not p_is_active:
                msg = f"Participant '{emp.full_name}' is inactive and cannot be published."
                blockers.append(msg)
                config_blockers.append(msg)

            # --- Technical Track ---
            tech_asgn = asgn_map.get((p.id, EvaluatorSectionType.TECHNICAL))
            has_tech_asgn = bool(tech_asgn and tech_asgn.evaluator_id is not None)
            if not has_tech_asgn:
                blockers.append("Missing required Technical evaluator assignment.")
                config_blockers.append("Missing required Technical evaluator assignment.")
                tech_summary['unassigned_evaluators'] += 1

            emp_tech_reviews = tech_reviews_by_emp.get(emp.id, [])
            active_tech_comp_ids = {c.id for c in tech_comps}
            submitted_tech_comp_ids = {
                r.competency_id for r in emp_tech_reviews
                if r.score is not None and r.status == 'SUBMITTED' and Decimal('0.00') <= Decimal(str(r.score)) <= rating_scale_max
            }
            scored_tech_comp_ids = {
                r.competency_id for r in emp_tech_reviews
                if r.score is not None and Decimal('0.00') <= Decimal(str(r.score)) <= rating_scale_max
            }
            tech_last_updated = max((r.updated_at for r in emp_tech_reviews), default=None)

            if total_tech_comps == 0:
                tech_status = 'UNCONFIGURED'
                blockers.append("No active Technical competencies configured for cycle.")
                config_blockers.append("No active Technical competencies configured for cycle.")
            elif active_tech_comp_ids.issubset(submitted_tech_comp_ids):
                tech_status = 'SUBMITTED'
                tech_summary['submitted'] += 1
            elif len(scored_tech_comp_ids) > 0 or len(emp_tech_reviews) > 0:
                tech_status = 'IN_PROGRESS'
                tech_summary['in_progress'] += 1
                msg = f"Technical evaluation in progress ({len(submitted_tech_comp_ids)} of {total_tech_comps} competencies submitted)."
                blockers.append(msg)
                eval_incomplete_reasons.append(msg)
            else:
                tech_status = 'NOT_STARTED'
                tech_summary['not_started'] += 1
                msg = f"Technical evaluation not started (0 of {total_tech_comps} competencies scored)."
                blockers.append(msg)
                eval_incomplete_reasons.append(msg)

            # --- Behavioral Track ---
            behav_asgn = asgn_map.get((p.id, EvaluatorSectionType.BEHAVIORAL))
            has_behav_asgn = bool(behav_asgn and behav_asgn.evaluator_id is not None)
            if not has_behav_asgn:
                blockers.append("Missing required Behavioral evaluator assignment.")
                config_blockers.append("Missing required Behavioral evaluator assignment.")
                behav_summary['unassigned_evaluators'] += 1

            emp_behav_reviews = behav_reviews_by_emp.get(emp.id, [])
            active_behav_comp_ids = {c.id for c in behav_comps}
            submitted_behav_comp_ids = {
                r.competency_id for r in emp_behav_reviews
                if r.score is not None and r.status == 'SUBMITTED' and Decimal('0.00') <= Decimal(str(r.score)) <= rating_scale_max
            }
            scored_behav_comp_ids = {
                r.competency_id for r in emp_behav_reviews
                if r.score is not None and Decimal('0.00') <= Decimal(str(r.score)) <= rating_scale_max
            }
            behav_last_updated = max((r.updated_at for r in emp_behav_reviews), default=None)

            if total_behav_comps == 0:
                behav_status = 'UNCONFIGURED'
                blockers.append("No active Behavioral competencies configured for cycle.")
                config_blockers.append("No active Behavioral competencies configured for cycle.")
            elif active_behav_comp_ids.issubset(submitted_behav_comp_ids):
                behav_status = 'SUBMITTED'
                behav_summary['submitted'] += 1
            elif len(scored_behav_comp_ids) > 0 or len(emp_behav_reviews) > 0:
                behav_status = 'IN_PROGRESS'
                behav_summary['in_progress'] += 1
                msg = f"Behavioral evaluation in progress ({len(submitted_behav_comp_ids)} of {total_behav_comps} competencies submitted)."
                blockers.append(msg)
                eval_incomplete_reasons.append(msg)
            else:
                behav_status = 'NOT_STARTED'
                behav_summary['not_started'] += 1
                msg = f"Behavioral evaluation not started (0 of {total_behav_comps} competencies scored)."
                blockers.append(msg)
                eval_incomplete_reasons.append(msg)

            # --- Japanese Track ---
            jp_eval = jp_eval_map.get(emp.id)
            jp_asgn = asgn_map.get((p.id, EvaluatorSectionType.JAPANESE))

            # Batch and instructor lookup
            batch_names = []
            batch_instructors = []
            try:
                for b in emp.japanese_batches.all():
                    batch_names.append(b.name)
                    for inst in b.instructors.all():
                        batch_instructors.append(inst)
            except Exception:
                pass

            jp_batch_str = ", ".join(batch_names) if batch_names else None
            unique_instructors = list({i.id: i for i in batch_instructors}.values())
            first_inst = unique_instructors[0] if unique_instructors else None

            if jp_eval and jp_eval.evaluator:
                jp_evaluator_name = jp_eval.evaluator.get_full_name() or jp_eval.evaluator.username
            elif jp_asgn and jp_asgn.evaluator:
                jp_evaluator_name = jp_asgn.evaluator.get_full_name() or jp_asgn.evaluator.username
            elif first_inst:
                jp_evaluator_name = first_inst.get_full_name() or first_inst.username
            else:
                jp_evaluator_name = None

            if japanese_mandatory is None:
                jp_mode = 'UNCONFIGURED'
                jp_status = 'UNCONFIGURED'
                jp_status_display = 'Unconfigured Setting'
                jp_is_blocking = True
                jp_summary['blocking_count'] += 1
                msg = "Japanese evaluation configuration is unconfigured (must be explicitly set to Mandatory or Optional)."
                blockers.append(msg)
                config_blockers.append(msg)
            elif japanese_mandatory is False:
                jp_mode = 'OPTIONAL'
                jp_is_blocking = False
                if jp_eval:
                    jp_status = jp_eval.status
                    jp_status_display = f"Optional ({jp_eval.get_status_display()})"
                else:
                    jp_status = 'NOT_REQUIRED'
                    jp_status_display = 'Optional (No Eval)'
            else:
                # japanese_mandatory is True
                jp_mode = 'MANDATORY'
                if not jp_eval:
                    if not jp_asgn and not unique_instructors:
                        jp_status = 'NO_EVALUATOR_ASSIGNED'
                        jp_status_display = 'Unassigned Instructor'
                        jp_is_blocking = True
                        jp_summary['no_evaluator_assigned'] += 1
                        jp_summary['blocking_count'] += 1
                        msg = "Mandatory Japanese evaluation has no instructor or batch assigned."
                        blockers.append(msg)
                        config_blockers.append(msg)
                    else:
                        jp_status = 'NOT_STARTED'
                        jp_status_display = 'Not Started'
                        jp_is_blocking = True
                        jp_summary['not_started'] += 1
                        jp_summary['blocking_count'] += 1
                        msg = "Mandatory Japanese evaluation not started by instructor."
                        blockers.append(msg)
                        config_blockers.append(msg)
                else:
                    jp_status = jp_eval.status
                    jp_status_display = jp_eval.get_status_display()
                    if jp_eval.status == EvaluationStatus.ACCEPTED:
                        jp_is_blocking = False
                        jp_summary['accepted'] += 1
                    else:
                        jp_is_blocking = True
                        jp_summary['blocking_count'] += 1
                        msg = f"Mandatory Japanese evaluation is not accepted (current status: {jp_status_display})."
                        blockers.append(msg)
                        config_blockers.append(msg)
                        if jp_eval.status in [EvaluationStatus.SUBMITTED, EvaluationStatus.RESUBMITTED]:
                            jp_summary['submitted_or_resubmitted'] += 1
                        elif jp_eval.status in [EvaluationStatus.DRAFT, EvaluationStatus.PENDING]:
                            jp_summary['draft_or_pending'] += 1
                        elif jp_eval.status == EvaluationStatus.RETURNED:
                            jp_summary['returned'] += 1

            # --- Operational Telemetry ---
            emp_goals = goals_by_emp.get(emp.id, [])
            total_goals = len(emp_goals)
            completed_goals = len([g for g in emp_goals if g.status == GoalStatus.COMPLETED])
            avg_goal_pct = float(round(Decimal(str(sum((g.completion_percentage for g in emp_goals), 0) / (total_goals or 1))), 2)) if total_goals else 0.0

            self_appraisal = self_appraisals_by_emp.get(emp.id)
            self_submitted = bool(self_appraisal and self_appraisal.status in ['SUBMITTED', 'PUBLISHED'])

            # --- Canonical Appraisal & 4-State Publication Status ---
            mgr_appraisal = manager_appraisals_by_emp.get(emp.id)
            is_published = bool(mgr_appraisal and mgr_appraisal.status == AppraisalStatus.PUBLISHED)

            config_blockers = list(dict.fromkeys(config_blockers))
            eval_incomplete_reasons = list(dict.fromkeys(eval_incomplete_reasons))
            has_config_blockers = len(config_blockers) > 0
            is_eval_incomplete = len(eval_incomplete_reasons) > 0

            # Deduplicate Blockers & Compute Readiness
            deduped_blockers = list(dict.fromkeys(blockers))
            is_ready = (len(deduped_blockers) == 0)
            if is_ready:
                fully_ready_count += 1

            if is_published:
                pub_status = 'PUBLISHED'
            elif has_config_blockers:
                pub_status = 'BLOCKED'
            elif is_eval_incomplete:
                pub_status = 'DRAFT'
            else:
                pub_status = 'READY_TO_PUBLISH'

            # --- Deterministic Scorecard Calculation ---
            if (
                total_tech_comps > 0 and
                total_behav_comps > 0 and
                active_tech_comp_ids.issubset(submitted_tech_comp_ids) and
                active_behav_comp_ids.issubset(submitted_behav_comp_ids)
            ):
                t_sum = Decimal('0.0000')
                for r in emp_tech_reviews:
                    if r.competency_id in tech_comp_map and r.score is not None and r.status == 'SUBMITTED':
                        c = tech_comp_map[r.competency_id]
                        n_pct = min(Decimal('100.00'), max(Decimal('0.00'), (Decimal(str(r.score)) / rating_scale_max) * Decimal('100.00')))
                        t_sum += n_pct * (Decimal(str(c.weight)) / Decimal('100.00'))

                b_sum = Decimal('0.0000')
                for r in emp_behav_reviews:
                    if r.competency_id in behav_comp_map and r.score is not None and r.status == 'SUBMITTED':
                        c = behav_comp_map[r.competency_id]
                        n_pct = min(Decimal('100.00'), max(Decimal('0.00'), (Decimal(str(r.score)) / rating_scale_max) * Decimal('100.00')))
                        b_sum += n_pct * (Decimal(str(c.weight)) / Decimal('100.00'))

                t_score = round(t_sum, 2)
                b_score = round(b_sum, 2)
                t_contrib = round(t_score * (tw / Decimal('100.00')), 2)
                b_contrib = round(b_score * (bw / Decimal('100.00')), 2)
                f_score = min(Decimal('100.00'), max(Decimal('0.00'), round(t_contrib + b_contrib, 2)))
                scorecard = {
                    'has_scores': True,
                    'technical_score': float(t_score),
                    'behavioral_score': float(b_score),
                    'final_score': float(f_score),
                    'is_complete': True,
                }
            elif mgr_appraisal and mgr_appraisal.overall_score is not None:
                scorecard = {
                    'has_scores': True,
                    'technical_score': None,
                    'behavioral_score': None,
                    'final_score': float(mgr_appraisal.overall_score),
                    'is_complete': False,
                }
            else:
                scorecard = {
                    'has_scores': False,
                    'technical_score': None,
                    'behavioral_score': None,
                    'final_score': None,
                    'is_complete': False,
                }

            participants_data.append({
                'participant_id': str(p.id),
                'employee_id': str(emp.id),
                'employee_code': emp.employee_code,
                'full_name': emp.full_name,
                'department': emp.department.name if emp.department else '',
                'employment_status': getattr(emp, 'employment_status', 'ACTIVE'),
                'technical_evaluator_assigned': has_tech_asgn,
                'behavioral_evaluator_assigned': has_behav_asgn,
                'publication_status': pub_status,
                'evaluation_incomplete': is_eval_incomplete,
                'evaluation_incomplete_reasons': eval_incomplete_reasons,
                'has_configuration_blockers': has_config_blockers,
                'configuration_blockers': config_blockers,
                'scorecard': scorecard,
                'appraisal': {
                    'id': str(mgr_appraisal.id) if mgr_appraisal else None,
                    'status': mgr_appraisal.status if mgr_appraisal else 'NOT_CREATED',
                    'published_at': mgr_appraisal.published_at.isoformat() if (mgr_appraisal and mgr_appraisal.published_at) else None,
                },
                'technical': {
                    'status': tech_status,
                    'total_competencies': total_tech_comps,
                    'scored_competencies': len(scored_tech_comp_ids),
                    'evaluator_id': str(tech_asgn.evaluator_id) if has_tech_asgn else None,
                    'evaluator_name': (tech_asgn.evaluator.get_full_name() or tech_asgn.evaluator.username) if has_tech_asgn else None,
                    'is_assigned': has_tech_asgn,
                    'last_updated_at': tech_last_updated.isoformat() if tech_last_updated else None,
                },
                'behavioral': {
                    'status': behav_status,
                    'total_competencies': total_behav_comps,
                    'scored_competencies': len(scored_behav_comp_ids),
                    'evaluator_id': str(behav_asgn.evaluator_id) if has_behav_asgn else None,
                    'evaluator_name': (behav_asgn.evaluator.get_full_name() or behav_asgn.evaluator.username) if has_behav_asgn else None,
                    'is_assigned': has_behav_asgn,
                    'last_updated_at': behav_last_updated.isoformat() if behav_last_updated else None,
                },
                'japanese': {
                    'mode': jp_mode,
                    'status': jp_status,
                    'status_display': jp_status_display,
                    'is_blocking': jp_is_blocking,
                    'overall_score': float(jp_eval.overall_language_score) if jp_eval and jp_eval.overall_language_score is not None else None,
                    'evaluator_name': jp_evaluator_name,
                    'batch_name': jp_batch_str,
                    'submitted_at': jp_eval.submitted_at.isoformat() if jp_eval and jp_eval.submitted_at else None,
                },
                'operational_telemetry': {
                    'goals_count': total_goals,
                    'completed_goals': completed_goals,
                    'avg_goal_progress': avg_goal_pct,
                    'self_assessment_submitted': self_submitted,
                },
                'is_ready_for_review': is_ready,
                'readiness_blockers': deduped_blockers,
            })

        return Response({
            'cycle_id': str(cycle.id),
            'cycle_name': cycle.name,
            'status': cycle.status,
            'rating_scale_max': float(cycle.rating_scale_max or Decimal('5.0')),
            'scoring_model': cycle.scoring_model,
            'japanese_evaluation_mandatory': japanese_mandatory,
            'configuration_health': {
                'is_valid': len(cycle_errors) == 0,
                'errors': cycle_errors,
                'technical_competencies_count': total_tech_comps,
                'technical_weight_total': float(tech_sum),
                'behavioral_competencies_count': total_behav_comps,
                'behavioral_weight_total': float(behav_sum),
                'section_weights_sum': float(cycle_weights_sum),
                'japanese_configured': (japanese_mandatory is not None),
            },
            'summary': {
                'total_participants': len(participants),
                'fully_ready_count': fully_ready_count,
                'technical_summary': tech_summary,
                'behavioral_summary': behav_summary,
                'japanese_summary': jp_summary,
            },
            'participants': participants_data,
        }, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=['post'],
        url_path=r'participants/(?P<participant_id>[^/.]+)/publish',
        permission_classes=[IsHR]
    )
    def publish_participant_evaluation(self, request, pk=None, participant_id=None):
        """
        HR publishes an individual participant's canonical MANAGER evaluation with verified score.
        Route: POST /api/performance/cycles/{pk}/participants/{participant_id}/publish/
        """
        cycle = self.get_object()

        with transaction.atomic():
            # 1. Resolve and lock CycleParticipant
            try:
                participant = CycleParticipant.objects.select_for_update().select_related(
                    'cycle', 'employee', 'employee__user', 'employee__manager'
                ).get(id=participant_id, cycle=cycle)
            except (CycleParticipant.DoesNotExist, ValueError):
                return Response({
                    'error': 'PARTICIPANT_NOT_FOUND',
                    'detail': f"Participant '{participant_id}' was not found in cycle '{cycle.name}'."
                }, status=status.HTTP_404_NOT_FOUND)

            # 2. Idempotency Check under transaction: if already published, return HTTP 409 Conflict
            existing_published = Appraisal.objects.select_for_update().filter(
                cycle=cycle,
                employee=participant.employee,
                appraisal_type=AppraisalType.MANAGER,
                status=AppraisalStatus.PUBLISHED
            ).first()
            if existing_published:
                return Response({
                    'error': 'ALREADY_PUBLISHED',
                    'detail': f"Appraisal for this participant has already been published on {existing_published.published_at.isoformat() if existing_published.published_at else 'previous date'}.",
                    'appraisal_id': str(existing_published.id),
                    'published_at': existing_published.published_at.isoformat() if existing_published.published_at else None
                }, status=status.HTTP_409_CONFLICT)

            # 3. Check 10-Gate Shared Readiness Contract inside transaction
            is_ready, pub_status, config_blockers, eval_reasons, all_blockers = check_participant_readiness_10_gates(cycle, participant)
            if not is_ready:
                return Response({
                    'error': 'READINESS_CHECK_FAILED',
                    'detail': 'Participant evaluation is not ready for publication.',
                    'publication_status': pub_status,
                    'configuration_blockers': config_blockers,
                    'evaluation_incomplete_reasons': eval_reasons,
                    'readiness_blockers': all_blockers
                }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

            # 4. Retrieve or create canonical Appraisal record (strictly AppraisalType.MANAGER)
            reviewer_user = participant.employee.manager if participant.employee.manager else None
            appraisal = Appraisal.objects.select_for_update().filter(
                cycle=cycle,
                employee=participant.employee,
                appraisal_type=AppraisalType.MANAGER
            ).first()
            if not appraisal:
                appraisal = Appraisal.objects.create(
                    cycle=cycle,
                    employee=participant.employee,
                    appraisal_type=AppraisalType.MANAGER,
                    status=AppraisalStatus.DRAFT,
                    reviewer=reviewer_user
                )
            elif not appraisal.reviewer and reviewer_user:
                appraisal.reviewer = reviewer_user

            # 5. Deterministic Score Calculation
            calculation = ScoringService.calculate_cycle_score(participant.employee, cycle, raise_on_incomplete=True)
            final_sc = calculation.get('final_score')
            if final_sc is None:
                return Response({
                    'error': 'EVALUATION_INCOMPLETE',
                    'detail': 'Cannot publish appraisal: scoring calculation could not determine final score.',
                    'verification_errors': calculation.get('verification_errors', [])
                }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

            # 6. Atomic Persistence of Score and Qualitative HR Feedback
            appraisal.overall_score = Decimal(str(final_sc))
            appraisal.status = AppraisalStatus.PUBLISHED
            appraisal.published_at = timezone.now()

            strengths = request.data.get('strengths')
            if strengths is not None:
                appraisal.strengths = strengths if isinstance(strengths, list) else [str(strengths)]
            areas = request.data.get('areas_for_improvement')
            if areas is not None:
                appraisal.areas_for_improvement = areas if isinstance(areas, list) else [str(areas)]
            recommendations = request.data.get('recommendations')
            if recommendations is not None:
                appraisal.recommendations = str(recommendations)
            final_comments = request.data.get('final_comments')
            if final_comments is not None:
                appraisal.final_comments = str(final_comments)

            appraisal.save()

            return Response({
                'status': 'SUCCESS',
                'message': 'Appraisal successfully published.',
                'appraisal_id': str(appraisal.id),
                'overall_score': float(appraisal.overall_score),
                'published_at': appraisal.published_at.isoformat(),
                'score_calculation': calculation
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

        if ratings_data:
            from apps.performance.models import ScoringModel
            if getattr(appraisal.cycle, 'scoring_model', ScoringModel.COMPETENCY_FRAMEWORK) == ScoringModel.COMPETENCY_FRAMEWORK:
                return Response(
                    {
                        "error": "LEGACY_RATINGS_NOT_ALLOWED",
                        "detail": (
                            f"Performance cycle '{appraisal.cycle.name}' uses the Competency Framework. "
                            "Criterion-based legacy ratings are not accepted on competency-based cycles. "
                            "Please submit technical and behavioral evaluations through their respective evaluation endpoints."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

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
        """
        HR publishes final canonical MANAGER evaluation with verified composite score.
        Enforces 10-Gate shared readiness contract, row locks, canonical MANAGER type,
        and idempotency under an atomic transaction.
        """
        unlocked_appraisal = self.get_object()

        with transaction.atomic():
            # 1. Enforce canonical appraisal type
            if unlocked_appraisal.appraisal_type != AppraisalType.MANAGER:
                return Response({
                    'error': 'INVALID_APPRAISAL_TYPE',
                    'detail': 'Only canonical MANAGER appraisals can be published.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # 2. Consistent lock hierarchy: lock CycleParticipant first, then Appraisal
            participant = CycleParticipant.objects.select_for_update().select_related(
                'cycle', 'employee', 'employee__user', 'employee__manager'
            ).filter(cycle=unlocked_appraisal.cycle, employee=unlocked_appraisal.employee).first()

            if not participant:
                return Response({
                    'error': 'PARTICIPANT_NOT_FOUND',
                    'detail': f"Participant for employee '{unlocked_appraisal.employee.full_name}' was not found in cycle '{unlocked_appraisal.cycle.name}'."
                }, status=status.HTTP_404_NOT_FOUND)

            is_legacy = (getattr(unlocked_appraisal.cycle, 'scoring_model', ScoringModel.COMPETENCY_FRAMEWORK) == ScoringModel.LEGACY_CRITERIA)

            appraisal = Appraisal.objects.select_for_update().select_related(
                'cycle', 'employee', 'reviewer'
            ).get(pk=unlocked_appraisal.pk)

            # 3. Idempotency Check under transaction: if already published, return HTTP 409 Conflict
            if appraisal.status == AppraisalStatus.PUBLISHED:
                return Response({
                    'error': 'ALREADY_PUBLISHED',
                    'detail': f"Appraisal for this participant has already been published on {appraisal.published_at.isoformat() if appraisal.published_at else 'previous date'}.",
                    'appraisal_id': str(appraisal.id),
                    'published_at': appraisal.published_at.isoformat() if appraisal.published_at else None
                }, status=status.HTTP_409_CONFLICT)

            # 4. For Legacy Cycles: execute legacy scoring path with lifecycle and governance checks
            if is_legacy:
                # 4a. Cycle publication eligibility
                if appraisal.cycle.status in [CycleStatus.DRAFT, CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
                    return Response({
                        'error': 'CYCLE_NOT_ELIGIBLE',
                        'detail': f"Cycle '{appraisal.cycle.name}' is in '{appraisal.cycle.get_status_display()}' status and is not eligible for publication."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # 4b. Participant eligibility
                is_participant_active = getattr(participant, 'is_active', True)
                emp = participant.employee
                if hasattr(emp, 'user') and emp.user and not emp.user.is_active:
                    is_participant_active = False
                if hasattr(emp, 'employment_status') and emp.employment_status in ['TERMINATED', 'INACTIVE']:
                    is_participant_active = False

                if not is_participant_active:
                    return Response({
                        'error': 'PARTICIPANT_NOT_ELIGIBLE',
                        'detail': f"Participant '{getattr(participant.employee, 'full_name', str(participant.id))}' is inactive or terminated and cannot be published.",
                        'publication_status': 'BLOCKED',
                        'configuration_blockers': [f"Participant '{getattr(participant.employee, 'full_name', str(participant.id))}' is inactive and cannot be published."]
                    }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

                # 4c. Japanese evaluation tri-state
                if appraisal.cycle.japanese_evaluation_mandatory is None:
                    return Response({
                        'error': 'READINESS_CHECK_FAILED',
                        'detail': f"Cycle '{appraisal.cycle.name}' Japanese evaluation requirement is unconfigured (None). Must be explicitly set to Mandatory (True) or Optional (False).",
                        'publication_status': 'BLOCKED',
                        'configuration_blockers': ["Cycle Japanese evaluation requirement is unconfigured (None). Must be explicitly set to Mandatory (True) or Optional (False)."]
                    }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

                if appraisal.cycle.japanese_evaluation_mandatory is True:
                    from apps.japanese.models import JapaneseEvaluation, EvaluationStatus
                    jp_eval = JapaneseEvaluation.objects.filter(intern=appraisal.employee, cycle=appraisal.cycle).first()
                    if not jp_eval or jp_eval.status != EvaluationStatus.ACCEPTED:
                        return Response({
                            'error': 'JAPANESE_EVALUATION_NOT_ACCEPTED',
                            'detail': 'Japanese evaluation is mandatory for this cycle and must be in ACCEPTED status before publication.',
                            'publication_status': 'BLOCKED',
                            'configuration_blockers': ["Mandatory Japanese evaluation is not accepted."]
                        }, status=status.HTTP_400_BAD_REQUEST)

                # 4d. Deterministic Legacy Evaluation Scoring
                try:
                    calculation = ScoringService.calculate_cycle_score(appraisal.employee, appraisal.cycle, raise_on_incomplete=True)
                except IncompleteEvaluationError as exc:
                    return Response({
                        'error': 'EVALUATION_INCOMPLETE',
                        'detail': f"Cannot publish appraisal: {str(exc)}",
                        'verification_errors': [str(exc)]
                    }, status=status.HTTP_400_BAD_REQUEST)

                if not calculation.get('is_complete', False) or calculation.get('final_score') is None:
                    return Response({
                        'error': 'EVALUATION_INCOMPLETE',
                        'detail': f"Cannot publish appraisal: {'; '.join(calculation.get('verification_errors', []))}",
                        'score_calculation': calculation
                    }, status=status.HTTP_400_BAD_REQUEST)

                # 4e. Reviewer attribution preservation
                reviewer_user = participant.employee.manager if participant.employee.manager else None
                if not appraisal.reviewer and reviewer_user:
                    appraisal.reviewer = reviewer_user

                # 4f. Atomic Persistence
                final_sc = calculation.get('final_score') if calculation.get('final_score') is not None else calculation.get('overall_score')
                appraisal.overall_score = Decimal(str(final_sc))
                appraisal.status = AppraisalStatus.PUBLISHED
                appraisal.published_at = timezone.now()
                final_notes = request.data.get('final_comments', '')
                if final_notes:
                    appraisal.final_comments = final_notes
                appraisal.save()

                resp_data = AppraisalSerializer(appraisal).data
                resp_data['score_calculation'] = calculation
                resp_data['publication_status'] = 'SUCCESS'
                resp_data['appraisal_id'] = str(appraisal.id)
                resp_data['overall_score'] = float(appraisal.overall_score)
                resp_data['published_at'] = appraisal.published_at.isoformat()
                return Response(resp_data, status=status.HTTP_200_OK)

            # 5. For Modern Competency Cycles: Check 10-Gate Shared Readiness Contract
            is_ready, pub_status, config_blockers, eval_reasons, all_blockers = check_participant_readiness_10_gates(appraisal.cycle, participant)
            if not is_ready:
                # Compatibility check: if mandatory Japanese evaluation is unaccepted, return legacy error code
                if appraisal.cycle.japanese_evaluation_mandatory is True:
                    from apps.japanese.models import JapaneseEvaluation, EvaluationStatus
                    jp_eval = JapaneseEvaluation.objects.filter(intern=appraisal.employee, cycle=appraisal.cycle).first()
                    if not jp_eval or jp_eval.status != EvaluationStatus.ACCEPTED:
                        return Response({
                            'error': 'JAPANESE_EVALUATION_NOT_ACCEPTED',
                            'detail': 'Japanese evaluation is mandatory for this cycle and must be in ACCEPTED status before publication.',
                            'publication_status': pub_status,
                            'configuration_blockers': config_blockers,
                            'evaluation_incomplete_reasons': eval_reasons,
                            'readiness_blockers': all_blockers
                        }, status=status.HTTP_400_BAD_REQUEST)

                # Compatibility check: if evaluation has incomplete or unconfigured competencies
                if any('competencies configured' in b for b in config_blockers) or (not config_blockers and eval_reasons):
                    return Response({
                        'error': 'EVALUATION_INCOMPLETE',
                        'detail': f"Cannot publish appraisal: {'; '.join(all_blockers)}",
                        'publication_status': pub_status,
                        'configuration_blockers': config_blockers,
                        'evaluation_incomplete_reasons': eval_reasons,
                        'readiness_blockers': all_blockers
                    }, status=status.HTTP_400_BAD_REQUEST)

                return Response({
                    'error': 'READINESS_CHECK_FAILED',
                    'detail': 'Participant evaluation is not ready for publication.',
                    'publication_status': pub_status,
                    'configuration_blockers': config_blockers,
                    'evaluation_incomplete_reasons': eval_reasons,
                    'readiness_blockers': all_blockers
                }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

            # 6. Deterministic Score Calculation
            try:
                calculation = ScoringService.calculate_cycle_score(participant.employee, appraisal.cycle, raise_on_incomplete=True)
            except IncompleteEvaluationError as exc:
                return Response({
                    'error': 'EVALUATION_INCOMPLETE',
                    'detail': str(exc),
                    'missing_competencies': exc.missing_competencies
                }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

            final_sc = calculation.get('final_score')
            if final_sc is None:
                return Response({
                    'error': 'EVALUATION_INCOMPLETE',
                    'detail': 'Cannot publish appraisal: scoring calculation could not determine final score.',
                    'verification_errors': calculation.get('verification_errors', [])
                }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

            # 7. Preserve reviewer attribution (do not overwrite with HR publisher)
            reviewer_user = participant.employee.manager if participant.employee.manager else None
            if not appraisal.reviewer and reviewer_user:
                appraisal.reviewer = reviewer_user

            # 8. Atomic Persistence of Score and Feedback
            appraisal.overall_score = Decimal(str(final_sc))
            appraisal.status = AppraisalStatus.PUBLISHED
            appraisal.published_at = timezone.now()

            strengths = request.data.get('strengths')
            if strengths is not None:
                appraisal.strengths = strengths if isinstance(strengths, list) else [str(strengths)]
            areas = request.data.get('areas_for_improvement')
            if areas is not None:
                appraisal.areas_for_improvement = areas if isinstance(areas, list) else [str(areas)]
            recommendations = request.data.get('recommendations')
            if recommendations is not None:
                appraisal.recommendations = str(recommendations)
            final_comments = request.data.get('final_comments') or request.data.get('finalComment')
            if final_comments is not None:
                appraisal.final_comments = str(final_comments)

            appraisal.save()

            resp_data = AppraisalSerializer(appraisal).data
            resp_data['score_calculation'] = calculation
            resp_data['publication_status'] = 'SUCCESS'
            resp_data['appraisal_id'] = str(appraisal.id)
            resp_data['overall_score'] = float(appraisal.overall_score)
            resp_data['published_at'] = appraisal.published_at.isoformat()
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

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        cycle = instance.cycle
        if cycle and cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            return Response(
                {"detail": f"Cannot modify competencies on a cycle in '{cycle.get_status_display()}' status."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if instance.technical_reviews.exists():
            return Response(
                {
                    "error": "HISTORICAL_REVIEWS_EXIST",
                    "detail": f"Cannot delete competency '{instance.name}': it is referenced by {instance.technical_reviews.count()} existing technical review(s)."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        if hasattr(instance, 'behavioral_reviews') and instance.behavioral_reviews.exists():
            return Response(
                {
                    "error": "HISTORICAL_REVIEWS_EXIST",
                    "detail": f"Cannot delete competency '{instance.name}': it is referenced by {instance.behavioral_reviews.count()} existing behavioral review(s)."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    def perform_destroy(self, instance):
        cycle = instance.cycle
        if cycle and cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            raise PermissionDenied(f"Cannot modify competencies on a cycle in '{cycle.get_status_display()}' status.")
        if instance.technical_reviews.exists():
            raise ValidationError(
                f"Cannot delete competency '{instance.name}': it is referenced by {instance.technical_reviews.count()} existing technical review(s)."
            )
        if hasattr(instance, 'behavioral_reviews') and instance.behavioral_reviews.exists():
            raise ValidationError(
                f"Cannot delete competency '{instance.name}': it is referenced by {instance.behavioral_reviews.count()} existing behavioral review(s)."
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

    @action(detail=False, methods=['get'], url_path='my-assignments', permission_classes=[permissions.IsAuthenticated])
    def my_assignments(self, request):
        user = request.user
        cycle_id = request.query_params.get('cycle_id') or request.query_params.get('cycle')
        if not cycle_id:
            cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).first() or PerformanceCycle.objects.first()
        else:
            cycle = PerformanceCycle.objects.filter(id=cycle_id).first()
        if not cycle:
            return Response({'cycle_id': None, 'count': 0, 'assignments': []}, status=status.HTTP_200_OK)

        is_hr_admin = getattr(user, 'is_super_admin', False) or getattr(user, 'is_hr', False) or getattr(user, 'role', '') in ['SUPER_ADMIN', 'HR'] or user.is_staff or user.is_superuser

        if is_hr_admin:
            assignments = CycleEvaluatorAssignment.objects.filter(cycle=cycle).select_related(
                'participant', 'participant__employee', 'participant__employee__department', 'evaluator'
            )
        else:
            assignments = CycleEvaluatorAssignment.objects.filter(cycle=cycle, evaluator=user).select_related(
                'participant', 'participant__employee', 'participant__employee__department', 'evaluator'
            )

        data = []
        for a in assignments:
            emp = a.participant.employee
            if a.section == EvaluatorSectionType.TECHNICAL:
                tech_reviews = TechnicalCapabilityReview.objects.filter(employee=emp, cycle=cycle)
                scored_count = tech_reviews.filter(score__isnull=False).count()
                total_count = cycle.competencies.filter(section=CompetencySection.TECHNICAL, is_active=True).count()
                rev_status = 'SUBMITTED' if tech_reviews.filter(status='SUBMITTED').exists() and scored_count >= total_count and total_count > 0 else ('IN_PROGRESS' if scored_count > 0 else 'PENDING')
            elif a.section == EvaluatorSectionType.BEHAVIORAL:
                behav_reviews = BehavioralCapabilityReview.objects.filter(employee=emp, cycle=cycle)
                scored_count = behav_reviews.filter(score__isnull=False).count()
                total_count = cycle.competencies.filter(section=CompetencySection.BEHAVIORAL, is_active=True).count()
                rev_status = 'SUBMITTED' if behav_reviews.filter(status='SUBMITTED').exists() and scored_count >= total_count and total_count > 0 else ('IN_PROGRESS' if scored_count > 0 else 'PENDING')
            else:
                rev_status = 'N/A'

            data.append({
                'assignment_id': str(a.id),
                'cycle_id': str(cycle.id),
                'cycle_name': cycle.name,
                'participant_id': str(a.participant.id),
                'employee_id': str(emp.id),
                'employee_code': emp.employee_code,
                'full_name': emp.full_name,
                'email': emp.email,
                'department': emp.department.name if emp.department else '',
                'section': a.section,
                'section_display': a.get_section_display(),
                'is_mandatory': a.is_mandatory,
                'evaluator_id': str(a.evaluator.id),
                'evaluator_name': a.evaluator.username,
                'evaluation_status': rev_status,
            })

        return Response({
            'cycle_id': str(cycle.id),
            'cycle_name': cycle.name,
            'count': len(data),
            'assignments': data
        }, status=status.HTTP_200_OK)


class TechnicalCapabilityReviewViewSet(viewsets.ModelViewSet):
    serializer_class = TechnicalCapabilityReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['cycle', 'employee', 'competency', 'status']
    ordering_fields = ['created_at', 'score']

    def get_queryset(self):
        user = self.request.user
        qs = TechnicalCapabilityReview.objects.select_related('competency', 'parameter', 'employee', 'cycle', 'reviewer')
        is_hr_admin = getattr(user, 'is_super_admin', False) or getattr(user, 'is_hr', False) or getattr(user, 'role', '') in ['SUPER_ADMIN', 'HR'] or user.is_staff or user.is_superuser
        if is_hr_admin:
            return qs.all()
        if getattr(user, 'role', '') == 'INTERN':
            return qs.none()

        cycle_param = self.request.query_params.get('cycle') or self.request.query_params.get('cycle_id')
        assignments = CycleEvaluatorAssignment.objects.filter(
            evaluator=user, section=EvaluatorSectionType.TECHNICAL
        )
        if cycle_param:
            assignments = assignments.filter(cycle_id=cycle_param)
            assigned_emp_ids = assignments.values_list('participant__employee_id', flat=True)
            return qs.filter(cycle_id=cycle_param, employee__id__in=assigned_emp_ids)

        assignment_pairs = list(assignments.values('cycle_id', 'participant__employee_id'))
        if not assignment_pairs:
            return qs.none()

        pair_filter = Q()
        for pair in assignment_pairs:
            pair_filter |= Q(cycle_id=pair['cycle_id'], employee_id=pair['participant__employee_id'])
        return qs.filter(pair_filter)

    def perform_create(self, serializer):
        user = self.request.user
        is_hr_admin = getattr(user, 'is_super_admin', False) or getattr(user, 'is_hr', False) or getattr(user, 'role', '') in ['SUPER_ADMIN', 'HR'] or user.is_staff or user.is_superuser

        validated_data = serializer.validated_data
        cycle = validated_data.get('cycle')
        employee = validated_data.get('employee')
        competency = validated_data.get('competency')
        if not cycle and competency:
            cycle = competency.cycle

        if cycle and cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            raise PermissionDenied(f"Cannot create technical reviews on a cycle in '{cycle.get_status_display()}' status.")

        if not is_hr_admin:
            if not cycle or not employee:
                raise PermissionDenied("Cycle and employee are required to verify evaluator authorization.")
            is_assigned = CycleEvaluatorAssignment.objects.filter(
                cycle=cycle,
                participant__employee=employee,
                evaluator=user,
                section=EvaluatorSectionType.TECHNICAL
            ).exists()
            if not is_assigned:
                raise PermissionDenied("You are not assigned as the Technical evaluator for this participant in this cycle.")

        instance = serializer.save(reviewer=user)
        return instance

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        is_hr_admin = getattr(user, 'is_super_admin', False) or getattr(user, 'is_hr', False) or getattr(user, 'role', '') in ['SUPER_ADMIN', 'HR'] or user.is_staff or user.is_superuser

        target_employee = serializer.validated_data.get('employee', instance.employee)
        target_cycle = serializer.validated_data.get('cycle', instance.cycle)

        if instance.cycle and instance.cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            raise PermissionDenied(f"Cannot modify technical reviews on a cycle in '{instance.cycle.get_status_display()}' status.")

        if not is_hr_admin:
            if target_employee != instance.employee:
                raise PermissionDenied("You cannot transfer a technical review to another employee.")
            if target_cycle != instance.cycle:
                raise PermissionDenied("You cannot change the performance cycle of an existing technical review.")

            is_assigned = CycleEvaluatorAssignment.objects.filter(
                cycle=target_cycle,
                participant__employee=target_employee,
                evaluator=user,
                section=EvaluatorSectionType.TECHNICAL
            ).exists()
            if not is_assigned:
                raise PermissionDenied("You are not assigned as the Technical evaluator for this participant in this cycle.")

        serializer.save(reviewer=user)

    def perform_destroy(self, instance):
        user = self.request.user
        is_hr_admin = getattr(user, 'is_super_admin', False) or getattr(user, 'is_hr', False) or getattr(user, 'role', '') in ['SUPER_ADMIN', 'HR'] or user.is_staff or user.is_superuser
        if not is_hr_admin:
            raise PermissionDenied("Only HR and Super Admins may delete technical capability reviews.")
        if instance.cycle and instance.cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            raise PermissionDenied(f"Cannot delete technical reviews on a cycle in '{instance.cycle.get_status_display()}' status.")
        instance.delete()


class BehavioralCapabilityReviewViewSet(viewsets.ModelViewSet):
    serializer_class = BehavioralCapabilityReviewSerializer
    permission_classes = [IsHR]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['cycle', 'employee', 'competency', 'status']
    ordering_fields = ['created_at', 'score']

    def get_queryset(self):
        return BehavioralCapabilityReview.objects.select_related('competency', 'employee', 'cycle', 'reviewer').all()

    def perform_create(self, serializer):
        cycle = serializer.validated_data.get('cycle')
        competency = serializer.validated_data.get('competency')
        if not cycle and competency:
            cycle = competency.cycle
        if cycle and cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            raise PermissionDenied(f"Cannot create behavioral reviews on a cycle in '{cycle.get_status_display()}' status.")
        return serializer.save(reviewer=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        target_employee = serializer.validated_data.get('employee', instance.employee)
        target_cycle = serializer.validated_data.get('cycle', instance.cycle)
        if instance.cycle and instance.cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            raise PermissionDenied(f"Cannot modify behavioral reviews on a cycle in '{instance.cycle.get_status_display()}' status.")
        if target_employee != instance.employee:
            raise PermissionDenied("You cannot transfer a behavioral review to another employee.")
        if target_cycle != instance.cycle:
            raise PermissionDenied("You cannot change the performance cycle of an existing behavioral review.")
        serializer.save(reviewer=self.request.user)

    def perform_destroy(self, instance):
        if instance.cycle and instance.cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            raise PermissionDenied(f"Cannot delete behavioral reviews on a cycle in '{instance.cycle.get_status_display()}' status.")
        instance.delete()


class TechnicalEvaluationView(APIView):
    """
    Technical Evaluation Sheet and Review Submission.
    Restricted to assigned TECHNICAL evaluator or HR/Super Admin.
    Direct manager status alone does NOT grant permission without assignment.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _resolve_context(self, request):
        user = request.user
        participant_id = request.query_params.get('participant_id') or (request.data.get('participant_id') if isinstance(request.data, dict) else None)
        employee_id = request.query_params.get('employee_id') or (request.data.get('employee_id') if isinstance(request.data, dict) else None)
        cycle_id = request.query_params.get('cycle_id') or (request.data.get('cycle_id') if isinstance(request.data, dict) else None)

        if not participant_id and not employee_id:
            raise ValidationError("Either participant_id or employee_id is required.")

        cycle = None
        if cycle_id:
            cycle = PerformanceCycle.objects.filter(id=cycle_id).first()
            if not cycle:
                raise ValidationError("Specified performance cycle was not found.")

        participant = None
        if participant_id:
            participant = CycleParticipant.objects.filter(id=participant_id).select_related('cycle', 'employee', 'employee__department').first()
            if not participant:
                raise ValidationError("Participant not found.")
            if cycle and participant.cycle_id != cycle.id:
                raise ValidationError("Participant does not belong to the specified cycle.")
            cycle = participant.cycle
        elif employee_id:
            if not cycle:
                raise ValidationError("cycle_id is required when participant_id is not provided.")
            participant = CycleParticipant.objects.filter(
                Q(cycle=cycle) & (Q(employee__id=employee_id) | Q(employee__user__id=employee_id) | Q(employee__employee_code__iexact=str(employee_id)))
            ).select_related('cycle', 'employee', 'employee__department').first()
            if not participant:
                raise ValidationError("Participant is not enrolled in the specified cycle.")

        # Authorization: Must be assigned TECHNICAL evaluator or HR/Super Admin
        is_hr_admin = getattr(user, 'is_super_admin', False) or getattr(user, 'is_hr', False) or getattr(user, 'role', '') in ['SUPER_ADMIN', 'HR'] or user.is_staff or user.is_superuser
        if not is_hr_admin:
            is_assigned = CycleEvaluatorAssignment.objects.filter(
                cycle=cycle,
                participant=participant,
                section=EvaluatorSectionType.TECHNICAL,
                evaluator=user
            ).exists()
            if not is_assigned:
                raise PermissionDenied("You are not assigned as the Technical evaluator for this participant.")

        return cycle, participant

    def get(self, request):
        try:
            cycle, participant = self._resolve_context(request)
        except (ValidationError, PermissionDenied) as exc:
            return Response({'error': str(exc.detail if hasattr(exc, 'detail') else exc)}, status=getattr(exc, 'status_code', status.HTTP_400_BAD_REQUEST))

        emp = participant.employee
        active_comps = cycle.competencies.filter(section=CompetencySection.TECHNICAL, is_active=True).order_by('order', 'name')
        existing_reviews = {
            r.competency_id: r
            for r in TechnicalCapabilityReview.objects.filter(cycle=cycle, employee=emp, competency__in=active_comps)
        }

        from apps.evidence.models import EvidenceSubmission
        evidence_qs = EvidenceSubmission.objects.filter(employee=emp).values('id', 'title', 'external_url', 'review_status')

        competencies_data = []
        for comp in active_comps:
            rev = existing_reviews.get(comp.id)
            competencies_data.append({
                'competency_id': str(comp.id),
                'name': comp.name,
                'description': comp.description,
                'weight': float(comp.weight),
                'benchmark_score': float(comp.benchmark_score),
                'rubric_descriptors': comp.rubric_descriptors or {},
                'review': {
                    'id': str(rev.id) if rev else None,
                    'score': float(rev.score) if rev and rev.score is not None else None,
                    'mentor_assessment': rev.mentor_assessment if rev else '',
                    'evidence_url': rev.evidence_url if rev else '',
                    'status': rev.status if rev else 'DRAFT',
                    'updated_at': rev.updated_at.isoformat() if rev else None,
                }
            })

        return Response({
            'cycle_id': str(cycle.id),
            'cycle_name': cycle.name,
            'rating_scale_max': float(cycle.rating_scale_max or Decimal('5.0')),
            'participant_id': str(participant.id),
            'employee_id': str(emp.id),
            'employee_code': emp.employee_code,
            'full_name': emp.full_name,
            'department': emp.department.name if emp.department else '',
            'competencies': competencies_data,
            'available_evidence': list(evidence_qs)
        }, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            cycle, participant = self._resolve_context(request)
        except (ValidationError, PermissionDenied) as exc:
            return Response({'error': str(exc.detail if hasattr(exc, 'detail') else exc)}, status=getattr(exc, 'status_code', status.HTTP_400_BAD_REQUEST))

        # Historical cycle protection guard: finalized, published, or closed cycles are strictly read-only
        if cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            return Response({
                'error': 'CYCLE_CLOSED',
                'detail': f"Cannot submit or modify technical evaluations for a cycle in '{cycle.get_status_display()}' status."
            }, status=status.HTTP_400_BAD_REQUEST)

        emp = participant.employee
        raw_status = request.data.get('status', 'DRAFT').upper()
        is_submitting = raw_status in ['SUBMITTED', 'SUBMIT']
        target_status = 'SUBMITTED' if is_submitting else 'DRAFT'
        reviews_data = request.data.get('reviews', [])

        active_comps = {
            str(c.id): c
            for c in cycle.competencies.filter(section=CompetencySection.TECHNICAL, is_active=True)
        }
        scale_max = cycle.rating_scale_max or Decimal('5.0')

        if is_submitting:
            submitted_comp_ids = set()
            for item in reviews_data:
                cid = str(item.get('competency_id') or item.get('competencyId') or '')
                score = item.get('score')
                if score is not None and str(score).strip() != '':
                    submitted_comp_ids.add(cid)
            missing = set(active_comps.keys()) - submitted_comp_ids
            if missing:
                return Response({
                    'error': 'INCOMPLETE_SUBMISSION',
                    'detail': f"All {len(active_comps)} active Technical competencies must be scored before submission. Missing: {len(missing)}."
                }, status=status.HTTP_400_BAD_REQUEST)

        saved_records = []
        with transaction.atomic():
            for item in reviews_data:
                cid = str(item.get('competency_id') or item.get('competencyId') or '')
                comp = active_comps.get(cid)
                if not comp:
                    continue

                raw_score = item.get('score')
                score_val = None
                if raw_score is not None and str(raw_score).strip() != '':
                    score_val = Decimal(str(raw_score))
                    if score_val < Decimal('0.00') or score_val > scale_max:
                        return Response({
                            'error': 'INVALID_SCORE',
                            'detail': f"Score for '{comp.name}' must be between 0.00 and {scale_max}."
                        }, status=status.HTTP_400_BAD_REQUEST)

                assessment = (item.get('mentor_assessment') or item.get('mentorAssessment') or item.get('assessment') or '').strip()
                evidence_url = (item.get('evidence_url') or item.get('evidenceUrl') or '').strip()

                rev, _ = TechnicalCapabilityReview.objects.update_or_create(
                    competency=comp,
                    employee=emp,
                    defaults={
                        'cycle': cycle,
                        'reviewer': request.user,
                        'score': score_val,
                        'mentor_assessment': assessment,
                        'evidence_url': evidence_url,
                        'status': target_status,
                        'parameter': None
                    }
                )
                saved_records.append(rev)

        return Response({
            'message': f"Technical evaluation {'submitted' if is_submitting else 'saved as draft'}.",
            'status': target_status,
            'saved_count': len(saved_records),
            'cycle_id': str(cycle.id),
            'participant_id': str(participant.id)
        }, status=status.HTTP_200_OK)


class BehavioralEvaluationView(APIView):
    """
    Behavioral Evaluation Sheet and Review Submission.
    HR exclusively authorized for this milestone.
    Mentors, direct managers, and interns are denied access (HTTP 403).
    """
    permission_classes = [IsHR]

    def _resolve_context(self, request):
        participant_id = request.query_params.get('participant_id') or (request.data.get('participant_id') if isinstance(request.data, dict) else None)
        employee_id = request.query_params.get('employee_id') or (request.data.get('employee_id') if isinstance(request.data, dict) else None)
        cycle_id = request.query_params.get('cycle_id') or (request.data.get('cycle_id') if isinstance(request.data, dict) else None)

        if not participant_id and not employee_id:
            raise ValidationError("Either participant_id or employee_id is required.")

        cycle = None
        if cycle_id:
            cycle = PerformanceCycle.objects.filter(id=cycle_id).first()
            if not cycle:
                raise ValidationError("Specified performance cycle was not found.")

        participant = None
        if participant_id:
            participant = CycleParticipant.objects.filter(id=participant_id).select_related('cycle', 'employee', 'employee__department').first()
            if not participant:
                raise ValidationError("Participant not found.")
            if cycle and participant.cycle_id != cycle.id:
                raise ValidationError("Participant does not belong to the specified cycle.")
            cycle = participant.cycle
        elif employee_id:
            if not cycle:
                raise ValidationError("cycle_id is required when participant_id is not provided.")
            participant = CycleParticipant.objects.filter(
                Q(cycle=cycle) & (Q(employee__id=employee_id) | Q(employee__user__id=employee_id) | Q(employee__employee_code__iexact=str(employee_id)))
            ).select_related('cycle', 'employee', 'employee__department').first()
            if not participant:
                raise ValidationError("Participant is not enrolled in the specified cycle.")

        return cycle, participant

    def get(self, request):
        try:
            cycle, participant = self._resolve_context(request)
        except (ValidationError, PermissionDenied) as exc:
            return Response({'error': str(exc.detail if hasattr(exc, 'detail') else exc)}, status=getattr(exc, 'status_code', status.HTTP_400_BAD_REQUEST))

        emp = participant.employee
        active_comps = cycle.competencies.filter(section=CompetencySection.BEHAVIORAL, is_active=True).order_by('order', 'name')
        existing_reviews = {
            r.competency_id: r
            for r in BehavioralCapabilityReview.objects.filter(cycle=cycle, employee=emp, competency__in=active_comps)
        }

        competencies_data = []
        for comp in active_comps:
            rev = existing_reviews.get(comp.id)
            competencies_data.append({
                'competency_id': str(comp.id),
                'name': comp.name,
                'description': comp.description,
                'weight': float(comp.weight),
                'benchmark_score': float(comp.benchmark_score),
                'rubric_descriptors': comp.rubric_descriptors or {},
                'review': {
                    'id': str(rev.id) if rev else None,
                    'score': float(rev.score) if rev and rev.score is not None else None,
                    'hr_assessment': rev.hr_assessment if rev else '',
                    'status': rev.status if rev else 'DRAFT',
                    'updated_at': rev.updated_at.isoformat() if rev else None,
                }
            })

        return Response({
            'cycle_id': str(cycle.id),
            'cycle_name': cycle.name,
            'rating_scale_max': float(cycle.rating_scale_max or Decimal('5.0')),
            'participant_id': str(participant.id),
            'employee_id': str(emp.id),
            'employee_code': emp.employee_code,
            'full_name': emp.full_name,
            'department': emp.department.name if emp.department else '',
            'competencies': competencies_data,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            cycle, participant = self._resolve_context(request)
        except (ValidationError, PermissionDenied) as exc:
            return Response({'error': str(exc.detail if hasattr(exc, 'detail') else exc)}, status=getattr(exc, 'status_code', status.HTTP_400_BAD_REQUEST))

        # Historical cycle protection guard: finalized, published, or closed cycles are strictly read-only
        if cycle.status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            return Response({
                'error': 'CYCLE_CLOSED',
                'detail': f"Cannot submit or modify behavioral evaluations for a cycle in '{cycle.get_status_display()}' status."
            }, status=status.HTTP_400_BAD_REQUEST)

        emp = participant.employee
        raw_status = request.data.get('status', 'DRAFT').upper()
        is_submitting = raw_status in ['SUBMITTED', 'SUBMIT']
        target_status = 'SUBMITTED' if is_submitting else 'DRAFT'
        reviews_data = request.data.get('reviews', [])

        active_comps = {
            str(c.id): c
            for c in cycle.competencies.filter(section=CompetencySection.BEHAVIORAL, is_active=True)
        }
        scale_max = cycle.rating_scale_max or Decimal('5.0')

        if is_submitting:
            submitted_comp_ids = set()
            for item in reviews_data:
                cid = str(item.get('competency_id') or item.get('competencyId') or '')
                score = item.get('score')
                if score is not None and str(score).strip() != '':
                    submitted_comp_ids.add(cid)
            missing = set(active_comps.keys()) - submitted_comp_ids
            if missing:
                return Response({
                    'error': 'INCOMPLETE_SUBMISSION',
                    'detail': f"All {len(active_comps)} active Behavioral competencies must be scored before submission. Missing: {len(missing)}."
                }, status=status.HTTP_400_BAD_REQUEST)

        saved_records = []
        with transaction.atomic():
            for item in reviews_data:
                cid = str(item.get('competency_id') or item.get('competencyId') or '')
                comp = active_comps.get(cid)
                if not comp:
                    continue

                raw_score = item.get('score')
                score_val = None
                if raw_score is not None and str(raw_score).strip() != '':
                    score_val = Decimal(str(raw_score))
                    if score_val < Decimal('0.00') or score_val > scale_max:
                        return Response({
                            'error': 'INVALID_SCORE',
                            'detail': f"Score for '{comp.name}' must be between 0.00 and {scale_max}."
                        }, status=status.HTTP_400_BAD_REQUEST)

                assessment = (item.get('hr_assessment') or item.get('hrAssessment') or item.get('assessment') or '').strip()

                rev, _ = BehavioralCapabilityReview.objects.update_or_create(
                    competency=comp,
                    employee=emp,
                    defaults={
                        'cycle': cycle,
                        'reviewer': request.user,
                        'score': score_val,
                        'hr_assessment': assessment,
                        'status': target_status,
                    }
                )
                saved_records.append(rev)

        return Response({
            'message': f"Behavioral evaluation {'submitted' if is_submitting else 'saved as draft'}.",
            'status': target_status,
            'saved_count': len(saved_records),
            'cycle_id': str(cycle.id),
            'participant_id': str(participant.id)
        }, status=status.HTTP_200_OK)


class EvaluationSummaryView(APIView):
    """
    Returns canonical score calculation breakdown and telemetry for a participant.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        participant_id = request.query_params.get('participant_id')
        employee_id = request.query_params.get('employee_id')
        cycle_id = request.query_params.get('cycle_id')

        if not participant_id and not employee_id:
            return Response({'error': 'Either participant_id or employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        cycle = None
        if cycle_id:
            cycle = PerformanceCycle.objects.filter(id=cycle_id).first()
            if not cycle:
                return Response({'error': 'Specified cycle was not found.'}, status=status.HTTP_404_NOT_FOUND)

        participant = None
        if participant_id:
            participant = CycleParticipant.objects.filter(id=participant_id).select_related('cycle', 'employee').first()
            if not participant:
                return Response({'error': 'Participant not found.'}, status=status.HTTP_404_NOT_FOUND)
            if cycle and participant.cycle_id != cycle.id:
                return Response({'error': 'Participant does not belong to the specified cycle.'}, status=status.HTTP_400_BAD_REQUEST)
            cycle = participant.cycle
        elif employee_id:
            if not cycle:
                return Response({'error': 'cycle_id is required when participant_id is not provided.'}, status=status.HTTP_400_BAD_REQUEST)
            participant = CycleParticipant.objects.filter(
                Q(cycle=cycle) & (Q(employee__id=employee_id) | Q(employee__user__id=employee_id) | Q(employee__employee_code__iexact=str(employee_id)))
            ).select_related('cycle', 'employee').first()
            if not participant:
                return Response({'error': 'Participant is not enrolled in the specified cycle.'}, status=status.HTTP_404_NOT_FOUND)

        emp = participant.employee

        is_hr_admin = getattr(user, 'is_super_admin', False) or getattr(user, 'is_hr', False) or getattr(user, 'role', '') in ['SUPER_ADMIN', 'HR'] or user.is_staff or user.is_superuser
        user_is_intern = (getattr(user, 'role', '') == 'INTERN') or (hasattr(user, 'profile') and getattr(user.profile, 'role', '') == 'INTERN') or (emp.user_id == user.id)

        if user_is_intern and not is_hr_admin:
            # Intern Privacy Boundary: Interns can ONLY inspect their own evaluation.
            user_profile = getattr(user, 'profile', None)
            if not user_profile:
                user_profile = EmployeeProfile.objects.filter(user=user).first()
            if not user_profile:
                return Response({'error': 'Intern profile not found for authenticated user.'}, status=status.HTTP_403_FORBIDDEN)
            if participant and participant.employee_id != user_profile.id:
                return Response({'error': 'Access denied: cannot inspect other participant evaluations.'}, status=status.HTTP_403_FORBIDDEN)
            emp = user_profile

            # Check canonical MANAGER Appraisal publication
            appraisal = Appraisal.objects.filter(employee=emp, cycle=cycle, appraisal_type=AppraisalType.MANAGER).first()
            if not appraisal or appraisal.status != AppraisalStatus.PUBLISHED:
                return Response({'error': 'Appraisal has not been published by HR yet.'}, status=status.HTTP_403_FORBIDDEN)

        if not is_hr_admin and not user_is_intern:
            is_assigned = CycleEvaluatorAssignment.objects.filter(cycle=cycle, participant=participant, evaluator=user).exists()
            if not is_assigned:
                return Response({'error': 'You do not have access to this evaluation summary.'}, status=status.HTTP_403_FORBIDDEN)

        calculation = ScoringService.calculate_cycle_score(emp, cycle)
        return Response({
            'participant_id': str(participant.id),
            'employee_id': str(emp.id),
            'full_name': emp.full_name,
            'employee_code': emp.employee_code,
            'cycle_id': str(cycle.id),
            'cycle_name': cycle.name,
            'score_calculation': calculation
        }, status=status.HTTP_200_OK)


class MentorAssignedEvaluationsView(APIView):
    """
    Dedicated discovery endpoint for mentor technical evaluations.
    Restricted to authenticated users with TECHNICAL evaluator assignments.
    Resolves active performance cycles without silent latest-cycle fallbacks.
    Returns assigned participants with evaluation progress telemetry.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        cycle_id = request.query_params.get('cycle_id')

        is_hr_admin = (
            getattr(user, 'is_super_admin', False) or
            getattr(user, 'is_hr', False) or
            getattr(user, 'role', '') in ['SUPER_ADMIN', 'HR'] or
            user.is_staff or
            user.is_superuser
        )

        active_statuses = [
            CycleStatus.ACTIVE,
            CycleStatus.IN_PROGRESS,
            CycleStatus.REVIEW_PERIOD,
        ]

        # 1. Discover all eligible active cycles where user has TECHNICAL assignments
        # (or all active cycles for HR/Super Admin)
        eligible_cycles_qs = PerformanceCycle.objects.filter(status__in=active_statuses)
        if not is_hr_admin:
            eligible_cycles_qs = eligible_cycles_qs.filter(
                evaluator_assignments__evaluator=user,
                evaluator_assignments__section=EvaluatorSectionType.TECHNICAL
            ).distinct()

        eligible_cycles = list(eligible_cycles_qs.order_by('-start_date', '-created_at'))

        target_cycle = None

        if cycle_id:
            # Explicit cycle requested
            target_cycle = PerformanceCycle.objects.filter(id=cycle_id).first()
            if not target_cycle:
                return Response(
                    {
                        'error': 'CYCLE_NOT_FOUND',
                        'detail': 'The specified performance cycle does not exist.'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )

            # Validate explicit cycle access: mentor must have at least one assignment in that cycle (unless HR/Super Admin)
            if not is_hr_admin:
                has_access = CycleEvaluatorAssignment.objects.filter(
                    cycle=target_cycle,
                    evaluator=user,
                    section=EvaluatorSectionType.TECHNICAL
                ).exists()
                if not has_access:
                    return Response(
                        {
                            'error': 'ACCESS_DENIED',
                            'detail': 'You do not have technical evaluator assignments in this cycle.'
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
        else:
            # No cycle_id provided: deterministic active cycle resolution
            if len(eligible_cycles) == 0:
                return Response({
                    'requires_cycle_selection': False,
                    'selected_cycle': None,
                    'eligible_cycles': [],
                    'assigned_evaluations': [],
                    'message': 'No active performance cycles with assigned technical evaluations were found.'
                }, status=status.HTTP_200_OK)

            elif len(eligible_cycles) == 1:
                target_cycle = eligible_cycles[0]

            else:
                # Multiple active cycles exist -> prompt user selection, never pick latest as fallback!
                eligible_cycles_data = [
                    {
                        'id': str(c.id),
                        'name': c.name,
                        'status': c.status,
                        'start_date': c.start_date.isoformat() if c.start_date else None,
                        'end_date': c.end_date.isoformat() if c.end_date else None,
                        'rating_scale_max': float(c.rating_scale_max or Decimal('5.0')),
                    }
                    for c in eligible_cycles
                ]
                return Response({
                    'requires_cycle_selection': True,
                    'selected_cycle': None,
                    'eligible_cycles': eligible_cycles_data,
                    'assigned_evaluations': [],
                    'message': 'Multiple active performance cycles are available. Please select a cycle to view assigned evaluations.'
                }, status=status.HTTP_200_OK)

        # 2. Query assignments for target_cycle
        assignments_qs = CycleEvaluatorAssignment.objects.filter(
            cycle=target_cycle,
            evaluator=user,
            section=EvaluatorSectionType.TECHNICAL
        ).select_related(
            'participant',
            'participant__employee',
            'participant__employee__department',
            'participant__employee__user'
        ).order_by('participant__employee__first_name', 'participant__employee__last_name')

        assignments = list(assignments_qs)

        # 3. Retrieve active technical competencies for target_cycle
        active_comps = list(target_cycle.competencies.filter(
            section=CompetencySection.TECHNICAL,
            is_active=True
        ).order_by('order', 'name'))
        total_comps = len(active_comps)
        active_comp_ids = [c.id for c in active_comps]

        # 4. Bulk fetch existing reviews to avoid N+1 queries
        emp_ids = [a.participant.employee_id for a in assignments if a.participant and a.participant.employee_id]
        reviews_by_emp = {}
        if emp_ids and active_comp_ids:
            reviews = TechnicalCapabilityReview.objects.filter(
                cycle=target_cycle,
                employee_id__in=emp_ids,
                competency_id__in=active_comp_ids,
                reviewer=user
            )
            for r in reviews:
                reviews_by_emp.setdefault(r.employee_id, []).append(r)

        # 5. Format assigned evaluations with real progress
        assigned_data = []
        for a in assignments:
            participant = a.participant
            if not participant:
                continue
            emp = participant.employee
            if not emp:
                continue

            emp_reviews = reviews_by_emp.get(emp.id, [])
            scored_reviews = [r for r in emp_reviews if r.score is not None]
            scored_count = len(scored_reviews)
            submitted_count = len([r for r in scored_reviews if r.status == 'SUBMITTED'])

            # Determine status
            if total_comps == 0:
                eval_status = 'NOT_STARTED'
            elif scored_count == total_comps and submitted_count == total_comps:
                eval_status = 'SUBMITTED'
            elif scored_count > 0 or len(emp_reviews) > 0:
                eval_status = 'IN_PROGRESS'
            else:
                eval_status = 'NOT_STARTED'

            last_updated = max([r.updated_at for r in emp_reviews]) if emp_reviews else None

            assigned_data.append({
                'assignment_id': str(a.id),
                'participant_id': str(participant.id),
                'employee_id': str(emp.id),
                'employee_code': emp.employee_code,
                'full_name': emp.full_name,
                'department': emp.department.name if emp.department else '',
                'employment_status': emp.employment_status,
                'is_mandatory': a.is_mandatory,
                'assigned_at': a.created_at.isoformat(),
                'progress': {
                    'total_competencies': total_comps,
                    'scored_competencies': scored_count,
                    'status': eval_status,
                    'has_configuration_error': total_comps == 0,
                    'configuration_error': 'No active technical competencies configured for this cycle.' if total_comps == 0 else None,
                    'last_updated_at': last_updated.isoformat() if last_updated else None,
                }
            })

        eligible_cycles_data = [
            {
                'id': str(c.id),
                'name': c.name,
                'status': c.status,
                'start_date': c.start_date.isoformat() if c.start_date else None,
                'end_date': c.end_date.isoformat() if c.end_date else None,
                'rating_scale_max': float(c.rating_scale_max or Decimal('5.0')),
            }
            for c in eligible_cycles
        ]

        return Response({
            'requires_cycle_selection': False,
            'selected_cycle': {
                'id': str(target_cycle.id),
                'name': target_cycle.name,
                'status': target_cycle.status,
                'start_date': target_cycle.start_date.isoformat() if target_cycle.start_date else None,
                'end_date': target_cycle.end_date.isoformat() if target_cycle.end_date else None,
                'rating_scale_max': float(target_cycle.rating_scale_max or Decimal('5.0')),
                'scoring_model': target_cycle.scoring_model,
            },
            'eligible_cycles': eligible_cycles_data,
            'assigned_evaluations': assigned_data,
        }, status=status.HTTP_200_OK)
