import json
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from apps.accounts.models import User, UserRole
from apps.employees.models import EmployeeProfile, EmploymentStatus
from apps.organization.models import Department
from apps.performance.models import PerformanceCycle, CycleStatus
from apps.japanese.models import (
    JapaneseBatch, JapaneseLearningPlan, JLPTAttempt,
    JLPTEligibilityRecord, JapaneseEvaluation, JapaneseEvalCriterion,
    JapaneseEvalRating, EvaluationStatus, JLPTLevel, JLPTEligibility
)
from apps.feedback.models import Feedback, FeedbackType, FeedbackVisibility

class JapaneseInstructorModuleTestCase(TestCase):
    def setUp(self):
        # Create users
        self.instructor = User.objects.create_user(
            username='tanaka_instructor',
            email='tanaka.japanese@company.com',
            password='TanakaPassword123!',
            role='INSTRUCTOR'
        )
        self.hr = User.objects.create_user(
            username='sarah_hr',
            email='sarah.hr@company.com',
            password='SarahPassword123!',
            role=UserRole.HR
        )
        self.intern_user = User.objects.create_user(
            username='intern_kenji',
            email='kenji.intern@company.com',
            password='KenjiPassword123!',
            role=UserRole.INTERN
        )
        self.unauthorized_intern = User.objects.create_user(
            username='unauth_intern',
            email='unauth@company.com',
            password='Password123!',
            role=UserRole.INTERN
        )

        # Department
        self.dept = Department.objects.create(name='Japanese Training')

        # Employee profiles
        self.intern_profile = EmployeeProfile.objects.create(
            user=self.intern_user,
            employee_code='INT-JP-001',
            first_name='Kenji',
            last_name='Sato',
            department=self.dept,
            employment_status=EmploymentStatus.ACTIVE
        )

        # Performance cycle
        self.cycle = PerformanceCycle.objects.create(
            name='2026 Q1 Cycle',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=90),
            status=CycleStatus.ACTIVE
        )

        # Batches & Sub-batches
        self.main_batch = JapaneseBatch.objects.create(
            name='Batch A (Alpha Cohort)',
            code='BATCH-A',
            status='ACTIVE'
        )
        self.main_batch.instructors.add(self.instructor)

        self.sub_batch = JapaneseBatch.objects.create(
            name='Sub-Batch A1',
            code='BATCH-A1',
            parent_batch=self.main_batch,
            status='ACTIVE'
        )
        self.sub_batch.instructors.add(self.instructor)
        self.sub_batch.interns.add(self.intern_profile)
        self.main_batch.interns.add(self.intern_profile)

        # Evaluation criteria
        self.criterion1 = JapaneseEvalCriterion.objects.create(
            cycle=self.cycle,
            name='Grammar & Vocabulary (文法・語彙)',
            weight=Decimal('50.00'),
            order=1
        )
        self.criterion2 = JapaneseEvalCriterion.objects.create(
            cycle=self.cycle,
            name='Workplace Communication (ビジネス会話)',
            weight=Decimal('50.00'),
            order=2
        )

        # Setup JWT/Session tokens
        self.instructor_headers = self._get_auth_headers(self.instructor)
        self.intern_headers = self._get_auth_headers(self.intern_user)
        self.hr_headers = self._get_auth_headers(self.hr)

    def _get_auth_headers(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        token = str(RefreshToken.for_user(user).access_token)
        return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def test_01_japanese_batches_hierarchy_and_filtering(self):
        """Verify Japanese batches and sub-batches retrieval and filtering."""
        res = self.client.get('/api/japanese/batches/', **self.instructor_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        batches = data if isinstance(data, list) else data.get('results', [])
        self.assertGreaterEqual(len(batches), 1)

        # Filter by sub-batch code
        filter_res = self.client.get('/api/japanese/batches/?sub=BATCH-A1', **self.instructor_headers)
        self.assertEqual(filter_res.status_code, 200)

    def test_02_japanese_instructor_dashboard_metrics(self):
        """Verify dashboard metrics aggregated for assigned instructor batches."""
        res = self.client.get('/api/japanese/dashboard/', **self.instructor_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('overview', data)
        self.assertIn('assignedBatches', data['overview'])
        self.assertIn('totalInterns', data['overview'])
        self.assertIn('activeCycle', data)

    def test_03_assigned_interns_roster(self):
        """Verify instructor can query assigned intern details."""
        res = self.client.get('/api/japanese/assigned-interns/', **self.instructor_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        interns = data if isinstance(data, list) else data.get('results', [])
        self.assertGreaterEqual(len(interns), 1)
        self.assertEqual(interns[0]['employeeCode'], 'INT-JP-001')

    def test_04_jlpt_attempt_record_and_verification(self):
        """Verify recording a JLPT attempt and instructor verification."""
        # Intern records attempt
        attempt = JLPTAttempt.objects.create(
            intern=self.intern_profile,
            level=JLPTLevel.N5,
            exam_date=timezone.now().date(),
            score=120,
            passed=True,
            verified=False
        )

        # Instructor verifies
        verify_res = self.client.post(
            f'/api/japanese/jlpt-attempts/{attempt.id}/verify/',
            data=json.dumps({'passed': True, 'score': 125, 'notes': 'Certificate validated.'}),
            content_type='application/json',
            **self.instructor_headers
        )
        self.assertEqual(verify_res.status_code, 200)
        attempt.refresh_from_db()
        self.assertTrue(attempt.verified)
        self.assertEqual(attempt.score, 125)

    def test_05_japanese_evaluation_lifecycle_and_submission(self):
        """Verify full evaluation lifecycle: create draft, update ratings, submit."""
        # Create draft evaluation
        eval_obj = JapaneseEvaluation.objects.create(
            intern=self.intern_profile,
            cycle=self.cycle,
            evaluator=self.instructor,
            status=EvaluationStatus.DRAFT,
            overall_language_score=Decimal('85.00')
        )

        JapaneseEvalRating.objects.create(
            evaluation=eval_obj,
            criterion=self.criterion1,
            score=Decimal('80.00'),
            comments='Good grammar foundations.'
        )
        JapaneseEvalRating.objects.create(
            evaluation=eval_obj,
            criterion=self.criterion2,
            score=Decimal('90.00'),
            comments='Active participation in conversations.'
        )

        # Submit evaluation
        submit_res = self.client.post(
            f'/api/japanese/evaluations/{eval_obj.id}/submit/',
            data=json.dumps({}),
            content_type='application/json',
            **self.instructor_headers
        )
        self.assertEqual(submit_res.status_code, 200)
        eval_obj.refresh_from_db()
        self.assertIn(eval_obj.status, [EvaluationStatus.SUBMITTED, EvaluationStatus.RESUBMITTED])

    def test_06_unauthorized_evaluation_submission_forbidden(self):
        """Unauthorized intern cannot submit instructor evaluation (403 Forbidden)."""
        eval_obj = JapaneseEvaluation.objects.create(
            intern=self.intern_profile,
            cycle=self.cycle,
            evaluator=self.instructor,
            status=EvaluationStatus.DRAFT
        )

        res = self.client.post(
            f'/api/japanese/evaluations/{eval_obj.id}/submit/',
            data=json.dumps({}),
            content_type='application/json',
            **self.intern_headers
        )
        self.assertIn(res.status_code, [403, 404])
