from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from rest_framework import serializers
from apps.performance.models import (
    PerformanceCycle,
    CycleParticipant,
    CycleStatus,
    EvaluationCriterion,
    CycleCompetency,
    CycleEvaluatorAssignment,
    EvaluatorSectionType,
    CompetencySection,
    Appraisal,
    AppraisalRating,
    PerformanceImprovementPlan,
    RecognitionReward,
)
from apps.employees.models import EmployeeProfile

class PerformanceCycleSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    goals_count = serializers.IntegerField(source='goals.count', read_only=True)
    participants_count = serializers.IntegerField(source='participants.count', read_only=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    japanese_evaluation_mandatory = serializers.BooleanField(required=False, allow_null=True)

    class Meta:
        model = PerformanceCycle
        fields = (
            'id', 'name', 'description', 'start_date', 'end_date',
            'mirai_stage', 'status', 'current_phase',
            'technical_weight', 'behavioral_weight', 'rating_scale_max',
            'japanese_evaluation_mandatory',
            'self_assessment_deadline', 'evidence_deadline', 'evaluator_deadline',
            'created_by', 'created_by_name', 'goals_count', 'participants_count',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'status', 'created_by', 'created_by_name', 'goals_count', 'participants_count', 'created_at', 'updated_at')

    def validate(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "End date must be on or after start date."})

        # Permissive draft type safety for weights
        tw = attrs.get('technical_weight', getattr(self.instance, 'technical_weight', None))
        bw = attrs.get('behavioral_weight', getattr(self.instance, 'behavioral_weight', None))
        if tw is not None:
            if tw < Decimal('0.00') or tw > Decimal('100.00'):
                raise serializers.ValidationError({"technical_weight": "Technical weight must be between 0.00 and 100.00%."})
        if bw is not None:
            if bw < Decimal('0.00') or bw > Decimal('100.00'):
                raise serializers.ValidationError({"behavioral_weight": "Behavioral weight must be between 0.00 and 100.00%."})

        scale = attrs.get('rating_scale_max', getattr(self.instance, 'rating_scale_max', None))
        if scale is not None and scale <= Decimal('0.0'):
            raise serializers.ValidationError({"rating_scale_max": "Rating scale maximum must be greater than 0."})

        return attrs

    def create(self, validated_data):
        if 'start_date' not in validated_data or not validated_data['start_date']:
            validated_data['start_date'] = timezone.localdate()
        if 'end_date' not in validated_data or not validated_data['end_date']:
            validated_data['end_date'] = validated_data['start_date'] + timedelta(days=90)
        validated_data['status'] = CycleStatus.DRAFT
        return super().create(validated_data)


class CycleParticipantSerializer(serializers.ModelSerializer):
    cycle_id = serializers.UUIDField(source='cycle.id', read_only=True)
    employee_id = serializers.UUIDField(source='employee.id', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    full_name = serializers.CharField(source='employee.full_name', read_only=True)
    email = serializers.EmailField(source='employee.email', read_only=True)
    designation = serializers.CharField(source='employee.designation', read_only=True)
    department_name = serializers.CharField(source='employee.department.name', default='', read_only=True)
    mentor_id = serializers.IntegerField(source='employee.manager.id', default=None, allow_null=True, read_only=True)
    mentor_name = serializers.CharField(source='employee.manager.username', default='', allow_null=True, read_only=True)
    mentor_assigned = serializers.SerializerMethodField()
    added_by_name = serializers.CharField(source='added_by.username', default='', read_only=True)

    class Meta:
        model = CycleParticipant
        fields = (
            'id', 'cycle_id', 'employee_id', 'employee_code',
            'full_name', 'email', 'designation', 'department_name',
            'mentor_id', 'mentor_name', 'mentor_assigned',
            'added_by_name', 'added_at'
        )
        read_only_fields = fields

    def get_mentor_assigned(self, obj):
        return bool(obj.employee and obj.employee.manager_id)


class EligibleInternSerializer(serializers.ModelSerializer):
    employee_id = serializers.UUIDField(source='id', read_only=True)
    department_name = serializers.CharField(source='department.name', default='', read_only=True)
    manager_id = serializers.IntegerField(source='manager.id', default=None, allow_null=True, read_only=True)
    manager_name = serializers.CharField(source='manager.username', default='', allow_null=True, read_only=True)
    is_eligible = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeProfile
        fields = (
            'employee_id', 'employee_code', 'full_name', 'email',
            'designation', 'department_name', 'manager_id', 'manager_name',
            'employment_status', 'is_eligible'
        )
        read_only_fields = fields

    def get_is_eligible(self, obj):
        return bool(getattr(obj, 'user', None) and obj.user.role == 'INTERN' and obj.employment_status in ['ACTIVE', 'PROBATION'])


class CycleCompetencySerializer(serializers.ModelSerializer):
    cycle_id = serializers.UUIDField(source='cycle.id', read_only=True)
    section_display = serializers.CharField(source='get_section_display', read_only=True)
    weight = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=Decimal('0.00'), max_value=Decimal('100.00'))
    benchmark_score = serializers.DecimalField(max_digits=4, decimal_places=1, default=Decimal('5.0'), required=False)
    rubric_descriptors = serializers.JSONField(required=False, default=dict)

    class Meta:
        model = CycleCompetency
        fields = (
            'id', 'cycle', 'cycle_id', 'section', 'section_display',
            'name', 'description', 'weight', 'benchmark_score',
            'rubric_descriptors', 'order', 'is_active',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'cycle_id', 'section_display', 'created_at', 'updated_at')

    def validate_rubric_descriptors(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Rubric descriptors must be a dictionary.")

        valid_levels = {'1', '2', '3', '4', '5'}
        cleaned = {}
        for key, val in value.items():
            str_key = str(key)
            if str_key not in valid_levels:
                raise serializers.ValidationError(
                    f"Unsupported proficiency level '{key}'. Only levels 1, 2, 3, 4, and 5 are supported."
                )
            if val is None:
                raise serializers.ValidationError(
                    f"Descriptor for level '{key}' cannot be null."
                )
            if not isinstance(val, str):
                raise serializers.ValidationError(
                    f"Descriptor for level '{key}' must be a string."
                )
            trimmed_val = val.strip()
            if not trimmed_val:
                raise serializers.ValidationError(
                    f"Descriptor for level '{key}' cannot be empty or whitespace only."
                )
            cleaned[str_key] = trimmed_val
        return cleaned

    def validate(self, attrs):
        cycle = attrs.get('cycle') or getattr(self.instance, 'cycle', None)
        section = attrs.get('section') or getattr(self.instance, 'section', None)
        name = attrs.get('name') or getattr(self.instance, 'name', None)
        if cycle and section and name:
            qs = CycleCompetency.objects.filter(cycle=cycle, section=section, name=name)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    'name': f"A competency named '{name}' already exists in section {section} for this cycle."
                })
        return attrs


