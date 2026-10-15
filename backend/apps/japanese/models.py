"""
Japanese Learning & Assessment — Models (WF-06)

Entities:
  JapaneseLearningPlan   — A plan assigned by the instructor to an intern for a cycle
  JapaneseTopic          — A topic/unit within a learning plan
  JapaneseMaterial       — A material/exercise attached to a topic
  JapanesePracticeResult — Intern's recorded practice/exercise result
  JLPTAttempt            — An official JLPT exam attempt and result
  JLPTEligibilityStatus  — Derived/confirmed eligibility status per intern per cycle
  JapaneseEvaluation     — Instructor's final evaluation submitted to HR for a cycle
  JapaneseEvalRating     — Per-criterion rating within a Japanese evaluation
"""

import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


# ---------------------------------------------------------------------------
# Choices
# ---------------------------------------------------------------------------

class JLPTLevel(models.TextChoices):
    N5 = 'N5', 'N5 (Beginner)'
    N4 = 'N4', 'N4 (Elementary)'
    N3 = 'N3', 'N3 (Intermediate)'
    N2 = 'N2', 'N2 (Upper Intermediate)'
    N1 = 'N1', 'N1 (Advanced)'


class JLPTEligibility(models.TextChoices):
    NOT_STARTED = 'NOT_STARTED', 'Not Started'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    PENDING_VERIFICATION = 'PENDING_VERIFICATION', 'Pending Verification'
    MEETS_REQUIREMENT = 'MEETS_REQUIREMENT', 'Meets Requirement'
    DOES_NOT_MEET = 'DOES_NOT_MEET', 'Does Not Meet Requirement'
    NOT_APPLICABLE = 'NOT_APPLICABLE', 'Not Applicable'


class PracticeStatus(models.TextChoices):
    ASSIGNED = 'ASSIGNED', 'Assigned'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    REVIEWED = 'REVIEWED', 'Reviewed'


class EvaluationStatus(models.TextChoices):
    NOT_ASSIGNED = 'NOT_ASSIGNED', 'Not Assigned'
    PENDING = 'PENDING', 'Pending'
    DRAFT = 'DRAFT', 'Draft'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    RETURNED = 'RETURNED', 'Returned'
    RESUBMITTED = 'RESUBMITTED', 'Resubmitted'
    ACCEPTED = 'ACCEPTED', 'Accepted for HR Review'


# ---------------------------------------------------------------------------
# JapaneseLearningPlan
# ---------------------------------------------------------------------------
class JapaneseLearningPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intern = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='japanese_learning_plans'
    )
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='japanese_plans_created'
    )
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.CASCADE,
        related_name='japanese_learning_plans'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    target_jlpt_level = models.CharField(
        max_length=2,
        choices=JLPTLevel.choices,
        blank=True,
        null=True,
        help_text='Target JLPT level for this cycle (e.g. N4 for Q2)'
    )
    target_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Japanese Learning Plan'
        verbose_name_plural = 'Japanese Learning Plans'
        unique_together = ('intern', 'cycle')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} — {self.intern} ({self.cycle.name})"


# ---------------------------------------------------------------------------
# JapaneseTopic — a unit/topic within a learning plan
# ---------------------------------------------------------------------------
class JapaneseTopic(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(
        JapaneseLearningPlan,
        on_delete=models.CASCADE,
        related_name='topics'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Japanese Topic'
        verbose_name_plural = 'Japanese Topics'
        ordering = ['plan', 'order']

    def __str__(self):
        return f"{self.plan.title} › {self.title}"


# ---------------------------------------------------------------------------
# JapaneseMaterial — a resource/exercise linked to a topic
# ---------------------------------------------------------------------------
class JapaneseMaterial(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic = models.ForeignKey(
        JapaneseTopic,
        on_delete=models.CASCADE,
        related_name='materials'
    )
    title = models.CharField(max_length=255)
    material_type = models.CharField(
        max_length=50,
        choices=[
            ('READING', 'Reading'),
            ('LISTENING', 'Listening'),
            ('VOCABULARY', 'Vocabulary'),
            ('GRAMMAR', 'Grammar'),
            ('EXERCISE', 'Exercise / Quiz'),
            ('VIDEO', 'Video'),
            ('OTHER', 'Other'),
        ],
        default='EXERCISE'
    )
    file_attachment = models.FileField(upload_to='japanese/materials/', null=True, blank=True)
    external_url = models.URLField(max_length=500, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Japanese Material'
        verbose_name_plural = 'Japanese Materials'
        ordering = ['topic', 'title']

    def __str__(self):
        return f"{self.topic.title} › {self.title}"


# ---------------------------------------------------------------------------
# JapanesePracticeResult — intern records progress on a topic/material
# ---------------------------------------------------------------------------
class JapanesePracticeResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intern = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='japanese_practice_results'
    )
    topic = models.ForeignKey(
        JapaneseTopic,
        on_delete=models.CASCADE,
        related_name='practice_results'
    )
    material = models.ForeignKey(
        JapaneseMaterial,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='practice_results'
    )
    status = models.CharField(
        max_length=20,
        choices=PracticeStatus.choices,
        default=PracticeStatus.ASSIGNED
    )
    score = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True,
        help_text='Score achieved (if applicable)'
    )
    max_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True
    )
    notes = models.TextField(blank=True)
    file_evidence = models.FileField(upload_to='japanese/practice/', null=True, blank=True)
    external_url = models.URLField(max_length=500, blank=True)
    # Instructor review
    instructor_remarks = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='japanese_practice_reviews'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Japanese Practice Result'
        verbose_name_plural = 'Japanese Practice Results'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.intern} — {self.topic.title} [{self.get_status_display()}]"


