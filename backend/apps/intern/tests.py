import datetime
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import UserRole
from apps.employees.models import EmployeeProfile
from apps.organization.models import Department
from apps.performance.models import (
    PerformanceCycle,
    TechnicalCapabilityParameter,
    TechnicalCapabilityReview,
    Appraisal,
    AppraisalStatus,
)
from apps.training.models import TrainingCourse, EmployeeTraining, TrainingStatus
from apps.intern.models import (
    QuarterCode,
    QuarterStatus,
    CertificationStatus,
    VerificationStatus,
    ConversionDecision,
    MiraiQuarterProgress,
    MiraiCertification,
    MiraiTimelineEvent,
)
from apps.intern.services import MiraiJourneyService

User = get_user_model()


class MiraiJourneyServiceTestCase(TestCase):
    def setUp(self):
        self.dept = Department.objects.create(name="Engineering", code="ENG")
        self.mentor_user = User.objects.create_user(
            email="mentor@test.com",
            username="mentor_marcus",
            role=UserRole.MANAGER
        )
        self.intern_user = User.objects.create_user(
            email="alex@test.com",
            username="intern_alex",
            role=UserRole.INTERN
        )
        self.intern_profile = EmployeeProfile.objects.create(
            user=self.intern_user,
            department=self.dept,
            manager=self.mentor_user,
            designation="Backend Software Intern",
            employee_code="INT-001",
            joining_date=datetime.date(2025, 1, 15)
        )
        self.cycle = PerformanceCycle.objects.create(
            name="Test Cohort Cycle",
            start_date=datetime.date(2025, 1, 1),
            end_date=datetime.date(2025, 12, 31),
            status="ACTIVE"
        )

    def test_get_or_initialize_quarters(self):
        quarters = MiraiJourneyService.get_or_initialize_quarters(self.intern_profile)
        self.assertEqual(len(quarters), 4)
        codes = [q.quarter_code for q in quarters]
        self.assertEqual(codes, [QuarterCode.Q1, QuarterCode.Q2, QuarterCode.Q3, QuarterCode.Q4])

    def test_q1_progression_and_completion(self):
        # Initial evaluation: Not started
        eval_data = MiraiJourneyService.evaluate_intern_journey(self.intern_profile)
        q1 = next(q for q in eval_data['quarters'] if q['quarterCode'] == 'Q1')
        self.assertEqual(q1['status'], QuarterStatus.NOT_STARTED)

        # 1. Clear N5 Exam
        MiraiCertification.objects.create(
            intern=self.intern_profile,
            name="JLPT N5",
            jlpt_level="N5",
            quarter_code=QuarterCode.Q1,
            status=CertificationStatus.CLEARED,
            verification_status=VerificationStatus.VERIFIED,
            score="145/180"
        )

        # 2. Complete Agentic AI Course
        course = TrainingCourse.objects.create(
            title="FD Agentic AI Engineering",
            provider="Performax Academy",
            duration_hours=Decimal('30.0')
        )
        EmployeeTraining.objects.create(
            employee=self.intern_profile,
            course=course,
            enrollment_status=TrainingStatus.COMPLETED,
            completion_percentage=Decimal('100.00')
        )

        # 3. Foundational Technical Review
        param = TechnicalCapabilityParameter.objects.create(
            name="Python Algorithms",
            category="Foundational Technical",
            benchmark_score=Decimal('4.0'),
            weight=Decimal('25.0')
        )
        TechnicalCapabilityReview.objects.create(
            parameter=param,
            employee=self.intern_profile,
            reviewer=self.mentor_user,
            score=Decimal('4.5')
        )

        from apps.feedback.models import Feedback, FeedbackType, FeedbackVisibility, FeedbackStatus
        Feedback.objects.create(
            sender=self.mentor_user,
            recipient=self.intern_user,
            feedback_type=FeedbackType.POSITIVE,
            message="Initial orientation assessment completed. Great progress on Japanese N5 and Agentic AI.",
            visibility=FeedbackVisibility.PUBLIC,
            status=FeedbackStatus.PUBLISHED
        )

        eval_data = MiraiJourneyService.evaluate_intern_journey(self.intern_profile)
        q1_updated = next(q for q in eval_data['quarters'] if q['quarterCode'] == 'Q1')
        self.assertEqual(q1_updated['status'], QuarterStatus.COMPLETED)
        self.assertEqual(q1_updated['completionPercentage'], 100.0)
        self.assertTrue(q1_updated['prerequisitesMet'])

    def test_q3_and_q4_prerequisite_gating(self):
        # Evaluate without verified N4: Q3 must be NOT_STARTED with prerequisitesMet = False
        eval_data = MiraiJourneyService.evaluate_intern_journey(self.intern_profile)
        q3 = next(q for q in eval_data['quarters'] if q['quarterCode'] == 'Q3')
        self.assertFalse(q3['prerequisitesMet'])
        self.assertEqual(q3['status'], QuarterStatus.NOT_STARTED)
        self.assertTrue(any('JLPT N4' in p for p in q3['pendingRequirements']))

        # Even if unverified N4 exists, prerequisite remains unmet
        unverified_n4 = MiraiCertification.objects.create(
            intern=self.intern_profile,
            name="JLPT N4",
            jlpt_level="N4",
            quarter_code=QuarterCode.Q2,
            status=CertificationStatus.CLEARED,
            verification_status=VerificationStatus.PENDING
        )
        eval_data2 = MiraiJourneyService.evaluate_intern_journey(self.intern_profile)
        q3_still_blocked = next(q for q in eval_data2['quarters'] if q['quarterCode'] == 'Q3')
        self.assertFalse(q3_still_blocked['prerequisitesMet'])

        # Now verify N4 and provide required technical score (>= 3.5)
        unverified_n4.verification_status = VerificationStatus.VERIFIED
        unverified_n4.save()

        param = TechnicalCapabilityParameter.objects.create(
            name="Architecture",
            category="Competency Technical",
            benchmark_score=Decimal('4.0'),
            weight=Decimal('30.0')
        )
        TechnicalCapabilityReview.objects.create(
            parameter=param,
            employee=self.intern_profile,
            reviewer=self.mentor_user,
            score=Decimal('3.8')
        )

        eval_data3 = MiraiJourneyService.evaluate_intern_journey(self.intern_profile)
        q3_unlocked = next(q for q in eval_data3['quarters'] if q['quarterCode'] == 'Q3')
        self.assertTrue(q3_unlocked['prerequisitesMet'])


class MiraiJourneyAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.dept = Department.objects.create(name="Engineering", code="ENG")
        self.hr_user = User.objects.create_user(
            email="hr@test.com",
            username="hr_sarah",
            role=UserRole.HR
        )
        self.intern_user = User.objects.create_user(
            email="alex@test.com",
            username="intern_alex",
            role=UserRole.INTERN
        )
        self.intern_profile = EmployeeProfile.objects.create(
            user=self.intern_user,
            department=self.dept,
            designation="Backend Software Intern",
            employee_code="INT-001"
        )
        self.client.force_authenticate(user=self.intern_user)

    def test_get_journey_endpoint(self):
        url = reverse('intern:journey')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertIn('quarters', data)
        self.assertEqual(len(data['quarters']), 4)
        self.assertIn('overallProgressPercent', data)
        self.assertIn('currentQuarter', data)

    def test_submit_certification(self):
        url = reverse('intern:journey_submit_certification')
        payload = {
            'jlpt_level': 'N5',
            'score': '138/180',
            'certificate_url': 'https://example.com/cert.pdf',
            'status': 'CLEARED'
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cert = MiraiCertification.objects.filter(intern=self.intern_profile, jlpt_level='N5').first()
        self.assertIsNotNone(cert)
        self.assertEqual(cert.verification_status, VerificationStatus.PENDING)

    def test_verify_certification_by_hr(self):
        cert = MiraiCertification.objects.create(
            intern=self.intern_profile,
            name="JLPT N5",
            jlpt_level="N5",
            status=CertificationStatus.CLEARED,
            verification_status=VerificationStatus.PENDING,
            certificate_url="https://example.com/cert.pdf"
        )
        # Authenticate as HR
        self.client.force_authenticate(user=self.hr_user)
        verify_url = reverse('intern:journey_verify_certification', kwargs={'pk': cert.id})
        response = self.client.post(verify_url, {'is_verified': True, 'notes': 'HR Approved'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        cert.refresh_from_db()
        self.assertEqual(cert.verification_status, VerificationStatus.VERIFIED)
        self.assertEqual(cert.verified_by, self.hr_user)
