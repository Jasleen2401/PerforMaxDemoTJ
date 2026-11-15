import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


# ---------------------------------------------------------------------------
# Cycle Status — full state machine per workflow document
# ---------------------------------------------------------------------------
class CycleStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    VALIDATING = 'VALIDATING', 'Validating'
    ACTIVE = 'ACTIVE', 'Active'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    REVIEW_PERIOD = 'REVIEW_PERIOD', 'Review Period'
    READY_FOR_HR_REVIEW = 'READY_FOR_HR_REVIEW', 'Ready for HR Review'
    FINALIZED = 'FINALIZED', 'Finalized'
    PUBLISHED = 'PUBLISHED', 'Published'
    CLOSED = 'CLOSED', 'Closed'


class MIRAIStage(models.TextChoices):
    Q1 = 'Q1', 'Q1 – Baseline & Priorities'
    Q2 = 'Q2', 'Q2 – Application & Progress'
    Q3 = 'Q3', 'Q3 – Ownership & Initiative'
    Q4 = 'Q4', 'Q4 – Professional Readiness'


class ScoringModel(models.TextChoices):
    LEGACY_CRITERIA = 'LEGACY_CRITERIA', 'Legacy Evaluation Criteria'
    COMPETENCY_FRAMEWORK = 'COMPETENCY_FRAMEWORK', 'Competency Framework'


