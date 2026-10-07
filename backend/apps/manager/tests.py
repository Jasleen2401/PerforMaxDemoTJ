from decimal import Decimal
import json
from django.test import TestCase, Client
from django.utils import timezone
from apps.accounts.models import User, UserRole
from apps.employees.models import EmployeeProfile
from apps.goals.models import Goal, GoalStatus, GoalPriority
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.feedback.models import Feedback, FeedbackVisibility, FeedbackStatus
from apps.performance.models import (
    PerformanceCycle,
    Appraisal,
    AppraisalStatus,
    EvaluationCriterion,
    TechnicalCapabilityParameter,
)

class ManagerMentorModuleTestCase(TestCase):
    """
    Automated TestCase for Manager & Mentor Functionalities (M-01 to M-12)
    """

    def setUp(self):
        self.client = Client()
        # Create Manager
        self.manager = User.objects.create_user(
            username="manager_marcus",
            email="marcus.tech@company.com",
            password="MarcusPassword123!",
            role=UserRole.MANAGER
        )
        self.manager_profile = EmployeeProfile.objects.create(
            user=self.manager,
            employee_code="MGR-001",
            first_name="Marcus",
            last_name="Vance",
            designation="Engineering Manager",
            employment_status="ACTIVE"
        )

        # Create Intern
        self.intern = User.objects.create_user(
            username="intern_alex",
            email="alex.dev@company.com",
            password="AlexPassword123!",
            role=UserRole.INTERN
        )
        self.intern_profile = EmployeeProfile.objects.create(
            user=self.intern,
            employee_code="INT-001",
            first_name="Alex",
            last_name="Chen",
            manager=self.manager,
            designation="Backend Intern",
            employment_status="ACTIVE"
        )

        # Active Performance Cycle
        today = timezone.localdate()
        self.cycle = PerformanceCycle.objects.create(
            name="Q3 Performance Cycle",
            start_date=today,
            end_date=today + timezone.timedelta(days=90),
            status="ACTIVE",
            created_by=self.manager
        )

        # Evaluation Criteria
        self.crit1 = EvaluationCriterion.objects.create(
            name="Technical Execution",
            weight=Decimal("50.00"),
            cycle=self.cycle
        )
        self.crit2 = EvaluationCriterion.objects.create(
            name="Quality & Reliability",
            weight=Decimal("50.00"),
            cycle=self.cycle
        )

        # Login manager
        login_res = self.client.post('/api/auth/login/', data=json.dumps({
            'email': self.manager.email,
            'password': 'MarcusPassword123!'
        }), content_type='application/json')
        self.manager_token = login_res.json().get('access') or login_res.json().get('accessToken')
        self.manager_headers = {'HTTP_AUTHORIZATION': f'Bearer {self.manager_token}'}

        # Login intern
        login_int = self.client.post('/api/auth/login/', data=json.dumps({
            'email': self.intern.email,
            'password': 'AlexPassword123!'
        }), content_type='application/json')
        self.intern_token = login_int.json().get('access') or login_int.json().get('accessToken')
        self.intern_headers = {'HTTP_AUTHORIZATION': f'Bearer {self.intern_token}'}

    def test_m01_view_assigned_mentees(self):
        """M-01: View assigned interns/employees."""
        res = self.client.get('/api/manager/mentees/', **self.manager_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json().get('data', [])
        self.assertTrue(any(m['id'] == str(self.intern_profile.id) for m in data))

    def test_m02_assign_task(self):
        """M-02: Assign work/task to mentee."""
        payload = {
            'employee_id': str(self.intern_profile.id),
            'title': 'Implement Unit Tests',
            'description': 'Add coverage for all endpoints',
            'priority': 'HIGH',
            'target_value': 100,
            'unit': '%'
        }
        res = self.client.post('/api/manager/tasks/', data=json.dumps(payload), content_type='application/json', **self.manager_headers)
        self.assertEqual(res.status_code, 201)
        self.assertIn('id', res.json().get('data', {}))

    def test_m03_manage_task_status(self):
        """M-03: Manage tasks and goals status."""
        task = Goal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            assigned_by=self.manager,
            title='Existing Goal',
            priority=GoalPriority.MEDIUM,
            status=GoalStatus.NOT_STARTED,
            due_date=self.cycle.end_date
        )
        res = self.client.patch(f'/api/manager/tasks/{task.id}/', data=json.dumps({
            'status': 'IN_PROGRESS',
            'completion_percentage': 75.0
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get('data', {}).get('completionPercentage'), 75.0)

    def test_m04_manage_technical_parameters(self):
        """M-04: Add and configure technical capability parameters."""
        res = self.client.post('/api/manager/technical-parameters/', data=json.dumps({
            'name': 'Code Quality & Clean Architecture',
            'category': 'Engineering',
            'description': 'DRY principles, testing, documentation',
            'benchmark_score': 4.0,
            'weight': 30.0
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(res.status_code, 201)

        get_res = self.client.get('/api/manager/technical-parameters/', **self.manager_headers)
        self.assertEqual(get_res.status_code, 200)
        self.assertGreaterEqual(len(get_res.json().get('data', [])), 1)

    def test_m05_review_technical_capability(self):
        """M-05: Review technical capability parameters against mentee."""
        param = TechnicalCapabilityParameter.objects.create(
            name='Database Modeling',
            category='Backend',
            benchmark_score=Decimal('4.0'),
            weight=Decimal('20.0'),
            created_by=self.manager
        )
        res = self.client.post('/api/manager/technical-reviews/', data=json.dumps({
            'employee_id': str(self.intern_profile.id),
            'status': 'SUBMITTED',
            'reviews': [{
                'parameter_id': str(param.id),
                'score': 4.5,
                'mentor_assessment': 'Excellent query optimization'
            }]
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(res.status_code, 200)

    def test_m06_view_and_review_evidence(self):
        """M-06: View and review evidence submissions."""
        goal = Goal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            assigned_by=self.manager,
            title='Feature Development',
            priority=GoalPriority.HIGH,
            status=GoalStatus.IN_PROGRESS,
            due_date=self.cycle.end_date
        )
        evidence = EvidenceSubmission.objects.create(
            employee=self.intern_profile,
            goal=goal,
            title='PR #12 - API Documentation',
            external_url='https://github.com/company/repo/pull/12',
            review_status=EvidenceReviewStatus.PENDING
        )
        list_res = self.client.get('/api/manager/evidence/', **self.manager_headers)
        self.assertEqual(list_res.status_code, 200)

        decision_res = self.client.post(f'/api/manager/evidence/{evidence.id}/decision/', data=json.dumps({
            'status': 'APPROVED',
            'remarks': 'Approved by Marcus.'
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(decision_res.status_code, 200)
        self.assertEqual(decision_res.json().get('data', {}).get('reviewStatus'), 'APPROVED')

    def test_m07_give_feedback(self):
        """M-07: Give performance feedback to mentee."""
        res = self.client.post('/api/manager/feedback/', data=json.dumps({
            'employee_id': str(self.intern_profile.id),
            'feedback_type': 'PRAISE',
            'message': 'Outstanding contribution on the sprint!',
            'visibility': 'PUBLIC'
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(res.status_code, 201)

    def test_m08_review_employee_feedback(self):
        """M-08: Review feedback provided by intern and add comments."""
        fb = Feedback.objects.create(
            sender=self.intern,
            recipient=self.manager,
            feedback_type='APPRECIATION',
            message='Thank you for mentoring me on backend architecture.',
            status=FeedbackStatus.PUBLISHED
        )
        get_res = self.client.get('/api/manager/employee-feedbacks/', **self.manager_headers)
        self.assertEqual(get_res.status_code, 200)

        cmt_res = self.client.post(f'/api/manager/employee-feedbacks/{fb.id}/comment/', data=json.dumps({
            'comment': 'Keep up the good work Alex!'
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(cmt_res.status_code, 201)

    def test_m09_m10_m11_appraisal_lifecycle(self):
        """M-09, M-10, M-11: Conduct, save draft, and submit performance appraisal."""
        appraisal = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            status=AppraisalStatus.DRAFT,
            reviewer=self.manager
        )

        # M-09: Conduct Review (fetch list)
        appraisal_list = self.client.get('/api/manager/appraisals/', **self.manager_headers)
        self.assertEqual(appraisal_list.status_code, 200)

        # M-10: Save Draft
        draft_res = self.client.post(f'/api/manager/appraisals/{appraisal.id}/save-draft/', data=json.dumps({
            'reviewer_comments': 'Preliminary draft review.',
            'ratings': [
                {'criterion_id': str(self.crit1.id), 'score': 4.0, 'comments': 'Strong output'},
                {'criterion_id': str(self.crit2.id), 'score': 5.0, 'comments': 'No bugs found'}
            ]
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(draft_res.status_code, 200)
        self.assertEqual(draft_res.json().get('data', {}).get('status'), 'DRAFT')

        # M-11: Submit Review
        submit_res = self.client.post(f'/api/manager/appraisals/{appraisal.id}/submit/', data=json.dumps({
            'reviewer_comments': 'Final evaluation signed off.'
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(submit_res.status_code, 200)
        self.assertEqual(submit_res.json().get('data', {}).get('status'), 'SUBMITTED')
        # Overall score: 4.0*0.5 + 5.0*0.5 = 4.5
        self.assertAlmostEqual(submit_res.json().get('data', {}).get('overallScore'), 4.5, places=2)

    def test_m12_view_previous_reviews(self):
        """M-12: View historical review records."""
        Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            status=AppraisalStatus.PUBLISHED,
            reviewer=self.manager,
            overall_score=Decimal('4.20')
        )
        res = self.client.get('/api/manager/historical-reviews/', **self.manager_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json().get('data', [])
        self.assertGreaterEqual(len(data), 1)

    def test_security_rbac_intern_forbidden(self):
        """Security: Intern role cannot access manager endpoints."""
        res = self.client.get('/api/manager/mentees/', **self.intern_headers)
        self.assertEqual(res.status_code, 403)
