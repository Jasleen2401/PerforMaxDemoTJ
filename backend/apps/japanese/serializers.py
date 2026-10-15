from rest_framework import serializers
from .models import (
    JapaneseLearningPlan, JapaneseTopic, JapaneseMaterial,
    JapanesePracticeResult, JLPTAttempt, JLPTEligibilityRecord,
    JapaneseEvaluation, JapaneseEvalCriterion, JapaneseEvalRating,
)


class JapaneseMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = JapaneseMaterial
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class JapaneseTopicSerializer(serializers.ModelSerializer):
    materials = JapaneseMaterialSerializer(many=True, read_only=True)

    class Meta:
        model = JapaneseTopic
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class JapaneseLearningPlanSerializer(serializers.ModelSerializer):
    topics = JapaneseTopicSerializer(many=True, read_only=True)
    intern_name = serializers.CharField(source='intern.full_name', read_only=True)
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)
    instructor_username = serializers.CharField(source='instructor.username', read_only=True)

    class Meta:
        model = JapaneseLearningPlan
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class JapanesePracticeResultSerializer(serializers.ModelSerializer):
    intern_name = serializers.CharField(source='intern.full_name', read_only=True)
    topic_title = serializers.CharField(source='topic.title', read_only=True)

    class Meta:
        model = JapanesePracticeResult
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'reviewed_by', 'reviewed_at']


class JLPTAttemptSerializer(serializers.ModelSerializer):
    intern_name = serializers.CharField(source='intern.full_name', read_only=True)
    verified_by_username = serializers.CharField(source='verified_by.username', read_only=True)

    class Meta:
        model = JLPTAttempt
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'verified_by', 'verified_at', 'verified']


class JLPTEligibilityRecordSerializer(serializers.ModelSerializer):
    intern_name = serializers.CharField(source='intern.full_name', read_only=True)
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)
    eligibility_status_display = serializers.CharField(source='get_eligibility_status_display', read_only=True)

    class Meta:
        model = JLPTEligibilityRecord
        fields = '__all__'
        read_only_fields = ['id', 'updated_at']


class JapaneseEvalCriterionSerializer(serializers.ModelSerializer):
    class Meta:
        model = JapaneseEvalCriterion
        fields = '__all__'
        read_only_fields = ['id']


class JapaneseEvalRatingSerializer(serializers.ModelSerializer):
    criterion_name = serializers.CharField(source='criterion.name', read_only=True)

    class Meta:
        model = JapaneseEvalRating
        fields = '__all__'
        read_only_fields = ['id']


class JapaneseEvaluationSerializer(serializers.ModelSerializer):
    ratings = JapaneseEvalRatingSerializer(many=True, read_only=True)
    intern_name = serializers.CharField(source='intern.full_name', read_only=True)
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)
    evaluator_username = serializers.CharField(source='evaluator.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = JapaneseEvaluation
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'submitted_at', 'returned_at', 'returned_by',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        # Hide instructor_remarks from interns unless published
        if request and hasattr(request, 'user'):
            user = request.user
            if user.role == 'INTERN' and instance.status not in ('ACCEPTED',):
                data.pop('instructor_remarks', None)
        return data
