from rest_framework import serializers
from .models import (
    JapaneseLearningPlan, JapaneseTopic, JapaneseMaterial,
    JapanesePracticeResult, JLPTAttempt, JLPTEligibilityRecord,
    JapaneseEvaluation, JapaneseEvalCriterion, JapaneseEvalRating,
    JapaneseBatch,
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
    intern_code = serializers.CharField(source='intern.employee_code', read_only=True)
    intern_email = serializers.CharField(source='intern.user.email', read_only=True)
    intern_id = serializers.CharField(source='intern.id', read_only=True)
    verified_by_username = serializers.CharField(source='verified_by.username', read_only=True)
    batch_name = serializers.SerializerMethodField()
    batch_code = serializers.SerializerMethodField()
    sub_batch_name = serializers.SerializerMethodField()
    sub_batch_code = serializers.SerializerMethodField()
    target_level = serializers.SerializerMethodField()

    class Meta:
        model = JLPTAttempt
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'verified_by', 'verified_at', 'verified']

    def _get_sub_batch(self, obj):
        return obj.intern.japanese_batches.filter(parent_batch__isnull=False).first()

    def _get_main_batch(self, obj):
        sb = self._get_sub_batch(obj)
        if sb and sb.parent_batch:
            return sb.parent_batch
        return obj.intern.japanese_batches.filter(parent_batch__isnull=True).first()

    def get_batch_name(self, obj):
        mb = self._get_main_batch(obj)
        return mb.name if mb else ''

    def get_batch_code(self, obj):
        mb = self._get_main_batch(obj)
        return mb.code if mb else ''

    def get_sub_batch_name(self, obj):
        sb = self._get_sub_batch(obj)
        return sb.name if sb else ''

    def get_sub_batch_code(self, obj):
        sb = self._get_sub_batch(obj)
        return sb.code if sb else ''

    def get_target_level(self, obj):
        plan = obj.intern.japanese_learning_plans.filter(is_active=True).first()
        if plan:
            return plan.target_jlpt_level
        elig = obj.intern.jlpt_eligibility_records.first()
        return elig.required_level if elig else 'N4'


class JLPTEligibilityRecordSerializer(serializers.ModelSerializer):
    intern_name = serializers.CharField(source='intern.full_name', read_only=True)
    intern_code = serializers.CharField(source='intern.employee_code', read_only=True)
    intern_email = serializers.CharField(source='intern.user.email', read_only=True)
    intern_id = serializers.CharField(source='intern.id', read_only=True)
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)
    eligibility_status_display = serializers.CharField(source='get_eligibility_status_display', read_only=True)
    batch_name = serializers.SerializerMethodField()
    batch_code = serializers.SerializerMethodField()
    sub_batch_name = serializers.SerializerMethodField()
    sub_batch_code = serializers.SerializerMethodField()
    current_level = serializers.SerializerMethodField()
    all_attempts = serializers.SerializerMethodField()

    class Meta:
        model = JLPTEligibilityRecord
        fields = '__all__'
        read_only_fields = ['id', 'updated_at']

    def _get_sub_batch(self, obj):
        return obj.intern.japanese_batches.filter(parent_batch__isnull=False).first()

    def _get_main_batch(self, obj):
        sb = self._get_sub_batch(obj)
        if sb and sb.parent_batch:
            return sb.parent_batch
        return obj.intern.japanese_batches.filter(parent_batch__isnull=True).first()

    def get_batch_name(self, obj):
        mb = self._get_main_batch(obj)
        return mb.name if mb else ''

    def get_batch_code(self, obj):
        mb = self._get_main_batch(obj)
        return mb.code if mb else ''

    def get_sub_batch_name(self, obj):
        sb = self._get_sub_batch(obj)
        return sb.name if sb else ''

    def get_sub_batch_code(self, obj):
        sb = self._get_sub_batch(obj)
        return sb.code if sb else ''

    def get_current_level(self, obj):
        levels_order = {'N1': 5, 'N2': 4, 'N3': 3, 'N4': 2, 'N5': 1}
        passed_attempts = [
            a for a in obj.intern.jlpt_attempts.all()
            if a.passed and a.level in levels_order
        ]
        if not passed_attempts:
            return None
        passed_attempts.sort(key=lambda a: levels_order.get(a.level, 0), reverse=True)
        return passed_attempts[0].level

    def get_all_attempts(self, obj):
        return [
            {
                'id': str(a.id),
                'level': a.level,
                'exam_date': str(a.exam_date),
                'passed': a.passed,
                'score': a.score,
                'verified': a.verified,
                'verified_by': a.verified_by.username if a.verified_by else None,
                'notes': a.notes,
            }
            for a in obj.intern.jlpt_attempts.all().order_by('-exam_date')
        ]


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


