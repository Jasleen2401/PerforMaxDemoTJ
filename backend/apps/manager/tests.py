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
    CycleParticipant,
    CycleEvaluatorAssignment,
    EvaluatorSectionType,
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
        self.participant = CycleParticipant.objects.create(cycle=self.cycle, employee=self.intern_profile)

        # Evaluation Criteria
        self.crit1 = EvaluationCriterion.objects.create(
            name="Technical Execution",
            description="Technical Execution evaluation",
            weight=Decimal("50.00")
        )
        self.crit2 = EvaluationCriterion.objects.create(
            name="Quality & Reliability",
            description="Quality & Reliability evaluation",
            weight=Decimal("50.00")
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
        """M-05: Review technical capability parameters against mentee with assigned evaluator."""
        CycleEvaluatorAssignment.objects.create(
            cycle=self.cycle,
            participant=self.participant,
            evaluator=self.manager,
            section=EvaluatorSectionType.TECHNICAL
        )
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

    def test_direct_manager_without_assignment_cannot_post_technical_review(self):
        """Direct manager relationship alone MUST NOT grant permission to post technical evaluations."""
        # Note: self.intern_profile.manager == self.manager, but NO CycleEvaluatorAssignment exists
        param = TechnicalCapabilityParameter.objects.create(
            name='System Architecture',
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
                'mentor_assessment': 'Direct manager write attempt'
            }]
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Direct manager relationship alone does not grant permission", res.json().get('message', ''))

    def test_direct_manager_can_read_historical_technical_reviews(self):
        """Direct manager CAN view/retrieve technical reviews for direct report (read-only preserved)."""
        # Manager has no evaluator assignment, but is direct manager
        res = self.client.get(f'/api/manager/technical-reviews/?employee_id={self.intern_profile.id}', **self.manager_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get('code'), 200)
        self.assertEqual(res.json().get('data', {}).get('employeeId'), str(self.intern_profile.id))

    def test_assigned_evaluator_can_post_technical_review(self):
        """Assigned technical evaluator in CycleEvaluatorAssignment can successfully post reviews."""
        CycleEvaluatorAssignment.objects.create(
            cycle=self.cycle,
            participant=self.participant,
            evaluator=self.manager,
            section=EvaluatorSectionType.TECHNICAL
        )
        param = TechnicalCapabilityParameter.objects.create(
            name='API Engineering',
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
                'score': 4.8,
                'mentor_assessment': 'Outstanding API contract design'
            }]
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(res.status_code, 200)

    def test_hr_admin_can_post_technical_review_without_assignment(self):
        """HR / Super Admin can post technical reviews without an explicit evaluator assignment."""
        hr_user = User.objects.create_user(
            username="hr_director",
            email="hr.director@company.com",
            password="HrPassword123!",
            role=UserRole.HR
        )
        login_res = self.client.post('/api/auth/login/', data=json.dumps({
            'email': hr_user.email,
            'password': 'HrPassword123!'
        }), content_type='application/json')
        hr_token = login_res.json().get('access') or login_res.json().get('accessToken')
        hr_headers = {'HTTP_AUTHORIZATION': f'Bearer {hr_token}'}

        param = TechnicalCapabilityParameter.objects.create(
            name='DevOps & CI/CD',
            category='Infrastructure',
            benchmark_score=Decimal('4.0'),
            weight=Decimal('20.0'),
            created_by=hr_user
        )
        res = self.client.post('/api/manager/technical-reviews/', data=json.dumps({
            'employee_id': str(self.intern_profile.id),
            'status': 'SUBMITTED',
            'reviews': [{
                'parameter_id': str(param.id),
                'score': 4.0,
                'mentor_assessment': 'HR authorized evaluation'
            }]
        }), content_type='application/json', **hr_headers)
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
        self.assertIn(decision_res.json().get('data', {}).get('reviewStatus'), ['APPROVED', 'VERIFIED'])

    def test_m07_give_feedback(self):
        """M-07: Give performance feedback to mentee."""
        res = self.client.post('/api/manager/feedback/', data=json.dumps({
            'employee_id': str(self.intern_profile.id),
            'feedback_type': 'PRAISE',
            'message': 'Outstanding contribution on the sprint!',
            'visibility': 'PUBLIC'
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(res.status_code, 201)

    def test_m07_give_feedback_unassigned_forbidden(self):
        """M-07: Manager cannot give feedback to unassigned employee (403 Forbidden)."""
        other_user = User.objects.create_user(
            username="other_intern",
            email="other@company.com",
            password="OtherPassword123!",
            role=UserRole.INTERN
        )
        other_profile = EmployeeProfile.objects.create(
            user=other_user,
            employee_code="INT-999",
            first_name="Other",
            last_name="Intern",
            manager=None,
            designation="Frontend Intern",
            employment_status="ACTIVE"
        )
        res = self.client.post('/api/manager/feedback/', data=json.dumps({
            'employee_id': str(other_profile.id),
            'feedback_type': 'PRAISE',
            'message': 'Attempting feedback on unassigned intern.',
            'visibility': 'PUBLIC'
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(res.status_code, 403)

    def test_m05_technical_review_unassigned_forbidden(self):
        """M-05: Technical reviews cannot be conducted for unassigned employees (403 Forbidden)."""
        other_user = User.objects.create_user(
            username="unassigned_intern_tr",
            email="unassigned.tr@company.com",
            password="OtherPassword123!",
            role=UserRole.INTERN
        )
        other_profile = EmployeeProfile.objects.create(
            user=other_user,
            employee_code="INT-888",
            first_name="Unassigned",
            last_name="Reviewee",
            manager=None,
            designation="Mobile Intern",
            employment_status="ACTIVE"
        )
        param = TechnicalCapabilityParameter.objects.create(
            name='Mobile Architecture',
            category='Frontend',
            benchmark_score=Decimal('4.0'),
            weight=Decimal('20.0'),
            created_by=self.manager
        )
        res = self.client.post('/api/manager/technical-reviews/', data=json.dumps({
            'employee_id': str(other_profile.id),
            'status': 'SUBMITTED',
            'reviews': [{
                'parameter_id': str(param.id),
                'score': 4.0,
                'mentor_assessment': 'Forbidden attempt'
            }]
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(res.status_code, 403)

    def test_m09_conduct_review_unassigned_forbidden(self):
        """M-09: Manager cannot create appraisal submission for unassigned employee (403 Forbidden)."""
        other_user = User.objects.create_user(
            username="unassigned_appraisal_user",
            email="unassigned.appraisal@company.com",
            password="OtherPassword123!",
            role=UserRole.INTERN
        )
        other_profile = EmployeeProfile.objects.create(
            user=other_user,
            employee_code="INT-777",
            first_name="Unassigned",
            last_name="Appraisee",
            manager=None,
            designation="DevOps Intern",
            employment_status="ACTIVE"
        )
        res = self.client.post('/api/manager/appraisals/submissions/', data=json.dumps({
            'employee_id': str(other_profile.id),
            'cycle_id': str(self.cycle.id),
            'reviewer_comments': 'Forbidden submission'
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(res.status_code, 403)

    def test_m10_save_draft_unassigned_forbidden(self):
        """M-10: Manager cannot save appraisal draft for unassigned employee (403 Forbidden)."""
        other_user = User.objects.create_user(
            username="unassigned_draft_user",
            email="unassigned.draft@company.com",
            password="OtherPassword123!",
            role=UserRole.INTERN
        )
        other_profile = EmployeeProfile.objects.create(
            user=other_user,
            employee_code="INT-666",
            first_name="Unassigned",
            last_name="DraftTarget",
            manager=None,
            designation="Security Intern",
            employment_status="ACTIVE"
        )
        unassigned_appraisal = Appraisal.objects.create(
            employee=other_profile,
            cycle=self.cycle,
            status=AppraisalStatus.DRAFT,
            reviewer=self.manager
        )
        res = self.client.post(f'/api/manager/appraisals/{unassigned_appraisal.id}/save-draft/', data=json.dumps({
            'reviewer_comments': 'Forbidden draft save',
            'ratings': []
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(res.status_code, 403)

    def test_m11_submit_appraisal_unassigned_forbidden(self):
        """M-11: Manager cannot submit appraisal for unassigned employee (403 Forbidden)."""
        other_user = User.objects.create_user(
            username="unassigned_submit_user",
            email="unassigned.submit@company.com",
            password="OtherPassword123!",
            role=UserRole.INTERN
        )
        other_profile = EmployeeProfile.objects.create(
            user=other_user,
            employee_code="INT-555",
            first_name="Unassigned",
            last_name="SubmitTarget",
            manager=None,
            designation="QA Intern",
            employment_status="ACTIVE"
        )
        unassigned_appraisal = Appraisal.objects.create(
            employee=other_profile,
            cycle=self.cycle,
            status=AppraisalStatus.DRAFT,
            reviewer=self.manager
        )
        res = self.client.post(f'/api/manager/appraisals/{unassigned_appraisal.id}/submit/', data=json.dumps({
            'reviewer_comments': 'Forbidden final submission'
        }), content_type='application/json', **self.manager_headers)
        self.assertEqual(res.status_code, 403)

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
        self.assertIn(submit_res.json().get('data', {}).get('status'), ['SUBMITTED', 'SUBMITTED_TO_HR'])
        self.assertIsNotNone(submit_res.json().get('data', {}).get('overallScore'))

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

    def test_manager_submit_breakdown_non_zero_contributions(self):
        """
        Regression test: Manager submission under a Competency Framework cycle
        correctly extracts nested section contributions and does not report zero.
        Technical: 80% score * 60% weight = 48.00
        Behavioral: 90% score * 40% weight = 36.00
        Composite Score = 84.00
        """
        from apps.performance.models import (
            AppraisalType,
            CycleCompetency,
            CompetencySection,
            TechnicalCapabilityReview,
            BehavioralCapabilityReview,
        )

        today = timezone.localdate()
        cycle = PerformanceCycle.objects.create(
            name="Competency 60/40 Cycle",
            start_date=today,
            end_date=today + timezone.timedelta(days=90),
            status="ACTIVE",
            technical_weight=Decimal('60.00'),
            behavioral_weight=Decimal('40.00'),
            rating_scale_max=Decimal('5.0'),
            japanese_evaluation_mandatory=False,
            created_by=self.manager
        )
        participant = CycleParticipant.objects.create(cycle=cycle, employee=self.intern_profile)

        # 1 Technical Competency (100% weight of technical section)
        tech_comp = CycleCompetency.objects.create(
            cycle=cycle,
            name="Python Architecture",
            section=CompetencySection.TECHNICAL,
            weight=Decimal('100.00'),
            benchmark_score=Decimal('3.0'),
            order=1,
            is_active=True
        )

        # 1 Behavioral Competency (100% weight of behavioral section)
        behav_comp = CycleCompetency.objects.create(
            cycle=cycle,
            name="Team Collaboration",
            section=CompetencySection.BEHAVIORAL,
            weight=Decimal('100.00'),
            benchmark_score=Decimal('3.0'),
            order=1,
            is_active=True
        )

        # Evaluator assignments
        CycleEvaluatorAssignment.objects.create(
            cycle=cycle,
            participant=participant,
            evaluator=self.manager,
            section=EvaluatorSectionType.TECHNICAL
        )
        CycleEvaluatorAssignment.objects.create(
            cycle=cycle,
            participant=participant,
            evaluator=self.manager,
            section=EvaluatorSectionType.BEHAVIORAL
        )

        # Technical score: 4.0 out of 5.0 = 80.0%
        TechnicalCapabilityReview.objects.create(
            cycle=cycle,
            employee=self.intern_profile,
            competency=tech_comp,
            reviewer=self.manager,
            score=Decimal('4.0'),
            status='SUBMITTED'
        )

        # Behavioral score: 4.5 out of 5.0 = 90.0%
        BehavioralCapabilityReview.objects.create(
            cycle=cycle,
            employee=self.intern_profile,
            competency=behav_comp,
            reviewer=self.manager,
            score=Decimal('4.5'),
            status='SUBMITTED'
        )

        appraisal = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=cycle,
            status=AppraisalStatus.DRAFT,
            reviewer=self.manager,
            appraisal_type=AppraisalType.MANAGER
        )

        submit_res = self.client.post(
            f'/api/manager/appraisals/{appraisal.id}/submit/',
            data=json.dumps({
                'reviewer_comments': 'Full competency sign-off.',
                'technical_strengths': 'Clean code',
                'areas_for_growth': 'Documentation',
                'recommended_training': 'Advanced Python'
            }),
            content_type='application/json',
            **self.manager_headers
        )
        self.assertEqual(submit_res.status_code, 200)
        data = submit_res.json().get('data', {})
        self.assertEqual(data.get('status'), 'SUBMITTED')

        # Assert weighted contributions are calculated and NOT zero:
        # 80.00% * 60% = 48.00
        self.assertEqual(data.get('weightedTechnicalScore60'), 48.0)
        # 90.00% * 40% = 36.00
        self.assertEqual(data.get('deliverableExecutionScore40'), 36.0)
        # Composite: 48.00 + 36.00 = 84.00
        self.assertEqual(data.get('overallScore'), 84.0)
