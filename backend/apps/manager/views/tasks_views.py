from decimal import Decimal
import uuid
from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.goals.models import Goal, KPI, GoalProgress, GoalStatus, GoalPriority, Project, ProjectStatus
from apps.performance.models import PerformanceCycle
from apps.employees.models import EmployeeProfile
from .base import IsManagerUser, get_manager_reports_qs


# =====================================================================
# TM-02: MULTI-PROJECT & MILESTONE DEFINITION
# =====================================================================
class ManagerProjectsView(APIView):
    """
    Feature TM-02: Multi-Project & Milestone Definition
    Mentors establish engineering projects with milestones, objectives, tech stacks,
    and deliverables per intern cohort.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        cohort_filter = request.query_params.get('cohort')
        status_filter = request.query_params.get('status')

        projects = Project.objects.select_related('owner', 'department').prefetch_related('tasks').all()
        if cohort_filter:
            projects = projects.filter(target_cohort__icontains=cohort_filter)
        if status_filter and status_filter.upper() != 'ALL':
            projects = projects.filter(status=status_filter.upper())

        data = []
        for p in projects:
            child_tasks = p.tasks.all()
            total_tasks = child_tasks.count()
            completed_tasks = child_tasks.filter(status=GoalStatus.COMPLETED).count()
            blocked_tasks = child_tasks.filter(is_blocked=True).count()
            completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

            data.append({
                'id': str(p.id),
                'title': p.title,
                'code': p.code,
                'description': p.description,
                'techStack': p.tech_stack or [],
                'targetCohort': p.target_cohort,
                'status': p.status,
                'statusDisplay': p.get_status_display(),
                'ownerName': p.owner.username if p.owner else 'Engineering Lead',
                'departmentName': p.department.name if p.department else 'Engineering',
                'milestones': p.milestones or [],
                'startDate': str(p.start_date) if p.start_date else None,
                'endDate': str(p.end_date) if p.end_date else None,
                'totalTasks': total_tasks,
                'completedTasks': completed_tasks,
                'blockedTasks': blocked_tasks,
                'completionRate': completion_rate,
                'createdAt': p.created_at.strftime('%Y-%m-%d %H:%M'),
            })

        return Response({
            'code': 200,
            'message': 'Projects retrieved successfully.',
            'data': data
        })

    def post(self, request):
        title = request.data.get('title', '').strip()
        code = request.data.get('code', '').strip().upper()
        description = request.data.get('description', '').strip()
        tech_stack = request.data.get('tech_stack') or request.data.get('techStack', [])
        target_cohort = request.data.get('target_cohort') or request.data.get('targetCohort', 'MIRAI Cohort 2026')
        milestones = request.data.get('milestones', [])
        start_date = request.data.get('start_date') or request.data.get('startDate')
        end_date = request.data.get('end_date') or request.data.get('endDate')

        if not title:
            return Response({'code': 400, 'message': 'Project title is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not code:
            code = f"PRJ-{uuid.uuid4().hex[:6].upper()}"

        if Project.objects.filter(code=code).exists():
            code = f"{code}-{uuid.uuid4().hex[:4].upper()}"

        eng_dept = None
        if hasattr(request.user, 'profile') and request.user.profile.department:
            eng_dept = request.user.profile.department

        project = Project.objects.create(
            title=title,
            code=code,
            description=description,
            tech_stack=tech_stack if isinstance(tech_stack, list) else [s.strip() for s in str(tech_stack).split(',') if s.strip()],
            target_cohort=target_cohort,
            status=ProjectStatus.ACTIVE,
            owner=request.user,
            department=eng_dept,
            milestones=milestones,
            start_date=start_date or timezone.localdate(),
            end_date=end_date,
        )

        return Response({
            'code': 201,
            'message': f'Project "{project.title}" ({project.code}) created successfully.',
            'data': {
                'id': str(project.id),
                'title': project.title,
                'code': project.code,
                'status': project.status,
            }
        }, status=status.HTTP_201_CREATED)

    def patch(self, request, pk):
        project = Project.objects.filter(id=pk).first()
        if not project:
            return Response({'code': 404, 'message': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status and hasattr(ProjectStatus, new_status.upper()):
            project.status = new_status.upper()

        if 'milestones' in request.data:
            project.milestones = request.data['milestones']

        project.save()
        return Response({
            'code': 200,
            'message': f'Project {project.title} updated.',
            'data': {'id': str(project.id), 'status': project.status}
        })


# =====================================================================
# TM-03: ASSIGN & MANAGE TASKS AND GOALS
# =====================================================================
class ManagerTasksView(APIView):
    """
    Feature TM-03: Task Allocation, Sprint Backlog & Priority Management
    Create, list, and manage assigned tasks and goals for mentees.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)
        report_ids = [p.id for p in direct_reports]

        tasks = Goal.objects.filter(
            Q(employee__id__in=report_ids) | Q(assigned_by=request.user)
        ).select_related(
            'employee__user', 'cycle', 'assigned_by', 'project'
        ).prefetch_related('kpis', 'progress_updates').distinct().order_by('-created_at')

        employee_param = request.query_params.get('employee_id') or request.query_params.get('employeeId')
        project_param = request.query_params.get('project_id') or request.query_params.get('projectId')
        status_param = request.query_params.get('status')
        priority_param = request.query_params.get('priority')
        blocked_param = request.query_params.get('is_blocked') or request.query_params.get('isBlocked')

        if employee_param:
            tasks = tasks.filter(
                Q(employee__id__iexact=str(employee_param)) |
                Q(employee__user__id__iexact=str(employee_param)) |
                Q(employee__employee_code__iexact=str(employee_param))
            )

        if project_param:
            tasks = tasks.filter(project__id=str(project_param))

        if status_param and status_param.upper() != 'ALL':
            tasks = tasks.filter(status=status_param.upper())

        if priority_param and priority_param.upper() != 'ALL':
            tasks = tasks.filter(priority=priority_param.upper())

        if blocked_param is not None:
            tasks = tasks.filter(is_blocked=str(blocked_param).lower() in ['true', '1'])

        today = timezone.localdate()
        data = []
        for t in tasks:
            kpi_item = t.kpis.first()
            is_overdue = bool(t.due_date and today > t.due_date and t.status != GoalStatus.COMPLETED)
            data.append({
                'id': str(t.id),
                'employeeId': str(t.employee.id),
                'employeeName': t.employee.full_name,
                'employeeCode': t.employee.employee_code,
                'employeeEmail': t.employee.user.email,
                'projectId': str(t.project.id) if t.project else None,
                'projectTitle': t.project.title if t.project else 'General Engineering Initiatives',
                'projectCode': t.project.code if t.project else 'PRJ-GEN',
                'title': t.title,
                'description': t.description,
                'expectedEvidenceType': t.expected_evidence_type or 'CODE_PR',
                'linkedCompetency': t.linked_competency or 'Technical Problem Solving & Debugging',
                'isBlocked': t.is_blocked,
                'blockedReason': t.blocked_reason,
                'isOverdue': is_overdue,
                'dueDate': t.due_date.strftime('%Y-%m-%d') if t.due_date else None,
                'status': t.status,
                'statusDisplay': t.get_status_display(),
                'priority': t.priority,
                'completionPercentage': float(t.completion_percentage),
                'assignedByName': (t.assigned_by.profile.full_name if hasattr(t.assigned_by, 'profile') else t.assigned_by.username) if t.assigned_by else 'Mentor',
                'kpi': {
                    'name': kpi_item.name if kpi_item else None,
                    'targetValue': float(kpi_item.target_value) if kpi_item else None,
                    'achievedValue': float(kpi_item.achieved_value) if kpi_item else None,
                    'unit': kpi_item.unit if kpi_item else '%',
                } if kpi_item else None,
                'progressUpdatesCount': t.progress_updates.count(),
                'createdAt': t.created_at.strftime('%Y-%m-%d %H:%M'),
            })

        return Response({
            'code': 200,
            'message': 'Tasks retrieved successfully.',
            'data': data
        })

    def post(self, request):
        """TM-03: Create and assign a new sprint task to an intern/employee."""
        emp_id = request.data.get('employee_id') or request.data.get('employeeId')
        project_id = request.data.get('project_id') or request.data.get('projectId')
        title = request.data.get('title', '').strip()
        description = request.data.get('description', '').strip()
        due_date = request.data.get('due_date') or request.data.get('dueDate')
        priority = request.data.get('priority', GoalPriority.MEDIUM).upper()
        target_value = request.data.get('target_value') or request.data.get('targetValue')
        unit = request.data.get('unit', '%')
        expected_evidence_type = request.data.get('expected_evidence_type') or request.data.get('expectedEvidenceType', 'CODE_PR')
        linked_competency = request.data.get('linked_competency') or request.data.get('linkedCompetency', 'Technical Problem Solving & Debugging')

        if not emp_id or not title:
            return Response(
                {'code': 400, 'message': 'employee_id and title are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        profile = EmployeeProfile.objects.filter(
            Q(id__iexact=str(emp_id)) |
            Q(user__id__iexact=str(emp_id)) |
            Q(employee_code__iexact=str(emp_id))
        ).first()

        if not profile:
            return Response({'code': 404, 'message': 'Intern/Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Parent Project Context Validation (TM-03: Tasks must strictly link to a parent project)
        project = None
        if project_id:
            project = Project.objects.filter(Q(id=str(project_id)) | Q(code__iexact=str(project_id))).first()

        if not project:
            project = Project.objects.filter(status=ProjectStatus.ACTIVE).first()

        if not project:
            project = Project.objects.create(
                title="MIRAI Core Engineering Sprints",
                code="PRJ-MIRAI-001",
                description="Core sprint development tasks for MIRAI interns.",
                target_cohort="MIRAI Cohort 2026",
                owner=request.user,
                status=ProjectStatus.ACTIVE
            )

        active_cycle = PerformanceCycle.objects.filter(status='ACTIVE').first() or PerformanceCycle.objects.first()
        if not active_cycle:
            today = timezone.localdate()
            active_cycle = PerformanceCycle.objects.create(
                name=f"Cycle {today.year}",
                start_date=today,
                end_date=today + timezone.timedelta(days=180),
                status='ACTIVE',
                created_by=request.user
            )

        if not due_date:
            due_date = timezone.localdate() + timezone.timedelta(days=14)

        task = Goal.objects.create(
            employee=profile,
            project=project,
            cycle=active_cycle,
            assigned_by=request.user,
            title=title,
            description=description,
            expected_evidence_type=expected_evidence_type,
            linked_competency=linked_competency,
            due_date=due_date,
            priority=priority,
            status=GoalStatus.NOT_STARTED,
            completion_percentage=Decimal('0.00'),
        )

        if target_value is not None:
            KPI.objects.create(
                goal=task,
                name=f"{title} Milestone",
                target_value=Decimal(str(target_value)),
                achieved_value=Decimal('0.00'),
                unit=unit,
            )

        return Response({
            'code': 201,
            'message': f'Task "{task.title}" successfully assigned to {profile.full_name} under project {project.title}.',
            'data': {
                'id': str(task.id),
                'title': task.title,
                'projectId': str(project.id),
                'projectTitle': project.title,
                'employeeId': str(profile.id),
                'employeeName': profile.full_name,
                'dueDate': str(task.due_date),
                'status': task.status,
                'priority': task.priority,
                'expectedEvidenceType': task.expected_evidence_type,
                'linkedCompetency': task.linked_competency,
            }
        }, status=status.HTTP_201_CREATED)


class ManagerTaskDetailView(APIView):
    """
    Feature TM-03: Manage Tasks & Goals
    Update status, progress percentage, blockers, or append mentor check-in notes.
    """
    permission_classes = [IsManagerUser]

    def patch(self, request, pk):
        task = Goal.objects.filter(id=pk).first()
        if not task:
            return Response({'code': 404, 'message': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        progress_pct = request.data.get('completion_percentage') or request.data.get('completionPercentage')
        comment = request.data.get('comment', '').strip()
        is_blocked = request.data.get('is_blocked') or request.data.get('isBlocked')
        blocked_reason = request.data.get('blocked_reason') or request.data.get('blockedReason')

        if new_status and hasattr(GoalStatus, new_status.upper()):
            task.status = new_status.upper()
            if task.status == GoalStatus.COMPLETED and progress_pct is None:
                task.completion_percentage = Decimal('100.00')

        if is_blocked is not None:
            task.is_blocked = bool(is_blocked)
            if blocked_reason is not None:
                task.blocked_reason = blocked_reason
            if not task.is_blocked:
                task.blocked_reason = ''

        if progress_pct is not None:
            try:
                pct = Decimal(str(progress_pct))
                task.completion_percentage = min(Decimal('100.00'), max(Decimal('0.00'), pct))
                if task.completion_percentage == Decimal('100.00'):
                    task.status = GoalStatus.COMPLETED
                elif task.completion_percentage > Decimal('0.00') and task.status == GoalStatus.NOT_STARTED:
                    task.status = GoalStatus.IN_PROGRESS
            except Exception:
                pass

        task.save()

        if comment:
            GoalProgress.objects.create(
                goal=task,
                updated_by=request.user,
                progress_percentage=task.completion_percentage,
                comment=f"[Mentor Update] {comment}"
            )

        return Response({
            'code': 200,
            'message': f'Task updated successfully. Status: {task.status}',
            'data': {
                'id': str(task.id),
                'title': task.title,
                'status': task.status,
                'isBlocked': task.is_blocked,
                'blockedReason': task.blocked_reason,
                'completionPercentage': float(task.completion_percentage),
            }
        })

