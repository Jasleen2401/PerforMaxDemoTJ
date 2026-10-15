"""
MIRAI Stage Progression Models (WF-14)
=======================================
Covers: Q1→Q4 intern stage records, stage checkpoints, panel validations, PPO decisions.
"""

import uuid
from django.db import models
from django.conf import settings


class MIRAIQuarter(models.TextChoices):
    Q1 = 'Q1', 'Q1 – Baseline & Development Priorities'
    Q2 = 'Q2', 'Q2 – Application & Progress'
    Q3 = 'Q3', 'Q3 – Ownership, Contribution & Initiative'
    Q4 = 'Q4', 'Q4 – Professional Readiness (Panel)'


class StageStatus(models.TextChoices):
    NOT_STARTED = 'NOT_STARTED', 'Not Started'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
    COMPLETED = 'COMPLETED', 'Completed'
    EXTENDED = 'EXTENDED', 'Extended'


class PPODecisionChoice(models.TextChoices):
    OFFERED = 'OFFERED', 'PPO Offered'
    NOT_OFFERED = 'NOT_OFFERED', 'PPO Not Offered'
    DEFERRED = 'DEFERRED', 'Decision Deferred'
    PENDING = 'PENDING', 'Pending'


# ---------------------------------------------------------------------------
# MIRAIProgram — an intern's enrollment in the full MIRAI program
# ---------------------------------------------------------------------------
class MIRAIProgram(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intern = models.OneToOneField(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='mirai_program'
    )
    cohort = models.CharField(
        max_length=100,
        blank=True,
        help_text='e.g. "2026 Batch A" or "Dailoqa Q1 2026"'
    )
    program_start_date = models.DateField()
    program_end_date = models.DateField(null=True, blank=True)
    current_stage = models.CharField(
        max_length=2,
        choices=MIRAIQuarter.choices,
        default=MIRAIQuarter.Q1
    )
    is_active = models.BooleanField(default=True)
    enrolled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='mirai_enrollments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'MIRAI Program'
        verbose_name_plural = 'MIRAI Programs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.intern} — MIRAI {self.current_stage} ({self.cohort})"


# ---------------------------------------------------------------------------
# MIRAIStageRecord — historical record per stage per intern
# ---------------------------------------------------------------------------
class MIRAIStageRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey(
        MIRAIProgram,
        on_delete=models.CASCADE,
        related_name='stage_records'
    )
    stage = models.CharField(max_length=2, choices=MIRAIQuarter.choices)
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='mirai_stage_records',
        help_text='The performance cycle associated with this stage'
    )
    status = models.CharField(
        max_length=20,
        choices=StageStatus.choices,
        default=StageStatus.NOT_STARTED
    )
    # Stage-specific expectations (set by HR/mentor at start of stage)
    stage_objectives = models.TextField(
        blank=True,
        help_text='Agreed objectives and expectations for this stage'
    )
    # Stage outcomes (recorded at end of stage)
    stage_outcome_summary = models.TextField(
        blank=True,
        help_text='Summary of performance and outcomes at the end of this stage'
    )
    mentor_notes = models.TextField(blank=True)
    # Dates
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    # Authorized by
    authorized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='authorized_stage_records'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'MIRAI Stage Record'
        verbose_name_plural = 'MIRAI Stage Records'
        unique_together = ('program', 'stage')
        ordering = ['program', 'stage']

    def __str__(self):
        return f"{self.program.intern} — {self.get_stage_display()} [{self.get_status_display()}]"


# ---------------------------------------------------------------------------
# MIRAICheckpoint — specific milestones/checkpoints within a stage
# ---------------------------------------------------------------------------
class MIRAICheckpoint(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stage_record = models.ForeignKey(
        MIRAIStageRecord,
        on_delete=models.CASCADE,
        related_name='checkpoints'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='completed_checkpoints'
    )
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'MIRAI Checkpoint'
        verbose_name_plural = 'MIRAI Checkpoints'
        ordering = ['stage_record', 'due_date']

    def __str__(self):
        status = 'Done' if self.is_completed else 'Pending'
        return f"{self.stage_record.program.intern} › {self.title} [{status}]"


# ---------------------------------------------------------------------------
# Q4PanelValidation — Q4 panel review record
# ---------------------------------------------------------------------------
class Q4PanelValidation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stage_record = models.OneToOneField(
        MIRAIStageRecord,
        on_delete=models.CASCADE,
        related_name='panel_validation'
    )
    panel_date = models.DateField()
    panel_members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='panel_validations',
        blank=True
    )
    readiness_confirmed = models.BooleanField(
        null=True,
        help_text='Panel consensus on professional readiness (None = not yet decided)'
    )
    panel_summary = models.TextField(blank=True)
    panel_remarks = models.TextField(
        blank=True,
        help_text='Detailed panel evaluation remarks — not visible to intern before publication'
    )
    conducted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='q4_validations_conducted'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Q4 Panel Validation'
        verbose_name_plural = 'Q4 Panel Validations'

    def __str__(self):
        return f"Panel: {self.stage_record.program.intern} ({self.panel_date})"


# ---------------------------------------------------------------------------
# PPODecision — Pre-Placement Offer decision record
# ---------------------------------------------------------------------------
class PPODecision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.OneToOneField(
        MIRAIProgram,
        on_delete=models.CASCADE,
        related_name='ppo_decision'
    )
    decision = models.CharField(
        max_length=15,
        choices=PPODecisionChoice.choices,
        default=PPODecisionChoice.PENDING
    )
    decision_date = models.DateField(null=True, blank=True)
    rationale = models.TextField(
        blank=True,
        help_text='Documented rationale for the PPO decision'
    )
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='ppo_decisions'
    )
    team_mirai_input = models.TextField(
        blank=True,
        help_text='Input from Team MIRAI deliberation'
    )
    panel_input = models.TextField(
        blank=True,
        help_text='Input from Q4 panel'
    )
    hr_input = models.TextField(
        blank=True,
        help_text='HR final input'
    )
    is_visible_to_intern = models.BooleanField(
        default=False,
        help_text='True only after HR explicitly publishes the decision to the intern'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'PPO Decision'
        verbose_name_plural = 'PPO Decisions'

    def __str__(self):
        return f"PPO: {self.program.intern} — {self.get_decision_display()}"