# ---------------------------------------------------------------------------
# JLPTAttempt — official JLPT exam attempt record
# ---------------------------------------------------------------------------
class JLPTAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intern = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='jlpt_attempts'
    )
    level = models.CharField(max_length=2, choices=JLPTLevel.choices)
    exam_date = models.DateField()
    passed = models.BooleanField(null=True, blank=True, help_text='None = result not yet verified')
    score = models.PositiveSmallIntegerField(null=True, blank=True)
    certificate_file = models.FileField(upload_to='japanese/jlpt/', null=True, blank=True)
    # Verification
    verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='jlpt_verifications'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'JLPT Attempt'
        verbose_name_plural = 'JLPT Attempts'
        ordering = ['-exam_date']

    def __str__(self):
        result = 'Pass' if self.passed else ('Fail' if self.passed is False else 'Pending')
        return f"{self.intern} — JLPT {self.level} ({self.exam_date}) [{result}]"


# ---------------------------------------------------------------------------
# JLPTEligibilityRecord — cycle-level eligibility status (separate from score)
# ---------------------------------------------------------------------------
class JLPTEligibilityRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intern = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='jlpt_eligibility_records'
    )
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.CASCADE,
        related_name='jlpt_eligibility_records'
    )
    required_level = models.CharField(
        max_length=2,
        choices=JLPTLevel.choices,
        default=JLPTLevel.N4,
        help_text='Required JLPT level for this cycle (e.g. N4 for Q2)'
    )
    eligibility_status = models.CharField(
        max_length=25,
        choices=JLPTEligibility.choices,
        default=JLPTEligibility.NOT_STARTED
    )
    linked_attempt = models.ForeignKey(
        JLPTAttempt,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='eligibility_records',
        help_text='The JLPT attempt that satisfies or fails this requirement'
    )
    notes = models.TextField(blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='jlpt_eligibility_updates'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'JLPT Eligibility Record'
        verbose_name_plural = 'JLPT Eligibility Records'
        unique_together = ('intern', 'cycle')

    def __str__(self):
        return f"{self.intern} — JLPT {self.required_level} eligibility: {self.get_eligibility_status_display()} ({self.cycle.name})"


# ---------------------------------------------------------------------------
# JapaneseEvaluation — instructor's formal evaluation for the cycle
# ---------------------------------------------------------------------------
class JapaneseEvaluation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intern = models.ForeignKey(
        'employees.EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='japanese_evaluations'
    )
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.CASCADE,
        related_name='japanese_evaluations'
    )
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='japanese_evaluations_given'
    )
    status = models.CharField(
        max_length=15,
        choices=EvaluationStatus.choices,
        default=EvaluationStatus.PENDING,
        db_index=True
    )
    # Ratings (stored as aggregate for now; per-criterion via JapaneseEvalRating)
    overall_language_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True,
        help_text='Overall language score on the configured scale'
    )
    strengths = models.TextField(blank=True)
    areas_for_improvement = models.TextField(blank=True)
    instructor_remarks = models.TextField(
        blank=True,
        help_text='Evaluator-only remarks — not visible to intern before publication'
    )
    developmental_feedback = models.TextField(
        blank=True,
        help_text='Feedback marked for intern visibility during the cycle'
    )
    is_developmental_feedback_visible = models.BooleanField(
        default=False,
        help_text='If True, the developmental_feedback field is visible to the intern'
    )
    # JLPT summary
    jlpt_status_summary = models.CharField(
        max_length=25,
        choices=JLPTEligibility.choices,
        default=JLPTEligibility.NOT_STARTED
    )
    # Workflow tracking
    submitted_at = models.DateTimeField(null=True, blank=True)
    return_reason = models.TextField(blank=True, help_text='Reason provided by HR when returning this evaluation')
    returned_at = models.DateTimeField(null=True, blank=True)
    returned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='japanese_evals_returned'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Japanese Evaluation'
        verbose_name_plural = 'Japanese Evaluations'
        unique_together = ('intern', 'cycle')
        ordering = ['-created_at']

    def __str__(self):
        return f"Japanese Eval: {self.intern} ({self.cycle.name}) [{self.get_status_display()}]"


# ---------------------------------------------------------------------------
# JapaneseEvalCriterion — configurable criteria for a Japanese evaluation
# ---------------------------------------------------------------------------
class JapaneseEvalCriterion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.ForeignKey(
        'performance.PerformanceCycle',
        on_delete=models.CASCADE,
        related_name='japanese_criteria'
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    weight = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('25.00'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))]
    )
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = 'Japanese Eval Criterion'
        verbose_name_plural = 'Japanese Eval Criteria'
        ordering = ['cycle', 'order']

    def __str__(self):
        return f"{self.cycle.name} › {self.name}"


# ---------------------------------------------------------------------------
# JapaneseEvalRating — per-criterion rating within a Japanese evaluation
# ---------------------------------------------------------------------------
class JapaneseEvalRating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    evaluation = models.ForeignKey(
        JapaneseEvaluation,
        on_delete=models.CASCADE,
        related_name='ratings'
    )
    criterion = models.ForeignKey(
        JapaneseEvalCriterion,
        on_delete=models.CASCADE,
        related_name='ratings'
    )
    score = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )
    comments = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Japanese Eval Rating'
        verbose_name_plural = 'Japanese Eval Ratings'
        unique_together = ('evaluation', 'criterion')

    def __str__(self):
        return f"{self.evaluation.intern} — {self.criterion.name}: {self.score}"