class CycleEvaluatorAssignmentSerializer(serializers.ModelSerializer):
    cycle_id = serializers.UUIDField(source='cycle.id', read_only=True)
    participant_id = serializers.UUIDField(source='participant.id', read_only=True)
    employee_id = serializers.UUIDField(source='participant.employee.id', read_only=True)
    employee_code = serializers.CharField(source='participant.employee.employee_code', read_only=True)
    employee_name = serializers.CharField(source='participant.employee.full_name', read_only=True)
    employee_email = serializers.EmailField(source='participant.employee.email', read_only=True)
    evaluator_id = serializers.UUIDField(source='evaluator.id', read_only=True)
    evaluator_name = serializers.CharField(source='evaluator.get_full_name', read_only=True)
    evaluator_username = serializers.CharField(source='evaluator.username', read_only=True)
    evaluator_email = serializers.EmailField(source='evaluator.email', read_only=True)
    section_display = serializers.CharField(source='get_section_display', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.username', default='', read_only=True)

    class Meta:
        model = CycleEvaluatorAssignment
        fields = (
            'id', 'cycle', 'cycle_id', 'participant', 'participant_id',
            'employee_id', 'employee_code', 'employee_name', 'employee_email',
            'evaluator', 'evaluator_id', 'evaluator_name', 'evaluator_username', 'evaluator_email',
            'section', 'section_display', 'is_mandatory',
            'assigned_by', 'assigned_by_name', 'created_at'
        )
        read_only_fields = (
            'id', 'cycle_id', 'participant_id', 'employee_id', 'employee_code',
            'employee_name', 'employee_email', 'evaluator_id', 'evaluator_name',
            'evaluator_username', 'evaluator_email', 'section_display',
            'assigned_by_name', 'created_at'
        )


class AssignEvaluatorSerializer(serializers.Serializer):
    participant_id = serializers.UUIDField(required=True)
    section = serializers.ChoiceField(choices=EvaluatorSectionType.choices, required=True)
    evaluator_id = serializers.UUIDField(required=False, allow_null=True)
    is_mandatory = serializers.BooleanField(required=False, default=True)


class EvaluationCriterionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationCriterion
        fields = ('id', 'name', 'description', 'maximum_score', 'weight', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

class AppraisalRatingSerializer(serializers.ModelSerializer):
    criterion_name = serializers.CharField(source='criterion.name', read_only=True)
    criterion_weight = serializers.DecimalField(source='criterion.weight', max_digits=5, decimal_places=2, read_only=True)
    maximum_score = serializers.DecimalField(source='criterion.maximum_score', max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = AppraisalRating
        fields = ('id', 'criterion', 'criterion_name', 'criterion_weight', 'maximum_score', 'score', 'comments')
        read_only_fields = ('id',)

class AppraisalSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True)
    ratings = AppraisalRatingSerializer(many=True, read_only=True)

    class Meta:
        model = Appraisal
        fields = (
            'id', 'employee', 'employee_name', 'employee_code', 'cycle', 'cycle_name',
            'reviewer', 'reviewer_name', 'appraisal_type', 'status', 'overall_score',
            'self_comments', 'reviewer_comments', 'final_comments', 'ratings',
            'submitted_at', 'published_at', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'overall_score', 'submitted_at', 'published_at', 'created_at', 'updated_at')

from decimal import Decimal

class RatingInputSerializer(serializers.Serializer):
    criterion_id = serializers.UUIDField(required=True)
    score = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=Decimal('0.00'), required=True)
    comments = serializers.CharField(required=False, allow_blank=True)

class SubmitAppraisalSerializer(serializers.Serializer):
    comments = serializers.CharField(required=False, allow_blank=True)
    ratings = RatingInputSerializer(many=True, required=False)

class PerformanceImprovementPlanSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = PerformanceImprovementPlan
        fields = (
            'id', 'employee', 'employee_name', 'employee_code',
            'created_by', 'created_by_name', 'reason', 'objectives',
            'start_date', 'end_date', 'status', 'review_notes',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

class RecognitionRewardSerializer(serializers.ModelSerializer):
    recipient_name = serializers.CharField(source='recipient.username', read_only=True)
    awarded_by_name = serializers.CharField(source='awarded_by.username', read_only=True)

    class Meta:
        model = RecognitionReward
        fields = ('id', 'recipient', 'recipient_name', 'awarded_by', 'awarded_by_name', 'title', 'description', 'awarded_at')
        read_only_fields = ('id', 'awarded_by', 'awarded_at')