class PerformanceCycle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    mirai_stage = models.CharField(
        max_length=10,
        choices=MIRAIStage.choices,
        blank=True,
        null=True,
        help_text='MIRAI program quarter this cycle covers'
    )
    status = models.CharField(
        max_length=25,
        choices=CycleStatus.choices,
        default=CycleStatus.DRAFT,
        db_index=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_cycles'
    )
    self_assessment_deadline = models.DateField(
        null=True,
        blank=True,
        help_text='Cutoff date for intern/employee self-appraisal submissions'
    )
    evidence_deadline = models.DateField(
        null=True,
        blank=True,
        help_text='Cutoff date for deliverables and evidence submissions'
    )
    evaluator_deadline = models.DateField(
        null=True,
        blank=True,
        help_text='Cutoff date for mentor and Japanese instructor evaluations'
    )
    japanese_evaluation_mandatory = models.BooleanField(
        null=True,
        blank=True,
        default=None,
        help_text='If True, HR cannot finalize until the Japanese evaluation is submitted. None means unconfigured.'
    )
    current_phase = models.CharField(
        max_length=50,
        blank=True,
        default='Active Evaluation',
        help_text='Current cycle milestone phase label'
    )
    # Scoring weights (must sum to 100)
    technical_weight = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('60.00'),
        help_text='Weight % for Technical Capability (default: 60)'
    )
    behavioral_weight = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('40.00'),
        help_text='Weight % for Behavioral Capability (default: 40)'
    )
    rating_scale_max = models.DecimalField(
        max_digits=4, decimal_places=1, default=Decimal('5.0'),
        help_text='Maximum rating value on the configured scale (default: 5)'
    )
    scoring_model = models.CharField(
        max_length=30,
        choices=ScoringModel.choices,
        default=ScoringModel.COMPETENCY_FRAMEWORK,
        editable=False,
        help_text='Evaluation and scoring framework used by this cycle'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Performance Cycle'
        verbose_name_plural = 'Performance Cycles'
        ordering = ['-start_date']
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_date__gte=models.F('start_date')),
                name='cycle_end_date_gte_start_date'
            )
        ]

    def clean(self):
        super().clean()
        from django.core.exceptions import ValidationError
        if self.pk:
            orig = PerformanceCycle.objects.filter(pk=self.pk).values('scoring_model').first()
            if orig and self.scoring_model != orig['scoring_model']:
                raise ValidationError({'scoring_model': 'The scoring model of a performance cycle is immutable once created.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


# ---------------------------------------------------------------------------
# CycleParticipant — which interns/employees are in scope for a cycle
# ---------------------------------------------------------------------------
class CycleParticipant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='cycle_participations'
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='cycle_participant_additions'
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Cycle Participant'
        verbose_name_plural = 'Cycle Participants'
        unique_together = ('cycle', 'employee')
        ordering = ['cycle', 'employee']

    def __str__(self):
        return f"{self.employee} in {self.cycle.name}"


# ---------------------------------------------------------------------------
# EvaluatorSection — category types for evaluator assignment
# ---------------------------------------------------------------------------
class EvaluatorSectionType(models.TextChoices):
    TECHNICAL = 'TECHNICAL', 'Technical Capability'
    BEHAVIORAL = 'BEHAVIORAL', 'Behavioral Capability'
    JAPANESE = 'JAPANESE', 'Japanese Language'
    HR_BEHAVIORAL = 'HR_BEHAVIORAL', 'HR Behavioral KPI'


# ---------------------------------------------------------------------------
# CompetencySection — sections for CycleCompetency
# ---------------------------------------------------------------------------
class CompetencySection(models.TextChoices):
    TECHNICAL = 'TECHNICAL', 'Technical Capability'
    BEHAVIORAL = 'BEHAVIORAL', 'Behavioral Capability'


# ---------------------------------------------------------------------------
# CycleCompetency — cycle-scoped competency definitions & rubric anchors
# ---------------------------------------------------------------------------
class CycleCompetency(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.CASCADE,
        related_name='competencies'
    )
    section = models.CharField(
        max_length=20,
        choices=CompetencySection.choices,
        default=CompetencySection.TECHNICAL,
        db_index=True,
        help_text='Evaluation section: Technical or Behavioral'
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default='')
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('20.00'),
        help_text='Weight in percentage within this section (must sum to 100.00% per section for activation)',
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    benchmark_score = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=Decimal('5.0'),
        help_text='Expected benchmark score on configured rating scale'
    )
    rubric_descriptors = models.JSONField(
        default=dict,
        blank=True,
        help_text='Proficiency anchors for scale levels 1 through 5 (e.g. {"1": "...", "2": "...", ...})'
    )
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cycle Competency'
        verbose_name_plural = 'Cycle Competencies'
        unique_together = ('cycle', 'section', 'name')
        ordering = ['cycle', 'section', 'order', 'name']

    def __str__(self):
        return f"{self.cycle.name} › {self.get_section_display()}: {self.name} ({self.weight}%)"

    def delete(self, *args, **kwargs):
        from django.core.exceptions import ValidationError
        has_tech = self.technical_reviews.exists()
        has_behav = hasattr(self, 'behavioral_reviews') and self.behavioral_reviews.exists()
        if has_tech or has_behav:
            raise ValidationError(f"Cannot delete competency '{self.name}': historical review records exist.")
        super().delete(*args, **kwargs)


# ---------------------------------------------------------------------------
# CycleEvaluatorAssignment — who evaluates which section for which intern
# ---------------------------------------------------------------------------
class CycleEvaluatorAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.CASCADE,
        related_name='evaluator_assignments'
    )
    participant = models.ForeignKey(
        CycleParticipant,
        on_delete=models.CASCADE,
        related_name='evaluator_assignments'
    )
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_evaluations'
    )
    section = models.CharField(
        max_length=20,
        choices=EvaluatorSectionType.choices,
        help_text='Which assessment section this evaluator is responsible for'
    )
    is_mandatory = models.BooleanField(
        default=True,
        help_text='If True, this evaluation must be submitted before HR can finalize'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='evaluator_assignment_creations'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Cycle Evaluator Assignment'
        verbose_name_plural = 'Cycle Evaluator Assignments'
        unique_together = ('cycle', 'participant', 'section')
        ordering = ['cycle', 'section']

    def __str__(self):
        return (f"{self.evaluator.username} → {self.get_section_display()} "
                f"for {self.participant.employee} in {self.cycle.name}")


class EvaluationCriterion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField()
    maximum_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('100.00'),
        validators=[MinValueValidator(Decimal('1.00'))]
    )
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text='Weight in percentage (e.g. 25.00 for 25%)',
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Evaluation Criterion'
        verbose_name_plural = 'Evaluation Criteria'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} (Weight: {self.weight}%, Max: {self.maximum_score})"

class AppraisalType(models.TextChoices):
    SELF = 'SELF', 'Self Assessment'
    MANAGER = 'MANAGER', 'Manager Evaluation'
    ANNUAL_REVIEW = 'ANNUAL_REVIEW', 'Annual Review'

class AppraisalStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
    HR_APPROVED = 'HR_APPROVED', 'HR Approved'
    PUBLISHED = 'PUBLISHED', 'Published'

