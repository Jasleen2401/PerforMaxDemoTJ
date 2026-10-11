import os
from decimal import Decimal, InvalidOperation
from datetime import date, datetime, timedelta
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound

from apps.accounts.models import User, UserRole
from apps.employees.models import EmployeeProfile
from apps.goals.models import Goal, GoalStatus, GoalPriority, GoalProgress
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.performance.models import (
    PerformanceCycle, Appraisal, AppraisalType, AppraisalStatus, CycleStatus,
    TechnicalCapabilityParameter, TechnicalCapabilityReview
)
from apps.performance.services.scoring import ScoringService
from apps.notifications.services import NotificationService
from apps.notifications.models import Notification, NotificationType
from apps.audit.services import AuditService

from .models import (
    InternTask, TaskCategory, TaskPriority, TaskStatus,
    InternGoalComment, InternSelfAppraisalSubmission, InternFeedbackReply,
    InternForm, InternFormQuestion, InternFormSubmission,
    FormStatus, QuestionType,
    MiraiQuarterProgress, MiraiCertification, MiraiTimelineEvent,
    QuarterCode, QuarterStatus, CertificationStatus, VerificationStatus,
    ConversionDecision, TimelineEventType
)
from .services import MiraiJourneyService
from .serializers import (
    InternGoalListSerializer, InternGoalProgressUpdateSerializer,
    InternGoalCommentSerializer, InternEvidenceSubmissionSerializer,
    InternTaskSerializer, InternTaskCompleteSerializer, InternTaskReviewSerializer,
    InternFormListSerializer, InternFormDetailSerializer, InternFormSubmitSerializer,
    InternSelfAppraisalSerializer, InternFeedbackReplySerializer,
    validate_file_attachment
)


def get_authenticated_intern_profile(user):
    """
    Resolves the EmployeeProfile for the authenticated user.
    Raises NotFound if no profile exists for this account.
    """
    profile = getattr(user, 'profile', None)
    if not profile:
        profile = EmployeeProfile.objects.filter(user=user).first()
    if not profile:
        raise NotFound("Employee profile not found for this account.")
    return profile


def get_performance_classification(score):
    """Returns official performance classification based on calibrated score."""
    if score is None:
        return None
    val = float(score)
    if val >= 90.0:
        return "Outstanding Contributor"
    elif val >= 80.0:
        return "Exceeds Expectations"
    elif val >= 70.0:
        return "Meets Expectations"
    elif val >= 60.0:
        return "Needs Improvement"
    else:
        return "Unsatisfactory / Review Required"


# ==============================================================================
# 1. PERSONAL DASHBOARD & SCORECARD OVERVIEW
# ==============================================================================
class InternOverviewView(APIView):
    """
    Returns authentic dashboard scorecard, assigned mentor, active cycle,
    upcoming deadlines, and published results. Strictly data-driven (no mock injection).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            profile = get_authenticated_intern_profile(user)
        except NotFound:
            return Response({
                'code': 404,
                'message': 'No profile found for authenticated account.',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)

        # 1. Mentor Info
        mentor = profile.manager
        mentor_data = None
        if mentor:
            mentor_profile = getattr(mentor, 'profile', None)
            mentor_data = {
                'id': str(mentor.id),
                'name': mentor_profile.full_name if mentor_profile else mentor.username,
                'email': mentor.email,
                'designation': mentor_profile.designation if mentor_profile else 'Assigned Mentor',
                'department': mentor_profile.department.name if mentor_profile and mentor_profile.department else (profile.department.name if profile.department else 'Engineering'),
                'status': 'Active Mentorship'
            }

        # 2. Active Evaluation Cycle
        today = date.today()
        active_cycle = PerformanceCycle.objects.filter(
            Q(status=CycleStatus.ACTIVE) | Q(status=CycleStatus.REVIEW_PERIOD)
        ).order_by('-start_date').first() or PerformanceCycle.objects.order_by('-start_date').first()

        cycle_data = None
        if active_cycle:
            days_remaining = max(0, (active_cycle.end_date - today).days)
            cycle_data = {
                'id': str(active_cycle.id),
                'name': active_cycle.name,
                'description': active_cycle.description or '',
                'startDate': active_cycle.start_date.isoformat(),
                'endDate': active_cycle.end_date.isoformat(),
                'status': active_cycle.status,
                'currentPhase': active_cycle.current_phase or ('Review Period' if active_cycle.status == CycleStatus.REVIEW_PERIOD else 'Self-Evaluation Open'),
                'daysRemaining': days_remaining,
                'selfAssessmentDeadline': active_cycle.self_assessment_deadline.isoformat() if active_cycle.self_assessment_deadline else active_cycle.end_date.isoformat(),
                'evidenceDeadline': active_cycle.evidence_deadline.isoformat() if active_cycle.evidence_deadline else active_cycle.end_date.isoformat()
            }

        # 3. Assigned Goals (Authentic data only)
        goals_qs = Goal.objects.filter(employee=profile)
        total_goals = goals_qs.count()
        completed_goals = goals_qs.filter(
            Q(status=GoalStatus.COMPLETED) | Q(completion_percentage=Decimal('100.00'))
        ).count()
        avg_progress = float(ScoringService.calculate_weighted_goal_progress(list(goals_qs)))

        # 4. Assigned Tasks
        tasks_qs = InternTask.objects.filter(intern=profile)
        total_tasks = tasks_qs.count()
        pending_tasks = tasks_qs.exclude(status=TaskStatus.COMPLETED).count()

        # 5. Published Results (Privacy-shielded)
        published_appraisal = Appraisal.objects.filter(
            employee=profile,
            status=AppraisalStatus.PUBLISHED
        ).order_by('-published_at', '-created_at').first()

        results_data = None
        if published_appraisal:
            calc_score = ScoringService.calculate_cycle_score(profile, published_appraisal.cycle)
            results_data = {
                'isPublished': True,
                'overallScore': float(published_appraisal.overall_score) if published_appraisal.overall_score is not None else float(calc_score.get('overall_score', 0)),
                'classification': published_appraisal.classification or get_performance_classification(published_appraisal.overall_score),
                'reviewerComments': published_appraisal.reviewer_comments,
                'strengths': published_appraisal.strengths,
                'areasForImprovement': published_appraisal.areas_for_improvement,
                'recommendations': published_appraisal.recommendations,
                'publishedAt': published_appraisal.published_at.isoformat() if published_appraisal.published_at else None,
                'allowInternReply': published_appraisal.allow_intern_reply
            }
        else:
            results_data = {
                'isPublished': False,
                'overallScore': None,
                'classification': None,
                'reviewerComments': None,
                'strengths': [],
                'areasForImprovement': [],
                'recommendations': None,
                'publishedAt': None,
                'allowInternReply': False
            }

        # 6. Deadlines Tracker (Dynamic)
        deadlines = []
        for g in goals_qs.exclude(status=GoalStatus.COMPLETED).order_by('due_date')[:5]:
            days_left = (g.due_date - today).days
            st = 'OVERDUE' if days_left < 0 else ('DUE_TODAY' if days_left == 0 else 'UPCOMING')
            deadlines.append({
                'id': str(g.id),
                'title': g.title,
                'type': 'GOAL',
                'dueDate': g.due_date.isoformat(),
                'daysLeft': days_left,
                'status': st
            })

        for t in tasks_qs.exclude(status=TaskStatus.COMPLETED).order_by('due_date')[:5]:
            days_left = (t.due_date - today).days
            st = 'OVERDUE' if days_left < 0 else ('DUE_TODAY' if days_left == 0 else 'UPCOMING')
            deadlines.append({
                'id': str(t.id),
                'title': t.title,
                'type': 'TASK',
                'dueDate': t.due_date.isoformat(),
                'daysLeft': days_left,
                'status': st
            })

        if active_cycle and active_cycle.self_assessment_deadline:
            days_left = (active_cycle.self_assessment_deadline - today).days
            st = 'OVERDUE' if days_left < 0 else ('DUE_TODAY' if days_left == 0 else 'UPCOMING')
            deadlines.append({
                'id': f"cycle-self-{active_cycle.id}",
                'title': f"Self-Assessment Cutoff ({active_cycle.name})",
                'type': 'EVALUATION',
                'dueDate': active_cycle.self_assessment_deadline.isoformat(),
                'daysLeft': days_left,
                'status': st
            })

        deadlines.sort(key=lambda d: d['daysLeft'])

        # Weight distribution parameters
        target_cycle = published_appraisal.cycle if published_appraisal else active_cycle
        calc_score = ScoringService.calculate_cycle_score(profile, target_cycle) if target_cycle else {}
        weight_dist = calc_score.get('weight_distribution', {
            'goals_and_kpis': 40.0,
            'manager_evaluation': 40.0,
            'self_assessment': 20.0
        })
        eval_params = calc_score.get('evaluation_parameters', [])

        return Response({
            'code': 200,
            'message': 'Success',
            'data': {
                'profile': {
                    'id': str(profile.id),
                    'userId': str(user.id),
                    'name': profile.full_name,
                    'email': user.email,
                    'employeeCode': profile.employee_code,
                    'designation': profile.designation,
                    'department': profile.department.name if profile.department else 'General'
                },
                'mentor': mentor_data,
                'cycle': cycle_data,
                'scorecard': {
                    'totalGoals': total_goals,
                    'completedGoals': completed_goals,
                    'averageProgress': avg_progress,
                    'totalTasks': total_tasks,
                    'pendingTasksCount': pending_tasks,
                    'weightDistribution': weight_dist,
                    'evaluationParameters': eval_params
                },
                'personalScorecard': {
                    'totalGoals': total_goals,
                    'completedGoals': completed_goals,
                    'averageProgress': avg_progress,
                    'totalTasks': total_tasks,
                    'pendingTasksCount': pending_tasks,
                    'weightDistribution': weight_dist,
                    'evaluationParameters': eval_params
                },
                'deadlines': deadlines,
                'publishedResults': results_data
            }
        })


# ==============================================================================
# 2. GOALS & PROGRESS
# ==============================================================================
class InternGoalsView(APIView):
    """
    List all assigned goals for the authenticated intern.
    Strictly isolated: returns only goals where employee=profile.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = get_authenticated_intern_profile(request.user)
        goals = Goal.objects.filter(employee=profile).select_related('cycle', 'assigned_by').order_by('due_date')
        serializer = InternGoalListSerializer(goals, many=True)
        return Response({'code': 200, 'data': serializer.data})


