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

    def _setup_cycle_competencies_and_evaluators(self, cycle, participant, is_japanese_mandatory=False, japanese_instructor=None):
        from apps.performance.models import CycleCompetency, CompetencySection, CycleEvaluatorAssignment, EvaluatorSectionType
        CycleCompetency.objects.create(
            cycle=cycle,
            section=CompetencySection.TECHNICAL,
            name='Core Engineering',
            weight=Decimal('100.00'),
            benchmark_score=Decimal('4.0')
        )
        CycleCompetency.objects.create(
            cycle=cycle,
            section=CompetencySection.BEHAVIORAL,
            name='Collaboration & Communication',
            weight=Decimal('100.00'),
            benchmark_score=Decimal('4.0')
        )
        CycleEvaluatorAssignment.objects.create(
            cycle=cycle,
            participant=participant,
            evaluator=self.manager,
            section=EvaluatorSectionType.TECHNICAL,
            is_mandatory=True
        )
        CycleEvaluatorAssignment.objects.create(
            cycle=cycle,
            participant=participant,
            evaluator=self.manager,
            section=EvaluatorSectionType.BEHAVIORAL,
            is_mandatory=True
        )
        if is_japanese_mandatory:
            from apps.japanese.models import JapaneseEvalCriterion
            JapaneseEvalCriterion.objects.create(
                cycle=cycle,
                name='Spoken Japanese Fluency',
                weight=Decimal('100.00')
            )
            if japanese_instructor:
                CycleEvaluatorAssignment.objects.create(
                    cycle=cycle,
                    participant=participant,
                    evaluator=japanese_instructor,
                    section=EvaluatorSectionType.JAPANESE,
                    is_mandatory=True
                )

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
        part = CycleParticipant.objects.create(cycle=cycle, employee=self.intern1_profile)
        self._setup_cycle_competencies_and_evaluators(cycle, part, is_japanese_mandatory=False)

        resp = self.client.post(f'/api/performance/cycles/{cycle.id}/activate/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        cycle.refresh_from_db()
        self.assertEqual(cycle.status, 'ACTIVE')
        self.assertEqual(cycle.evidence_deadline, cycle.self_assessment_deadline)

    def test_japanese_configuration_tri_state_and_activation(self):
        self.client.force_authenticate(user=self.hr)
        from apps.performance.models import CycleParticipant
        from apps.japanese.models import JapaneseBatch

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

        # Setup Japanese instructor & batch for Case 2
        sensei = User.objects.create_user(
            email='sensei@test.com',
            username='tanaka_sensei',
            password='Password123!',
            role=UserRole.MANAGER
        )
        jp_batch = JapaneseBatch.objects.create(name='Batch Tokyo 2026')
        jp_batch.interns.add(self.intern1_profile)
        jp_batch.instructors.add(sensei)

        # Case 2: Explicitly Configured as Mandatory (True) -> Activation SUCCEEDS when criteria & evaluator assigned
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
        part_mand = CycleParticipant.objects.create(cycle=cycle_mandatory, employee=self.intern1_profile)
        self._setup_cycle_competencies_and_evaluators(
            cycle_mandatory, part_mand, is_japanese_mandatory=True, japanese_instructor=sensei
        )

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
        part_not_mand = CycleParticipant.objects.create(cycle=cycle_not_mandatory, employee=self.intern1_profile)
        self._setup_cycle_competencies_and_evaluators(
            cycle_not_mandatory, part_not_mand, is_japanese_mandatory=False
        )

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


class PerformanceCompetenciesAndEvaluatorAssignmentPR3Tests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # HR Admin
        self.hr = User.objects.create_user(
            email='hr_pr3@test.com',
            username='hr_pr3',
            password='Password123!',
            role=UserRole.HR
        )

        # Manager / Mentor
        self.manager = User.objects.create_user(
            email='mentor_alice@test.com',
            username='mentor_alice',
            password='Password123!',
            role=UserRole.MANAGER
        )

        # Department
        self.dept = Department.objects.create(name='Cloud Architecture')

        # Intern 1 (has manager)
        self.intern1_user = User.objects.create_user(
            email='intern1_pr3@test.com',
            username='intern1_pr3',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern1_profile = EmployeeProfile.objects.create(
            user=self.intern1_user,
            employee_code='INT-PR3-001',
            first_name='Kenji',
            last_name='Sato',
            department=self.dept,
            manager=self.manager
        )

        # Intern 2 (no manager)
        self.intern2_user = User.objects.create_user(
            email='intern2_pr3@test.com',
            username='intern2_pr3',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern2_profile = EmployeeProfile.objects.create(
            user=self.intern2_user,
            employee_code='INT-PR3-002',
            first_name='Yuki',
            last_name='Takahashi',
            department=self.dept,
            manager=None
        )

        # Japanese Instructors
        self.sensei_a = User.objects.create_user(
            email='sensei_a@test.com',
            username='sensei_a',
            password='Password123!',
            role=UserRole.MANAGER
        )
        self.sensei_b = User.objects.create_user(
            email='sensei_b@test.com',
            username='sensei_b',
            password='Password123!',
            role=UserRole.MANAGER
        )

        # Japanese Batches
        # Batch 1: single instructor (sensei_a), intern1 enrolled
        from apps.japanese.models import JapaneseBatch
        self.batch_single = JapaneseBatch.objects.create(name='Tokyo Alpha Batch')
        self.batch_single.interns.add(self.intern1_profile)
        self.batch_single.instructors.add(self.sensei_a)

        # Batch 2: multiple instructors (sensei_a & sensei_b), intern2 enrolled
        self.batch_multi = JapaneseBatch.objects.create(name='Kyoto Beta Batch')
        self.batch_multi.interns.add(self.intern2_profile)
        self.batch_multi.instructors.add(self.sensei_a)
        self.batch_multi.instructors.add(self.sensei_b)

        # Draft Cycle
        self.cycle = PerformanceCycle.objects.create(
            name='MIRAI Q3 2026 Appraisal Cycle',
            start_date='2026-07-01',
            end_date='2026-09-30',
            mirai_stage='Q3',
            technical_weight=Decimal('60.00'),
            behavioral_weight=Decimal('40.00'),
            rating_scale_max=Decimal('5.0'),
            self_assessment_deadline='2026-09-15',
            evaluator_deadline='2026-09-25',
            japanese_evaluation_mandatory=True,
            status='DRAFT'
        )

        # Enroll both interns
        from apps.performance.models import CycleParticipant
        self.part1 = CycleParticipant.objects.create(cycle=self.cycle, employee=self.intern1_profile)
        self.part2 = CycleParticipant.objects.create(cycle=self.cycle, employee=self.intern2_profile)

    def test_competency_incremental_draft_creation_and_validation(self):
        self.client.force_authenticate(user=self.hr)

        # 1. Draft save with partial weight (30%) succeeds without requiring 100%
        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/competencies/', {
            'section': 'TECHNICAL',
            'name': 'Cloud Infrastructure & IaC',
            'description': 'Terraform, AWS, CI/CD automation',
            'weight': '30.00',
            'benchmark_score': '4.0',
            'rubric_descriptors': {
                '1': 'Unable to deploy basic cloud components',
                '3': 'Deploys Terraform templates with guidance',
                '5': 'Designs scalable production architecture independently'
            }
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['weight'], '30.00')
        self.assertEqual(resp.data['benchmark_score'], '4.0')
        self.assertEqual(resp.data['rubric_descriptors']['5'], 'Designs scalable production architecture independently')

        # 2. Duplicate name within same section and cycle is rejected
        dup_resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/competencies/', {
            'section': 'TECHNICAL',
            'name': 'Cloud Infrastructure & IaC',
            'weight': '70.00'
        }, format='json')
        self.assertEqual(dup_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue('name' in dup_resp.data or 'non_field_errors' in dup_resp.data)

        # 3. Same name in DIFFERENT section is allowed
        diff_sec_resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/competencies/', {
            'section': 'BEHAVIORAL',
            'name': 'Cloud Infrastructure & IaC',
            'weight': '40.00'
        }, format='json')
        self.assertEqual(diff_sec_resp.status_code, status.HTTP_201_CREATED)

    def test_competency_crud_via_standard_viewset(self):
        from apps.performance.models import CycleCompetency, CompetencySection
        comp = CycleCompetency.objects.create(
            cycle=self.cycle,
            section=CompetencySection.TECHNICAL,
            name='Backend API Development',
            weight=Decimal('50.00')
        )

        # Authenticated user can read
        self.client.force_authenticate(user=self.manager)
        list_resp = self.client.get(f'/api/performance/competencies/?cycle={self.cycle.id}')
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        results = list_resp.data.get('results', list_resp.data)
        self.assertTrue(any(c['name'] == 'Backend API Development' for c in results))

        # Regular non-HR user cannot patch or delete
        patch_unauth = self.client.patch(f'/api/performance/competencies/{comp.id}/', {'weight': '60.00'})
        self.assertEqual(patch_unauth.status_code, status.HTTP_403_FORBIDDEN)

        # HR can patch and delete
        self.client.force_authenticate(user=self.hr)
        patch_hr = self.client.patch(f'/api/performance/competencies/{comp.id}/', {'weight': '60.00'})
        self.assertEqual(patch_hr.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_hr.data['weight'], '60.00')

        del_hr = self.client.delete(f'/api/performance/competencies/{comp.id}/')
        self.assertEqual(del_hr.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CycleCompetency.objects.filter(id=comp.id).exists())

    def test_auto_assign_evaluators_rules(self):
        self.client.force_authenticate(user=self.hr)

        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/evaluators/auto-assign/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data

        # Intern 1 has manager -> technical & behavioral assigned
        self.assertEqual(data['technical_assigned'], 1)
        self.assertEqual(data['behavioral_assigned'], 1)

        # Japanese: intern 1 has single instructor (sensei_a) -> assigned; intern 2 has 2 instructors -> ambiguous
        self.assertEqual(data['japanese_assigned'], 1)
        self.assertEqual(data['ambiguous_japanese_count'], 1)

        from apps.performance.models import CycleEvaluatorAssignment, EvaluatorSectionType
        asgns_p1 = {
            a.section: a for a in CycleEvaluatorAssignment.objects.filter(cycle=self.cycle, participant=self.part1)
        }
        self.assertEqual(asgns_p1[EvaluatorSectionType.TECHNICAL].evaluator, self.manager)
        self.assertEqual(asgns_p1[EvaluatorSectionType.BEHAVIORAL].evaluator, self.manager)
        self.assertEqual(asgns_p1[EvaluatorSectionType.JAPANESE].evaluator, self.sensei_a)

        # Intern 2 has no technical or behavioral assignment (no manager configured)
        self.assertFalse(
            CycleEvaluatorAssignment.objects.filter(cycle=self.cycle, participant=self.part2, section=EvaluatorSectionType.TECHNICAL).exists()
        )

    def test_manual_assignment_eligibility_and_unassign(self):
        self.client.force_authenticate(user=self.hr)
        from apps.performance.models import CycleEvaluatorAssignment, EvaluatorSectionType

        # 1. Assigning manager to Technical for intern 2 succeeds
        assign_tech = self.client.post(f'/api/performance/cycles/{self.cycle.id}/evaluators/assign/', {
            'participant_id': str(self.part2.id),
            'section': 'TECHNICAL',
            'evaluator_id': str(self.manager.id)
        }, format='json')
        self.assertEqual(assign_tech.status_code, status.HTTP_200_OK)
        self.assertTrue(assign_tech.data['created'])

        # 2. Assigning non-manager/non-HR (e.g. intern) to Technical is rejected
        assign_invalid = self.client.post(f'/api/performance/cycles/{self.cycle.id}/evaluators/assign/', {
            'participant_id': str(self.part2.id),
            'section': 'TECHNICAL',
            'evaluator_id': str(self.intern1_user.id)
        }, format='json')
        self.assertEqual(assign_invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Mentor, Manager, or HR', assign_invalid.data['detail'])

        # 3. Japanese instructor must be in intern's batch
        # Create external instructor sensei_c not in intern1's batch
        sensei_c = User.objects.create_user(
            email='sensei_c@test.com',
            username='sensei_c',
            password='Password123!',
            role=UserRole.MANAGER
        )
        assign_jp_external = self.client.post(f'/api/performance/cycles/{self.cycle.id}/evaluators/assign/', {
            'participant_id': str(self.part1.id),
            'section': 'JAPANESE',
            'evaluator_id': str(sensei_c.id)
        }, format='json')
        self.assertEqual(assign_jp_external.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("assigned Japanese instructor for this intern's batch", assign_jp_external.data['detail'])

        # Assigning sensei_a (in intern1's batch) succeeds
        assign_jp_valid = self.client.post(f'/api/performance/cycles/{self.cycle.id}/evaluators/assign/', {
            'participant_id': str(self.part1.id),
            'section': 'JAPANESE',
            'evaluator_id': str(self.sensei_a.id)
        }, format='json')
        self.assertEqual(assign_jp_valid.status_code, status.HTTP_200_OK)

        # 4. Unassigning evaluator by passing evaluator_id = None
        unassign_resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/evaluators/assign/', {
            'participant_id': str(self.part1.id),
            'section': 'JAPANESE',
            'evaluator_id': None
        }, format='json')
        self.assertEqual(unassign_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(unassign_resp.data['unassigned'])
        self.assertFalse(
            CycleEvaluatorAssignment.objects.filter(cycle=self.cycle, participant=self.part1, section=EvaluatorSectionType.JAPANESE).exists()
        )

    def test_evaluator_matrix_endpoint(self):
        self.client.force_authenticate(user=self.hr)

        # Auto-assign first
        self.client.post(f'/api/performance/cycles/{self.cycle.id}/evaluators/auto-assign/')

        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluators/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data

        self.assertIn('summary', data)
        self.assertIn('matrix', data)
        self.assertIn('available_mentors', data)
        self.assertIn('available_instructors', data)

        matrix = data['matrix']
        self.assertEqual(len(matrix), 2)

        # Find intern 1 row
        row_p1 = next(r for r in matrix if r['participant_id'] == str(self.part1.id))
        self.assertEqual(row_p1['japanese_status']['status_badge'], 'ASSIGNED')
        self.assertIsNotNone(row_p1['assignments']['technical'])
        self.assertIsNotNone(row_p1['assignments']['behavioral'])
        self.assertIsNotNone(row_p1['assignments']['japanese'])
        self.assertTrue(row_p1['is_fully_assigned'])

        # Find intern 2 row
        row_p2 = next(r for r in matrix if r['participant_id'] == str(self.part2.id))
        self.assertEqual(row_p2['japanese_status']['status_badge'], 'AMBIGUOUS')
        self.assertFalse(row_p2['is_fully_assigned'])

    def test_activation_readiness_end_to_end_pr3(self):
        self.client.force_authenticate(user=self.hr)
        from apps.performance.models import CycleCompetency, CompetencySection, CycleEvaluatorAssignment, EvaluatorSectionType
        from apps.japanese.models import JapaneseEvalCriterion

        # 1. Currently unconfigured competencies -> activation fails
        resp1 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/activate/')
        self.assertEqual(resp1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(any('Technical competencies must be configured' in e for e in resp1.data['readiness_errors']))
        self.assertTrue(any('Behavioral competencies must be configured' in e for e in resp1.data['readiness_errors']))

        # 2. Add unbalanced technical (80%) and behavioral (100%)
        CycleCompetency.objects.create(
            cycle=self.cycle, section=CompetencySection.TECHNICAL, name='Architecture', weight=Decimal('80.00')
        )
        CycleCompetency.objects.create(
            cycle=self.cycle, section=CompetencySection.BEHAVIORAL, name='Teamwork', weight=Decimal('100.00')
        )
        resp2 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/activate/')
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(any('Technical competency weights must sum to exactly 100.00%' in e for e in resp2.data['readiness_errors']))

        # Fix technical to 100%
        CycleCompetency.objects.create(
            cycle=self.cycle, section=CompetencySection.TECHNICAL, name='Code Quality', weight=Decimal('20.00')
        )

        # 3. Evaluators still missing
        resp3 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/activate/')
        self.assertEqual(resp3.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(any('Mandatory Technical evaluators must be assigned' in e for e in resp3.data['readiness_errors']))

        # Assign Technical & Behavioral for both participants
        for p in [self.part1, self.part2]:
            CycleEvaluatorAssignment.objects.create(cycle=self.cycle, participant=p, evaluator=self.manager, section=EvaluatorSectionType.TECHNICAL)
            CycleEvaluatorAssignment.objects.create(cycle=self.cycle, participant=p, evaluator=self.manager, section=EvaluatorSectionType.BEHAVIORAL)

        # 4. Japanese criteria and Japanese evaluators still missing (cycle has japanese_evaluation_mandatory=True)
        resp4 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/activate/')
        self.assertEqual(resp4.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(any('Japanese evaluation criteria must be configured' in e for e in resp4.data['readiness_errors']))

        # Add Japanese criteria (100%)
        JapaneseEvalCriterion.objects.create(cycle=self.cycle, name='Business Japanese', weight=Decimal('100.00'))

        # Assign Japanese evaluators (sensei_a for intern1, sensei_b for intern2)
        CycleEvaluatorAssignment.objects.create(cycle=self.cycle, participant=self.part1, evaluator=self.sensei_a, section=EvaluatorSectionType.JAPANESE)
        CycleEvaluatorAssignment.objects.create(cycle=self.cycle, participant=self.part2, evaluator=self.sensei_b, section=EvaluatorSectionType.JAPANESE)

        # 5. Now all PR #3 activation conditions are met -> activation SUCCEEDS!
        final_resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/activate/')
        self.assertEqual(final_resp.status_code, status.HTTP_200_OK)
        self.cycle.refresh_from_db()
        self.assertEqual(self.cycle.status, 'ACTIVE')

    def test_auto_assign_preserves_manual_assignments_and_is_idempotent(self):
        self.client.force_authenticate(user=self.hr)
        from apps.performance.models import CycleEvaluatorAssignment, EvaluatorSectionType

        # Create alternate mentor (Elena)
        elena = User.objects.create_user(
            email='elena@test.com',
            username='elena',
            password='Password123!',
            role=UserRole.MANAGER
        )

        # 1. Manually assign Elena to Technical for intern 1 (manager is self.manager)
        asgn_tech = CycleEvaluatorAssignment.objects.create(
            cycle=self.cycle,
            participant=self.part1,
            section=EvaluatorSectionType.TECHNICAL,
            evaluator=elena,
            assigned_by=self.hr
        )

        # 2. Manually assign Elena to Behavioral for intern 1
        asgn_behav = CycleEvaluatorAssignment.objects.create(
            cycle=self.cycle,
            participant=self.part1,
            section=EvaluatorSectionType.BEHAVIORAL,
            evaluator=elena,
            assigned_by=self.hr
        )

        # 3. Manually assign sensei_b to Japanese for intern 2 (who has ambiguous sensei_a and sensei_b)
        asgn_jp = CycleEvaluatorAssignment.objects.create(
            cycle=self.cycle,
            participant=self.part2,
            section=EvaluatorSectionType.JAPANESE,
            evaluator=self.sensei_b,
            assigned_by=self.hr
        )

        # 4. Run Auto-Assign
        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/evaluators/auto-assign/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data

        # Conflict/Preserved counts are accurate
        self.assertGreaterEqual(data.get('preserved_manual_count', 0), 3)

        # Verify that Elena was PRESERVED and not overwritten by self.manager
        asgn_tech.refresh_from_db()
        self.assertEqual(asgn_tech.evaluator, elena)

        asgn_behav.refresh_from_db()
        self.assertEqual(asgn_behav.evaluator, elena)

        # Verify sensei_b was preserved for intern 2
        asgn_jp.refresh_from_db()
        self.assertEqual(asgn_jp.evaluator, self.sensei_b)

        # Verify intern 1 Japanese was auto-assigned to sensei_a (since intern 1 had no existing jp assignment)
        jp_p1 = CycleEvaluatorAssignment.objects.get(
            cycle=self.cycle, participant=self.part1, section=EvaluatorSectionType.JAPANESE
        )
        self.assertEqual(jp_p1.evaluator, self.sensei_a)

        # 5. Repeated auto-assign is idempotent and preserves all assignments
        resp2 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/evaluators/auto-assign/')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)

        asgn_tech.refresh_from_db()
        self.assertEqual(asgn_tech.evaluator, elena)
        asgn_behav.refresh_from_db()
        self.assertEqual(asgn_behav.evaluator, elena)
        asgn_jp.refresh_from_db()
        self.assertEqual(asgn_jp.evaluator, self.sensei_b)
        jp_p1.refresh_from_db()
        self.assertEqual(jp_p1.evaluator, self.sensei_a)

    def test_rubric_descriptors_strict_backend_validation(self):
        self.client.force_authenticate(user=self.hr)

        base_payload = {
            'section': 'TECHNICAL',
            'name': 'API Performance Engineering',
            'weight': '25.00'
        }

        # 1. Valid 5-level descriptors -> succeeds
        resp1 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/competencies/', {
            **base_payload,
            'name': 'API Performance Engineering 1',
            'rubric_descriptors': {
                '1': 'Novice - cannot optimize queries',
                '2': 'Developing - uses indexes with assistance',
                '3': 'Competent - benchmarks and tunes standard endpoints',
                '4': 'Advanced - profile distributed systems independently',
                '5': 'Master - designs high-throughput caching and load patterns'
            }
        }, format='json')
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(resp1.data['rubric_descriptors']), 5)

        # 2. Incomplete draft descriptors (levels 1 and 3 only) -> succeeds
        resp2 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/competencies/', {
            **base_payload,
            'name': 'API Performance Engineering 2',
            'rubric_descriptors': {
                '1': 'Novice - cannot optimize queries',
                '3': 'Competent - benchmarks and tunes standard endpoints'
            }
        }, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(resp2.data['rubric_descriptors']), 2)

        # 3. Unsupported level key '6' -> rejected
        resp3 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/competencies/', {
            **base_payload,
            'name': 'API Performance Engineering 3',
            'rubric_descriptors': {
                '6': 'God Tier'
            }
        }, format='json')
        self.assertEqual(resp3.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('rubric_descriptors', resp3.data)
        self.assertIn("Unsupported proficiency level '6'", str(resp3.data['rubric_descriptors']))

        # 4. Empty descriptor string -> rejected
        resp4 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/competencies/', {
            **base_payload,
            'name': 'API Performance Engineering 4',
            'rubric_descriptors': {
                '1': ''
            }
        }, format='json')
        self.assertEqual(resp4.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be empty or whitespace only', str(resp4.data['rubric_descriptors']))

        # 5. Whitespace-only descriptor -> rejected
        resp5 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/competencies/', {
            **base_payload,
            'name': 'API Performance Engineering 5',
            'rubric_descriptors': {
                '1': '   '
            }
        }, format='json')
        self.assertEqual(resp5.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be empty or whitespace only', str(resp5.data['rubric_descriptors']))

        # 6. Non-string descriptor (integer) -> rejected
        resp6 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/competencies/', {
            **base_payload,
            'name': 'API Performance Engineering 6',
            'rubric_descriptors': {
                '1': 100
            }
        }, format='json')
        self.assertEqual(resp6.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('must be a string', str(resp6.data['rubric_descriptors']))

        # 7. Null descriptor -> rejected
        resp7 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/competencies/', {
            **base_payload,
            'name': 'API Performance Engineering 7',
            'rubric_descriptors': {
                '1': None
            }
        }, format='json')
        self.assertEqual(resp7.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be null', str(resp7.data['rubric_descriptors']))

    def test_historical_deletion_protection_for_competencies(self):
        self.client.force_authenticate(user=self.hr)
        from apps.performance.models import CycleCompetency, CompetencySection, TechnicalCapabilityReview

        # 1. Deletion of competency with NO reviews succeeds in draft cycle
        comp_unreferenced = CycleCompetency.objects.create(
            cycle=self.cycle,
            section=CompetencySection.TECHNICAL,
            name='Unreferenced Competency',
            weight=Decimal('20.00')
        )
        del_resp1 = self.client.delete(f'/api/performance/cycles/{self.cycle.id}/competencies/{comp_unreferenced.id}/')
        self.assertEqual(del_resp1.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CycleCompetency.objects.filter(id=comp_unreferenced.id).exists())

        # 2. Competency referenced by historical review -> deletion REJECTED
        comp_referenced = CycleCompetency.objects.create(
            cycle=self.cycle,
            section=CompetencySection.TECHNICAL,
            name='Critical System Architecture',
            weight=Decimal('25.00')
        )
        review = TechnicalCapabilityReview.objects.create(
            competency=comp_referenced,
            employee=self.intern1_profile,
            reviewer=self.manager,
            score=Decimal('4.5'),
            status='SUBMITTED'
        )

        # Deletion via cycle action endpoint rejected
        del_resp2 = self.client.delete(f'/api/performance/cycles/{self.cycle.id}/competencies/{comp_referenced.id}/')
        self.assertEqual(del_resp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('existing technical review', del_resp2.data.get('detail', ''))

        # Foreign key on review remains intact
        review.refresh_from_db()
        self.assertEqual(review.competency_id, comp_referenced.id)
        self.assertTrue(CycleCompetency.objects.filter(id=comp_referenced.id).exists())

        # Deletion via ModelViewSet standard route rejected
        del_resp3 = self.client.delete(f'/api/performance/competencies/{comp_referenced.id}/')
        self.assertEqual(del_resp3.status_code, status.HTTP_400_BAD_REQUEST)
        review.refresh_from_db()
        self.assertEqual(review.competency_id, comp_referenced.id)

        # 3. Finalized/published cycle rejects deletion regardless
        self.cycle.status = 'FINALIZED'
        self.cycle.save()
        del_resp4 = self.client.delete(f'/api/performance/cycles/{self.cycle.id}/competencies/{comp_referenced.id}/')
        self.assertEqual(del_resp4.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot modify competencies', del_resp4.data.get('detail', ''))