class Appraisal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='appraisals',
        db_index=True
    )
    cycle = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.CASCADE,
        related_name='appraisals',
        db_index=True
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_appraisals'
    )
    appraisal_type = models.CharField(
        max_length=20,
        choices=AppraisalType.choices,
        default=AppraisalType.MANAGER
    )
    status = models.CharField(
        max_length=20,
        choices=AppraisalStatus.choices,
        default=AppraisalStatus.DRAFT,
        db_index=True
    )
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    classification = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text='Published performance classification'
    )
    strengths = models.JSONField(
        default=list,
        blank=True,
        help_text='List of key evaluated strengths and accomplishments'
    )
    areas_for_improvement = models.JSONField(
        default=list,
        blank=True,
        help_text='List of actionable recommendations and growth focus areas'
    )
    recommendations = models.TextField(
        blank=True,
        null=True,
        help_text='Long-form development recommendations from reviewer/mentor'
    )
    allow_intern_reply = models.BooleanField(
        default=True,
        help_text='Whether the intern can submit replies to published feedback'
    )
    self_comments = models.TextField(blank=True, null=True)
    reviewer_comments = models.TextField(blank=True, null=True)
    final_comments = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Appraisal'
        verbose_name_plural = 'Appraisals'
        unique_together = ('employee', 'cycle', 'appraisal_type')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_appraisal_type_display()} - {self.employee.full_name} ({self.cycle.name}) [{self.get_status_display()}]"

class AppraisalRating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appraisal = models.ForeignKey(
        Appraisal,
        on_delete=models.CASCADE,
        related_name='ratings'
    )
    criterion = models.ForeignKey(
        EvaluationCriterion,
        on_delete=models.CASCADE,
        related_name='ratings'
    )
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    comments = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Appraisal Rating'
        verbose_name_plural = 'Appraisal Ratings'
        unique_together = ('appraisal', 'criterion')

    def __str__(self):
        return f"{self.appraisal.employee.full_name} - {self.criterion.name}: {self.score}"

class PipStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    SUCCESSFUL = 'SUCCESSFUL', 'Successful'
    EXTENDED = 'EXTENDED', 'Extended'
    TERMINATED = 'TERMINATED', 'Terminated'

class PerformanceImprovementPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='pips',
        db_index=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    reason = models.TextField()
    objectives = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=PipStatus.choices,
        default=PipStatus.ACTIVE,
        db_index=True
    )
    review_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Performance Improvement Plan'
        verbose_name_plural = 'Performance Improvement Plans'
        ordering = ['-created_at']

    def __str__(self):
        return f"PIP: {self.employee.full_name} ({self.get_status_display()})"

class RecognitionReward(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rewards',
        db_index=True
    )
    awarded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='given_rewards'
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Recognition & Reward'
        verbose_name_plural = 'Recognition & Rewards'
        ordering = ['-awarded_at']

    def __str__(self):
        return f"{self.title} awarded to {self.recipient.username}"


class TechnicalCapabilityParameter(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100, default='Technical Capability')
    description = models.TextField(blank=True, default='')
    benchmark_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('5.00'),
        help_text='Expected benchmark score out of 5.0'
    )
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('20.00'),
        help_text='Weight in percentage'
    )
    cycle = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='technical_parameters'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_tech_parameters'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Technical Capability Parameter'
        verbose_name_plural = 'Technical Capability Parameters'
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.category} - {self.weight}%)"


