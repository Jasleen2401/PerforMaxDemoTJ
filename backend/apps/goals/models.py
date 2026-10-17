import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class GoalStatus(models.TextChoices):
    NOT_STARTED = 'NOT_STARTED', 'Not Started'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'

class GoalPriority(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    CRITICAL = 'CRITICAL', 'Critical'

class KPIMeasurementType(models.TextChoices):
    NUMERIC = 'NUMERIC', 'Numeric'
    PERCENTAGE = 'PERCENTAGE', 'Percentage'
    CURRENCY = 'CURRENCY', 'Currency'
    BOOLEAN = 'BOOLEAN', 'Boolean'


class ProjectStatus(models.TextChoices):
    PLANNING = 'PLANNING', 'Planning'
    ACTIVE = 'ACTIVE', 'Active'
    COMPLETED = 'COMPLETED', 'Completed'
    ARCHIVED = 'ARCHIVED', 'Archived'


class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True, default='')
    tech_stack = models.JSONField(default=list, blank=True)
    target_cohort = models.CharField(max_length=100, blank=True, default='MIRAI Cohort 2026')
    status = models.CharField(max_length=20, choices=ProjectStatus.choices, default=ProjectStatus.ACTIVE, db_index=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_projects')
    department = models.ForeignKey('organization.Department', on_delete=models.SET_NULL, null=True, blank=True, related_name='projects')
    milestones = models.JSONField(default=list, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.code}) [{self.get_status_display()}]"


class Goal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks',
        db_index=True
    )
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='goals',
        db_index=True
    )
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.CASCADE,
        related_name='goals',
        db_index=True
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_goals'
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=GoalStatus.choices,
        default=GoalStatus.NOT_STARTED,
        db_index=True
    )
    priority = models.CharField(
        max_length=10,
        choices=GoalPriority.choices,
        default=GoalPriority.MEDIUM
    )
    completion_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    expected_evidence_type = models.CharField(
        max_length=50,
        default='CODE_PR',
        blank=True
    )
    linked_competency = models.CharField(
        max_length=150,
        blank=True,
        default=''
    )
    is_blocked = models.BooleanField(default=False)
    blocked_reason = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Goal'
        verbose_name_plural = 'Goals'
        ordering = ['due_date', '-priority']
        constraints = [
            models.CheckConstraint(
                check=models.Q(completion_percentage__gte=Decimal('0.00')) & models.Q(completion_percentage__lte=Decimal('100.00')),
                name='goal_valid_completion_percentage'
            )
        ]

    def __str__(self):
        return f"{self.title} ({self.employee.full_name} - {self.get_status_display()})"

class KPI(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(
        Goal,
        on_delete=models.CASCADE,
        related_name='kpis',
        db_index=True
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    target_value = models.DecimalField(max_digits=12, decimal_places=2)
    achieved_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    unit = models.CharField(max_length=50, default='%')
    measurement_type = models.CharField(
        max_length=20,
        choices=KPIMeasurementType.choices,
        default=KPIMeasurementType.NUMERIC
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'KPI'
        verbose_name_plural = 'KPIs'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} [{self.achieved_value}/{self.target_value} {self.unit}]"

    @property
    def achievement_percentage(self):
        if self.target_value and self.target_value > 0:
            pct = (self.achieved_value / self.target_value) * Decimal('100.00')
            return min(Decimal('100.00'), max(Decimal('0.00'), round(pct, 2)))
        return Decimal('0.00')

class GoalProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(
        Goal,
        on_delete=models.CASCADE,
        related_name='progress_updates',
        db_index=True
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    progress_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Goal Progress Update'
        verbose_name_plural = 'Goal Progress Updates'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.goal.title}: {self.progress_percentage}% ({self.created_at.strftime('%Y-%m-%d')})"


# ==============================================================================
# KPI FRAMEWORK & GOAL SET MODELS (M-02, M-03, HR-KPI)
# ==============================================================================

class KpiCategory(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'KPI Category'
        verbose_name_plural = 'KPI Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class KpiLibrary(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    position_id = models.IntegerField(default=1)
    position_name = models.CharField(max_length=150, default='General')
    target_level_id = models.IntegerField(default=1)
    level_name = models.CharField(max_length=150, default='L05 - Professional')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def position(self):
        return None

    @property
    def target_level(self):
        return None

    class Meta:
        verbose_name = 'KPI Library'
        verbose_name_plural = 'KPI Libraries'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class KpiLibraryDetail(models.Model):
    library = models.ForeignKey(KpiLibrary, on_delete=models.CASCADE, related_name='details')
    category = models.ForeignKey(KpiCategory, on_delete=models.SET_NULL, null=True, blank=True)
    goal_title = models.CharField(max_length=255)
    unit = models.CharField(max_length=50, default='%')
    target_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('100.00'))
    weight_percent = models.IntegerField(default=20)
    is_active = models.BooleanField(default=True)
    is_compliance = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'KPI Library Detail'
        verbose_name_plural = 'KPI Library Details'

    def __str__(self):
        return f"{self.library.title} - {self.goal_title}"


class GoalSet(models.Model):
    employee = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='goal_sets',
        db_index=True
    )
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.CASCADE,
        related_name='goal_sets',
        db_index=True
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_goal_sets'
    )
    library = models.ForeignKey(KpiLibrary, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=30, default='DRAFT', db_index=True)
    version = models.IntegerField(default=1)
    approved_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Goal Set'
        verbose_name_plural = 'Goal Sets'
        ordering = ['-created_at']

    def __str__(self):
        return f"GoalSet {self.id}: {self.employee.full_name} ({self.status})"


class GoalItem(models.Model):
    goal_set = models.ForeignKey(GoalSet, on_delete=models.CASCADE, related_name='items')
    category = models.ForeignKey(KpiCategory, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    unit = models.CharField(max_length=50, default='%')
    target_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('100.00'))
    current_progress = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    weight_percent = models.IntegerField(default=20)
    status = models.CharField(max_length=30, default='NOT_STARTED')
    is_compliance = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def score_percent(self):
        if self.target_value and self.target_value > 0:
            pct = (float(self.current_progress) / float(self.target_value)) * 100.0
            return round(min(100.0, max(0.0, pct)), 2)
        return 0.0

    @property
    def weighted_score(self):
        return round((self.score_percent * self.weight_percent) / 100.0, 2)

    class Meta:
        verbose_name = 'Goal Item'
        verbose_name_plural = 'Goal Items'
        ordering = ['id']

    def __str__(self):
        return f"{self.title} [{self.current_progress}/{self.target_value} {self.unit}]"


class KpiProgressEntry(models.Model):
    goal_item = models.ForeignKey(GoalItem, on_delete=models.CASCADE, related_name='progress_entries')
    actual_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    progress_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    evidence_note = models.TextField(blank=True, default='')
    logged_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'KPI Progress Entry'
        verbose_name_plural = 'KPI Progress Entries'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.goal_item.title}: {self.actual_value} ({self.created_at.strftime('%Y-%m-%d')})"


class KpiAuditTrail(models.Model):
    employee = models.ForeignKey('employees.EmployeeProfile', on_delete=models.CASCADE, null=True, blank=True)
    goal_set = models.ForeignKey(GoalSet, on_delete=models.CASCADE, null=True, blank=True)
    action = models.CharField(max_length=50)
    change_reason = models.TextField(blank=True, default='')
    change_details = models.TextField(blank=True, default='')
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'KPI Audit Trail'
        verbose_name_plural = 'KPI Audit Trails'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} on GoalSet #{self.goal_set_id if self.goal_set else 0} by {self.changed_by}"

