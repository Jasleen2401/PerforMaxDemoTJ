import uuid
from datetime import date
from django.db.models import Q, Avg
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.employees.models import EmployeeProfile, EmploymentStatus
from apps.organization.models import Department
from apps.goals.models import Goal, GoalStatus
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.performance.models import Appraisal, PerformanceCycle, TechnicalCapabilityReview, AppraisalStatus, AppraisalType
from apps.feedback.models import Feedback
from .base import IsManagerUser, get_manager_reports_qs


# =====================================================================
# M-01: VIEW ASSIGNED INTERNS / EMPLOYEES
# =====================================================================
class ManagerMenteesView(APIView):
    """
    Feature M-01: View Assigned Interns/Employees
    Provides the Mentor with access to assigned interns/employees profiles,
    status, active tasks, appraisal status, and quick performance summary.
    """
    permission_classes = [IsManagerUser]

    def get(self, request):
        direct_reports = get_manager_reports_qs(request.user)

        search_query = request.query_params.get('search', '').strip()
        status_filter = request.query_params.get('status', '').strip()
        dept_filter = request.query_params.get('department', '').strip()

        if search_query:
            direct_reports = direct_reports.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(employee_code__icontains=search_query) |
                Q(user__email__icontains=search_query)
            )

        if status_filter:
            direct_reports = direct_reports.filter(employment_status__iexact=status_filter)

        if dept_filter:
            direct_reports = direct_reports.filter(
                Q(department__id__iexact=dept_filter) |
                Q(department__name__icontains=dept_filter)
            )

        active_cycle = PerformanceCycle.objects.filter(status='ACTIVE').first() or PerformanceCycle.objects.first()

        mentees_data = []
        for emp in direct_reports:
            # Goals summary
            goals = Goal.objects.filter(employee=emp)
            total_goals = goals.count()
            completed_goals = goals.filter(status=GoalStatus.COMPLETED).count()
            avg_goal_pct = goals.aggregate(avg=Avg('completion_percentage'))['avg'] or 0.0

            # Evidence summary
            pending_evidence = EvidenceSubmission.objects.filter(
                employee=emp,
                review_status=EvidenceReviewStatus.PENDING
            ).count()

            # Active Appraisal summary
            appraisal = None
            if active_cycle:
                appraisal = Appraisal.objects.filter(employee=emp, cycle=active_cycle).first()
            if not appraisal:
                appraisal = Appraisal.objects.filter(employee=emp).order_by('-created_at').first()
            if not appraisal and active_cycle:
                appraisal, _ = Appraisal.objects.get_or_create(
                    employee=emp,
                    cycle=active_cycle,
                    defaults={
                        'reviewer': emp.manager or request.user,
                        'status': AppraisalStatus.DRAFT,
                        'appraisal_type': AppraisalType.MANAGER
                    }
                )

            # Technical Capability Review summary
            tech_reviews = TechnicalCapabilityReview.objects.filter(employee=emp)
            avg_tech = tech_reviews.aggregate(avg=Avg('score'))['avg']
            tech_avg_score = round(float(avg_tech), 1) if avg_tech is not None else None

            # Feedback summary
            feedbacks_received = Feedback.objects.filter(recipient=emp.user).count()

            mentees_data.append({
                'id': str(emp.id),
                'userId': str(emp.user.id),
                'employeeCode': emp.employee_code,
                'firstName': emp.first_name,
                'lastName': emp.last_name,
                'fullName': emp.full_name,
                'email': emp.user.email,
                'designation': emp.designation,
                'department': emp.department.name if emp.department else 'General Engineering',
                'departmentId': str(emp.department.id) if emp.department else None,
                'employmentStatus': emp.employment_status,
                'joiningDate': emp.joining_date.strftime('%Y-%m-%d') if emp.joining_date else None,
                'skills': emp.skills or [],
                'competencies': emp.competencies or [],
                'academicHistory': emp.academic_history or {},
                'universityCohort': emp.university_cohort or 'MIRAI Cohort 2026',
                'metrics': {
                    'totalGoals': total_goals,
                    'completedGoals': completed_goals,
                    'avgGoalProgress': round(float(avg_goal_pct), 1),
                    'pendingEvidence': pending_evidence,
                    'feedbacksReceived': feedbacks_received,
                    'technicalCapabilityAvg': tech_avg_score,
                },
                'activeAppraisal': {
                    'id': str(appraisal.id) if appraisal else None,
                    'status': appraisal.status if appraisal else 'NOT_STARTED',
                    'statusDisplay': appraisal.get_status_display() if appraisal else 'Not Started',
                    'overallScore': float(appraisal.overall_score) if appraisal and appraisal.overall_score else None,
                    'cycleName': appraisal.cycle.name if appraisal else (active_cycle.name if active_cycle else 'Current Cycle'),
                } if appraisal or active_cycle else None,
            })

        return Response({
            'code': 200,
            'message': 'Assigned interns retrieved successfully.',
            'data': mentees_data,
            'total': len(mentees_data)
        })

    def post(self, request):
        """
        Create a new intern and assign to the authenticated mentor.
        Supports both single intern creation and batch CSV import payloads.
        """
        data = request.data
        interns_to_create = []

        if isinstance(data, list):
            interns_to_create = data
        elif 'interns' in data and isinstance(data['interns'], list):
            interns_to_create = data['interns']
        else:
            interns_to_create = [data]

        created_results = []
        for item in interns_to_create:
            name = (item.get('staffName') or item.get('name') or '').strip()
            if not name:
                continue

            email = (item.get('email') or '').strip().lower()
            if not email:
                clean_name = name.lower().replace(' ', '')
                email = f"{clean_name}_{uuid.uuid4().hex[:4]}@college.edu"

            batch = item.get('currentDepartmentName') or item.get('batch') or 'Batch A'
            sub_batch = item.get('subBatch') or item.get('sub_batch') or 'A1'
            cohort = item.get('cohort') or item.get('universityCohort') or 'MIRAI Cohort 2026'
            position = item.get('positionName') or f"Software Intern ({sub_batch})"

            # Ensure unique username
            base_username = email.split('@')[0].replace('.', '_').replace('-', '_')
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1

            # Find or create User
            user = User.objects.filter(email=email).first()
            if not user:
                user = User.objects.create(
                    username=username,
                    email=email,
                    role=UserRole.INTERN,
                    is_active=True
                )
                user.set_password("Dailoqa")
                user.save()

            # Ensure Department
            dept = Department.objects.filter(name__iexact=batch).first()
            if not dept:
                dept = Department.objects.filter(name="Engineering").first() or Department.objects.first()

            # Generate unique employee code
            emp_code = f"INT-{uuid.uuid4().hex[:6].upper()}"
            name_parts = name.split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''

            profile, created = EmployeeProfile.objects.get_or_create(
                user=user,
                defaults={
                    'employee_code': emp_code,
                    'first_name': first_name,
                    'last_name': last_name,
                    'department': dept,
                    'manager': request.user,
                    'designation': position,
                    'employment_status': EmploymentStatus.ACTIVE,
                    'university_cohort': cohort,
                    'joining_date': timezone.localdate(),
                }
            )
            if not created and not profile.manager:
                profile.manager = request.user
                profile.save(update_fields=['manager'])

            created_results.append({
                'id': str(profile.id),
                'userId': str(user.id),
                'employeeCode': profile.employee_code,
                'fullName': profile.full_name,
                'email': user.email,
                'department': dept.name if dept else batch,
                'designation': profile.designation,
                'employmentStatus': profile.employment_status,
                'universityCohort': profile.university_cohort,
            })

        if not created_results:
            return Response(
                {'code': 400, 'message': 'No valid intern records provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'code': 201,
            'message': f'Successfully created {len(created_results)} intern(s) and assigned to mentor.',
            'data': created_results if len(created_results) > 1 else created_results[0]
        }, status=status.HTTP_201_CREATED)