class TechnicalCapabilityReview(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parameter = models.ForeignKey(
        TechnicalCapabilityParameter,
        on_delete=models.CASCADE,
        related_name='reviews',
        null=True,
        blank=True
    )
    competency = models.ForeignKey(
        CycleCompetency,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='technical_reviews'
    )
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='technical_reviews'
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='given_technical_reviews'
    )
    cycle = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='technical_reviews'
    )
    score = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        default=None,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('10.00'))]
    )
    mentor_assessment = models.TextField(blank=True, default='')
    evidence_url = models.URLField(max_length=500, blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=[
            ('DRAFT', 'Draft'),
            ('SUBMITTED', 'Submitted'),
            ('SAVED_DRAFT', 'Saved Draft'),
            ('LOCKED_FOR_APPRAISAL', 'Locked for Appraisal'),
        ],
        default='DRAFT'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Technical Capability Review'
        verbose_name_plural = 'Technical Capability Reviews'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['competency', 'employee'],
                condition=models.Q(competency__isnull=False),
                name='unique_tech_review_per_competency'
            ),
            models.UniqueConstraint(
                fields=['parameter', 'employee', 'cycle'],
                condition=models.Q(parameter__isnull=False),
                name='unique_tech_review_per_parameter'
            ),
            models.CheckConstraint(
                check=(
                    (models.Q(competency__isnull=False) & models.Q(parameter__isnull=True)) |
                    (models.Q(competency__isnull=True) & models.Q(parameter__isnull=False))
                ),
                name='tech_review_exactly_one_reference'
            ),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        from apps.performance.models import CycleParticipant
        if self.pk:
            orig = TechnicalCapabilityReview.objects.filter(pk=self.pk).values(
                'employee_id', 'cycle_id', 'competency_id', 'parameter_id'
            ).first()
            if orig:
                if self.employee_id != orig['employee_id']:
                    raise ValidationError({'employee': 'Employee cannot be modified on an existing technical review.'})
                if self.cycle_id != orig['cycle_id']:
                    raise ValidationError({'cycle': 'Performance cycle cannot be modified on an existing technical review.'})
                if self.competency_id != orig['competency_id']:
                    raise ValidationError({'competency': 'Competency reference cannot be modified on an existing technical review.'})
                if self.parameter_id != orig['parameter_id']:
                    raise ValidationError({'parameter': 'Parameter reference cannot be modified on an existing technical review.'})

        if bool(self.competency) == bool(self.parameter):
            raise ValidationError('A technical review must reference exactly one of CycleCompetency or TechnicalCapabilityParameter.')
        if self.competency:
            if self.competency.section != CompetencySection.TECHNICAL:
                raise ValidationError({'competency': 'Referenced competency must be in TECHNICAL section.'})
            if not self.cycle_id:
                self.cycle = self.competency.cycle
            elif self.competency.cycle_id != self.cycle_id:
                raise ValidationError({'cycle': 'Review cycle must match competency cycle.'})
        elif self.parameter:
            if not self.cycle_id:
                if self.parameter.cycle_id:
                    self.cycle = self.parameter.cycle
                else:
                    raise ValidationError({'cycle': 'Performance cycle is required for parameter-based technical reviews.'})
            elif self.parameter.cycle_id and self.parameter.cycle_id != self.cycle_id:
                raise ValidationError({'cycle': 'Review cycle must match parameter cycle.'})

        if self.cycle_id and self.employee_id:
            if not CycleParticipant.objects.filter(cycle_id=self.cycle_id, employee_id=self.employee_id).exists():
                raise ValidationError({'employee': 'Employee is not enrolled as a participant in the specified cycle.'})

        if self.score is not None and self.cycle:
            scale_max = self.cycle.rating_scale_max or Decimal('5.0')
            if self.score < Decimal('0.00') or self.score > scale_max:
                raise ValidationError({'score': f'Score must be between 0.00 and {scale_max}.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        target_name = self.competency.name if self.competency else (self.parameter.name if self.parameter else 'Unknown')
        score_display = f"{self.score}" if self.score is not None else "UNSCORED"
        return f"{self.employee.full_name} - {target_name}: {score_display} [{self.status}]"


class BehavioralCapabilityReview(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competency = models.ForeignKey(
        CycleCompetency,
        on_delete=models.PROTECT,
        related_name='behavioral_reviews',
        limit_choices_to={'section': CompetencySection.BEHAVIORAL}
    )
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='behavioral_reviews'
    )
    cycle = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.CASCADE,
        related_name='behavioral_reviews'
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='given_behavioral_reviews'
    )
    score = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        default=None,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    hr_assessment = models.TextField(blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=[('DRAFT', 'Draft'), ('SUBMITTED', 'Submitted')],
        default='DRAFT'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Behavioral Capability Review'
        verbose_name_plural = 'Behavioral Capability Reviews'
        ordering = ['competency__order', 'competency__name']
        constraints = [
            models.UniqueConstraint(
                fields=['competency', 'employee'],
                name='unique_behavioral_review_per_competency'
            )
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        from apps.performance.models import CycleParticipant
        if self.pk:
            orig = BehavioralCapabilityReview.objects.filter(pk=self.pk).values(
                'employee_id', 'cycle_id', 'competency_id'
            ).first()
            if orig:
                if self.employee_id != orig['employee_id']:
                    raise ValidationError({'employee': 'Employee cannot be modified on an existing behavioral review.'})
                if self.cycle_id != orig['cycle_id']:
                    raise ValidationError({'cycle': 'Performance cycle cannot be modified on an existing behavioral review.'})
                if self.competency_id != orig['competency_id']:
                    raise ValidationError({'competency': 'Competency reference cannot be modified on an existing behavioral review.'})

        if not self.competency_id:
            raise ValidationError({'competency': 'Competency reference is required.'})
        if self.competency and self.competency.section != CompetencySection.BEHAVIORAL:
            raise ValidationError({'competency': 'Referenced competency must be in BEHAVIORAL section.'})
        if not self.cycle_id and self.competency:
            self.cycle = self.competency.cycle
        elif self.competency and self.cycle and self.competency.cycle_id != self.cycle_id:
            raise ValidationError({'cycle': 'Review cycle must match competency cycle.'})

        if self.cycle_id and self.employee_id:
            if not CycleParticipant.objects.filter(cycle_id=self.cycle_id, employee_id=self.employee_id).exists():
                raise ValidationError({'employee': 'Employee is not enrolled as a participant in the specified cycle.'})

        if self.score is not None and self.cycle:
            scale_max = self.cycle.rating_scale_max or Decimal('5.0')
            if self.score < Decimal('0.00') or self.score > scale_max:
                raise ValidationError({'score': f'Score must be between 0.00 and {scale_max}.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        score_display = f"{self.score}" if self.score is not None else "UNSCORED"
        return f"{self.employee.full_name} - {self.competency.name}: {score_display} [{self.status}]"


# ==============================================================================
# TM-07: RELATIONAL 1-ON-1 SYNC MEETINGS & ACTION ITEMS
# ==============================================================================

class MeetingStatus(models.TextChoices):
    SCHEDULED = 'SCHEDULED', 'Scheduled'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    COMPLETED = 'COMPLETED', 'Completed'
    ACTION_ITEMS_PENDING = 'ACTION_ITEMS_PENDING', 'Action Items Pending'
    RESOLVED = 'RESOLVED', 'Resolved'
    PUBLISHED = 'PUBLISHED', 'Published'
    CANCELLED = 'CANCELLED', 'Cancelled'


class ActionItemStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    DONE = 'DONE', 'Done'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'


class SyncMeeting(models.Model):
    id = models.AutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='sync_meetings',
        db_index=True
    )
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conducted_meetings',
        db_index=True
    )
    meeting_title = models.CharField(max_length=255)
    meeting_date = models.DateField()
    meeting_time = models.CharField(max_length=20, default='10:00')
    discussion_points = models.TextField(blank=True, default='')
    key_issues = models.TextField(blank=True, default='')
    confidential_notes = models.TextField(blank=True, default='', help_text='Manager-only confidential notes visible to HR during calibration')
    status = models.CharField(max_length=30, choices=MeetingStatus.choices, default=MeetingStatus.PUBLISHED, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_meetings')
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Sync Meeting'
        verbose_name_plural = 'Sync Meetings'
        ordering = ['-meeting_date', '-created_at']

    def __str__(self):
        return f"{self.meeting_title} ({self.employee.full_name} & {self.manager.username})"


class ActionItem(models.Model):
    id = models.AutoField(primary_key=True)
    meeting = models.ForeignKey(SyncMeeting, on_delete=models.CASCADE, related_name='action_items')
    content = models.CharField(max_length=500)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='meeting_action_items')
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=ActionItemStatus.choices, default=ActionItemStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Action Item'
        verbose_name_plural = 'Action Items'
        ordering = ['due_date', 'id']

    def __str__(self):
        return f"{self.content} [{self.status}]"


class MeetingComment(models.Model):
    id = models.AutoField(primary_key=True)
    meeting = models.ForeignKey(SyncMeeting, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='meeting_comments')
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Meeting Comment'
        verbose_name_plural = 'Meeting Comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.username} on meeting #{self.meeting_id}"