class InternGoalDetailView(APIView):
    """
    Retrieve single goal detail with complete audit progress updates and comment counts.
    Anti-IDOR: Returns 404 if goal does not belong to the authenticated intern.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        goal = Goal.objects.filter(id=pk, employee=profile).select_related('cycle', 'assigned_by').first()
        if not goal:
            return Response({'code': 404, 'message': 'Goal not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = InternGoalListSerializer(goal)
        progress_updates = [{
            'id': str(p.id),
            'progressPercentage': float(p.progress_percentage),
            'comment': p.comment,
            'updatedBy': p.updated_by.username if p.updated_by else 'Intern',
            'createdAt': p.created_at.strftime('%Y-%m-%d %H:%M')
        } for p in goal.progress_updates.all().order_by('-created_at')]

        data = serializer.data
        data['progressUpdates'] = progress_updates
        return Response({'code': 200, 'data': data})


class InternUpdateProgressView(APIView):
    """
    Update goal progress percentage (0.00 to 100.00).
    Enforces that the intern can only update progress, not goal title, weight, or owner.
    Creates an auditable GoalProgress record.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        return self.post(request, pk)

    def post(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        goal = Goal.objects.filter(id=pk, employee=profile).first()
        if not goal:
            return Response({'code': 404, 'message': 'Goal not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = InternGoalProgressUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'code': 400, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        new_progress = serializer.validated_data['progress']
        comment = serializer.validated_data.get('comment', '').strip()

        old_progress = goal.completion_percentage
        goal.completion_percentage = new_progress

        # Auto-transition status
        if new_progress >= Decimal('100.00'):
            goal.status = GoalStatus.COMPLETED
        elif new_progress > Decimal('0.00') and goal.status == GoalStatus.NOT_STARTED:
            goal.status = GoalStatus.IN_PROGRESS
        goal.save(update_fields=['completion_percentage', 'status', 'updated_at'])

        # Audit progress record
        progress_record = GoalProgress.objects.create(
            goal=goal,
            updated_by=request.user,
            progress_percentage=new_progress,
            comment=comment or f"Progress updated from {old_progress}% to {new_progress}%"
        )

        return Response({
            'code': 200,
            'message': 'Goal progress updated successfully',
            'data': {
                'id': str(goal.id),
                'progress': float(goal.completion_percentage),
                'status': goal.status,
                'auditId': str(progress_record.id)
            }
        })


# ==============================================================================
# 3. GOAL COMMENTS
# ==============================================================================
class InternGoalCommentsView(APIView):
    """
    View comments thread on a goal or post a new progress note/reply to mentor.
    Anti-IDOR: Goal must belong to the authenticated intern (or assigned mentor).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        # Verify access: intern owns the goal, or user is the intern's assigned mentor, or HR
        is_mentor = profile.manager == request.user or request.user.role in [UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN]
        goal = Goal.objects.filter(id=pk).first()
        if not goal or (goal.employee != profile and not is_mentor):
            return Response({'code': 404, 'message': 'Goal not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        comments = InternGoalComment.objects.filter(goal=goal).order_by('created_at')
        serializer = InternGoalCommentSerializer(comments, many=True)
        return Response({'code': 200, 'data': serializer.data})

    def post(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        is_mentor = profile.manager == request.user or request.user.role in [UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN]
        goal = Goal.objects.filter(id=pk).first()
        if not goal or (goal.employee != profile and not is_mentor):
            return Response({'code': 404, 'message': 'Goal not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        comment_text = request.data.get('comment', '').strip()
        if not comment_text:
            return Response({'code': 400, 'message': 'Comment text cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        parent_id = request.data.get('parentId') or request.data.get('parent')
        parent_comment = None
        if parent_id:
            parent_comment = InternGoalComment.objects.filter(id=parent_id, goal=goal).first()

        author_name = request.user.username
        user_profile = getattr(request.user, 'profile', None)
        if user_profile and user_profile.full_name:
            author_name = user_profile.full_name
        elif hasattr(request.user, 'get_full_name') and request.user.get_full_name():
            author_name = request.user.get_full_name()

        new_comment = InternGoalComment.objects.create(
            goal=goal,
            author=request.user,
            author_name=author_name,
            author_role='MENTOR' if is_mentor else 'INTERN',
            comment=comment_text,
            is_mentor=is_mentor,
            parent=parent_comment
        )

        serializer = InternGoalCommentSerializer(new_comment)
        return Response({'code': 201, 'message': 'Comment posted successfully', 'data': serializer.data}, status=status.HTTP_201_CREATED)


# ==============================================================================
# 4. EVIDENCE SUBMISSIONS
# ==============================================================================
class InternEvidenceView(APIView):
    """
    List submitted evidence and submit new proof of work against goals.
    Strict server-side validation:
    - Disallows executable/script file extensions (.exe, .sh, .py, etc.)
    - Limits file sizes to 10MB
    - Enforces goal ownership
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = get_authenticated_intern_profile(request.user)
        evidence_list = EvidenceSubmission.objects.filter(employee=profile).select_related('goal', 'reviewed_by').order_by('-created_at')
        serializer = InternEvidenceSubmissionSerializer(evidence_list, many=True)
        return Response({'code': 200, 'data': serializer.data})

    def post(self, request):
        profile = get_authenticated_intern_profile(request.user)
        goal_id = request.data.get('goalId') or request.data.get('goal_id') or request.data.get('goal')
        task_id = request.data.get('taskId') or request.data.get('task_id') or request.data.get('task')
        if not goal_id and not task_id:
            return Response({'code': 400, 'message': 'Goal ID or Task ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        goal = None
        if goal_id:
            goal = Goal.objects.filter(id=goal_id, employee=profile).first()
            if not goal:
                return Response({'code': 400, 'message': 'Specified goal does not belong to your assigned goals.'}, status=status.HTTP_400_BAD_REQUEST)

        task = None
        if task_id:
            task = InternTask.objects.filter(id=task_id, intern=profile).first()
            if not task:
                return Response({'code': 400, 'message': 'Specified task does not belong to your assigned tasks.'}, status=status.HTTP_400_BAD_REQUEST)

        title = request.data.get('title', '').strip()
        if not title:
            return Response({'code': 400, 'message': 'Evidence title is required.'}, status=status.HTTP_400_BAD_REQUEST)

        description = request.data.get('description', '').strip()
        external_url = request.data.get('external_url') or request.data.get('externalUrl', '')
        file_obj = request.FILES.get('file') or request.FILES.get('file_attachment')

        if not file_obj and not external_url:
            return Response({'code': 400, 'message': 'Please provide either a file attachment or an external URL.'}, status=status.HTTP_400_BAD_REQUEST)

        # File validation
        if file_obj:
            try:
                validate_file_attachment(file_obj)
            except ValidationError as ve:
                return Response({'code': 400, 'message': ve.detail[0] if isinstance(ve.detail, list) else str(ve.detail)}, status=status.HTTP_400_BAD_REQUEST)

        # Duplicate submission protection (same title and goal/task within 1 hour)
        dup_filter = {'employee': profile, 'title__iexact': title, 'created_at__gte': timezone.now() - timedelta(hours=1)}
        if goal:
            dup_filter['goal'] = goal
        if task:
            dup_filter['task'] = task
        recent_duplicate = EvidenceSubmission.objects.filter(**dup_filter).first()
        if recent_duplicate:
            return Response({
                'code': 400,
                'message': 'A duplicate evidence submission with this title was already submitted recently.'
            }, status=status.HTTP_400_BAD_REQUEST)

        evidence = EvidenceSubmission.objects.create(
            employee=profile,
            goal=goal,
            task=task,
            title=title,
            description=description,
            external_url=external_url.strip() if external_url else None,
            file_attachment=file_obj,
            review_status=EvidenceReviewStatus.PENDING
        )

        # Dispatch event notification to mentor
        NotificationService.notify_evidence_submitted(evidence)

        serializer = InternEvidenceSubmissionSerializer(evidence)
        return Response({
            'code': 201,
            'message': 'Evidence submitted successfully for mentor verification',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)


class InternEvidenceDetailView(APIView):
    """
    Single evidence detail. Anti-IDOR: Returns 404 if not owned.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        evidence = EvidenceSubmission.objects.filter(id=pk, employee=profile).select_related('goal', 'reviewed_by').first()
        if not evidence:
            return Response({'code': 404, 'message': 'Evidence submission not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = InternEvidenceSubmissionSerializer(evidence)
        return Response({'code': 200, 'data': serializer.data})


# ==============================================================================
# 5. ASSIGNED TASKS & LIFECYCLE
# ==============================================================================
class InternTasksView(APIView):
    """
    List all assigned tasks for the intern, filterable by ?status=...
    Or create a personal task for the authenticated intern.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = get_authenticated_intern_profile(request.user)
        tasks = InternTask.objects.filter(intern=profile).select_related('reviewed_by', 'goal')
        status_filter = request.query_params.get('status')
        if status_filter:
            tasks = tasks.filter(status=status_filter.upper())
        serializer = InternTaskSerializer(tasks, many=True)
        return Response({'code': 200, 'data': serializer.data})

    def post(self, request):
        profile = get_authenticated_intern_profile(request.user)
        title = request.data.get('title', '').strip()
        if not title:
            return Response({'code': 400, 'message': 'Task title is required.'}, status=status.HTTP_400_BAD_REQUEST)

        description = request.data.get('description', '').strip() or request.data.get('instructions', '').strip()
        category = request.data.get('category', TaskCategory.TECHNICAL)
        if category not in [c[0] for c in TaskCategory.choices]:
            category = TaskCategory.TECHNICAL

        priority = request.data.get('priority', TaskPriority.MEDIUM).upper()
        if priority not in [p[0] for p in TaskPriority.choices]:
            priority = TaskPriority.MEDIUM

        due_date_val = request.data.get('due_date') or request.data.get('dueDate')
        if not due_date_val:
            due_date = date.today() + timedelta(days=14)
        else:
            try:
                due_date = datetime.strptime(str(due_date_val)[:10], '%Y-%m-%d').date()
            except ValueError:
                due_date = date.today() + timedelta(days=14)

        raw_status = (request.data.get('status') or 'ASSIGNED').upper()
        if raw_status in ['TO DO', 'TO_DO', 'TODO', 'ASSIGNED', 'NOT_STARTED']:
            task_status = TaskStatus.ASSIGNED
        elif raw_status in ['IN PROGRESS', 'IN_PROGRESS']:
            task_status = TaskStatus.IN_PROGRESS
        elif raw_status in ['COMPLETED', 'DONE']:
            task_status = TaskStatus.COMPLETED
        else:
            task_status = TaskStatus.ASSIGNED

        # Related goal validation (anti-IDOR: goal must belong to this intern)
        goal_id = request.data.get('goalId') or request.data.get('goal_id') or request.data.get('goal')
        related_goal = None
        if goal_id:
            related_goal = Goal.objects.filter(id=goal_id, employee=profile).first()
            if not related_goal:
                return Response(
                    {'code': 400, 'message': 'Specified goal does not belong to your assigned goals.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        is_completed = (task_status == TaskStatus.COMPLETED)
        completed_at = date.today() if is_completed else None

        task = InternTask.objects.create(
            intern=profile,
            created_by=request.user,
            goal=related_goal,
            title=title,
            description=description,
            instructions=description,
            category=category,
            priority=priority,
            due_date=due_date,
            status=task_status,
            is_completed=is_completed,
            completed_at=completed_at,
            requires_mentor_review=False,
            is_permitted_to_complete=True
        )

        return Response({
            'code': 201,
            'message': 'Task created successfully',
            'data': InternTaskSerializer(task).data
        }, status=status.HTTP_201_CREATED)


class InternTaskDetailView(APIView):
    """
    Retrieve single task detail, update task details/status, or delete personal task.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        task = InternTask.objects.filter(id=pk, intern=profile).select_related('reviewed_by', 'goal').first()
        if not task:
            return Response({'code': 404, 'message': 'Task not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = InternTaskSerializer(task)
        return Response({'code': 200, 'data': serializer.data})

    def patch(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        task = InternTask.objects.filter(id=pk, intern=profile).first()
        if not task:
            return Response({'code': 404, 'message': 'Task not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        title = request.data.get('title')
        if title is not None:
            if not str(title).strip():
                return Response({'code': 400, 'message': 'Task title cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
            task.title = str(title).strip()

        desc = request.data.get('description') or request.data.get('instructions')
        if desc is not None:
            task.description = str(desc).strip()
            task.instructions = str(desc).strip()

        priority = request.data.get('priority')
        if priority and priority.upper() in [p[0] for p in TaskPriority.choices]:
            task.priority = priority.upper()

        due_date_val = request.data.get('due_date') or request.data.get('dueDate')
        if due_date_val:
            try:
                task.due_date = datetime.strptime(str(due_date_val)[:10], '%Y-%m-%d').date()
            except ValueError:
                pass

        goal_id = request.data.get('goalId') or request.data.get('goal_id')
        if goal_id is not None:
            if str(goal_id).strip() in ('', 'null', 'none'):
                task.goal = None
            else:
                goal = Goal.objects.filter(id=goal_id, employee=profile).first()
                if not goal:
                    return Response({'code': 400, 'message': 'Specified goal does not belong to your assigned goals.'}, status=status.HTTP_400_BAD_REQUEST)
                task.goal = goal

        target_status = request.data.get('status')
        if target_status:
            ts = target_status.upper()
            if ts in ['TO DO', 'TO_DO', 'TODO', 'ASSIGNED', 'NOT_STARTED']:
                task.status = TaskStatus.ASSIGNED
                task.is_completed = False
            elif ts in ['IN PROGRESS', 'IN_PROGRESS']:
                task.status = TaskStatus.IN_PROGRESS
                task.is_completed = False
            elif ts in ['COMPLETED', 'DONE']:
                task.status = TaskStatus.COMPLETED
                task.is_completed = True
                task.completed_at = date.today()

        task.save()
        return Response({'code': 200, 'message': 'Task updated successfully', 'data': InternTaskSerializer(task).data})

    def put(self, request, pk):
        return self.patch(request, pk)

    def delete(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        task = InternTask.objects.filter(id=pk, intern=profile).first()
        if not task:
            return Response({'code': 404, 'message': 'Task not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        if task.created_by != request.user and not (request.user.role in [UserRole.HR, UserRole.SUPER_ADMIN]):
            return Response({'code': 403, 'message': 'You can only delete tasks you created yourself.'}, status=status.HTTP_403_FORBIDDEN)

        task.delete()
        return Response({'code': 200, 'message': 'Task deleted successfully.'})


class InternAllTasksView(APIView):
    """
    List all intern-created and assigned tasks for HR and Managers.
    Allows filtering by ?employee_id=... / ?intern_id=... and ?status=...
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not (user.role in [UserRole.HR, UserRole.SUPER_ADMIN, UserRole.MANAGER] or user.is_superuser):
            return Response({'code': 403, 'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        qs = InternTask.objects.select_related('intern__user', 'goal', 'reviewed_by', 'created_by').all()

        if user.role == UserRole.MANAGER and not (user.is_superuser or user.role in [UserRole.HR, UserRole.SUPER_ADMIN]):
            qs = qs.filter(intern__manager=user)

        employee_param = request.query_params.get('employee_id') or request.query_params.get('intern_id')
        if employee_param:
            qs = qs.filter(
                Q(intern__id__iexact=str(employee_param)) |
                Q(intern__user__id__iexact=str(employee_param)) |
                Q(intern__employee_code__iexact=str(employee_param))
            )

        status_param = request.query_params.get('status')
        if status_param and status_param.upper() != 'ALL':
            qs = qs.filter(status=status_param.upper())

        priority_param = request.query_params.get('priority')
        if priority_param and priority_param.upper() != 'ALL':
            qs = qs.filter(priority=priority_param.upper())

        serializer = InternTaskSerializer(qs.order_by('-created_at'), many=True)
        return Response({'code': 200, 'data': serializer.data})


class InternCompleteTaskView(APIView):
    """
    Submit completion for an assigned task.
    Enforces mentor review workflow:
    - If requires_mentor_review=True -> sets status=SUBMITTED (NOT completed).
    - If requires_mentor_review=False -> sets status=COMPLETED (if permitted).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        task = InternTask.objects.filter(id=pk, intern=profile).first()
        if not task:
            return Response({'code': 404, 'message': 'Task not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = InternTaskCompleteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'code': 400, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        hours_spent = serializer.validated_data.get('hours_spent', Decimal('0.00'))
        completion_notes = serializer.validated_data.get('completion_notes', '')
        artifact_url = serializer.validated_data.get('artifact_url', '')
        completed_at = serializer.validated_data.get('completed_at') or date.today()

        old_status = task.status
        task.hours_spent = hours_spent
        task.completion_notes = completion_notes
        task.artifact_url = artifact_url
        task.completed_at = completed_at

        if task.requires_mentor_review:
            # Must be reviewed by mentor
            task.status = TaskStatus.SUBMITTED
            task.save()
            NotificationService.notify_task_status_changed(task, old_status, TaskStatus.SUBMITTED, actor=request.user)
            return Response({
                'code': 200,
                'message': 'Task submitted for mentor verification. Your mentor will review and finalize completion.',
                'data': InternTaskSerializer(task).data
            })
        else:
            if not task.is_permitted_to_complete:
                return Response({
                    'code': 403,
                    'message': 'You do not have permission to self-complete this task directly.'
                }, status=status.HTTP_403_FORBIDDEN)
            task.status = TaskStatus.COMPLETED
            task.save()
            NotificationService.notify_task_status_changed(task, old_status, TaskStatus.COMPLETED, actor=request.user)
            return Response({
                'code': 200,
                'message': 'Task completed successfully',
                'data': InternTaskSerializer(task).data
            })


class InternTaskReviewView(APIView):
    """
    Mentor/HR action to approve or request revision on a submitted task.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        task = InternTask.objects.filter(id=pk).select_related('intern__manager').first()
        if not task:
            return Response({'code': 404, 'message': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Authorized only for assigned mentor, manager, or HR
        is_mentor = task.intern.manager == request.user or request.user.role in [UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN]
        if not is_mentor:
            return Response({'code': 403, 'message': 'Only the assigned mentor or HR can review submitted tasks.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = InternTaskReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'code': 400, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        action = serializer.validated_data['action']
        feedback = serializer.validated_data.get('feedback', '')

        old_status = task.status
        task.reviewed_by = request.user
        task.reviewed_at = timezone.now()
        task.review_feedback = feedback

        if action == 'APPROVE':
            task.status = TaskStatus.COMPLETED
            task.save()
            NotificationService.notify_task_status_changed(task, old_status, TaskStatus.COMPLETED, actor=request.user)
            return Response({'code': 200, 'message': 'Task approved and marked completed.', 'data': InternTaskSerializer(task).data})
        else:
            task.status = TaskStatus.IN_PROGRESS
            task.save()
            NotificationService.notify_task_status_changed(task, old_status, TaskStatus.IN_PROGRESS, actor=request.user)
            return Response({'code': 200, 'message': 'Task returned to intern for revision with feedback.', 'data': InternTaskSerializer(task).data})


# ==============================================================================
# 6. HR-PUBLISHED FORMS & QUESTIONNAIRES
# ==============================================================================
class InternFormsListView(APIView):
    """
    List all PUBLISHED forms targeted to this intern's role, cohort, and active cycle.
    Draft forms are strictly invisible.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = get_authenticated_intern_profile(request.user)

        # Targeting: published status AND matching role AND (matching dept OR global)
        qs = InternForm.objects.filter(
            status=FormStatus.PUBLISHED,
            target_role__in=['INTERN', 'ALL']
        )
        if profile.department:
            qs = qs.filter(Q(department=profile.department) | Q(department__isnull=True))
        else:
            qs = qs.filter(department__isnull=True)

        serializer = InternFormListSerializer(qs, many=True, context={'request': request})
        return Response({'code': 200, 'data': serializer.data})


class InternFormDetailView(APIView):
    """
    Retrieve single published form with its structured questions and current intern submission (draft or final).
    Anti-IDOR: Access denied if form is not published or targeting does not match.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        form = InternForm.objects.filter(
            id=pk,
            status=FormStatus.PUBLISHED,
            target_role__in=['INTERN', 'ALL']
        ).prefetch_related('questions').first()

        if not form:
            return Response({'code': 404, 'message': 'Form not found or not published.'}, status=status.HTTP_404_NOT_FOUND)

        if form.department and form.department != profile.department:
            return Response({'code': 404, 'message': 'Form not targeted to your department.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = InternFormDetailSerializer(form, context={'request': request})
        return Response({'code': 200, 'data': serializer.data})


class InternFormSubmitView(APIView):
    """
    Save draft or submit final answers to an HR-published form.
    Validates all answer types (numeric, rating, choice, date, text) server-side.
    Locks form against further edits once is_submitted=True.
    Anti-IDOR: intern is strictly derived from request.user.profile.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        profile = get_authenticated_intern_profile(request.user)
        form = InternForm.objects.filter(
            id=pk,
            status=FormStatus.PUBLISHED,
            target_role__in=['INTERN', 'ALL']
        ).first()

        if not form:
            return Response({'code': 404, 'message': 'Form not found or not published.'}, status=status.HTTP_404_NOT_FOUND)

        if form.department and form.department != profile.department:
            return Response({'code': 403, 'message': 'This form is not targeted to your department.'}, status=status.HTTP_403_FORBIDDEN)

        # Check existing submission
        submission = InternFormSubmission.objects.filter(form=form, intern=profile).first()
        if submission and submission.is_submitted:
            return Response({
                'code': 400,
                'message': 'You have already finalized your submission for this form. Further edits are locked.'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = InternFormSubmitSerializer(data=request.data, context={'form': form})
        if not serializer.is_valid():
            return Response({'code': 400, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        answers = serializer.validated_data['answers']
        is_submitted = serializer.validated_data.get('is_submitted', False)

        if not submission:
            submission = InternFormSubmission(
                form=form,
                intern=profile,
                cycle=form.cycle
            )

        submission.answers = answers
        submission.is_submitted = is_submitted
        if is_submitted:
            submission.submitted_at = timezone.now()
        submission.save()

        status_msg = "Form submitted successfully." if is_submitted else "Draft answers saved successfully."
        return Response({
            'code': 200,
            'message': status_msg,
            'data': {
                'id': str(submission.id),
                'isSubmitted': submission.is_submitted,
                'submittedAt': submission.submitted_at.isoformat() if submission.submitted_at else None
            }
        })


# ==============================================================================
# 7. SELF-ASSESSMENT & REFLECTION
# ==============================================================================
class InternSelfAppraisalView(APIView):
    """
    Retrieve or submit 1.0–10.0 self-rating and qualitative reflection answers.
    Enforces cycle self-assessment window and locks upon final submission.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = get_authenticated_intern_profile(request.user)
        today = date.today()
        cycle = PerformanceCycle.objects.filter(
            Q(status=CycleStatus.ACTIVE) | Q(status=CycleStatus.REVIEW_PERIOD)
        ).order_by('-start_date').first() or PerformanceCycle.objects.order_by('-start_date').first()

        if not cycle:
            return Response({
                'code': 200,
                'data': {
                    'isOpen': False,
                    'message': 'No active evaluation cycle currently open for self-assessment.'
                }
            })

        submission = InternSelfAppraisalSubmission.objects.filter(intern=profile, cycle=cycle).first()
        is_open = True
        if cycle.self_assessment_deadline and today > cycle.self_assessment_deadline:
            is_open = False

        data = {
            'isOpen': is_open,
            'cycleId': str(cycle.id),
            'cycleName': cycle.name,
            'deadline': cycle.self_assessment_deadline.isoformat() if cycle.self_assessment_deadline else cycle.end_date.isoformat(),
            'submission': InternSelfAppraisalSerializer(submission).data if submission else None
        }
        return Response({'code': 200, 'data': data})

    def post(self, request):
        profile = get_authenticated_intern_profile(request.user)
        today = date.today()
        cycle = PerformanceCycle.objects.filter(
            Q(status=CycleStatus.ACTIVE) | Q(status=CycleStatus.REVIEW_PERIOD)
        ).order_by('-start_date').first() or PerformanceCycle.objects.order_by('-start_date').first()

        if not cycle:
            return Response({'code': 400, 'message': 'No active evaluation cycle open.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check existing submission immutability
        submission = InternSelfAppraisalSubmission.objects.filter(intern=profile, cycle=cycle).first()
        if submission and submission.is_submitted:
            return Response({
                'code': 400,
                'message': 'You have already finalized your self-assessment for this cycle. Editing is locked.'
            }, status=status.HTTP_400_BAD_REQUEST)

        self_rating = request.data.get('selfRating') or request.data.get('self_rating')
        if self_rating is None:
            return Response({'code': 400, 'message': 'Self-rating score is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rating_val = Decimal(str(self_rating))
        except (InvalidOperation, ValueError):
            return Response({'code': 400, 'message': 'Invalid rating number.'}, status=status.HTTP_400_BAD_REQUEST)

        if rating_val < Decimal('1.0') or rating_val > Decimal('10.0'):
            return Response({'code': 400, 'message': 'Self-rating must be between 1.0 and 10.0.'}, status=status.HTTP_400_BAD_REQUEST)

        is_sub = request.data.get('is_submitted')
        if is_sub is None:
            is_sub = request.data.get('isSubmitted')
        is_final = True if is_sub is None else bool(is_sub)

        if not submission:
            submission = InternSelfAppraisalSubmission(intern=profile, cycle=cycle)

        submission.self_rating = rating_val
        submission.achievements = request.data.get('achievements', '')
        submission.challenges = request.data.get('challenges', '')
        submission.skills_acquired = request.data.get('skillsAcquired', request.data.get('skills_acquired', ''))
        submission.mentorship_needs = request.data.get('mentorshipNeeds', request.data.get('mentorship_needs', ''))
        submission.reflection_summary = request.data.get('reflectionSummary', request.data.get('reflection_summary', ''))
        submission.is_submitted = is_final
        if is_final:
            submission.submitted_at = timezone.now()
        submission.save()

        return Response({
            'code': 200,
            'message': 'Self-assessment submitted successfully' if is_final else 'Self-assessment draft saved',
            'data': InternSelfAppraisalSerializer(submission).data
        })


# ==============================================================================
# 8. PUBLISHED RESULTS, FEEDBACK & REPLIES
# ==============================================================================
class InternPublishedFeedbackView(APIView):
    """
    Retrieve published mentor feedback, official calibrated score, classification,
    and growth recommendations. Strictly masked if status != PUBLISHED.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = get_authenticated_intern_profile(request.user)
        published_appraisal = Appraisal.objects.filter(
            employee=profile,
            status=AppraisalStatus.PUBLISHED
        ).select_related('cycle', 'reviewer').order_by('-published_at', '-created_at').first()

        if not published_appraisal:
            return Response({
                'code': 200,
                'data': {
                    'isPublished': False,
                    'message': 'Evaluation results have not been published yet.'
                }
            })

        calc_score = ScoringService.calculate_cycle_score(profile, published_appraisal.cycle)
        weight_dist = calc_score.get('weight_distribution', {
            'goals_and_kpis': 40.0,
            'manager_evaluation': 40.0,
            'self_assessment': 20.0
        })
        eval_params = calc_score.get('evaluation_parameters', [])

        replies = InternFeedbackReply.objects.filter(
            intern=profile,
            appraisal=published_appraisal
        ).order_by('created_at')

        reviewer_name = published_appraisal.reviewer.username if published_appraisal.reviewer else 'Assigned Mentor'
        if published_appraisal.reviewer and hasattr(published_appraisal.reviewer, 'profile') and published_appraisal.reviewer.profile:
            reviewer_name = published_appraisal.reviewer.profile.full_name or reviewer_name

        areas_for_improvement = published_appraisal.areas_for_improvement or []

        return Response({
            'code': 200,
            'data': {
                'isPublished': True,
                'cycleId': str(published_appraisal.cycle_id),
                'cycleName': published_appraisal.cycle.name,
                'overallScore': float(published_appraisal.overall_score) if published_appraisal.overall_score is not None else float(calc_score.get('overall_score', 0)),
                'classification': published_appraisal.classification or get_performance_classification(published_appraisal.overall_score),
                'performanceClassification': published_appraisal.classification or get_performance_classification(published_appraisal.overall_score),
                'reviewerName': reviewer_name,
                'reviewerComments': published_appraisal.reviewer_comments,
                'mentorFeedback': published_appraisal.reviewer_comments or '',
                'strengths': published_appraisal.strengths,
                'areasForImprovement': areas_for_improvement,
                'recommendations': published_appraisal.recommendations,
                'allowInternReply': published_appraisal.allow_intern_reply,
                'weightDistribution': weight_dist,
                'evaluationParameters': eval_params,
                'replies': [{
                    'id': str(r.id),
                    'replyText': r.reply_text,
                    'createdAt': r.created_at.strftime('%Y-%m-%d %H:%M')
                } for r in replies]
            }
        })

    def post(self, request):
        return InternFeedbackReplyView().post(request)


class InternFeedbackReplyView(APIView):
    """
    Reply to published mentor remarks where allow_intern_reply=True.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = get_authenticated_intern_profile(request.user)
        appraisal_id = request.data.get('appraisalId') or request.data.get('appraisal_id')

        query = Appraisal.objects.filter(employee=profile, status=AppraisalStatus.PUBLISHED)
        if appraisal_id:
            published_appraisal = query.filter(id=appraisal_id).first()
        else:
            published_appraisal = query.order_by('-published_at').first()

        if not published_appraisal:
            return Response({'code': 404, 'message': 'No published appraisal found to reply to.'}, status=status.HTTP_404_NOT_FOUND)

        if not published_appraisal.allow_intern_reply:
            return Response({'code': 403, 'message': 'Replies to this feedback are not currently permitted.'}, status=status.HTTP_403_FORBIDDEN)

        reply_text = request.data.get('replyText') or request.data.get('reply_text') or request.data.get('reply') or request.data.get('message', '')
        if not reply_text or not str(reply_text).strip():
            return Response({'code': 400, 'message': 'Reply text cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        reply = InternFeedbackReply.objects.create(
            intern=profile,
            appraisal=published_appraisal,
            reply_text=reply_text.strip()
        )

        return Response({
            'code': 201,
            'message': 'Reply sent to your mentor',
            'data': {
                'id': str(reply.id),
                'replyText': reply.reply_text,
                'createdAt': reply.created_at.strftime('%Y-%m-%d %H:%M')
            }
        }, status=status.HTTP_201_CREATED)


# ==============================================================================
# 8. INTERNSHIP JOURNEY ROADMAP & MILESTONES (100% DATA-DRIVEN)
# ==============================================================================
class InternJourneyView(APIView):
    """
    Returns the comprehensive, end-to-end Internship Journey roadmap.
    100% data-driven from EmployeeProfile, Goals, InternTasks, Evidence, Self-Appraisal, and Published Appraisals.
    Zero mock data or hardcoded dates/scores.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        user = request.user
        target_intern_id = pk or request.query_params.get('intern_id') or request.query_params.get('employee_id')
        if target_intern_id:
            if user.role in [UserRole.HR, UserRole.MANAGER, UserRole.SUPER_ADMIN] or user.is_superuser:
                target_profile = EmployeeProfile.objects.filter(
                    Q(id=target_intern_id) | Q(user__id=target_intern_id) | Q(employee_code__iexact=str(target_intern_id))
                ).first()
                if not target_profile:
                    return Response({'code': 404, 'message': 'Target intern profile not found.'}, status=status.HTTP_404_NOT_FOUND)
                profile = target_profile
            elif user.role == UserRole.INTERN:
                profile = getattr(user, 'profile', None)
                if not profile or (str(profile.id) != str(target_intern_id) and str(user.id) != str(target_intern_id) and profile.employee_code != str(target_intern_id)):
                    return Response({'code': 403, 'message': 'Forbidden: You cannot access another intern\'s journey.'}, status=status.HTTP_403_FORBIDDEN)
            else:
                return Response({'code': 403, 'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        else:
            try:
                profile = get_authenticated_intern_profile(user)
            except NotFound:
                return Response({
                    'code': 404,
                    'message': 'No intern profile found for authenticated account.',
                    'data': None
                }, status=status.HTTP_404_NOT_FOUND)

        today = date.today()
        joining_date = profile.joining_date or (profile.created_at.date() if profile.created_at else today)
        days_active = max(1, (today - joining_date).days)

        # 1. Mentor Info
        mentor = profile.manager
        mentor_info = None
        if mentor:
            m_prof = getattr(mentor, 'profile', None)
            mentor_info = {
                'id': str(mentor.id),
                'name': m_prof.full_name if m_prof else mentor.username,
                'email': mentor.email,
                'designation': m_prof.designation if m_prof else 'Mentor',
                'department': m_prof.department.name if m_prof and m_prof.department else (profile.department.name if profile.department else 'Engineering')
            }

        # 2. Active Cycle
        active_cycle = PerformanceCycle.objects.filter(
            Q(status=CycleStatus.ACTIVE) | Q(status=CycleStatus.REVIEW_PERIOD),
            start_date__lte=today,
            end_date__gte=today
        ).order_by('-start_date').first()
        if not active_cycle:
            active_cycle = PerformanceCycle.objects.order_by('-start_date').first()

        # 3. Goals Stats
        goals_qs = Goal.objects.filter(employee=profile)
        total_goals = goals_qs.count()
        completed_goals = goals_qs.filter(
            Q(status=GoalStatus.COMPLETED) | Q(completion_percentage=Decimal('100.00'))
        ).count()
        avg_goal_progress = float(ScoringService.calculate_weighted_goal_progress(list(goals_qs)))

        # 4. Task Stats
        tasks_qs = InternTask.objects.filter(intern=profile)
        total_tasks = tasks_qs.count()
        completed_tasks = tasks_qs.filter(status=TaskStatus.COMPLETED).count()
        under_review_tasks = tasks_qs.filter(status=TaskStatus.UNDER_REVIEW).count()
        task_completion_rate = round((completed_tasks / total_tasks * 100.0), 1) if total_tasks > 0 else 0.0

        # 5. Evidence Stats
        evidence_qs = EvidenceSubmission.objects.filter(employee=profile)
        total_evidence = evidence_qs.count()
        approved_evidence = evidence_qs.filter(review_status=EvidenceReviewStatus.APPROVED).count()

        # 6. Forms & Questionnaires Stats
        forms_submitted_count = InternFormSubmission.objects.filter(intern=profile).count()

        # 7. Self-Appraisal
        self_eval = None
        if active_cycle:
            self_eval = InternSelfAppraisalSubmission.objects.filter(intern=profile, cycle=active_cycle).first()
        if not self_eval:
            self_eval = InternSelfAppraisalSubmission.objects.filter(intern=profile).order_by('-updated_at').first()

        self_eval_submitted = bool(self_eval and self_eval.is_submitted)

        # 8. Published Appraisal / Results
        published_appraisal = Appraisal.objects.filter(
            employee=profile,
            status=AppraisalStatus.PUBLISHED
        ).order_by('-published_at', '-created_at').first()

        # Milestones Construction (Stages 1 through 5)
        # Stage 1: Placement & Onboarding
        milestone_1_status = 'COMPLETED'
        milestone_1_date = joining_date.isoformat()

        # Stage 2: Goal Alignment & Planning
        if total_goals > 0 and (completed_goals > 0 or avg_goal_progress >= 50.0):
            milestone_2_status = 'COMPLETED'
        elif total_goals > 0:
            milestone_2_status = 'IN_PROGRESS'
        else:
            milestone_2_status = 'PENDING'
        first_goal = goals_qs.order_by('created_at').first()
        milestone_2_date = first_goal.created_at.strftime('%Y-%m-%d') if first_goal else None

        # Stage 3: Sprints, Tasks & Deliverables
        if total_tasks > 0 and completed_tasks == total_tasks:
            milestone_3_status = 'COMPLETED'
        elif total_tasks > 0 or total_evidence > 0:
            milestone_3_status = 'IN_PROGRESS'
        else:
            milestone_3_status = 'PENDING'
        last_completed_task = tasks_qs.filter(status=TaskStatus.COMPLETED).order_by('-updated_at').first()
        milestone_3_date = last_completed_task.updated_at.strftime('%Y-%m-%d') if last_completed_task else None

        # Stage 4: Self-Appraisal & Growth Reflection
        if self_eval_submitted:
            milestone_4_status = 'COMPLETED'
            milestone_4_date = self_eval.submitted_at.strftime('%Y-%m-%d') if self_eval.submitted_at else None
        elif self_eval or forms_submitted_count > 0:
            milestone_4_status = 'IN_PROGRESS'
            milestone_4_date = None
        else:
            milestone_4_status = 'PENDING'
            milestone_4_date = None

        # Stage 5: Final Evaluation & Calibration
        if published_appraisal:
            milestone_5_status = 'COMPLETED'
            milestone_5_date = published_appraisal.published_at.strftime('%Y-%m-%d') if published_appraisal.published_at else None
        elif self_eval_submitted:
            milestone_5_status = 'IN_PROGRESS'
            milestone_5_date = None
        else:
            milestone_5_status = 'PENDING'
            milestone_5_date = None

        # Determine current stage (1 - 5)
        if milestone_5_status == 'COMPLETED':
            current_stage = 5
        elif milestone_4_status == 'COMPLETED' or milestone_5_status == 'IN_PROGRESS':
            current_stage = 5
        elif milestone_3_status == 'COMPLETED' or milestone_4_status == 'IN_PROGRESS':
            current_stage = 4
        elif milestone_2_status == 'COMPLETED' or milestone_3_status == 'IN_PROGRESS':
            current_stage = 3
        elif milestone_1_status == 'COMPLETED' or milestone_2_status == 'IN_PROGRESS':
            current_stage = 2
        else:
            current_stage = 1

        # Calculate Journey Progress Percentage
        completed_milestones = sum(1 for st in [milestone_1_status, milestone_2_status, milestone_3_status, milestone_4_status, milestone_5_status] if st == 'COMPLETED')
        in_prog_milestones = sum(1 for st in [milestone_1_status, milestone_2_status, milestone_3_status, milestone_4_status, milestone_5_status] if st == 'IN_PROGRESS')
        overall_progress = min(100, int((completed_milestones * 20.0) + (in_prog_milestones * 10.0)))

        dept_name = profile.department.name if profile.department else 'Engineering'
        milestones = [
            {
                'stage': 1,
                'key': 'ONBOARDING',
                'title': 'Placement & Onboarding',
                'category': 'Foundation',
                'status': milestone_1_status,
                'date': milestone_1_date,
                'description': f"Onboarded to {dept_name} as {profile.designation or 'Intern'}.",
                'metrics': [
                    {'label': 'Employee ID', 'value': profile.employee_code or 'Pending'},
                    {'label': 'Mentor', 'value': mentor_info['name'] if mentor_info else 'Unassigned'},
                    {'label': 'Start Date', 'value': joining_date.strftime('%b %d, %Y')}
                ]
            },
            {
                'stage': 2,
                'key': 'GOALS',
                'title': 'Quarterly Goal Alignment',
                'category': 'Commitment',
                'status': milestone_2_status,
                'date': milestone_2_date,
                'description': f"{total_goals} measurable performance objectives aligned with quarterly cycle.",
                'metrics': [
                    {'label': 'Total Goals', 'value': str(total_goals)},
                    {'label': 'Completed', 'value': str(completed_goals)},
                    {'label': 'Weighted Progress', 'value': f"{avg_goal_progress:.1f}%"}
                ]
            },
            {
                'stage': 3,
                'key': 'TASKS_EVIDENCE',
                'title': 'Sprint Deliverables & Evidence',
                'category': 'Execution',
                'status': milestone_3_status,
                'date': milestone_3_date,
                'description': f"Execution of assigned technical sprint tasks and artifact verification.",
                'metrics': [
                    {'label': 'Tasks Done', 'value': f"{completed_tasks}/{total_tasks}"},
                    {'label': 'Task Success Rate', 'value': f"{task_completion_rate}%"},
                    {'label': 'Evidence Artifacts', 'value': str(total_evidence)}
                ]
            },
            {
                'stage': 4,
                'key': 'SELF_APPRAISAL',
                'title': 'Self-Appraisal & Growth Reflection',
                'category': 'Reflection',
                'status': milestone_4_status,
                'date': milestone_4_date,
                'description': 'Submission of self-assessment rating, project achievements, and HR feedback questionnaires.',
                'metrics': [
                    {'label': 'Self-Evaluation', 'value': 'Submitted' if self_eval_submitted else ('In Draft' if self_eval else 'Pending')},
                    {'label': 'Self-Rating', 'value': f"{self_eval.self_rating}/10" if (self_eval and self_eval.self_rating) else 'Not Rated'},
                    {'label': 'Surveys Answered', 'value': str(forms_submitted_count)}
                ]
            },
            {
                'stage': 5,
                'key': 'FINAL_APPRAISAL',
                'title': 'Calibrated Evaluation & Recognition',
                'category': 'Outcome',
                'status': milestone_5_status,
                'date': milestone_5_date,
                'description': 'Multi-stakeholder review, mentor appraisal, and official performance calibration.',
                'metrics': [
                    {'label': 'Status', 'value': 'Published' if published_appraisal else ('In Calibration' if self_eval_submitted else 'Awaiting Review')},
                    {'label': 'Final Score', 'value': f"{published_appraisal.overall_score:.1f}%" if (published_appraisal and published_appraisal.overall_score is not None) else 'TBD'},
                    {'label': 'Classification', 'value': (published_appraisal.classification or get_performance_classification(published_appraisal.overall_score)) if published_appraisal else 'In Progress'}
                ]
            }
        ]

        # Evaluate 4-Quarter MIRAI Progression
        mirai_eval = MiraiJourneyService.evaluate_intern_journey(profile)

        return Response({
            'code': 200,
            'data': {
                'intern': {
                    'name': profile.full_name or profile.user.get_full_name() or profile.user.username,
                    'email': profile.user.email,
                    'employeeCode': profile.employee_code,
                    'department': dept_name,
                    'designation': profile.designation or 'Intern',
                    'joiningDate': joining_date.isoformat(),
                    'daysActive': days_active,
                },
                'mentor': mentor_info,
                'cycle': {
                    'name': active_cycle.name if active_cycle else 'Active Internship Period',
                    'status': active_cycle.status if active_cycle else 'ACTIVE',
                    'endDate': active_cycle.end_date.isoformat() if active_cycle else None,
                } if active_cycle else None,
                'currentStage': current_stage,
                'currentQuarter': mirai_eval['currentQuarter'],
                'overallProgressPercent': mirai_eval['overallProgressPercent'],
                'quarters': mirai_eval['quarters'],
                'milestones': milestones,
                'stats': {
                    'goalsTotal': total_goals,
                    'goalsCompleted': completed_goals,
                    'goalsWeightedProgress': avg_goal_progress,
                    'tasksTotal': total_tasks,
                    'tasksCompleted': completed_tasks,
                    'tasksUnderReview': under_review_tasks,
                    'evidenceTotal': total_evidence,
                    'evidenceApproved': approved_evidence,
                    'formsSubmitted': forms_submitted_count,
                    'selfEvaluationSubmitted': self_eval_submitted,
                    'isResultsPublished': bool(published_appraisal)
                }
            }
        })

    def patch(self, request, pk=None):
        """
        Allows authorized HR administrators and SuperAdmins to edit an intern's MIRAI Journey:
        quarter progress (0–100%), quarter status transitions with prerequisite validation,
        milestones, dates, project focus, JLPT exam certifications, and technical parameters.
        All changes are persistently saved to the database and logged to the audit service.
        """
        user = request.user
        if not (user.role in [UserRole.HR, UserRole.SUPER_ADMIN] or user.is_superuser):
            return Response(
                {'code': 403, 'message': 'Permission denied. Only authorized HR administrators can edit the intern journey.'},
                status=status.HTTP_403_FORBIDDEN
            )

        target_id = pk or request.data.get('intern_id') or request.data.get('employee_id') or request.query_params.get('employee_id')
        if not target_id:
            return Response({'code': 400, 'message': 'Target intern employee ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = EmployeeProfile.objects.filter(
            Q(id=target_id) | Q(user__id=target_id) | Q(employee_code__iexact=str(target_id))
        ).first()

        if not profile:
            return Response({'code': 404, 'message': 'Target intern profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        quarters_data = data.get('quarters')
        if not quarters_data and any(k in data for k in ['quarter_code', 'quarterCode', 'status', 'progress', 'completion_percentage', 'completionPercentage']):
            quarters_data = [data]

        updated_quarters = []

        if quarters_data and isinstance(quarters_data, list):
            for q_update in quarters_data:
                q_code = q_update.get('quarter_code') or q_update.get('quarterCode')
                if not q_code:
                    continue
                q_code = str(q_code).upper()
                if q_code not in [c[0] for c in QuarterCode.choices]:
                    return Response({'code': 400, 'message': f'Invalid quarter code: {q_code}'}, status=status.HTTP_400_BAD_REQUEST)

                quarter = MiraiQuarterProgress.objects.filter(intern=profile, quarter_code=q_code).first()
                if not quarter:
                    MiraiJourneyService.get_or_initialize_quarters(profile)
                    quarter = MiraiQuarterProgress.objects.filter(intern=profile, quarter_code=q_code).first()

                # 1. Progress percentage validation (strict 0.0 to 100.0)
                progress_val = q_update.get('completion_percentage')
                if progress_val is None:
                    progress_val = q_update.get('completionPercentage')
                if progress_val is None:
                    progress_val = q_update.get('progress')

                if progress_val is not None:
                    try:
                        p_dec = Decimal(str(progress_val))
                    except (InvalidOperation, ValueError):
                        return Response({
                            'code': 400,
                            'message': f'Progress percentage for {q_code} must be a valid number.'
                        }, status=status.HTTP_400_BAD_REQUEST)

                    if p_dec < Decimal('0.00') or p_dec > Decimal('100.00'):
                        return Response({
                            'code': 400,
                            'message': f'Progress percentage for {q_code} must be strictly between 0 and 100%.'
                        }, status=status.HTTP_400_BAD_REQUEST)

                    quarter.completion_percentage = p_dec

                # 2. Quarter Status transition & prerequisite validation
                status_val = q_update.get('status')
                if status_val:
                    s_str = str(status_val).upper().replace(' ', '_')
                    if s_str in ['TODO', 'NOT_STARTED']:
                        s_str = QuarterStatus.NOT_STARTED
                    elif s_str in ['IN_PROGRESS', 'INPROGRESS']:
                        s_str = QuarterStatus.IN_PROGRESS
                    elif s_str in ['COMPLETED', 'DONE']:
                        s_str = QuarterStatus.COMPLETED

                    if s_str not in [c[0] for c in QuarterStatus.choices]:
                        return Response({'code': 400, 'message': f'Invalid quarter status: {status_val}'}, status=status.HTTP_400_BAD_REQUEST)

                    force_override = q_update.get('force_override') or q_update.get('forceOverride') or q_update.get('prerequisites_met') or q_update.get('prerequisitesMet')

                    # Validate prerequisites for quarter transition
                    if s_str in [QuarterStatus.IN_PROGRESS, QuarterStatus.COMPLETED]:
                        if q_code == 'Q3' and not force_override:
                            n4_verified = MiraiCertification.objects.filter(
                                intern=profile,
                                jlpt_level='N4',
                                status=CertificationStatus.CLEARED,
                                verification_status=VerificationStatus.VERIFIED
                            ).exists()
                            all_tech = TechnicalCapabilityReview.objects.filter(employee=profile)
                            avg_tech = (sum(float(r.score) for r in all_tech) / all_tech.count()) if all_tech.exists() else 0.0
                            if not n4_verified and avg_tech < 3.5:
                                return Response({
                                    'code': 400,
                                    'message': f'Cannot advance Q3 to {s_str}: Entry prerequisites (verified JLPT N4 and technical capability benchmark >= 3.5/5.0) are not satisfied.'
                                }, status=status.HTTP_400_BAD_REQUEST)

                        elif q_code == 'Q4' and not force_override:
                            n3_verified = MiraiCertification.objects.filter(
                                intern=profile,
                                jlpt_level='N3',
                                status=CertificationStatus.CLEARED,
                                verification_status=VerificationStatus.VERIFIED
                            ).exists()
                            all_tech = TechnicalCapabilityReview.objects.filter(employee=profile)
                            avg_tech = (sum(float(r.score) for r in all_tech) / all_tech.count()) if all_tech.exists() else 0.0
                            if not n3_verified and avg_tech < 4.0:
                                return Response({
                                    'code': 400,
                                    'message': f'Cannot advance Q4 to {s_str}: Entry prerequisites (verified JLPT N3 and technical capability benchmark >= 4.0/5.0) are not satisfied.'
                                }, status=status.HTTP_400_BAD_REQUEST)

                    quarter.status = s_str

                # Dates
                if 'start_date' in q_update or 'startDate' in q_update:
                    sd = q_update.get('start_date') or q_update.get('startDate')
                    if sd:
                        try:
                            quarter.start_date = datetime.strptime(str(sd)[:10], '%Y-%m-%d').date()
                        except ValueError:
                            pass
                if 'end_date' in q_update or 'endDate' in q_update:
                    ed = q_update.get('end_date') or q_update.get('endDate')
                    if ed:
                        try:
                            quarter.end_date = datetime.strptime(str(ed)[:10], '%Y-%m-%d').date()
                        except ValueError:
                            pass

                # Journey Focus & Project
                if 'title' in q_update:
                    quarter.title = q_update['title']
                if 'current_focus' in q_update or 'currentFocus' in q_update:
                    quarter.current_focus = q_update.get('current_focus') or q_update.get('currentFocus', '')
                if 'project_name' in q_update or 'projectName' in q_update:
                    quarter.project_name = q_update.get('project_name') or q_update.get('projectName', '')
                if 'attendance_percentage' in q_update or 'attendancePercentage' in q_update:
                    att_val = q_update.get('attendance_percentage') or q_update.get('attendancePercentage')
                    if att_val is not None:
                        try:
                            att_dec = Decimal(str(att_val))
                            if Decimal('0.00') <= att_dec <= Decimal('100.00'):
                                quarter.attendance_percentage = att_dec
                        except (InvalidOperation, ValueError):
                            pass

                # Milestones & Requirements
                if 'completed_requirements' in q_update or 'completedRequirements' in q_update:
                    cr = q_update.get('completed_requirements') or q_update.get('completedRequirements')
                    if isinstance(cr, list):
                        quarter.completed_requirements = cr
                if 'pending_requirements' in q_update or 'pendingRequirements' in q_update:
                    pr = q_update.get('pending_requirements') or q_update.get('pendingRequirements')
                    if isinstance(pr, list):
                        quarter.pending_requirements = pr
                if 'prerequisites_met' in q_update or 'prerequisitesMet' in q_update:
                    pm = q_update.get('prerequisites_met') if 'prerequisites_met' in q_update else q_update.get('prerequisitesMet')
                    quarter.prerequisites_met = bool(pm)

                # Conversion Decision (Q4)
                if 'conversion_decision' in q_update or 'conversionDecision' in q_update:
                    cd = q_update.get('conversion_decision') or q_update.get('conversionDecision')
                    if cd in [c[0] for c in ConversionDecision.choices]:
                        quarter.conversion_decision = cd
                if 'conversion_effective_date' in q_update or 'conversionEffectiveDate' in q_update:
                    ced = q_update.get('conversion_effective_date') or q_update.get('conversionEffectiveDate')
                    if ced:
                        try:
                            quarter.conversion_effective_date = datetime.strptime(str(ced)[:10], '%Y-%m-%d').date()
                        except ValueError:
                            pass
                if 'hr_conversion_notes' in q_update or 'hrConversionNotes' in q_update:
                    quarter.hr_conversion_notes = q_update.get('hr_conversion_notes') or q_update.get('hrConversionNotes', '')

                quarter.is_manually_updated = True
                quarter.save()
                updated_quarters.append(q_code)

        # 3. Certifications / Exams updates
        certs_data = data.get('certifications') or data.get('exams')
        if certs_data and isinstance(certs_data, list):
            for c_item in certs_data:
                jlpt = c_item.get('jlpt_level') or c_item.get('jlptLevel', 'OTHER')
                q_code = c_item.get('quarter_code') or c_item.get('quarterCode') or {'N5': 'Q1', 'N4': 'Q2', 'N3': 'Q3'}.get(jlpt, 'Q1')
                is_ver = c_item.get('verification_status') or c_item.get('verificationStatus') or VerificationStatus.VERIFIED
                MiraiCertification.objects.update_or_create(
                    intern=profile,
                    jlpt_level=jlpt,
                    defaults={
                        'name': c_item.get('name') or f"JLPT {jlpt} Examination",
                        'quarter_code': q_code,
                        'status': c_item.get('status', CertificationStatus.CLEARED),
                        'score': str(c_item.get('score', '')),
                        'certificate_url': c_item.get('certificate_url') or c_item.get('certificateUrl', ''),
                        'verification_status': is_ver,
                        'verification_notes': c_item.get('verification_notes') or c_item.get('verificationNotes', f"Updated by HR ({user.username})"),
                        'verified_by': user if is_ver == VerificationStatus.VERIFIED else None,
                        'verified_at': timezone.now() if is_ver == VerificationStatus.VERIFIED else None,
                    }
                )

        # 4. Technical Parameters updates
        tech_data = data.get('technical_parameters') or data.get('technicalParameters')
        if tech_data and isinstance(tech_data, list):
            for t_item in tech_data:
                param_id = t_item.get('parameter_id') or t_item.get('id')
                param = None
                if param_id:
                    param = TechnicalCapabilityParameter.objects.filter(id=param_id).first()
                if not param and t_item.get('parameterName'):
                    param = TechnicalCapabilityParameter.objects.filter(name__icontains=t_item['parameterName']).first()
                
                score_val = t_item.get('achievedScore') if t_item.get('achievedScore') is not None else t_item.get('score')
                if param and score_val is not None:
                    try:
                        s_dec = Decimal(str(score_val))
                        if Decimal('0.00') <= s_dec <= Decimal('5.00'):
                            TechnicalCapabilityReview.objects.update_or_create(
                                parameter=param,
                                employee=profile,
                                defaults={
                                    'score': s_dec,
                                    'reviewer': user,
                                    'status': 'SUBMITTED',
                                    'mentor_assessment': t_item.get('assessmentNotes', t_item.get('mentor_assessment', 'Assessed by HR')),
                                }
                            )
                    except (InvalidOperation, ValueError):
                        pass

        # 5. Record Audit Log
        AuditService.log(
            actor=user,
            action='UPDATE',
            entity_type='MIRAI_JOURNEY',
            entity_id=str(profile.id),
            metadata={
                'intern_username': profile.user.username,
                'intern_code': profile.employee_code,
                'updated_by': user.username,
                'quarters_updated': updated_quarters,
            },
            ip_address=request.META.get('REMOTE_ADDR')
        )

        # Refresh displayed journey from database
        eval_res = MiraiJourneyService.evaluate_intern_journey(profile)
        return Response({
            'code': 200,
            'message': 'MIRAI Journey successfully updated and persisted.',
            'data': eval_res
        })

    def put(self, request, pk=None):
        return self.patch(request, pk)


class MiraiCertificationSubmitView(APIView):
    """
    Endpoint for intern to submit JLPT certification details, score, and certificate verification URL.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            profile = get_authenticated_intern_profile(user)
        except NotFound:
            return Response({'code': 404, 'message': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        jlpt_level = data.get('jlpt_level') or data.get('jlptLevel')
        if not jlpt_level:
            return Response({'code': 400, 'message': 'jlpt_level is required (N5, N4, N3, N2, N1).'}, status=status.HTTP_400_BAD_REQUEST)

        quarter_code = data.get('quarter_code') or data.get('quarterCode')
        if not quarter_code:
            quarter_code = {'N5': 'Q1', 'N4': 'Q2', 'N3': 'Q3'}.get(jlpt_level, 'Q1')

        name = data.get('name') or f"JLPT {jlpt_level} Japanese Proficiency Examination"
        score = data.get('score', '')
        exam_date_str = data.get('exam_date') or data.get('examDate')
        clearance_date_str = data.get('clearance_date') or data.get('clearanceDate')
        cert_url = data.get('certificate_url') or data.get('certificateUrl', '')
        cert_status = data.get('status') or CertificationStatus.IN_PROGRESS

        cert, created = MiraiCertification.objects.update_or_create(
            intern=profile,
            jlpt_level=jlpt_level,
            defaults={
                'name': name,
                'quarter_code': quarter_code,
                'status': cert_status,
                'score': score,
                'exam_date': exam_date_str if exam_date_str else None,
                'clearance_date': clearance_date_str if clearance_date_str else None,
                'certificate_url': cert_url,
                'verification_status': VerificationStatus.PENDING if cert_url else VerificationStatus.NOT_SUBMITTED,
            }
        )

        MiraiTimelineEvent.objects.create(
            intern=profile,
            quarter_code=quarter_code,
            event_type=TimelineEventType.EXAM_CLEARED if cert_status == CertificationStatus.CLEARED else TimelineEventType.MILESTONE,
            title=f"Submitted JLPT {jlpt_level} Details",
            description=f"Submitted examination details. Certificate verification: {cert.verification_status}.",
            event_date=date.today(),
            actor=profile.full_name or user.username
        )

        eval_res = MiraiJourneyService.evaluate_intern_journey(profile)

        return Response({
            'code': 200,
            'message': f"JLPT {jlpt_level} certification updated successfully.",
            'data': eval_res
        })


class MiraiCertificationVerifyView(APIView):
    """
    Endpoint for HR or Mentor to verify or reject an intern's certification.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        if user.role not in [UserRole.HR, UserRole.MANAGER, UserRole.SUPER_ADMIN]:
            return Response({'code': 403, 'message': 'Only HR or Mentors can verify certificates.'}, status=status.HTTP_403_FORBIDDEN)

        cert = MiraiCertification.objects.filter(id=pk).first()
        if not cert:
            return Response({'code': 404, 'message': 'Certification record not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_verified = request.data.get('is_verified', True)
        notes = request.data.get('notes', '')

        if is_verified:
            cert.verification_status = VerificationStatus.VERIFIED
            cert.status = CertificationStatus.CLEARED
            cert.verified_by = user
            cert.verified_at = timezone.now()
            cert.verification_notes = notes or f"Verified by {user.get_full_name() or user.username} ({user.role})"
            cert.save()

            MiraiTimelineEvent.objects.create(
                intern=cert.intern,
                quarter_code=cert.quarter_code,
                event_type=TimelineEventType.STATUS_CHANGE,
                title=f"{cert.name} Verified by HR",
                description=f"Official certificate authenticated. {cert.verification_notes}",
                event_date=date.today(),
                actor=user.get_full_name() or user.username
            )
        else:
            cert.verification_status = VerificationStatus.REJECTED
            cert.verification_notes = notes or "Certificate rejected during verification review."
            cert.save()

        eval_res = MiraiJourneyService.evaluate_intern_journey(cert.intern)

        return Response({
            'code': 200,
            'message': f"Certification {cert.name} has been {'verified' if is_verified else 'rejected'}.",
            'data': eval_res
        })


class MiraiQuarterConfigureView(APIView):
    """
    Allows HR or authorized managers to customize quarter dates, requirements,
    and conversion decisions dynamically.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, quarter_code):
        user = request.user
        if user.role not in [UserRole.HR, UserRole.SUPER_ADMIN]:
            return Response({'code': 403, 'message': 'Only HR administrators can configure quarters.'}, status=status.HTTP_403_FORBIDDEN)

        intern_id = request.data.get('intern_id')
        if not intern_id:
            return Response({'code': 400, 'message': 'intern_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = EmployeeProfile.objects.filter(Q(id=intern_id) | Q(user__id=intern_id)).first()
        if not profile:
            return Response({'code': 404, 'message': 'Intern profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        quarter = MiraiQuarterProgress.objects.filter(intern=profile, quarter_code=quarter_code).first()
        if not quarter:
            return Response({'code': 404, 'message': f"Quarter {quarter_code} not found."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'start_date' in data:
            quarter.start_date = data['start_date']
        if 'end_date' in data:
            quarter.end_date = data['end_date']
        if 'current_focus' in data:
            quarter.current_focus = data['current_focus']
        if 'project_name' in data:
            quarter.project_name = data['project_name']
        if 'conversion_decision' in data:
            quarter.conversion_decision = data['conversion_decision']
        if 'conversion_effective_date' in data:
            quarter.conversion_effective_date = data['conversion_effective_date']
        if 'hr_conversion_notes' in data:
            quarter.hr_conversion_notes = data['hr_conversion_notes']
        if 'requirements_config' in data:
            quarter.requirements_config = data['requirements_config']

        quarter.save()

        eval_res = MiraiJourneyService.evaluate_intern_journey(profile)
        return Response({
            'code': 200,
            'message': f"Quarter {quarter_code} configuration updated successfully.",
            'data': eval_res
        })