class JapaneseBatchSerializer(serializers.ModelSerializer):
    creator = serializers.SerializerMethodField()
    interns_count = serializers.SerializerMethodField()
    instructors_list = serializers.SerializerMethodField()
    assigned_interns = serializers.SerializerMethodField()
    sub_batches_count = serializers.SerializerMethodField()
    sub_batches = serializers.SerializerMethodField()

    class Meta:
        model = JapaneseBatch
        fields = [
            'id', 'name', 'code', 'cohort', 'status', 'description', 'created_by',
            'creator', 'sub_batches_count', 'sub_batches', 'interns_count',
            'instructors_list', 'assigned_interns',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_creator(self, obj):
        if not obj.created_by:
            return {
                'id': None,
                'name': 'System Administrator',
                'role': 'SUPER_ADMIN',
                'role_display': 'Super Admin',
                'email': '',
            }
        role = getattr(obj.created_by, 'role', 'HR')
        role_display = 'HR Partner' if role == 'HR' else ('Super Admin' if role == 'SUPER_ADMIN' else role)
        full_name = obj.created_by.get_full_name() or obj.created_by.username
        return {
            'id': str(obj.created_by.id),
            'name': full_name,
            'role': role,
            'role_display': role_display,
            'email': obj.created_by.email or '',
        }

    def get_sub_batches_count(self, obj):
        return obj.sub_batches.count()

    def get_sub_batches(self, obj):
        result = []
        for sb in obj.sub_batches.all():
            result.append({
                'id': str(sb.id),
                'name': sb.name,
                'code': sb.code,
                'cohort': sb.cohort,
                'status': sb.status,
                'interns_count': sb.interns.count(),
                'assigned_interns': [self._serialize_intern(p, sb.code, sb.name) for p in sb.interns.select_related('user', 'department', 'manager').all()],
            })
        return result

    def get_interns_count(self, obj):
        # If it has sub-batches, count all interns across sub-batches plus direct
        sub_interns_count = sum(sb.interns.count() for sb in obj.sub_batches.all())
        direct_count = obj.interns.count()
        return max(direct_count, sub_interns_count)

    def get_instructors_list(self, obj):
        return [
            {
                'id': str(inst.id),
                'username': inst.username,
                'fullName': inst.get_full_name() or inst.username,
                'email': inst.email,
            }
            for inst in obj.instructors.all()
        ]

    def _serialize_intern(self, p, sub_batch_code='', sub_batch_name=''):
        plan = p.japanese_learning_plans.filter(is_active=True).first() or p.japanese_learning_plans.first()
        evaluation = p.japanese_evaluations.first()
        eligibility = p.jlpt_eligibility_records.first()
        practice_results = p.japanese_practice_results.all()
        completed_practice = practice_results.filter(status='REVIEWED').count()
        total_practice = practice_results.count()
        progress_pct = round((completed_practice / max(total_practice, 1)) * 100, 1) if total_practice > 0 else 0.0

        return {
            'id': str(p.id),
            'userId': str(p.user.id),
            'fullName': p.full_name or p.user.username,
            'employeeCode': p.employee_code,
            'email': p.user.email,
            'department': p.department.name if p.department else 'Language & Training',
            'managerName': p.manager.username if p.manager else 'Unassigned',
            'designation': p.designation or 'Intern',
            'subBatchCode': sub_batch_code,
            'subBatchName': sub_batch_name,
            'plan': {
                'id': str(plan.id) if plan else None,
                'title': plan.title if plan else 'No Active Plan',
                'targetLevel': plan.target_jlpt_level if plan else None,
                'targetDate': str(plan.target_date) if plan and plan.target_date else None,
                'topicsCount': plan.topics.count() if plan else 0,
            } if plan else None,
            'progress': {
                'percentage': progress_pct,
                'completed': completed_practice,
                'total': total_practice,
            },
            'evaluation': {
                'id': str(evaluation.id) if evaluation else None,
                'status': evaluation.status if evaluation else 'NOT_ASSIGNED',
                'statusDisplay': evaluation.get_status_display() if evaluation else 'Not Assigned',
                'overallScore': float(evaluation.overall_language_score) if evaluation and evaluation.overall_language_score is not None else None,
                'returnReason': evaluation.return_reason if evaluation and evaluation.status == 'RETURNED' else '',
            } if evaluation else None,
            'jlpt': {
                'requiredLevel': eligibility.required_level if eligibility else (plan.target_jlpt_level if plan else 'N4'),
                'eligibilityStatus': eligibility.eligibility_status if eligibility else 'NOT_STARTED',
                'eligibilityStatusDisplay': eligibility.get_eligibility_status_display() if eligibility else 'Not Started',
                'attemptsCount': p.jlpt_attempts.count(),
                'lastAttemptPassed': p.jlpt_attempts.first().passed if p.jlpt_attempts.exists() else None,
            },
        }

    def get_assigned_interns(self, obj):
        interns_map = {}
        # First add direct interns
        for p in obj.interns.select_related('user', 'department', 'manager').all():
            interns_map[p.id] = self._serialize_intern(p, obj.code, obj.name)

        # Then add interns from sub-batches
        for sb in obj.sub_batches.all():
            for p in sb.interns.select_related('user', 'department', 'manager').all():
                interns_map[p.id] = self._serialize_intern(p, sb.code, sb.name)

        return list(interns_map.values())

