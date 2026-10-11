from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import User, UserRole
from apps.employees.models import EmployeeProfile
from apps.audit.models import AuditLog
from apps.intern.models import (
    QuarterCode, QuarterStatus, CertificationStatus, VerificationStatus,
    MiraiQuarterProgress, MiraiCertification
)
from apps.intern.services import MiraiJourneyService


class MiraiDirectoryIntegrationTests(APITestCase):
    def setUp(self):
        # HR user
        self.hr_user = User.objects.create_user(
            username='hr_tester',
            email='hr_tester@example.com',
            password='Password123!',
            role=UserRole.HR
        )
        self.hr_profile = EmployeeProfile.objects.create(
            user=self.hr_user,
            employee_code='HR-TEST-001',
            first_name='HR',
            last_name='Tester'
        )

        # Intern A
        self.intern_a_user = User.objects.create_user(
            username='intern_alpha',
            email='intern_alpha@example.com',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern_a = EmployeeProfile.objects.create(
            user=self.intern_a_user,
            employee_code='INT-ALPHA-01',
            first_name='Alpha',
            last_name='Intern'
        )

        # Intern B
        self.intern_b_user = User.objects.create_user(
            username='intern_beta',
            email='intern_beta@example.com',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern_b = EmployeeProfile.objects.create(
            user=self.intern_b_user,
            employee_code='INT-BETA-02',
            first_name='Beta',
            last_name='Intern'
        )

    def test_hr_can_view_specific_intern_journey(self):
        self.client.force_authenticate(user=self.hr_user)
        url = reverse('intern:journey_detail', kwargs={'pk': str(self.intern_a.id)})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('data', {})
        self.assertEqual(data['intern']['employeeCode'], 'INT-ALPHA-01')
        self.assertEqual(len(data['quarters']), 4)

    def test_hr_receives_404_for_nonexistent_intern(self):
        self.client.force_authenticate(user=self.hr_user)
        url = reverse('intern:journey_detail', kwargs={'pk': '00000000-0000-0000-0000-000000000000'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_intern_cannot_access_other_intern_journey(self):
        # Intern Alpha attempts to view Intern Beta's journey
        self.client.force_authenticate(user=self.intern_a_user)
        url = reverse('intern:journey_detail', kwargs={'pk': str(self.intern_b.id)})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_intern_cannot_edit_journey(self):
        self.client.force_authenticate(user=self.intern_a_user)
        url = reverse('intern:journey_detail', kwargs={'pk': str(self.intern_a.id)})
        response = self.client.patch(url, {'quarters': [{'quarter_code': 'Q2', 'progress': 50}]}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hr_edit_journey_with_progress_validation(self):
        self.client.force_authenticate(user=self.hr_user)
        url = reverse('intern:journey_detail', kwargs={'pk': str(self.intern_a.id)})

        # Progress > 100 must fail
        res_invalid = self.client.patch(url, {'quarters': [{'quarter_code': 'Q2', 'progress': 125}]}, format='json')
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)

        # Progress < 0 must fail
        res_negative = self.client.patch(url, {'quarters': [{'quarter_code': 'Q2', 'progress': -10}]}, format='json')
        self.assertEqual(res_negative.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid update (80%)
        res_valid = self.client.patch(url, {
            'quarters': [{
                'quarter_code': 'Q2',
                'progress': 80.0,
                'status': 'IN_PROGRESS',
                'current_focus': 'Sprint Technical Ownership'
            }]
        }, format='json')
        self.assertEqual(res_valid.status_code, status.HTTP_200_OK)

        # Verify DB persistence
        q2 = MiraiQuarterProgress.objects.get(intern=self.intern_a, quarter_code='Q2')
        self.assertEqual(q2.completion_percentage, Decimal('80.00'))
        self.assertEqual(q2.status, QuarterStatus.IN_PROGRESS)
        self.assertTrue(q2.is_manually_updated)

        # Verify Audit Log
        audit = AuditLog.objects.filter(entity_type='MIRAI_JOURNEY', entity_id=str(self.intern_a.id)).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.action, 'UPDATE')
        self.assertEqual(audit.actor, self.hr_user)

    def test_q3_prerequisite_validation(self):
        self.client.force_authenticate(user=self.hr_user)
        url = reverse('intern:journey_detail', kwargs={'pk': str(self.intern_a.id)})

        # Without N4 verified, cannot set Q3 to IN_PROGRESS
        res = self.client.patch(url, {'quarters': [{'quarter_code': 'Q3', 'status': 'IN_PROGRESS'}]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('prerequisites', res.data.get('message', '').lower())

        # With admin override, succeeds
        res_override = self.client.patch(url, {
            'quarters': [{'quarter_code': 'Q3', 'status': 'IN_PROGRESS', 'force_override': True}]
        }, format='json')
        self.assertEqual(res_override.status_code, status.HTTP_200_OK)

    def test_new_intern_starts_with_0_percent_not_started(self):
        # Create a brand new intern
        new_u = User.objects.create_user(username='new_intern_gamma', email='gamma@example.com', password='Password123!', role=UserRole.INTERN)
        new_p = EmployeeProfile.objects.create(user=new_u, employee_code='INT-GAMMA-03', first_name='Gamma', last_name='Intern')

        quarters = MiraiJourneyService.get_or_initialize_quarters(new_p)
        q1 = next(q for q in quarters if q.quarter_code == 'Q1')
        self.assertEqual(q1.status, QuarterStatus.NOT_STARTED)
        self.assertEqual(q1.completion_percentage, Decimal('0.00'))
        self.assertFalse(q1.is_manually_updated)
