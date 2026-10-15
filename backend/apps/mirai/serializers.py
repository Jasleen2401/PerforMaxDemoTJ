from rest_framework import serializers
from .models import (
    MIRAIProgram, MIRAIStageRecord, MIRAICheckpoint,
    Q4PanelValidation, PPODecision,
)


class MIRAICheckpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = MIRAICheckpoint
        fields = '__all__'
        read_only_fields = ['id', 'completed_by', 'completed_at']


class MIRAIStageRecordSerializer(serializers.ModelSerializer):
    checkpoints = MIRAICheckpointSerializer(many=True, read_only=True)
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)

    class Meta:
        model = MIRAIStageRecord
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at']


class Q4PanelValidationSerializer(serializers.ModelSerializer):
    panel_member_usernames = serializers.SerializerMethodField()

    class Meta:
        model = Q4PanelValidation
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_panel_member_usernames(self, obj):
        return list(obj.panel_members.values_list('username', flat=True))


class PPODecisionSerializer(serializers.ModelSerializer):
    decision_display = serializers.CharField(source='get_decision_display', read_only=True)
    intern_name = serializers.CharField(source='program.intern.full_name', read_only=True)

    class Meta:
        model = PPODecision
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        # PPO decision hidden from intern until HR marks it visible
        if request and hasattr(request, 'user'):
            if request.user.role == 'INTERN' and not instance.is_visible_to_intern:
                return {'id': str(instance.id), 'decision': 'PENDING', 'is_visible_to_intern': False}
        return data


class MIRAIProgramSerializer(serializers.ModelSerializer):
    stage_records = MIRAIStageRecordSerializer(many=True, read_only=True)
    ppo_decision = PPODecisionSerializer(read_only=True)
    intern_name = serializers.CharField(source='intern.full_name', read_only=True)
    current_stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)

    class Meta:
        model = MIRAIProgram
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class MIRAIProgramSummarySerializer(serializers.ModelSerializer):
    """Lightweight summary for dashboard display."""
    intern_name = serializers.CharField(source='intern.full_name', read_only=True)
    current_stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)
    completed_stages = serializers.SerializerMethodField()

    class Meta:
        model = MIRAIProgram
        fields = ['id', 'intern', 'intern_name', 'cohort', 'current_stage',
                  'current_stage_display', 'completed_stages', 'is_active',
                  'program_start_date', 'program_end_date']

    def get_completed_stages(self, obj):
        return obj.stage_records.filter(status='COMPLETED').values_list('stage', flat=True)
