from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.organization.models import Department
from apps.employees.models import EmployeeProfile
from apps.performance.models import (
    PerformanceCycle,
    CycleStatus,
    EvaluationCriterion,
    Appraisal,
    AppraisalType,
    AppraisalStatus,
    AppraisalRating,
)
from apps.performance.services.scoring import ScoringService
from apps.goals.models import Goal, KPI

class PerformanceScoringAndAppraisalTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # HR
        self.hr = User.objects.create_user(
            email='hr@test.com',
            username='hr_admin',
            password='Password123!',
            role=UserRole.HR
        )

        # Manager
        self.manager = User.objects.create_user(
            email='manager@test.com',
            username='manager_bob',
            password='Password123!',
            role=UserRole.MANAGER
        )

        # Department
        self.dept = Department.objects.create(name='Mobile Development')

        # Intern
        self.intern_user = User.objects.create_user(
            email='intern_sam@test.com',
            username='intern_sam',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern_profile = EmployeeProfile.objects.create(
            user=self.intern_user,
            employee_code='INT-201',
            first_name='Sam',
            last_name='Wilson',
            department=self.dept,
            manager=self.manager
        )

        # Cycle
        self.cycle = PerformanceCycle.objects.create(
            name='Q3 2026 Cycle',
            start_date='2026-07-01',
            end_date='2026-09-30',
            status=CycleStatus.ACTIVE
        )

        # Evaluation Criteria (Total weight = 100%)
        self.crit1 = EvaluationCriterion.objects.create(
            name='Technical Competence',
            description='Code quality, architectural design, debugging skills',
            maximum_score=Decimal('100.00'),
            weight=Decimal('50.00')
        )
        self.crit2 = EvaluationCriterion.objects.create(
            name='Team Collaboration & Ownership',
            description='Communication, initiative, punctuality',
            maximum_score=Decimal('100.00'),
            weight=Decimal('50.00')
        )

    def test_scoring_service_mathematical_precision(self):
        # 1. Create a goal with 80% completion and a KPI with 100% target/achieved
        goal = Goal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            assigned_by=self.manager,
            title='Implement Chat Module',
            description='Mobile chat',
            due_date='2026-09-25',
            completion_percentage=Decimal('80.00')
        )
        KPI.objects.create(
            goal=goal,
            name='Tests Written',
            target_value=Decimal('10.00'),
            achieved_value=Decimal('10.00'),
            unit='tests'
        )
        # Goal avg = 80, KPI avg = 100. Composite = (80*0.5)+(100*0.5) = 90.00

        # 2. Create Manager Appraisal with ratings: Crit1: 90/100, Crit2: 90/100 -> 90.00
        mgr_appraisal = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.manager,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.SUBMITTED
        )
        AppraisalRating.objects.create(appraisal=mgr_appraisal, criterion=self.crit1, score=Decimal('90.00'))
        AppraisalRating.objects.create(appraisal=mgr_appraisal, criterion=self.crit2, score=Decimal('90.00'))

        # 3. Create Self Appraisal with ratings: Crit1: 80/100, Crit2: 80/100 -> 80.00
        self_appraisal = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.intern_user,
            appraisal_type=AppraisalType.SELF,
            status=AppraisalStatus.SUBMITTED
        )
        AppraisalRating.objects.create(appraisal=self_appraisal, criterion=self.crit1, score=Decimal('80.00'))
        AppraisalRating.objects.create(appraisal=self_appraisal, criterion=self.crit2, score=Decimal('80.00'))

        # Expected overall = (90.00 * 0.40) + (90.00 * 0.40) + (80.00 * 0.20)
        #                  = 36.00 + 36.00 + 16.00 = 88.00 (VERY_GOOD)
        calc = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle)
        self.assertEqual(calc['goals_composite_score'], 90.00)
        self.assertEqual(calc['manager_criteria_score'], 90.00)
        self.assertEqual(calc['self_assessment_score'], 80.00)
        self.assertEqual(calc['overall_score'], 88.00)
        self.assertEqual(calc['performance_grade'], 'VERY_GOOD')

    def test_appraisal_lifecycle_and_intern_visibility_restriction(self):
        # 1. Manager drafts an evaluation
        mgr_appraisal = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.manager,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.DRAFT,
            reviewer_comments='Preliminary confidential notes'
        )

        # 2. Intern attempts to list appraisals - should NOT see draft manager appraisal
        self.client.force_authenticate(user=self.intern_user)
        list_resp = self.client.get('/api/performance/appraisals/')
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        results = list_resp.data.get('results', list_resp.data)
        self.assertEqual(len(results), 0)

        # 3. Manager submits evaluation
        self.client.force_authenticate(user=self.manager)
        sub_resp = self.client.post(f'/api/performance/appraisals/{mgr_appraisal.id}/submit/', {
            'comments': 'Great work across the board.',
            'ratings': [
                {'criterion_id': str(self.crit1.id), 'score': '95.00', 'comments': 'Strong PRs'},
                {'criterion_id': str(self.crit2.id), 'score': '90.00', 'comments': 'Good attendance'}
            ]
        }, format='json')
        self.assertEqual(sub_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(sub_resp.data['status'], AppraisalStatus.SUBMITTED)

        # Intern STILL cannot see submitted manager appraisal (only published!)
        self.client.force_authenticate(user=self.intern_user)
        unpub_resp = self.client.get('/api/performance/appraisals/')
        self.assertEqual(len(unpub_resp.data.get('results', unpub_resp.data)), 0)

        # 4. HR Publishes the appraisal
        self.client.force_authenticate(user=self.hr)
        pub_resp = self.client.post(f'/api/performance/appraisals/{mgr_appraisal.id}/publish/', {
            'final_comments': 'Approved by HR Director'
        }, format='json')
        self.assertEqual(pub_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(pub_resp.data['status'], AppraisalStatus.PUBLISHED)
        self.assertIsNotNone(pub_resp.data['overall_score'])

        # 5. Intern CAN NOW view the published appraisal and final score!
        self.client.force_authenticate(user=self.intern_user)
        pub_view = self.client.get('/api/performance/appraisals/')
        results = pub_view.data.get('results', pub_view.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['status'], AppraisalStatus.PUBLISHED)
        self.assertEqual(results[0]['id'], str(mgr_appraisal.id))


class PerformanceCycleWorkspacePR2Tests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.hr = User.objects.create_user(
            email='hr_pr2@test.com',
            username='hr_pr2',
            password='Password123!',
            role=UserRole.HR
        )
        self.manager = User.objects.create_user(
            email='manager_pr2@test.com',
            username='manager_pr2',
            password='Password123!',
            role=UserRole.MANAGER
        )
        self.dept = Department.objects.create(name='AI Engineering')

        # Intern 1 with manager
        self.intern1_user = User.objects.create_user(
            email='intern1@test.com',
            username='intern1',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern1_profile = EmployeeProfile.objects.create(
            user=self.intern1_user,
            employee_code='INT-2026-001',
            first_name='Aarav',
            last_name='Sharma',
            department=self.dept,
            manager=self.manager
        )

        # Intern 2 WITHOUT manager (null manager)
        self.intern2_user = User.objects.create_user(
            email='intern2@test.com',
            username='intern2',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern2_profile = EmployeeProfile.objects.create(
            user=self.intern2_user,
            employee_code='INT-2026-002',
            first_name='Rohan',
            last_name='Verma',
            department=self.dept,
            manager=None
        )

        # Ineligible non-intern user
        self.staff_user = User.objects.create_user(
            email='staff@test.com',
            username='staff_member',
            password='Password123!',
            role=UserRole.MANAGER
        )
        self.staff_profile = EmployeeProfile.objects.create(
            user=self.staff_user,
            employee_code='MGR-001',
            first_name='David',
            last_name='Miller',
            department=self.dept
        )

    def test_draft_cycle_creation_minimal(self):
        self.client.force_authenticate(user=self.hr)
        resp = self.client.post('/api/performance/cycles/', {
            'name': 'MIRAI Q2 2026 Batch A'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], 'DRAFT')
        self.assertEqual(resp.data['technical_weight'], '60.00')
        self.assertEqual(resp.data['behavioral_weight'], '40.00')
        self.assertIsNotNone(resp.data['start_date'])
        self.assertIsNotNone(resp.data['end_date'])

    def test_draft_incremental_update_and_normal_save_does_not_activate(self):
        self.client.force_authenticate(user=self.hr)
        create_resp = self.client.post('/api/performance/cycles/', {
            'name': 'Incremental Cycle'
        }, format='json')
        cycle_id = create_resp.data['id']

        # Update weights incrementally (even if not yet summing to 100)
        up_resp = self.client.patch(f'/api/performance/cycles/{cycle_id}/', {
            'technical_weight': '65.00',
            'behavioral_weight': '40.00',
            'mirai_stage': 'Q2'
        }, format='json')
        self.assertEqual(up_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(up_resp.data['status'], 'DRAFT')
        self.assertEqual(up_resp.data['technical_weight'], '65.00')

    def test_activation_readiness_failure_missing_participants(self):
        self.client.force_authenticate(user=self.hr)
        cycle = PerformanceCycle.objects.create(
            name='Ready Setup Cycle No Participants',
            start_date='2026-04-01',
            end_date='2026-06-30',
            mirai_stage='Q2',
            technical_weight=Decimal('60.00'),
            behavioral_weight=Decimal('40.00'),
            self_assessment_deadline='2026-06-15',
            evaluator_deadline='2026-06-25',
            status='DRAFT'
        )

        resp = self.client.post(f'/api/performance/cycles/{cycle.id}/activate/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('readiness_errors', resp.data)
        self.assertTrue(any('intern must be enrolled' in err for err in resp.data['readiness_errors']))

    def test_activation_readiness_failure_unbalanced_weights(self):
        self.client.force_authenticate(user=self.hr)
        cycle = PerformanceCycle.objects.create(
            name='Unbalanced Cycle',
            start_date='2026-04-01',
            end_date='2026-06-30',
            mirai_stage='Q2',
            technical_weight=Decimal('70.00'),
            behavioral_weight=Decimal('40.00'),
            self_assessment_deadline='2026-06-15',
            evaluator_deadline='2026-06-25',
            status='DRAFT'
        )
        # Enroll 1 intern
        from apps.performance.models import CycleParticipant
        CycleParticipant.objects.create(cycle=cycle, employee=self.intern1_profile)

        resp = self.client.post(f'/api/performance/cycles/{cycle.id}/activate/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(any('must sum to exactly 100.00%' in err for err in resp.data['readiness_errors']))

    def test_activation_readiness_failure_deadline_sequence(self):
        self.client.force_authenticate(user=self.hr)
        cycle = PerformanceCycle.objects.create(
            name='Bad Sequence Cycle',
            start_date='2026-04-01',
            end_date='2026-06-30',
            mirai_stage='Q2',
            technical_weight=Decimal('60.00'),
            behavioral_weight=Decimal('40.00'),
            self_assessment_deadline='2026-06-25',
            evaluator_deadline='2026-06-10',  # before self assessment!
            status='DRAFT'
        )
        from apps.performance.models import CycleParticipant
        CycleParticipant.objects.create(cycle=cycle, employee=self.intern1_profile)

        resp = self.client.post(f'/api/performance/cycles/{cycle.id}/activate/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(any('Evaluator review deadline must be on or after' in err for err in resp.data['readiness_errors']))

    def test_successful_activation(self):
        self.client.force_authenticate(user=self.hr)
        cycle = PerformanceCycle.objects.create(
            name='Full Ready Cycle',
            start_date='2026-04-01',
            end_date='2026-06-30',
            mirai_stage='Q2',
            technical_weight=Decimal('60.00'),
            behavioral_weight=Decimal('40.00'),
            self_assessment_deadline='2026-06-15',
            evaluator_deadline='2026-06-25',
            japanese_evaluation_mandatory=False,
            status='DRAFT'
        )
        from apps.performance.models import CycleParticipant
        CycleParticipant.objects.create(cycle=cycle, employee=self.intern1_profile)

        resp = self.client.post(f'/api/performance/cycles/{cycle.id}/activate/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        cycle.refresh_from_db()
        self.assertEqual(cycle.status, 'ACTIVE')
        self.assertEqual(cycle.evidence_deadline, cycle.self_assessment_deadline)

    def test_japanese_configuration_tri_state_and_activation(self):
        self.client.force_authenticate(user=self.hr)
        from apps.performance.models import CycleParticipant

        # Case 1: Unconfigured (None) -> Activation BLOCKED
        cycle_unconfigured = PerformanceCycle.objects.create(
            name='Japanese Unconfigured Cycle',
            start_date='2026-04-01',
            end_date='2026-06-30',
            mirai_stage='Q2',
            technical_weight=Decimal('60.00'),
            behavioral_weight=Decimal('40.00'),
            self_assessment_deadline='2026-06-15',
            evaluator_deadline='2026-06-25',
            japanese_evaluation_mandatory=None,
            status='DRAFT'
        )
        CycleParticipant.objects.create(cycle=cycle_unconfigured, employee=self.intern1_profile)

        readiness_resp = self.client.get(f'/api/performance/cycles/{cycle_unconfigured.id}/readiness/')
        self.assertFalse(readiness_resp.data['is_ready'])
        self.assertFalse(readiness_resp.data['checklist']['japanese_mandatory_explicit'])
        self.assertTrue(any('Japanese evaluation requirement must be explicitly configured' in err for err in readiness_resp.data['readiness_errors']))

        act_resp = self.client.post(f'/api/performance/cycles/{cycle_unconfigured.id}/activate/')
        self.assertEqual(act_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Case 2: Explicitly Configured as Mandatory (True) -> Activation SUCCEEDS
        cycle_mandatory = PerformanceCycle.objects.create(
            name='Japanese Mandatory Cycle',
            start_date='2026-04-01',
            end_date='2026-06-30',
            mirai_stage='Q2',
            technical_weight=Decimal('60.00'),
            behavioral_weight=Decimal('40.00'),
            self_assessment_deadline='2026-06-15',
            evaluator_deadline='2026-06-25',
            japanese_evaluation_mandatory=True,
            status='DRAFT'
        )
        CycleParticipant.objects.create(cycle=cycle_mandatory, employee=self.intern1_profile)

        act_mandatory_resp = self.client.post(f'/api/performance/cycles/{cycle_mandatory.id}/activate/')
        self.assertEqual(act_mandatory_resp.status_code, status.HTTP_200_OK)
        cycle_mandatory.refresh_from_db()
        self.assertEqual(cycle_mandatory.status, 'ACTIVE')
        self.assertTrue(cycle_mandatory.japanese_evaluation_mandatory)

        # Case 3: Explicitly Configured as Not Mandatory (False) -> Activation SUCCEEDS
        cycle_not_mandatory = PerformanceCycle.objects.create(
            name='Japanese Not Mandatory Cycle',
            start_date='2026-04-01',
            end_date='2026-06-30',
            mirai_stage='Q2',
            technical_weight=Decimal('60.00'),
            behavioral_weight=Decimal('40.00'),
            self_assessment_deadline='2026-06-15',
            evaluator_deadline='2026-06-25',
            japanese_evaluation_mandatory=False,
            status='DRAFT'
        )
        CycleParticipant.objects.create(cycle=cycle_not_mandatory, employee=self.intern1_profile)

        act_not_mandatory_resp = self.client.post(f'/api/performance/cycles/{cycle_not_mandatory.id}/activate/')
        self.assertEqual(act_not_mandatory_resp.status_code, status.HTTP_200_OK)
        cycle_not_mandatory.refresh_from_db()
        self.assertEqual(cycle_not_mandatory.status, 'ACTIVE')
        self.assertFalse(cycle_not_mandatory.japanese_evaluation_mandatory)

    def test_draft_saving_and_reopening_preserves_japanese_state(self):
        self.client.force_authenticate(user=self.hr)

        # 1. Create minimal draft -> japanese_evaluation_mandatory is None
        create_resp = self.client.post('/api/performance/cycles/', {'name': 'Draft Japanese Test Cycle'}, format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        cycle_id = create_resp.data['id']
        self.assertIsNone(create_resp.data['japanese_evaluation_mandatory'])

        # 2. Update to True
        up1 = self.client.patch(f'/api/performance/cycles/{cycle_id}/', {'japanese_evaluation_mandatory': True}, format='json')
        self.assertEqual(up1.status_code, status.HTTP_200_OK)
        self.assertTrue(up1.data['japanese_evaluation_mandatory'])

        # 3. Reopen via GET
        get1 = self.client.get(f'/api/performance/cycles/{cycle_id}/')
        self.assertTrue(get1.data['japanese_evaluation_mandatory'])

        # 4. Update to False
        up2 = self.client.patch(f'/api/performance/cycles/{cycle_id}/', {'japanese_evaluation_mandatory': False}, format='json')
        self.assertEqual(up2.status_code, status.HTTP_200_OK)
        self.assertFalse(up2.data['japanese_evaluation_mandatory'])

        # 5. Reopen via GET
        get2 = self.client.get(f'/api/performance/cycles/{cycle_id}/')
        self.assertFalse(get2.data['japanese_evaluation_mandatory'])

    def test_bulk_enrollment_with_mentor_and_unassigned_mentor(self):
        self.client.force_authenticate(user=self.hr)
        cycle = PerformanceCycle.objects.create(
            name='Enrollment Test Cycle',
            start_date='2026-04-01',
            end_date='2026-06-30',
            status='DRAFT'
        )

        resp = self.client.post(f'/api/performance/cycles/{cycle.id}/enroll/', {
            'employee_ids': [
                str(self.intern1_profile.id),
                str(self.intern2_profile.id),
                str(self.staff_profile.id)  # inelligible
            ]
        }, format='json')

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['enrolled_count'], 2)
        self.assertEqual(resp.data['failed_count'], 1)

        # Intern 1 has mentor
        res1 = next(r for r in resp.data['results'] if r['employee_id'] == str(self.intern1_profile.id))
        self.assertEqual(res1['status'], 'ENROLLED')
        self.assertTrue(res1['mentor_assigned'])

        # Intern 2 has NO mentor, still enrolled cleanly!
        res2 = next(r for r in resp.data['results'] if r['employee_id'] == str(self.intern2_profile.id))
        self.assertEqual(res2['status'], 'ENROLLED')
        self.assertFalse(res2['mentor_assigned'])

        # Staff member failed
        res3 = next(r for r in resp.data['results'] if r['employee_id'] == str(self.staff_profile.id))
        self.assertEqual(res3['status'], 'FAILED')

        # Submitting duplicate returns SKIPPED
        dup_resp = self.client.post(f'/api/performance/cycles/{cycle.id}/enroll/', {
            'employee_ids': [str(self.intern1_profile.id)]
        }, format='json')
        self.assertEqual(dup_resp.data['enrolled_count'], 0)
        self.assertEqual(dup_resp.data['skipped_count'], 1)

    def test_safe_unenrollment_and_409_conflict_protection(self):
        self.client.force_authenticate(user=self.hr)
        cycle = PerformanceCycle.objects.create(
            name='Safe Unenroll Cycle',
            start_date='2026-04-01',
            end_date='2026-06-30',
            status='DRAFT'
        )
        from apps.performance.models import CycleParticipant
        part1 = CycleParticipant.objects.create(cycle=cycle, employee=self.intern1_profile)
        part2 = CycleParticipant.objects.create(cycle=cycle, employee=self.intern2_profile)

        # Unenroll part2 cleanly
        del_resp = self.client.delete(f'/api/performance/cycles/{cycle.id}/participants/{part2.id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CycleParticipant.objects.filter(id=part2.id).exists())

        # Create an appraisal for part1
        Appraisal.objects.create(
            cycle=cycle,
            employee=self.intern1_profile,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.DRAFT
        )

        # Unenroll part1 should be BLOCKED with 409
        del_blocked = self.client.delete(f'/api/performance/cycles/{cycle.id}/participants/{part1.id}/')
        self.assertEqual(del_blocked.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(del_blocked.data['error'], 'HISTORICAL_RECORDS_EXIST')
        self.assertTrue(CycleParticipant.objects.filter(id=part1.id).exists())

    def test_role_based_cycle_and_participant_access(self):
        # Create 1 draft cycle and 1 active cycle
        draft_cycle = PerformanceCycle.objects.create(
            name='Draft Cycle',
            start_date='2026-04-01',
            end_date='2026-06-30',
            status='DRAFT'
        )
        active_cycle = PerformanceCycle.objects.create(
            name='Active Cycle',
            start_date='2026-04-01',
            end_date='2026-06-30',
            status='ACTIVE'
        )
        from apps.performance.models import CycleParticipant
        CycleParticipant.objects.create(cycle=active_cycle, employee=self.intern1_profile)
        CycleParticipant.objects.create(cycle=active_cycle, employee=self.intern2_profile)

        # HR sees both cycles
        self.client.force_authenticate(user=self.hr)
        hr_resp = self.client.get('/api/performance/cycles/')
        cycle_names = [c['name'] for c in hr_resp.data.get('results', hr_resp.data)]
        self.assertIn('Draft Cycle', cycle_names)
        self.assertIn('Active Cycle', cycle_names)

        # Mentor only sees active cycle
        self.client.force_authenticate(user=self.manager)
        mgr_resp = self.client.get('/api/performance/cycles/')
        mgr_names = [c['name'] for c in mgr_resp.data.get('results', mgr_resp.data)]
        self.assertNotIn('Draft Cycle', mgr_names)
        self.assertIn('Active Cycle', mgr_names)

        # Mentor querying participants of active cycle ONLY sees Intern 1 (assigned mentee), NOT Intern 2
        mgr_part_resp = self.client.get(f'/api/performance/cycles/{active_cycle.id}/participants/')
        mgr_part_names = [p['full_name'] for p in mgr_part_resp.data.get('results', mgr_part_resp.data)]
        self.assertIn('Aarav Sharma', mgr_part_names)
        self.assertNotIn('Rohan Verma', mgr_part_names)

        # Intern 2 (enrolled in active cycle) only sees their own participant record
        self.client.force_authenticate(user=self.intern2_user)
        intern_part_resp = self.client.get(f'/api/performance/cycles/{active_cycle.id}/participants/')
        intern_part_names = [p['full_name'] for p in intern_part_resp.data.get('results', intern_part_resp.data)]
        self.assertIn('Rohan Verma', intern_part_names)
        self.assertNotIn('Aarav Sharma', intern_part_names)

    def test_eligible_interns_directory(self):
        self.client.force_authenticate(user=self.hr)
        resp = self.client.get('/api/performance/cycles/eligible-interns/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        emp_codes = [e['employee_code'] for e in resp.data.get('results', resp.data)]
        self.assertIn('INT-2026-001', emp_codes)
        self.assertIn('INT-2026-002', emp_codes)
        self.assertNotIn('MGR-001', emp_codes)

    def test_intern_forbidden_from_cohort_directory_and_drafts(self):
        # Intern cannot view eligible interns directory
        self.client.force_authenticate(user=self.intern1_user)
        resp = self.client.get('/api/performance/cycles/eligible-interns/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # Intern cannot create cycle
        create_resp = self.client.post('/api/performance/cycles/', {'name': 'Intern Forbidden Cycle'})
        self.assertEqual(create_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_unenrollment_blocked_on_active_cycle(self):
        self.client.force_authenticate(user=self.hr)
        cycle = PerformanceCycle.objects.create(
            name='Active Locked Unenroll Cycle',
            start_date='2026-04-01',
            end_date='2026-06-30',
            status='ACTIVE'
        )
        from apps.performance.models import CycleParticipant
        part = CycleParticipant.objects.create(cycle=cycle, employee=self.intern1_profile)

        resp = self.client.delete(f'/api/performance/cycles/{cycle.id}/participants/{part.id}/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(CycleParticipant.objects.filter(id=part.id).exists())
