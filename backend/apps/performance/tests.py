from decimal import Decimal
from django.test import TestCase
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.organization.models import Department
from apps.employees.models import EmployeeProfile
from apps.performance.models import (
    PerformanceCycle,
    CycleStatus,
    CycleParticipant,
    EvaluationCriterion,
    Appraisal,
    AppraisalType,
    AppraisalStatus,
    AppraisalRating,
    ScoringModel,
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
            status=CycleStatus.ACTIVE,
            japanese_evaluation_mandatory=False,
            scoring_model=ScoringModel.LEGACY_CRITERIA
        )
        self.participant = CycleParticipant.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile
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
        self.assertNotIn('performance_grade', calc)

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


class MentorAppraisalExecutionPhase1Tests(TestCase):
    """
    Phase 1 Test Suite: Assessment Foundation - Schema, Scoring and Backend Integration.
    Covers:
      1. Technical review schema & exclusivity constraints.
      2. Behavioral capability review schema & HR authorization.
      3. Canonical scoring engine with 60:40 dynamic weighting & rating normalization.
      4. Complete/incomplete evaluation gating without fallback scores.
      5. Japanese mandatory evaluation publication gating & remarks masking.
      6. Evaluator assignment enforcement and summary breakdown API.
    """

    def setUp(self):
        from django.db import transaction
        from apps.performance.models import (
            PerformanceCycle,
            CycleStatus,
            CycleParticipant,
            CycleCompetency,
            CompetencySection,
            CycleEvaluatorAssignment,
            EvaluatorSectionType,
            TechnicalCapabilityParameter,
            Appraisal,
            AppraisalStatus,
            AppraisalType,
        )

        self.client = APIClient()

        # Users
        self.hr = User.objects.create_user(
            email='hr_phase1@test.com',
            username='hr_phase1',
            password='Password123!',
            role=UserRole.HR
        )
        self.super_admin = User.objects.create_user(
            email='admin_phase1@test.com',
            username='admin_phase1',
            password='Password123!',
            role=UserRole.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True
        )
        self.assigned_mentor = User.objects.create_user(
            email='assigned_mentor@test.com',
            username='assigned_mentor',
            password='Password123!',
            role=UserRole.MANAGER
        )
        self.unassigned_mentor = User.objects.create_user(
            email='unassigned_mentor@test.com',
            username='unassigned_mentor',
            password='Password123!',
            role=UserRole.MANAGER
        )
        self.intern_user = User.objects.create_user(
            email='intern_phase1@test.com',
            username='intern_phase1',
            password='Password123!',
            role=UserRole.INTERN
        )

        # Department & Intern Profile
        self.dept = Department.objects.create(name='AI Engineering')
        self.intern_profile = EmployeeProfile.objects.create(
            user=self.intern_user,
            employee_code='INT-P1-001',
            first_name='Alex',
            last_name='Rivera',
            department=self.dept,
            manager=self.unassigned_mentor  # Line manager is NOT the assigned mentor
        )

        # Performance Cycle (60% Tech / 40% Behav, Scale Max = 5.0, Japanese Mandatory)
        self.cycle = PerformanceCycle.objects.create(
            name='2026 Phase 1 Assessment Cycle',
            start_date='2026-07-01',
            end_date='2026-09-30',
            rating_scale_max=Decimal('5.0'),
            technical_weight=Decimal('60.00'),
            behavioral_weight=Decimal('40.00'),
            japanese_evaluation_mandatory=True,
            status=CycleStatus.ACTIVE
        )

        # Enroll Intern as Participant
        self.participant = CycleParticipant.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            added_by=self.hr
        )

        # Evaluator Assignment: assigned_mentor for TECHNICAL section
        self.tech_assignment = CycleEvaluatorAssignment.objects.create(
            cycle=self.cycle,
            participant=self.participant,
            section=EvaluatorSectionType.TECHNICAL,
            evaluator=self.assigned_mentor,
            is_mandatory=True,
            assigned_by=self.hr
        )

        # Competencies (2 Technical = 100%, 2 Behavioral = 100%)
        self.tech_comp1 = CycleCompetency.objects.create(
            cycle=self.cycle,
            section=CompetencySection.TECHNICAL,
            name='Cloud Architecture & Distributed Systems',
            weight=Decimal('50.00'),
            benchmark_score=Decimal('4.0'),
            order=1
        )
        self.tech_comp2 = CycleCompetency.objects.create(
            cycle=self.cycle,
            section=CompetencySection.TECHNICAL,
            name='API Reliability & Performance',
            weight=Decimal('50.00'),
            benchmark_score=Decimal('3.5'),
            order=2
        )
        self.behav_comp1 = CycleCompetency.objects.create(
            cycle=self.cycle,
            section=CompetencySection.BEHAVIORAL,
            name='Ownership & Proactive Accountability',
            weight=Decimal('50.00'),
            benchmark_score=Decimal('4.0'),
            order=1
        )
        self.behav_comp2 = CycleCompetency.objects.create(
            cycle=self.cycle,
            section=CompetencySection.BEHAVIORAL,
            name='Cross-functional Communication',
            weight=Decimal('50.00'),
            benchmark_score=Decimal('3.5'),
            order=2
        )

        # Legacy Parameter for compatibility testing
        self.legacy_param = TechnicalCapabilityParameter.objects.create(
            name='Legacy Code Review Rigor',
            category='Engineering Execution',
            weight=Decimal('10.00')
        )

    def test_technical_review_schema_constraints_and_exclusivity(self):
        from django.db import IntegrityError, transaction
        from apps.performance.models import TechnicalCapabilityReview

        # 1. Valid review referencing CycleCompetency (parameter is None)
        rev1 = TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp1,
            parameter=None,
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.assigned_mentor,
            score=Decimal('4.5'),
            mentor_assessment='Strong distributed systems design.',
            status='SUBMITTED'
        )
        self.assertIsNotNone(rev1.id)
        self.assertEqual(rev1.competency, self.tech_comp1)
        self.assertIsNone(rev1.parameter)

        # 2. Valid review referencing legacy TechnicalCapabilityParameter (competency is None)
        rev2 = TechnicalCapabilityReview.objects.create(
            competency=None,
            parameter=self.legacy_param,
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.assigned_mentor,
            score=Decimal('4.0'),
            status='SUBMITTED'
        )
        self.assertIsNotNone(rev2.id)
        self.assertEqual(rev2.parameter, self.legacy_param)
        self.assertIsNone(rev2.competency)

        # 3. Constraint rejection: referencing BOTH competency and parameter
        with self.assertRaises((IntegrityError, ValidationError)):
            with transaction.atomic():
                TechnicalCapabilityReview.objects.create(
                    competency=self.tech_comp2,
                    parameter=self.legacy_param,
                    employee=self.intern_profile,
                    cycle=self.cycle,
                    reviewer=self.assigned_mentor,
                    score=Decimal('3.5')
                )

        # 4. Constraint rejection: referencing NEITHER competency nor parameter
        with self.assertRaises((IntegrityError, ValidationError)):
            with transaction.atomic():
                TechnicalCapabilityReview.objects.create(
                    competency=None,
                    parameter=None,
                    employee=self.intern_profile,
                    cycle=self.cycle,
                    reviewer=self.assigned_mentor,
                    score=Decimal('3.5')
                )

        # 5. Conditional uniqueness: duplicate review for same (competency, employee, cycle) rejected
        with self.assertRaises((IntegrityError, ValidationError)):
            with transaction.atomic():
                TechnicalCapabilityReview.objects.create(
                    competency=self.tech_comp1,
                    parameter=None,
                    employee=self.intern_profile,
                    cycle=self.cycle,
                    reviewer=self.assigned_mentor,
                    score=Decimal('4.0')
                )

        # 6. Unanswered score remains NULL (never defaulted to 0 or arbitrary fallback)
        rev_draft = TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp2,
            parameter=None,
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.assigned_mentor,
            score=None,
            mentor_assessment='Draft observation before final scoring',
            status='DRAFT'
        )
        rev_draft.refresh_from_db()
        self.assertIsNone(rev_draft.score)

    def test_behavioral_review_schema_and_integrity(self):
        from django.db import IntegrityError, transaction
        from django.core.exceptions import ValidationError
        from apps.performance.models import BehavioralCapabilityReview, CompetencySection

        # 1. Valid review referencing Behavioral CycleCompetency
        brev1 = BehavioralCapabilityReview.objects.create(
            competency=self.behav_comp1,
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.hr,
            score=Decimal('4.0'),
            hr_assessment='Exhibits remarkable ownership in sprint rituals.',
            status='SUBMITTED'
        )
        self.assertIsNotNone(brev1.id)
        self.assertEqual(brev1.competency.section, CompetencySection.BEHAVIORAL)

        # 2. Model validation rejects technical competency on BehavioralCapabilityReview
        invalid_brev = BehavioralCapabilityReview(
            competency=self.tech_comp1,
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.hr,
            score=Decimal('4.0')
        )
        with self.assertRaises(ValidationError):
            invalid_brev.clean()

        # 3. Duplicate review for same (competency, employee, cycle) rejected
        with self.assertRaises((IntegrityError, ValidationError)):
            with transaction.atomic():
                BehavioralCapabilityReview.objects.create(
                    competency=self.behav_comp1,
                    employee=self.intern_profile,
                    cycle=self.cycle,
                    reviewer=self.hr,
                    score=Decimal('4.5')
                )

        # 4. Unanswered score remains NULL
        brev_draft = BehavioralCapabilityReview.objects.create(
            competency=self.behav_comp2,
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.hr,
            score=None,
            status='DRAFT'
        )
        brev_draft.refresh_from_db()
        self.assertIsNone(brev_draft.score)

    def test_behavioral_evaluation_authorization_and_workflow(self):
        from apps.performance.models import BehavioralCapabilityReview

        # 1. Mentors / Line Managers are DENIED access (403 Forbidden)
        self.client.force_authenticate(user=self.assigned_mentor)
        get_mentor = self.client.get(f'/api/performance/evaluations/behavioral/?participant_id={self.participant.id}')
        self.assertEqual(get_mentor.status_code, status.HTTP_403_FORBIDDEN)

        post_mentor = self.client.post('/api/performance/evaluations/behavioral/', {
            'participant_id': str(self.participant.id),
            'reviews': [{'competency_id': str(self.behav_comp1.id), 'score': '4.0'}]
        }, format='json')
        self.assertEqual(post_mentor.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Interns are DENIED access (403 Forbidden)
        self.client.force_authenticate(user=self.intern_user)
        get_intern = self.client.get(f'/api/performance/evaluations/behavioral/?participant_id={self.participant.id}')
        self.assertEqual(get_intern.status_code, status.HTTP_403_FORBIDDEN)

        # 3. HR can GET the behavioral evaluation sheet
        self.client.force_authenticate(user=self.hr)
        get_hr = self.client.get(f'/api/performance/evaluations/behavioral/?participant_id={self.participant.id}')
        self.assertEqual(get_hr.status_code, status.HTTP_200_OK)
        self.assertEqual(len(get_hr.data['competencies']), 2)

        # 4. HR can save DRAFT reviews (allows partial scoring)
        post_draft = self.client.post('/api/performance/evaluations/behavioral/', {
            'participant_id': str(self.participant.id),
            'status': 'DRAFT',
            'reviews': [
                {'competency_id': str(self.behav_comp1.id), 'score': '4.5', 'hr_assessment': 'Draft note'}
            ]
        }, format='json')
        self.assertEqual(post_draft.status_code, status.HTTP_200_OK)
        self.assertEqual(post_draft.data['status'], 'DRAFT')

        # 5. Incomplete SUBMISSION is blocked (missing behav_comp2)
        post_incomplete = self.client.post('/api/performance/evaluations/behavioral/', {
            'participant_id': str(self.participant.id),
            'status': 'SUBMITTED',
            'reviews': [
                {'competency_id': str(self.behav_comp1.id), 'score': '4.5', 'hr_assessment': 'High ownership'}
            ]
        }, format='json')
        self.assertEqual(post_incomplete.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(post_incomplete.data['error'], 'INCOMPLETE_SUBMISSION')

        # 6. Complete SUBMISSION succeeds for HR
        post_submit = self.client.post('/api/performance/evaluations/behavioral/', {
            'participant_id': str(self.participant.id),
            'status': 'SUBMITTED',
            'reviews': [
                {'competency_id': str(self.behav_comp1.id), 'score': '4.5', 'hr_assessment': 'High ownership'},
                {'competency_id': str(self.behav_comp2.id), 'score': '4.0', 'hr_assessment': 'Clear sync comms'}
            ]
        }, format='json')
        self.assertEqual(post_submit.status_code, status.HTTP_200_OK)
        self.assertEqual(post_submit.data['status'], 'SUBMITTED')

        # Check DB records
        self.assertEqual(BehavioralCapabilityReview.objects.filter(cycle=self.cycle, employee=self.intern_profile, status='SUBMITTED').count(), 2)

    def test_technical_evaluation_authorization_and_workflow(self):
        from apps.performance.models import TechnicalCapabilityReview

        # 1. Unassigned mentor (even though intern's line manager) is DENIED (403 Forbidden)
        self.client.force_authenticate(user=self.unassigned_mentor)
        get_unassigned = self.client.get(f'/api/performance/evaluations/technical/?participant_id={self.participant.id}')
        self.assertEqual(get_unassigned.status_code, status.HTTP_403_FORBIDDEN)

        post_unassigned = self.client.post('/api/performance/evaluations/technical/', {
            'participant_id': str(self.participant.id),
            'reviews': [{'competency_id': str(self.tech_comp1.id), 'score': '4.0'}]
        }, format='json')
        self.assertEqual(post_unassigned.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Intern is DENIED (403 Forbidden)
        self.client.force_authenticate(user=self.intern_user)
        get_intern = self.client.get(f'/api/performance/evaluations/technical/?participant_id={self.participant.id}')
        self.assertEqual(get_intern.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Assigned mentor can GET the technical evaluation sheet
        self.client.force_authenticate(user=self.assigned_mentor)
        get_mentor = self.client.get(f'/api/performance/evaluations/technical/?participant_id={self.participant.id}')
        self.assertEqual(get_mentor.status_code, status.HTTP_200_OK)
        self.assertEqual(len(get_mentor.data['competencies']), 2)

        # 4. Out of range score (> rating_scale_max 5.0) is rejected
        post_invalid = self.client.post('/api/performance/evaluations/technical/', {
            'participant_id': str(self.participant.id),
            'status': 'DRAFT',
            'reviews': [
                {'competency_id': str(self.tech_comp1.id), 'score': '6.0'}
            ]
        }, format='json')
        self.assertEqual(post_invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(post_invalid.data['error'], 'INVALID_SCORE')

        # 5. Incomplete SUBMISSION is blocked
        post_incomplete = self.client.post('/api/performance/evaluations/technical/', {
            'participant_id': str(self.participant.id),
            'status': 'SUBMITTED',
            'reviews': [
                {'competency_id': str(self.tech_comp1.id), 'score': '4.0', 'mentor_assessment': 'Solid'}
            ]
        }, format='json')
        self.assertEqual(post_incomplete.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(post_incomplete.data['error'], 'INCOMPLETE_SUBMISSION')

        # 6. Complete SUBMISSION succeeds for assigned mentor
        post_complete = self.client.post('/api/performance/evaluations/technical/', {
            'participant_id': str(self.participant.id),
            'status': 'SUBMITTED',
            'reviews': [
                {'competency_id': str(self.tech_comp1.id), 'score': '4.0', 'mentor_assessment': 'Excellent architecture'},
                {'competency_id': str(self.tech_comp2.id), 'score': '5.0', 'mentor_assessment': 'Zero defect release'}
            ]
        }, format='json')
        self.assertEqual(post_complete.status_code, status.HTTP_200_OK)
        self.assertEqual(post_complete.data['status'], 'SUBMITTED')

        # Check DB records
        self.assertEqual(TechnicalCapabilityReview.objects.filter(cycle=self.cycle, employee=self.intern_profile, status='SUBMITTED').count(), 2)

    def test_canonical_scoring_engine_exact_60_40_math_and_custom_weights(self):
        from apps.performance.models import TechnicalCapabilityReview, BehavioralCapabilityReview

        # Setup complete evaluations
        # Tech: comp1 (score 4.0 / 5.0 = 80%), comp2 (score 5.0 / 5.0 = 100%)
        # Section Score = (80 * 0.5) + (100 * 0.5) = 90.00%
        TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp1,
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.assigned_mentor,
            score=Decimal('4.0'),
            status='SUBMITTED'
        )
        TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp2,
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.assigned_mentor,
            score=Decimal('5.0'),
            status='SUBMITTED'
        )

        # Behav: comp1 (score 3.5 / 5.0 = 70%), comp2 (score 4.5 / 5.0 = 90%)
        # Section Score = (70 * 0.5) + (90 * 0.5) = 80.00%
        BehavioralCapabilityReview.objects.create(
            competency=self.behav_comp1,
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.hr,
            score=Decimal('3.5'),
            status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            competency=self.behav_comp2,
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.hr,
            score=Decimal('4.5'),
            status='SUBMITTED'
        )

        # 1. Standard 60:40 Cycle Calculation
        calc = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle)
        self.assertTrue(calc['is_complete'])
        self.assertEqual(calc['technical_section']['section_score'], 90.00)
        self.assertEqual(calc['technical_section']['weighted_contribution'], 54.00)  # 90.00 * 0.60
        self.assertEqual(calc['behavioral_section']['section_score'], 80.00)
        self.assertEqual(calc['behavioral_section']['weighted_contribution'], 32.00)  # 80.00 * 0.40
        self.assertEqual(calc['final_score'], 86.00)  # 54.00 + 32.00
        self.assertEqual(calc['overall_score'], 86.00)
        self.assertNotIn('performance_grade', calc)

        # 2. Custom Weights (70% Tech / 30% Behav)
        self.cycle.technical_weight = Decimal('70.00')
        self.cycle.behavioral_weight = Decimal('30.00')
        self.cycle.save()

        calc_custom = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle)
        # Final = (90.00 * 0.70) + (80.00 * 0.30) = 63.00 + 24.00 = 87.00
        self.assertEqual(calc_custom['final_score'], 87.00)
        self.assertEqual(calc_custom['technical_section']['weighted_contribution'], 63.00)
        self.assertEqual(calc_custom['behavioral_section']['weighted_contribution'], 24.00)

        # Reset weights
        self.cycle.technical_weight = Decimal('60.00')
        self.cycle.behavioral_weight = Decimal('40.00')
        self.cycle.save()

    def test_canonical_scoring_incomplete_evaluation_blocks_without_fallback(self):
        from apps.performance.models import TechnicalCapabilityReview, BehavioralCapabilityReview
        from apps.performance.services.scoring import IncompleteEvaluationError

        # Only 1 tech review submitted, tech_comp2 missing, behavioral entirely missing
        TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp1,
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.assigned_mentor,
            score=Decimal('4.0'),
            status='SUBMITTED'
        )

        calc = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle)
        self.assertFalse(calc['is_complete'])
        self.assertIsNone(calc['final_score'])
        self.assertIsNone(calc['overall_score'])
        self.assertNotIn('performance_grade', calc)
        self.assertIn(str(self.tech_comp2.id), calc['missing_technical_competency_ids'])
        self.assertIn(str(self.behav_comp1.id), calc['missing_behavioral_competency_ids'])
        self.assertIn(str(self.behav_comp2.id), calc['missing_behavioral_competency_ids'])

        # Explicit exception if raise_on_incomplete=True
        with self.assertRaises(IncompleteEvaluationError):
            ScoringService.calculate_cycle_score(self.intern_profile, self.cycle, raise_on_incomplete=True)

    def test_operational_telemetry_isolation_zero_percent_contribution(self):
        from apps.performance.models import TechnicalCapabilityReview, BehavioralCapabilityReview, Appraisal, AppraisalType
        from apps.goals.models import Goal, GoalStatus
        from apps.japanese.models import JapaneseEvaluation, EvaluationStatus

        # Full evaluations yielding baseline 86.00%
        TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp1, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.assigned_mentor, score=Decimal('4.0'), status='SUBMITTED'
        )
        TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp2, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.assigned_mentor, score=Decimal('5.0'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            competency=self.behav_comp1, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.hr, score=Decimal('3.5'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            competency=self.behav_comp2, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.hr, score=Decimal('4.5'), status='SUBMITTED'
        )

        # Baseline score check
        calc_base = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle)
        self.assertEqual(calc_base['final_score'], 86.00)

        # 1. Add Goal telemetry (100% completed)
        Goal.objects.create(
            employee=self.intern_profile, cycle=self.cycle, assigned_by=self.assigned_mentor,
            title='Phase 1 Milestone Release', due_date='2026-09-30',
            completion_percentage=Decimal('100.00'), status=GoalStatus.COMPLETED
        )

        # 2. Add Self-assessment telemetry (very low reflection)
        Appraisal.objects.create(
            employee=self.intern_profile, cycle=self.cycle, reviewer=self.intern_user,
            appraisal_type=AppraisalType.SELF, status='SUBMITTED', self_comments='Self reflection notes'
        )

        # 3. Add Japanese Evaluation telemetry (high score)
        JapaneseEvaluation.objects.create(
            intern=self.intern_profile, cycle=self.cycle, evaluator=self.hr,
            status=EvaluationStatus.ACCEPTED, overall_language_score=Decimal('98.00')
        )

        # Score recalculation MUST be strictly unchanged at 86.00
        calc_after = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle)
        self.assertEqual(calc_after['final_score'], 86.00)
        self.assertEqual(calc_after['operational_telemetry']['goals_count'], 1)
        self.assertEqual(calc_after['operational_telemetry']['completed_goals_count'], 1)
        self.assertTrue(calc_after['operational_telemetry']['self_assessment_submitted'])
        self.assertTrue(calc_after['operational_telemetry']['japanese_gating_passed'])

    def test_japanese_publication_gate_mandatory_vs_optional(self):
        from apps.performance.models import (
            TechnicalCapabilityReview,
            BehavioralCapabilityReview,
            Appraisal,
            AppraisalType,
            AppraisalStatus,
        )
        from apps.japanese.models import JapaneseEvaluation, EvaluationStatus

        # Populate complete evaluations
        from apps.japanese.models import JapaneseEvalCriterion
        from apps.performance.models import CycleEvaluatorAssignment, EvaluatorSectionType
        JapaneseEvalCriterion.objects.get_or_create(cycle=self.cycle, name='Language', defaults={'weight': Decimal('100.00')})
        CycleEvaluatorAssignment.objects.get_or_create(
            cycle=self.cycle, participant=self.participant, section=EvaluatorSectionType.BEHAVIORAL,
            defaults={'evaluator': self.hr, 'is_mandatory': True, 'assigned_by': self.hr}
        )
        TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp1, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.assigned_mentor, score=Decimal('4.0'), status='SUBMITTED'
        )
        TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp2, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.assigned_mentor, score=Decimal('5.0'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            competency=self.behav_comp1, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.hr, score=Decimal('4.0'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            competency=self.behav_comp2, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.hr, score=Decimal('4.0'), status='SUBMITTED'
        )

        mgr_appraisal = Appraisal.objects.create(
            employee=self.intern_profile, cycle=self.cycle, reviewer=self.assigned_mentor,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.SUBMITTED
        )

        self.client.force_authenticate(user=self.hr)

        # 1. Mandatory Japanese evaluation missing -> publication BLOCKED
        pub_blocked1 = self.client.post(f'/api/performance/appraisals/{mgr_appraisal.id}/publish/', format='json')
        self.assertEqual(pub_blocked1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(pub_blocked1.data['error'], 'JAPANESE_EVALUATION_NOT_ACCEPTED')

        # 2. Mandatory Japanese evaluation in DRAFT / PENDING -> publication BLOCKED
        jp_eval = JapaneseEvaluation.objects.create(
            intern=self.intern_profile, cycle=self.cycle, evaluator=self.hr,
            status=EvaluationStatus.PENDING, overall_language_score=Decimal('85.00')
        )
        pub_blocked2 = self.client.post(f'/api/performance/appraisals/{mgr_appraisal.id}/publish/', format='json')
        self.assertEqual(pub_blocked2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(pub_blocked2.data['error'], 'JAPANESE_EVALUATION_NOT_ACCEPTED')

        # 3. Mandatory Japanese evaluation in ACCEPTED -> publication SUCCEEDS
        jp_eval.status = EvaluationStatus.ACCEPTED
        jp_eval.save()

        pub_ok = self.client.post(f'/api/performance/appraisals/{mgr_appraisal.id}/publish/', {
            'final_comments': 'Published by HR Director'
        }, format='json')
        self.assertEqual(pub_ok.status_code, status.HTTP_200_OK)
        mgr_appraisal.refresh_from_db()
        self.assertEqual(mgr_appraisal.status, AppraisalStatus.PUBLISHED)
        self.assertIsNotNone(mgr_appraisal.overall_score)

        # 4. Optional Japanese evaluation does not block publication
        self.cycle.japanese_evaluation_mandatory = False
        self.cycle.save()
        jp_eval.delete()  # Remove evaluation completely

        mgr_appraisal.status = AppraisalStatus.SUBMITTED
        mgr_appraisal.save()

        pub_optional_ok = self.client.post(f'/api/performance/appraisals/{mgr_appraisal.id}/publish/', format='json')
        self.assertEqual(pub_optional_ok.status_code, status.HTTP_200_OK)

    def test_japanese_remarks_masking_for_intern(self):
        from apps.japanese.models import JapaneseEvaluation, EvaluationStatus
        from apps.japanese.serializers import JapaneseEvaluationSerializer

        jp_eval = JapaneseEvaluation.objects.create(
            intern=self.intern_profile,
            cycle=self.cycle,
            evaluator=self.hr,
            status=EvaluationStatus.ACCEPTED,
            overall_language_score=Decimal('90.00'),
            instructor_remarks='Confidential instructor developmental assessment',
            developmental_feedback='Focus on business keigo nuance'
        )

        # 1. Evaluator / HR representation contains remarks
        serializer_hr = JapaneseEvaluationSerializer(jp_eval, context={'request': type('Req', (), {'user': self.hr})()})
        self.assertEqual(serializer_hr.data['instructor_remarks'], 'Confidential instructor developmental assessment')

        # 2. Intern representation masks instructor remarks
        serializer_intern = JapaneseEvaluationSerializer(jp_eval, context={'request': type('Req', (), {'user': self.intern_user})()})
        self.assertEqual(serializer_intern.data['instructor_remarks'], '')

    def test_evaluator_my_assignments_endpoint(self):
        # 1. Assigned mentor retrieves their technical assignments
        self.client.force_authenticate(user=self.assigned_mentor)
        resp_mentor = self.client.get(f'/api/performance/evaluators/my-assignments/?cycle_id={self.cycle.id}')
        self.assertEqual(resp_mentor.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_mentor.data['count'], 1)
        asgn = resp_mentor.data['assignments'][0]
        self.assertEqual(asgn['participant_id'], str(self.participant.id))
        self.assertEqual(asgn['section'], 'TECHNICAL')
        self.assertEqual(asgn['evaluation_status'], 'PENDING')

        # 2. Unassigned mentor retrieves 0 assignments
        self.client.force_authenticate(user=self.unassigned_mentor)
        resp_unassigned = self.client.get(f'/api/performance/evaluators/my-assignments/?cycle_id={self.cycle.id}')
        self.assertEqual(resp_unassigned.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_unassigned.data['count'], 0)

        # 3. HR retrieves all cycle assignments
        self.client.force_authenticate(user=self.hr)
        resp_hr = self.client.get(f'/api/performance/evaluators/my-assignments/?cycle_id={self.cycle.id}')
        self.assertEqual(resp_hr.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_hr.data['count'], 1)

    def test_evaluation_summary_view_access_and_output(self):
        from apps.performance.models import (
            TechnicalCapabilityReview,
            BehavioralCapabilityReview,
            Appraisal,
            AppraisalType,
            AppraisalStatus,
        )

        TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp1, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.assigned_mentor, score=Decimal('4.0'), status='SUBMITTED'
        )
        TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp2, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.assigned_mentor, score=Decimal('4.0'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            competency=self.behav_comp1, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.hr, score=Decimal('4.0'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            competency=self.behav_comp2, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.hr, score=Decimal('4.0'), status='SUBMITTED'
        )

        appraisal = Appraisal.objects.create(
            employee=self.intern_profile, cycle=self.cycle, reviewer=self.assigned_mentor,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.SUBMITTED
        )

        # 1. Intern denied before publication (403 Forbidden)
        self.client.force_authenticate(user=self.intern_user)
        resp_intern_pre = self.client.get(f'/api/performance/evaluations/summary/?participant_id={self.participant.id}')
        self.assertEqual(resp_intern_pre.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Assigned mentor has access
        self.client.force_authenticate(user=self.assigned_mentor)
        resp_mentor = self.client.get(f'/api/performance/evaluations/summary/?participant_id={self.participant.id}')
        self.assertEqual(resp_mentor.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_mentor.data['score_calculation']['final_score'], 80.00)

        # 3. Unassigned mentor is denied (403 Forbidden)
        self.client.force_authenticate(user=self.unassigned_mentor)
        resp_unassigned = self.client.get(f'/api/performance/evaluations/summary/?participant_id={self.participant.id}')
        self.assertEqual(resp_unassigned.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Once published, intern has access
        appraisal.status = AppraisalStatus.PUBLISHED
        appraisal.save()

        self.client.force_authenticate(user=self.intern_user)
        resp_intern_post = self.client.get(f'/api/performance/evaluations/summary/?participant_id={self.participant.id}')
        self.assertEqual(resp_intern_post.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_intern_post.data['score_calculation']['final_score'], 80.00)

    def test_cycle_resolution_cleanliness(self):
        """Verify cycle resolution rejects mismatches and arbitrary fallbacks."""
        # 1. Resolve via participant_id without cycle_id -> resolves participant's cycle
        self.client.force_authenticate(user=self.assigned_mentor)
        resp_p_only = self.client.get(f'/api/performance/evaluations/technical/?participant_id={self.participant.id}')
        self.assertEqual(resp_p_only.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_p_only.data['cycle_id'], str(self.cycle.id))

        # 2. Cycle mismatch between participant and supplied cycle_id -> HTTP 400
        cycle2 = PerformanceCycle.objects.create(
            name='Q4 2026 Cycle',
            start_date='2026-10-01',
            end_date='2026-12-31',
            status=CycleStatus.DRAFT
        )
        resp_mismatch = self.client.get(f'/api/performance/evaluations/technical/?participant_id={self.participant.id}&cycle_id={cycle2.id}')
        self.assertEqual(resp_mismatch.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Participant does not belong to the specified cycle", resp_mismatch.data['error'])

        # 3. Employee-only query without cycle_id -> rejected HTTP 400
        resp_no_cycle = self.client.get(f'/api/performance/evaluations/technical/?employee_id={self.intern_profile.id}')
        self.assertEqual(resp_no_cycle.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cycle_id is required", resp_no_cycle.data['error'])

        # 4. Summary endpoint with mismatched participant/cycle -> rejected HTTP 400
        self.client.force_authenticate(user=self.hr)
        resp_summary_mismatch = self.client.get(f'/api/performance/evaluations/summary/?participant_id={self.participant.id}&cycle_id={cycle2.id}')
        self.assertEqual(resp_summary_mismatch.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_cycle_review_isolation_and_drf_authorization(self):
        """Verify mentors cannot view, edit, or delete reviews across cycles without assignment."""
        from apps.performance.models import (
            CycleCompetency,
            CompetencySection,
            CycleParticipant,
            CycleEvaluatorAssignment,
            EvaluatorSectionType,
            TechnicalCapabilityReview,
        )

        # Setup Cycle 2 and enroll same intern
        cycle2 = PerformanceCycle.objects.create(
            name='Cycle 2 (Winter 2026)',
            start_date='2026-10-01',
            end_date='2026-12-31',
            status=CycleStatus.ACTIVE
        )
        part2 = CycleParticipant.objects.create(cycle=cycle2, employee=self.intern_profile)
        comp_c2 = CycleCompetency.objects.create(
            cycle=cycle2, name='System Design', section=CompetencySection.TECHNICAL,
            weight=Decimal('100.00'), benchmark_score=Decimal('5.0')
        )

        # Review in Cycle 1 (assigned to self.assigned_mentor)
        rev_c1 = TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp1, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.assigned_mentor, score=Decimal('4.0'), status='SUBMITTED'
        )

        # Review in Cycle 2 (Marcus NOT assigned in Cycle 2)
        rev_c2 = TechnicalCapabilityReview.objects.create(
            competency=comp_c2, employee=self.intern_profile, cycle=cycle2,
            reviewer=self.hr, score=Decimal('4.5'), status='SUBMITTED'
        )

        self.client.force_authenticate(user=self.assigned_mentor)

        # 1. Listing all reviews without cycle param: only returns Cycle 1 review
        resp_list = self.client.get('/api/performance/technical-reviews/')
        self.assertEqual(resp_list.status_code, status.HTTP_200_OK)
        results = resp_list.data.get('results', resp_list.data)
        result_ids = [str(r['id']) for r in results]
        self.assertIn(str(rev_c1.id), result_ids)
        self.assertNotIn(str(rev_c2.id), result_ids)

        # 2. Filtering by cycle2: returns 0 results for Marcus
        resp_c2_list = self.client.get(f'/api/performance/technical-reviews/?cycle={cycle2.id}')
        self.assertEqual(resp_c2_list.status_code, status.HTTP_200_OK)
        c2_results = resp_c2_list.data.get('results', resp_c2_list.data)
        self.assertEqual(len(c2_results), 0)

        # 3. Direct GET for Cycle 2 review: returns 404
        resp_c2_detail = self.client.get(f'/api/performance/technical-reviews/{rev_c2.id}/')
        self.assertEqual(resp_c2_detail.status_code, status.HTTP_404_NOT_FOUND)

        # 4. Attempting to create review in Cycle 2 via generic DRF endpoint: 403 Forbidden
        resp_create = self.client.post('/api/performance/technical-reviews/', {
            'competency': str(comp_c2.id),
            'employee': str(self.intern_profile.id),
            'cycle': str(cycle2.id),
            'score': '4.0',
            'status': 'DRAFT'
        }, format='json')
        self.assertEqual(resp_create.status_code, status.HTTP_403_FORBIDDEN)

        # 5. Attempting to delete Cycle 1 review as mentor: 403 Forbidden
        resp_delete = self.client.delete(f'/api/performance/technical-reviews/{rev_c1.id}/')
        self.assertEqual(resp_delete.status_code, status.HTTP_403_FORBIDDEN)

        # 6. HR user can delete review: 204 No Content
        self.client.force_authenticate(user=self.hr)
        resp_hr_delete = self.client.delete(f'/api/performance/technical-reviews/{rev_c1.id}/')
        self.assertEqual(resp_hr_delete.status_code, status.HTTP_204_NO_CONTENT)

    def test_technical_review_uniqueness_and_legacy_compatibility(self):
        """Verify (competency, employee) uniqueness and multi-cycle legacy parameter reviews."""
        from django.db import IntegrityError
        from django.core.exceptions import ValidationError
        from apps.performance.models import (
            CycleCompetency,
            CompetencySection,
            CycleParticipant,
            TechnicalCapabilityParameter,
            TechnicalCapabilityReview,
        )

        # 1. Competency-based uniqueness: duplicate review rejected even if cycle is omitted/None
        TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp1, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.assigned_mentor, score=Decimal('4.0')
        )
        with self.assertRaises((IntegrityError, ValidationError)):
            # Attempting duplicate review for same competency and employee
            TechnicalCapabilityReview.objects.create(
                competency=self.tech_comp1, employee=self.intern_profile, cycle=None,
                reviewer=self.assigned_mentor, score=Decimal('4.5')
            )

        # 2. Legacy parameter: can be reviewed across multiple cycles for same employee
        cycle2 = PerformanceCycle.objects.create(
            name='Cycle 2', start_date='2026-10-01', end_date='2026-12-31', status=CycleStatus.ACTIVE
        )
        CycleParticipant.objects.create(cycle=cycle2, employee=self.intern_profile)
        legacy_param = TechnicalCapabilityParameter.objects.create(
            name='Algorithms Legacy', category='Technical', weight=Decimal('20.00'), benchmark_score=Decimal('5.0')
        )

        rev_param_c1 = TechnicalCapabilityReview.objects.create(
            parameter=legacy_param, employee=self.intern_profile, cycle=self.cycle,
            reviewer=self.assigned_mentor, score=Decimal('4.0')
        )
        self.assertIsNotNone(rev_param_c1.id)

        # Same parameter, same employee, DIFFERENT cycle -> Allowed
        rev_param_c2 = TechnicalCapabilityReview.objects.create(
            parameter=legacy_param, employee=self.intern_profile, cycle=cycle2,
            reviewer=self.assigned_mentor, score=Decimal('4.5')
        )
        self.assertIsNotNone(rev_param_c2.id)

        # Same parameter, same employee, SAME cycle -> IntegrityError or ValidationError
        with self.assertRaises((IntegrityError, ValidationError)):
            TechnicalCapabilityReview.objects.create(
                parameter=legacy_param, employee=self.intern_profile, cycle=self.cycle,
                reviewer=self.assigned_mentor, score=Decimal('3.5')
            )

        # 3. Parameter review without cycle -> ValidationError
        rev_no_cycle = TechnicalCapabilityReview(
            parameter=legacy_param, employee=self.intern_profile, cycle=None,
            reviewer=self.assigned_mentor, score=Decimal('4.0')
        )
        with self.assertRaises(ValidationError):
            rev_no_cycle.clean()

    def test_competency_weight_calibration_and_no_renormalization(self):
        """Verify ScoringService enforces exact 100% weights and rejects invalid totals without re-normalizing."""
        from apps.performance.models import (
            PerformanceCycle,
            CycleCompetency,
            CompetencySection,
            CycleParticipant,
            TechnicalCapabilityReview,
            BehavioralCapabilityReview,
        )
        from apps.performance.services.scoring import IncompleteEvaluationError

        calib_cycle = PerformanceCycle.objects.create(
            name='Calibration Test Cycle',
            start_date='2026-07-01',
            end_date='2026-09-30',
            status=CycleStatus.ACTIVE,
            technical_weight=Decimal('60.00'),
            behavioral_weight=Decimal('40.00'),
            rating_scale_max=Decimal('5.0')
        )
        CycleParticipant.objects.create(cycle=calib_cycle, employee=self.intern_profile)

        # Tech comps total 80% (invalid: 50 + 30 = 80%)
        t_comp1 = CycleCompetency.objects.create(
            cycle=calib_cycle, name='T1', section=CompetencySection.TECHNICAL,
            weight=Decimal('50.00'), benchmark_score=Decimal('5.0')
        )
        t_comp2 = CycleCompetency.objects.create(
            cycle=calib_cycle, name='T2', section=CompetencySection.TECHNICAL,
            weight=Decimal('30.00'), benchmark_score=Decimal('5.0')
        )

        # Behav comps total 100% (50 + 50)
        b_comp1 = CycleCompetency.objects.create(
            cycle=calib_cycle, name='B1', section=CompetencySection.BEHAVIORAL,
            weight=Decimal('50.00'), benchmark_score=Decimal('5.0')
        )
        b_comp2 = CycleCompetency.objects.create(
            cycle=calib_cycle, name='B2', section=CompetencySection.BEHAVIORAL,
            weight=Decimal('50.00'), benchmark_score=Decimal('5.0')
        )

        # Create all submitted reviews
        TechnicalCapabilityReview.objects.create(
            competency=t_comp1, employee=self.intern_profile, cycle=calib_cycle,
            reviewer=self.assigned_mentor, score=Decimal('4.0'), status='SUBMITTED'
        )
        TechnicalCapabilityReview.objects.create(
            competency=t_comp2, employee=self.intern_profile, cycle=calib_cycle,
            reviewer=self.assigned_mentor, score=Decimal('4.0'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            competency=b_comp1, employee=self.intern_profile, cycle=calib_cycle,
            reviewer=self.hr, score=Decimal('4.0'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            competency=b_comp2, employee=self.intern_profile, cycle=calib_cycle,
            reviewer=self.hr, score=Decimal('4.0'), status='SUBMITTED'
        )

        # 1. Calculation MUST reject because tech total is 80.00%, NOT 100.00%
        calc = ScoringService.calculate_cycle_score(self.intern_profile, calib_cycle)
        self.assertFalse(calc['is_complete'])
        self.assertIsNone(calc['final_score'])
        self.assertIsNone(calc['overall_score'])
        self.assertNotIn('performance_grade', calc)
        self.assertTrue(any('Active Technical competency weights total 80.00%, expected exactly 100.00%.' in err for err in calc['verification_errors']))

        with self.assertRaises(IncompleteEvaluationError):
            ScoringService.calculate_cycle_score(self.intern_profile, calib_cycle, raise_on_incomplete=True)

        # 2. Fix tech comps to exactly 100.00% (50 + 50)
        t_comp2.weight = Decimal('50.00')
        t_comp2.save()

        calc_valid = ScoringService.calculate_cycle_score(self.intern_profile, calib_cycle)
        self.assertTrue(calc_valid['is_complete'])
        self.assertEqual(calc_valid['final_score'], 80.00)
        self.assertEqual(calc_valid['overall_score'], 80.00)
        self.assertNotIn('performance_grade', calc_valid)

    def test_behavioral_review_model_integrity(self):
        """Verify BehavioralCapabilityReview enforces section, cycle, and participant validation."""
        from django.core.exceptions import ValidationError
        from apps.performance.models import (
            CycleCompetency,
            CompetencySection,
            CycleParticipant,
            BehavioralCapabilityReview,
        )

        # 1. Non-BEHAVIORAL competency rejected
        with self.assertRaises(ValidationError):
            BehavioralCapabilityReview.objects.create(
                competency=self.tech_comp1,  # TECHNICAL section
                employee=self.intern_profile,
                cycle=self.cycle,
                reviewer=self.hr,
                score=Decimal('4.0')
            )

        # 2. Mismatched cycle competency rejected
        cycle2 = PerformanceCycle.objects.create(
            name='Cycle 2', start_date='2026-10-01', end_date='2026-12-31', status=CycleStatus.ACTIVE
        )
        CycleParticipant.objects.create(cycle=cycle2, employee=self.intern_profile)
        with self.assertRaises(ValidationError):
            BehavioralCapabilityReview.objects.create(
                competency=self.behav_comp1,  # Belongs to self.cycle
                employee=self.intern_profile,
                cycle=cycle2,  # Mismatched cycle
                reviewer=self.hr,
                score=Decimal('4.0')
            )

        # 3. Unenrolled employee rejected
        unenrolled_user = User.objects.create_user(
            email='other@test.com', username='other_user', password='Password123!', role=UserRole.INTERN
        )
        unenrolled_profile = EmployeeProfile.objects.create(
            user=unenrolled_user, employee_code='INT-999', first_name='Other', last_name='Intern', department=self.dept
        )
        with self.assertRaises(ValidationError):
            BehavioralCapabilityReview.objects.create(
                competency=self.behav_comp1,
                employee=unenrolled_profile,  # Not enrolled in self.cycle
                cycle=self.cycle,
                reviewer=self.hr,
                score=Decimal('4.0')
            )

    def test_generic_technical_review_put_patch_tampering_rejected(self):
        """Verify mentor cannot reassign employee, cycle, competency, or reviewer via PUT/PATCH."""
        from apps.performance.models import (
            CycleCompetency,
            CompetencySection,
            CycleParticipant,
            CycleEvaluatorAssignment,
            EvaluatorSectionType,
            TechnicalCapabilityReview,
        )

        user_b = User.objects.create_user(
            email='intern_b@test.com', username='intern_b', password='Password123!', role=UserRole.INTERN
        )
        profile_b = EmployeeProfile.objects.create(
            user=user_b, employee_code='INT-002', first_name='Bob', last_name='Smith', department=self.dept
        )
        CycleParticipant.objects.create(cycle=self.cycle, employee=profile_b)

        cycle2 = PerformanceCycle.objects.create(
            name='Cycle 2', start_date='2026-10-01', end_date='2026-12-31', status=CycleStatus.ACTIVE
        )
        CycleParticipant.objects.create(cycle=cycle2, employee=self.intern_profile)
        comp_c2 = CycleCompetency.objects.create(
            cycle=cycle2, name='Cycle 2 Comp', section=CompetencySection.TECHNICAL,
            weight=Decimal('100.00'), benchmark_score=Decimal('5.0')
        )

        rev = TechnicalCapabilityReview.objects.create(
            competency=self.tech_comp1,
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.assigned_mentor,
            score=Decimal('4.0'),
            status='DRAFT'
        )

        self.client.force_authenticate(user=self.assigned_mentor)

        # 1. Attack Scenario 1: Mentor attempts PATCH with employee_b's ID
        resp_patch_emp = self.client.patch(
            f'/api/performance/technical-reviews/{rev.id}/',
            {'employee': str(profile_b.id)},
            format='json'
        )
        self.assertIn(resp_patch_emp.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])
        rev.refresh_from_db()
        self.assertEqual(rev.employee, self.intern_profile)

        # 2. Attack Scenario 2: Mentor attempts PUT with employee_b's ID
        resp_put_emp = self.client.put(
            f'/api/performance/technical-reviews/{rev.id}/',
            {
                'competency': str(self.tech_comp1.id),
                'employee': str(profile_b.id),
                'cycle': str(self.cycle.id),
                'score': '4.5',
                'status': 'DRAFT'
            },
            format='json'
        )
        self.assertIn(resp_put_emp.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])
        rev.refresh_from_db()
        self.assertEqual(rev.employee, self.intern_profile)

        # 3. Attack Scenario 3: Mentor attempts PATCH with different cycle
        resp_patch_cycle = self.client.patch(
            f'/api/performance/technical-reviews/{rev.id}/',
            {'cycle': str(cycle2.id)},
            format='json'
        )
        self.assertIn(resp_patch_cycle.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])
        rev.refresh_from_db()
        self.assertEqual(rev.cycle, self.cycle)

        # 4. Attack Scenario 4: Mentor attempts PATCH with cross-cycle competency
        resp_patch_comp = self.client.patch(
            f'/api/performance/technical-reviews/{rev.id}/',
            {'competency': str(comp_c2.id)},
            format='json'
        )
        self.assertIn(resp_patch_comp.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])
        rev.refresh_from_db()
        self.assertEqual(rev.competency, self.tech_comp1)

        # 5. Attack Scenario 5: Mentor attempts PATCH referencing BEHAVIORAL competency
        resp_patch_behav = self.client.patch(
            f'/api/performance/technical-reviews/{rev.id}/',
            {'competency': str(self.behav_comp1.id)},
            format='json'
        )
        self.assertEqual(resp_patch_behav.status_code, status.HTTP_400_BAD_REQUEST)
        rev.refresh_from_db()
        self.assertEqual(rev.competency, self.tech_comp1)

        # 6. Attack Scenario 6: Reviewer spoofing attempt via PATCH
        resp_patch_rev = self.client.patch(
            f'/api/performance/technical-reviews/{rev.id}/',
            {'reviewer': str(self.hr.id), 'score': '4.2'},
            format='json'
        )
        self.assertEqual(resp_patch_rev.status_code, status.HTTP_200_OK)
        rev.refresh_from_db()
        self.assertEqual(rev.reviewer, self.assigned_mentor)

    def test_generic_behavioral_review_put_patch_tampering_rejected(self):
        """Verify HR cannot reassign employee or cycle on existing behavioral review."""
        from apps.performance.models import (
            CycleCompetency,
            CompetencySection,
            CycleParticipant,
            BehavioralCapabilityReview,
        )

        user_b = User.objects.create_user(
            email='intern_b2@test.com', username='intern_b2', password='Password123!', role=UserRole.INTERN
        )
        profile_b = EmployeeProfile.objects.create(
            user=user_b, employee_code='INT-003', first_name='Betty', last_name='White', department=self.dept
        )
        CycleParticipant.objects.create(cycle=self.cycle, employee=profile_b)

        b_rev = BehavioralCapabilityReview.objects.create(
            competency=self.behav_comp1,
            employee=self.intern_profile,
            cycle=self.cycle,
            reviewer=self.hr,
            score=Decimal('4.0'),
            status='DRAFT'
        )

        self.client.force_authenticate(user=self.hr)

        # Attempt to transfer behavioral review to Employee B
        resp = self.client.patch(
            f'/api/performance/behavioral-reviews/{b_rev.id}/',
            {'employee': str(profile_b.id)},
            format='json'
        )
        self.assertIn(resp.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])
        b_rev.refresh_from_db()
        self.assertEqual(b_rev.employee, self.intern_profile)

    def test_legacy_scoring_and_empty_competency_sections(self):
        """Verify explicit legacy cycles follow legacy path; new cycles with empty sections are blocked."""
        from apps.performance.models import (
            PerformanceCycle,
            CycleCompetency,
            CompetencySection,
            CycleParticipant,
            EvaluationCriterion,
            AppraisalRating,
            ScoringModel,
        )

        # 1. Explicitly legacy cycle (has AppraisalRating, NO CycleCompetency)
        legacy_cycle = PerformanceCycle.objects.create(
            name='Historical Summer 2024 Cycle',
            start_date='2024-06-01',
            end_date='2024-08-31',
            status=CycleStatus.CLOSED,
            scoring_model=ScoringModel.LEGACY_CRITERIA
        )
        CycleParticipant.objects.create(cycle=legacy_cycle, employee=self.intern_profile)
        crit = EvaluationCriterion.objects.create(
            name='Legacy Execution',
            description='Legacy evaluation criterion',
            weight=Decimal('100.00'),
            maximum_score=Decimal('100.00')
        )
        legacy_mgr_appraisal = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=legacy_cycle,
            reviewer=self.assigned_mentor,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.SUBMITTED
        )
        AppraisalRating.objects.create(
            appraisal=legacy_mgr_appraisal,
            criterion=crit,
            score=Decimal('85.00')
        )

        legacy_calc = ScoringService.calculate_cycle_score(self.intern_profile, legacy_cycle)
        self.assertTrue(legacy_calc.get('is_legacy'))
        self.assertTrue(legacy_calc.get('is_complete'))
        self.assertIsNotNone(legacy_calc.get('final_score'))

        # 2. New competency cycle with ZERO technical competencies (only behavioral active)
        cycle_no_tech = PerformanceCycle.objects.create(
            name='Cycle No Tech', start_date='2026-01-01', end_date='2026-03-31', status=CycleStatus.ACTIVE
        )
        CycleParticipant.objects.create(cycle=cycle_no_tech, employee=self.intern_profile)
        CycleCompetency.objects.create(
            cycle=cycle_no_tech, name='Behavioral Core', section=CompetencySection.BEHAVIORAL,
            weight=Decimal('100.00'), benchmark_score=Decimal('5.0'), is_active=True
        )

        calc_no_tech = ScoringService.calculate_cycle_score(self.intern_profile, cycle_no_tech)
        self.assertFalse(calc_no_tech['is_complete'])
        self.assertIsNone(calc_no_tech['final_score'])
        self.assertFalse(calc_no_tech.get('is_legacy', False))
        self.assertTrue(any('No active Technical competencies configured' in err for err in calc_no_tech['verification_errors']))

        # 3. New competency cycle with ZERO behavioral competencies (only technical active)
        cycle_no_behav = PerformanceCycle.objects.create(
            name='Cycle No Behav', start_date='2026-01-01', end_date='2026-03-31', status=CycleStatus.ACTIVE
        )
        CycleParticipant.objects.create(cycle=cycle_no_behav, employee=self.intern_profile)
        CycleCompetency.objects.create(
            cycle=cycle_no_behav, name='Technical Core', section=CompetencySection.TECHNICAL,
            weight=Decimal('100.00'), benchmark_score=Decimal('5.0'), is_active=True
        )

        calc_no_behav = ScoringService.calculate_cycle_score(self.intern_profile, cycle_no_behav)
        self.assertFalse(calc_no_behav['is_complete'])
        self.assertIsNone(calc_no_behav['final_score'])
        self.assertFalse(calc_no_behav.get('is_legacy', False))
        self.assertTrue(any('No active Behavioral competencies configured' in err for err in calc_no_behav['verification_errors']))

        # 4. New competency cycle with BOTH sections empty
        cycle_empty = PerformanceCycle.objects.create(
            name='Cycle Completely Empty', start_date='2026-01-01', end_date='2026-03-31', status=CycleStatus.ACTIVE
        )
        CycleParticipant.objects.create(cycle=cycle_empty, employee=self.intern_profile)

        calc_empty = ScoringService.calculate_cycle_score(self.intern_profile, cycle_empty)
        self.assertFalse(calc_empty['is_complete'])
        self.assertIsNone(calc_empty['final_score'])
        self.assertFalse(calc_empty.get('is_legacy', False))
        self.assertTrue(any('No active Technical competencies configured' in err for err in calc_empty['verification_errors']))
        self.assertTrue(any('No active Behavioral competencies configured' in err for err in calc_empty['verification_errors']))

        # 5. Publication remains blocked for all incomplete competency-based cycles
        self.client.force_authenticate(user=self.hr)
        appraisal_empty = Appraisal.objects.create(
            employee=self.intern_profile, cycle=cycle_empty, appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.SUBMITTED
        )
        resp_publish = self.client.post(f'/api/performance/appraisals/{appraisal_empty.id}/publish/', format='json')
        self.assertEqual(resp_publish.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp_publish.data.get('error'), 'EVALUATION_INCOMPLETE')

    def test_scoring_model_immutability_and_comprehensive_protections(self):
        """Verify persistent scoring_model immutability, legacy submission restriction, and review history protection."""
        from django.core.exceptions import ValidationError
        from apps.performance.models import (
            PerformanceCycle,
            CycleCompetency,
            CompetencySection,
            CycleParticipant,
            EvaluationCriterion,
            AppraisalRating,
            ScoringModel,
            TechnicalCapabilityReview,
            BehavioralCapabilityReview,
        )

        # 1. Historical legacy cycle remains classified as LEGACY_CRITERIA
        legacy_cycle = PerformanceCycle.objects.create(
            name='Historical Cohort 2024',
            start_date='2024-01-01',
            end_date='2024-03-31',
            scoring_model=ScoringModel.LEGACY_CRITERIA,
            status=CycleStatus.CLOSED
        )
        self.assertEqual(legacy_cycle.scoring_model, ScoringModel.LEGACY_CRITERIA)
        self.assertTrue(ScoringService.is_explicitly_legacy_cycle(legacy_cycle))

        # 2. New competency-based cycle is default classified as COMPETENCY_FRAMEWORK
        modern_cycle = PerformanceCycle.objects.create(
            name='Modern Competency Cohort 2026',
            start_date='2026-01-01',
            end_date='2026-03-31',
            status=CycleStatus.ACTIVE
        )
        self.assertEqual(modern_cycle.scoring_model, ScoringModel.COMPETENCY_FRAMEWORK)
        self.assertFalse(ScoringService.is_explicitly_legacy_cycle(modern_cycle))

        # 3. Immutability of scoring_model on PerformanceCycle
        modern_cycle.scoring_model = ScoringModel.LEGACY_CRITERIA
        with self.assertRaises(ValidationError):
            modern_cycle.save()
        modern_cycle.refresh_from_db()
        self.assertEqual(modern_cycle.scoring_model, ScoringModel.COMPETENCY_FRAMEWORK)

        # 4. Deleting or deactivating all competencies cannot convert a modern cycle to legacy
        tech_comp = CycleCompetency.objects.create(
            cycle=modern_cycle,
            name='Cloud Architecture',
            section=CompetencySection.TECHNICAL,
            weight=Decimal('100.00'),
            benchmark_score=Decimal('5.0'),
            is_active=True
        )
        behav_comp = CycleCompetency.objects.create(
            cycle=modern_cycle,
            name='Collaborative Leadership',
            section=CompetencySection.BEHAVIORAL,
            weight=Decimal('100.00'),
            benchmark_score=Decimal('5.0'),
            is_active=True
        )
        # Deactivate all
        tech_comp.is_active = False
        tech_comp.save()
        behav_comp.is_active = False
        behav_comp.save()
        self.assertFalse(ScoringService.is_explicitly_legacy_cycle(modern_cycle))

        # Delete all
        tech_comp.delete()
        behav_comp.delete()
        self.assertEqual(modern_cycle.competencies.count(), 0)
        self.assertFalse(ScoringService.is_explicitly_legacy_cycle(modern_cycle))

        # 5. Legacy AppraisalRating records cannot cause modern cycle to switch scoring models
        crit = EvaluationCriterion.objects.create(
            name='Legacy Architecture Criterion',
            description='Legacy criterion test',
            weight=Decimal('100.00'),
            maximum_score=Decimal('100.00')
        )
        modern_appraisal = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=modern_cycle,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.DRAFT
        )
        AppraisalRating.objects.create(
            appraisal=modern_appraisal,
            criterion=crit,
            score=Decimal('80.00')
        )
        self.assertFalse(ScoringService.is_explicitly_legacy_cycle(modern_cycle))

        # 6. Legacy rating submission rejected for competency-based cycles (HTTP 400 LEGACY_RATINGS_NOT_ALLOWED)
        self.client.force_authenticate(user=self.hr)
        resp_modern_submit = self.client.post(
            f'/api/performance/appraisals/{modern_appraisal.id}/submit/',
            {
                'comments': 'Attempting legacy ratings on modern cycle',
                'ratings': [{'criterion_id': str(crit.id), 'score': 90.0}]
            },
            format='json'
        )
        self.assertEqual(resp_modern_submit.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp_modern_submit.data.get('error'), 'LEGACY_RATINGS_NOT_ALLOWED')

        # 7. Legacy rating submission continues to work for genuine legacy cycles
        appraisal_legacy = Appraisal.objects.create(
            employee=self.intern_profile,
            cycle=legacy_cycle,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.DRAFT
        )
        resp_legacy_submit = self.client.post(
            f'/api/performance/appraisals/{appraisal_legacy.id}/submit/',
            {
                'comments': 'Valid legacy submission',
                'ratings': [{'criterion_id': str(crit.id), 'score': 88.0, 'comments': 'Good work'}]
            },
            format='json'
        )
        self.assertEqual(resp_legacy_submit.status_code, status.HTTP_200_OK)
        self.assertEqual(appraisal_legacy.ratings.count(), 1)

        # 8 & 9. Nested deletion of behavioral and technical competencies with existing reviews is rejected
        cycle_reviews = PerformanceCycle.objects.create(
            name='Cohort Review Protection 2026',
            start_date='2026-01-01',
            end_date='2026-03-31',
            status=CycleStatus.ACTIVE
        )
        CycleParticipant.objects.create(cycle=cycle_reviews, employee=self.intern_profile)
        c_tech = CycleCompetency.objects.create(
            cycle=cycle_reviews, name='Core Tech', section=CompetencySection.TECHNICAL,
            weight=Decimal('100.00'), benchmark_score=Decimal('5.0')
        )
        c_behav = CycleCompetency.objects.create(
            cycle=cycle_reviews, name='Core Behav', section=CompetencySection.BEHAVIORAL,
            weight=Decimal('100.00'), benchmark_score=Decimal('5.0')
        )
        t_rev = TechnicalCapabilityReview.objects.create(
            competency=c_tech, employee=self.intern_profile, cycle=cycle_reviews,
            reviewer=self.assigned_mentor, score=Decimal('4.5')
        )
        b_rev = BehavioralCapabilityReview.objects.create(
            competency=c_behav, employee=self.intern_profile, cycle=cycle_reviews,
            reviewer=self.hr, score=Decimal('4.0')
        )

        self.client.force_authenticate(user=self.hr)

        # Nested deletion of technical competency rejected
        resp_del_tech = self.client.delete(f'/api/performance/cycles/{cycle_reviews.id}/competencies/{c_tech.id}/')
        self.assertEqual(resp_del_tech.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp_del_tech.data.get('error'), 'HISTORICAL_REVIEWS_EXIST')

        # Nested deletion of behavioral competency rejected
        resp_del_behav = self.client.delete(f'/api/performance/cycles/{cycle_reviews.id}/competencies/{c_behav.id}/')
        self.assertEqual(resp_del_behav.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp_del_behav.data.get('error'), 'HISTORICAL_REVIEWS_EXIST')

        # 10. Historical review records remain intact
        t_rev.refresh_from_db()
        b_rev.refresh_from_db()
        self.assertIsNotNone(t_rev.id)
        self.assertIsNotNone(b_rev.id)
        self.assertEqual(t_rev.competency, c_tech)
        self.assertEqual(b_rev.competency, c_behav)


class Migration0012ScoringModelClassificationTests(TestCase):
    """Targeted regression and safety tests for migration 0012 historical classification."""

    def setUp(self):
        from apps.accounts.models import User, UserRole
        from apps.organization.models import Department
        from apps.employees.models import EmployeeProfile

        self.dept = Department.objects.create(name='Systems Infrastructure')
        self.mentor = User.objects.create_user(
            email='mig_mentor@test.com', username='mig_mentor', password='Password123!', role=UserRole.MANAGER
        )
        self.intern_user = User.objects.create_user(
            email='mig_intern@test.com', username='mig_intern', password='Password123!', role=UserRole.INTERN
        )
        self.intern = EmployeeProfile.objects.create(
            user=self.intern_user, employee_code='INT-MIG-01', first_name='Robin', last_name='Patel',
            department=self.dept, manager=self.mentor
        )

    def _get_migration_module(self):
        import importlib
        return importlib.import_module('apps.performance.migrations.0012_performancecycle_scoring_model')

    def test_fresh_database_migrates_without_a_manifest(self):
        """1. A fresh database with 0 cycles migrates cleanly without any manifest or env var."""
        from django.apps import apps
        from apps.performance.models import PerformanceCycle
        PerformanceCycle.objects.all().delete()
        mig = self._get_migration_module()
        # Should complete cleanly with no manifest and no env vars
        mig.populate_scoring_models(apps, None)

    def test_database_with_only_unambiguous_cycles_migrates_without_a_manifest(self):
        """2. A database containing only unambiguous cycles (legacy with ratings, modern with comps) migrates without a manifest."""
        from django.apps import apps
        from apps.performance.models import (
            PerformanceCycle, CycleStatus, EvaluationCriterion, Appraisal, AppraisalType,
            AppraisalStatus, AppraisalRating, CycleCompetency, CompetencySection,
            CycleParticipant, CycleEvaluatorAssignment, EvaluatorSectionType, ScoringModel
        )
        # Clear existing cycles for clean isolated verification
        PerformanceCycle.objects.all().delete()

        # Unambiguous Legacy
        crit = EvaluationCriterion.objects.create(
            name='Clean Code Rigor', weight=Decimal('100.00'), maximum_score=Decimal('100.00')
        )
        legacy_cycle = PerformanceCycle.objects.create(
            name='Historical Summer 2025', start_date='2025-06-01', end_date='2025-08-31',
            status=CycleStatus.CLOSED
        )
        appraisal = Appraisal.objects.create(
            employee=self.intern, cycle=legacy_cycle, reviewer=self.mentor,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.SUBMITTED
        )
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit, score=Decimal('88.00'))

        # Unambiguous Modern (with competencies)
        modern_comp_cycle = PerformanceCycle.objects.create(
            name='Modern Q1 2026', start_date='2026-01-01', end_date='2026-03-31',
            status=CycleStatus.ACTIVE
        )
        CycleCompetency.objects.create(
            cycle=modern_comp_cycle, section=CompetencySection.TECHNICAL, name='Microservices',
            weight=Decimal('100.00'), benchmark_score=Decimal('5.0')
        )

        # Unambiguous Modern (with evaluator assignments)
        modern_asgn_cycle = PerformanceCycle.objects.create(
            name='Modern Q2 2026', start_date='2026-04-01', end_date='2026-06-30',
            status=CycleStatus.DRAFT
        )
        part = CycleParticipant.objects.create(cycle=modern_asgn_cycle, employee=self.intern)
        CycleEvaluatorAssignment.objects.create(
            cycle=modern_asgn_cycle, participant=part, section=EvaluatorSectionType.TECHNICAL,
            evaluator=self.mentor, is_mandatory=True
        )

        mig = self._get_migration_module()
        # Call with NO parameters and NO environment variables
        mig.populate_scoring_models(apps, None)

        legacy_cycle.refresh_from_db()
        modern_comp_cycle.refresh_from_db()
        modern_asgn_cycle.refresh_from_db()
        self.assertEqual(legacy_cycle.scoring_model, ScoringModel.LEGACY_CRITERIA)
        self.assertEqual(modern_comp_cycle.scoring_model, ScoringModel.COMPETENCY_FRAMEWORK)
        self.assertEqual(modern_asgn_cycle.scoring_model, ScoringModel.COMPETENCY_FRAMEWORK)

    def test_ambiguous_cycle_without_manifest_causes_migration_refusal(self):
        """3. An ambiguous cycle (empty draft, unrated legacy, or transitional) causes fail-closed migration refusal."""
        from django.apps import apps
        from apps.performance.models import (
            PerformanceCycle, CycleStatus, Appraisal, AppraisalType, AppraisalStatus
        )
        PerformanceCycle.objects.all().delete()
        ambig_cycle = PerformanceCycle.objects.create(
            name='Ambiguous Unrated Cycle 2025', start_date='2025-05-01', end_date='2025-08-31',
            status=CycleStatus.CLOSED
        )
        Appraisal.objects.create(
            employee=self.intern, cycle=ambig_cycle, reviewer=self.mentor,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.DRAFT
        )

        mig = self._get_migration_module()
        with self.assertRaises(RuntimeError) as ctx:
            mig.populate_scoring_models(apps, None)

        self.assertIn("MIGRATION 0012 REFUSAL: AMBIGUOUS CYCLES DETECTED", str(ctx.exception))
        self.assertIn(str(ambig_cycle.id), str(ctx.exception))
        self.assertIn("appraisal(s) exist but 0 submitted ratings", str(ctx.exception))

    def test_explicitly_supplied_valid_manifest_resolves_ambiguous_cycle(self):
        """4. An explicitly supplied valid manifest resolves an ambiguous cycle."""
        import os
        from django.apps import apps
        from apps.performance.models import (
            PerformanceCycle, CycleStatus, Appraisal, AppraisalType, AppraisalStatus, ScoringModel
        )
        PerformanceCycle.objects.all().delete()
        ambig_cycle = PerformanceCycle.objects.create(
            name='Reviewed Ambiguous Cycle 2025', start_date='2025-05-01', end_date='2025-08-31',
            status=CycleStatus.CLOSED
        )
        Appraisal.objects.create(
            employee=self.intern, cycle=ambig_cycle, reviewer=self.mentor,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.DRAFT
        )

        mig = self._get_migration_module()

        # Supply manifest via environment variable PERFORMAX_SCORING_MANIFEST
        os.environ['PERFORMAX_SCORING_MANIFEST'] = f'{{"{ambig_cycle.id}": "LEGACY_CRITERIA"}}'
        try:
            mig.populate_scoring_models(apps, None)
        finally:
            os.environ.pop('PERFORMAX_SCORING_MANIFEST', None)

        ambig_cycle.refresh_from_db()
        self.assertEqual(ambig_cycle.scoring_model, ScoringModel.LEGACY_CRITERIA)

    def test_development_manifest_not_automatically_loaded_in_another_environment(self):
        """5. A development manifest file on disk is NOT automatically loaded in another environment without explicit env var."""
        from django.apps import apps
        from apps.performance.models import (
            PerformanceCycle, CycleStatus, EvaluationCriterion, Appraisal, AppraisalType,
            AppraisalStatus, AppraisalRating, ScoringModel
        )
        PerformanceCycle.objects.all().delete()

        # Create unambiguous legacy cycle
        crit = EvaluationCriterion.objects.create(
            name='Testing Auto Load Isolation', weight=Decimal('100.00'), maximum_score=Decimal('100.00')
        )
        legacy_cycle = PerformanceCycle.objects.create(
            name='Production Legacy Cycle', start_date='2025-01-01', end_date='2025-04-30',
            status=CycleStatus.CLOSED
        )
        appraisal = Appraisal.objects.create(
            employee=self.intern, cycle=legacy_cycle, reviewer=self.mentor,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.SUBMITTED
        )
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit, score=Decimal('90.00'))

        mig = self._get_migration_module()

        # Verify load_scoring_manifest returns empty and "none" by default
        manifest, source = mig.load_scoring_manifest()
        self.assertEqual(manifest, {})
        self.assertEqual(source, "none")

        # Running populate_scoring_models succeeds with 0 manifest errors
        mig.populate_scoring_models(apps, None)
        legacy_cycle.refresh_from_db()
        self.assertEqual(legacy_cycle.scoring_model, ScoringModel.LEGACY_CRITERIA)

    def test_stale_or_unused_explicitly_supplied_manifest_entry_rejected(self):
        """6. A stale or unused explicitly supplied manifest entry is rejected."""
        import uuid
        from django.apps import apps
        from apps.performance.models import (
            PerformanceCycle, CycleStatus, CycleCompetency, CompetencySection
        )
        PerformanceCycle.objects.all().delete()
        valid_cycle = PerformanceCycle.objects.create(
            name='Valid Staging Cycle', start_date='2026-01-01', end_date='2026-03-31',
            status=CycleStatus.ACTIVE
        )
        CycleCompetency.objects.create(
            cycle=valid_cycle, section=CompetencySection.TECHNICAL, name='Architecture',
            weight=Decimal('100.00'), benchmark_score=Decimal('5.0')
        )

        mig = self._get_migration_module()
        stale_uuid = str(uuid.uuid4())
        manifest_with_stale = {
            str(valid_cycle.id): 'COMPETENCY_FRAMEWORK',
            stale_uuid: 'COMPETENCY_FRAMEWORK'
        }

        with self.assertRaises(RuntimeError) as ctx:
            mig.populate_scoring_models(apps, None, manifest_override=manifest_with_stale)

        self.assertIn("contains unused entries", str(ctx.exception))
        self.assertIn(stale_uuid, str(ctx.exception))

    def test_conflicting_evidence_rejected(self):
        """Cycle with both AppraisalRating and CycleCompetency records is rejected even with manifest override."""
        from django.apps import apps
        from apps.performance.models import (
            PerformanceCycle, CycleStatus, EvaluationCriterion, Appraisal, AppraisalType,
            AppraisalRating, CycleCompetency, CompetencySection
        )
        PerformanceCycle.objects.all().delete()
        crit = EvaluationCriterion.objects.create(
            name='Conflict Test Criterion', weight=Decimal('100.00'), maximum_score=Decimal('100.00')
        )
        conflict_cycle = PerformanceCycle.objects.create(
            name='Conflicting Data Cycle', start_date='2026-01-01', end_date='2026-03-31',
            status=CycleStatus.ACTIVE
        )
        appraisal = Appraisal.objects.create(
            employee=self.intern, cycle=conflict_cycle, reviewer=self.mentor,
            appraisal_type=AppraisalType.MANAGER
        )
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit, score=Decimal('90.00'))
        CycleCompetency.objects.create(
            cycle=conflict_cycle, section=CompetencySection.TECHNICAL, name='Conflicting Competency',
            weight=Decimal('100.00'), benchmark_score=Decimal('5.0')
        )

        mig = self._get_migration_module()

        # 1. Without manifest -> Refusal: Conflicting Data
        with self.assertRaises(RuntimeError) as ctx:
            mig.populate_scoring_models(apps, None, manifest_override={})
        self.assertIn("MIGRATION 0012 REFUSAL: CONFLICTING DATA DETECTED", str(ctx.exception))

        # 2. Manifest claiming COMPETENCY_FRAMEWORK -> Refusal: Contradicts ratings
        manifest_modern = {str(conflict_cycle.id): 'COMPETENCY_FRAMEWORK'}
        with self.assertRaises(RuntimeError) as ctx_mod:
            mig.populate_scoring_models(apps, None, manifest_override=manifest_modern)
        self.assertIn("legacy AppraisalRating records referencing EvaluationCriterion", str(ctx_mod.exception))

        # 3. Manifest claiming LEGACY_CRITERIA -> Refusal: Contradicts competencies
        manifest_legacy = {str(conflict_cycle.id): 'LEGACY_CRITERIA'}
        with self.assertRaises(RuntimeError) as ctx_leg:
            mig.populate_scoring_models(apps, None, manifest_override=manifest_legacy)
        self.assertIn("active CycleCompetency record(s)", str(ctx_leg.exception))

    def test_manifest_syntax_and_malformed_input_validation(self):
        """Manifest loader rejects malformed UUIDs, invalid model names, and duplicate keys."""
        mig = self._get_migration_module()

        # 1. Malformed UUID
        with self.assertRaises(RuntimeError) as ctx_uuid:
            mig.load_scoring_manifest(manifest_json='{"not-a-valid-uuid": "COMPETENCY_FRAMEWORK"}')
        self.assertIn("Malformed UUID in scoring manifest", str(ctx_uuid.exception))

        # 2. Invalid scoring model
        valid_uuid = "35c8db1e-f9e3-45ac-8eff-49b7e5d6e14d"
        with self.assertRaises(RuntimeError) as ctx_model:
            mig.load_scoring_manifest(manifest_json=f'{{"{valid_uuid}": "NONEXISTENT_MODEL"}}')
        self.assertIn("Invalid scoring model 'NONEXISTENT_MODEL'", str(ctx_model.exception))

        # 3. Duplicate key in manifest
        dup_json = f'{{"{valid_uuid}": "COMPETENCY_FRAMEWORK", "{valid_uuid}": "LEGACY_CRITERIA"}}'
        with self.assertRaises(RuntimeError) as ctx_dup:
            mig.load_scoring_manifest(manifest_json=dup_json)
        self.assertIn("Duplicate entry in scoring manifest", str(ctx_dup.exception))

    def test_atomic_rollback_on_classification_failure(self):
        """7. If any cycle fails classification, the migration fails closed and no cycles are saved with partial state."""
        from django.apps import apps
        from apps.performance.models import (
            PerformanceCycle, CycleStatus, CycleCompetency, CompetencySection, ScoringModel
        )
        PerformanceCycle.objects.all().delete()

        c_modern = PerformanceCycle.objects.create(
            name='Atomic Test Modern Cycle', start_date='2026-01-01', end_date='2026-03-31',
            status=CycleStatus.ACTIVE
        )
        CycleCompetency.objects.create(
            cycle=c_modern, section=CompetencySection.TECHNICAL, name='Atomic Tech Comp',
            weight=Decimal('100.00'), benchmark_score=Decimal('5.0')
        )
        # Directly reset to verify no intermediate write happens
        PerformanceCycle.objects.filter(pk=c_modern.pk).update(scoring_model='LEGACY_CRITERIA')

        c_empty = PerformanceCycle.objects.create(
            name='Atomic Test Empty Cycle', start_date='2026-04-01', end_date='2026-06-30',
            status=CycleStatus.DRAFT
        )

        mig = self._get_migration_module()

        # Should fail closed due to c_empty
        with self.assertRaises(RuntimeError):
            mig.populate_scoring_models(apps, None, manifest_override={})

        # Verify c_modern was NOT changed/saved (still 'LEGACY_CRITERIA' as set before migration)
        c_modern.refresh_from_db()
        self.assertEqual(c_modern.scoring_model, ScoringModel.LEGACY_CRITERIA)

    def test_ratings_only_no_competencies_assignments_or_tech_params_auto_legacy(self):
        """Scenario 1: Ratings only, no competencies, no assignments, no tech params -> auto LEGACY_CRITERIA."""
        from django.apps import apps
        from apps.performance.models import (
            PerformanceCycle, CycleStatus, EvaluationCriterion, Appraisal, AppraisalType,
            AppraisalStatus, AppraisalRating, ScoringModel
        )
        PerformanceCycle.objects.all().delete()

        crit = EvaluationCriterion.objects.create(
            name='Legacy Architecture Standard', weight=Decimal('100.00'), maximum_score=Decimal('100.00')
        )
        cycle = PerformanceCycle.objects.create(
            name='Pure Legacy Cycle 2025', start_date='2025-01-01', end_date='2025-04-30',
            status=CycleStatus.CLOSED
        )
        appraisal = Appraisal.objects.create(
            employee=self.intern, cycle=cycle, reviewer=self.mentor,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.SUBMITTED
        )
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit, score=Decimal('85.00'))

        mig = self._get_migration_module()
        # No manifest supplied - must auto-classify
        mig.populate_scoring_models(apps, None, manifest_override={})
        cycle.refresh_from_db()
        self.assertEqual(cycle.scoring_model, ScoringModel.LEGACY_CRITERIA)

    def test_technical_parameters_only_without_ratings_refuses_without_manifest(self):
        """Scenario 2: TechnicalCapabilityParameter exists, no ratings, no competencies -> requires explicit manifest."""
        from django.apps import apps
        from apps.performance.models import (
            PerformanceCycle, CycleStatus, TechnicalCapabilityParameter
        )
        PerformanceCycle.objects.all().delete()

        cycle = PerformanceCycle.objects.create(
            name='Transitional Parameter Only Cycle', start_date='2025-09-01', end_date='2025-12-31',
            status=CycleStatus.CLOSED
        )
        TechnicalCapabilityParameter.objects.create(
            cycle=cycle, name='System Design', category='BACKEND',
            benchmark_score=Decimal('4.0'), weight=Decimal('50.00'), created_by=self.mentor
        )

        mig = self._get_migration_module()
        with self.assertRaises(RuntimeError) as ctx:
            mig.populate_scoring_models(apps, None, manifest_override={})

        self.assertIn("MIGRATION 0012 REFUSAL: AMBIGUOUS CYCLES DETECTED", str(ctx.exception))
        self.assertIn(str(cycle.id), str(ctx.exception))
        self.assertIn("transitional technical parameter(s) exist but 0 competencies", str(ctx.exception))

    def test_ratings_plus_technical_parameters_refuses_without_manifest(self):
        """Scenario 3: AppraisalRating + TechnicalCapabilityParameter (hybrid) -> refuses with explicit hybrid diagnostic."""
        from django.apps import apps
        from apps.performance.models import (
            PerformanceCycle, CycleStatus, EvaluationCriterion, Appraisal, AppraisalType,
            AppraisalRating, TechnicalCapabilityParameter
        )
        PerformanceCycle.objects.all().delete()

        crit = EvaluationCriterion.objects.create(
            name='Hybrid Evaluation Criterion', weight=Decimal('100.00'), maximum_score=Decimal('100.00')
        )
        cycle = PerformanceCycle.objects.create(
            name='Hybrid Historical Cycle 2025', start_date='2025-05-01', end_date='2025-08-31',
            status=CycleStatus.CLOSED
        )
        appraisal = Appraisal.objects.create(
            employee=self.intern, cycle=cycle, reviewer=self.mentor, appraisal_type=AppraisalType.MANAGER
        )
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit, score=Decimal('90.00'))
        TechnicalCapabilityParameter.objects.create(
            cycle=cycle, name='Transitional Reliability', category='BACKEND',
            benchmark_score=Decimal('4.5'), weight=Decimal('50.00'), created_by=self.mentor
        )

        mig = self._get_migration_module()
        with self.assertRaises(RuntimeError) as ctx:
            mig.populate_scoring_models(apps, None, manifest_override={})

        self.assertIn("MIGRATION 0012 REFUSAL: AMBIGUOUS CYCLES DETECTED", str(ctx.exception))
        self.assertIn(str(cycle.id), str(ctx.exception))
        self.assertIn("hybrid cycle: 1 legacy appraisal rating(s) exist alongside 1 transitional technical parameter(s) without competencies", str(ctx.exception))

    def test_hybrid_case_with_valid_acknowledged_manifest_entry(self):
        """Scenario 4: Hybrid cycle classified via manifest with acknowledged_hybrid=True succeeds."""
        from django.apps import apps
        from apps.performance.models import (
            PerformanceCycle, CycleStatus, EvaluationCriterion, Appraisal, AppraisalType,
            AppraisalRating, TechnicalCapabilityParameter, ScoringModel
        )
        PerformanceCycle.objects.all().delete()

        crit = EvaluationCriterion.objects.create(
            name='Acknowledged Hybrid Criterion', weight=Decimal('100.00'), maximum_score=Decimal('100.00')
        )
        cycle = PerformanceCycle.objects.create(
            name='Acknowledged Hybrid Cycle 2025', start_date='2025-05-01', end_date='2025-08-31',
            status=CycleStatus.CLOSED
        )
        appraisal = Appraisal.objects.create(
            employee=self.intern, cycle=cycle, reviewer=self.mentor, appraisal_type=AppraisalType.MANAGER
        )
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit, score=Decimal('88.00'))
        TechnicalCapabilityParameter.objects.create(
            cycle=cycle, name='Acknowledged Param', category='BACKEND',
            benchmark_score=Decimal('4.0'), weight=Decimal('40.00'), created_by=self.mentor
        )

        mig = self._get_migration_module()
        manifest_override = {
            str(cycle.id): {
                'scoring_model': 'LEGACY_CRITERIA',
                'acknowledged_hybrid': True
            }
        }
        mig.populate_scoring_models(apps, None, manifest_override=manifest_override)
        cycle.refresh_from_db()
        self.assertEqual(cycle.scoring_model, ScoringModel.LEGACY_CRITERIA)

    def test_technical_parameters_plus_competencies_auto_modern(self):
        """Scenario 5: TechnicalCapabilityParameter + CycleCompetency (no ratings) -> auto COMPETENCY_FRAMEWORK."""
        from django.apps import apps
        from apps.performance.models import (
            PerformanceCycle, CycleStatus, CycleCompetency, CompetencySection,
            TechnicalCapabilityParameter, ScoringModel
        )
        PerformanceCycle.objects.all().delete()

        cycle = PerformanceCycle.objects.create(
            name='Modern Cycle with Residual Param', start_date='2026-01-01', end_date='2026-03-31',
            status=CycleStatus.ACTIVE
        )
        CycleCompetency.objects.create(
            cycle=cycle, section=CompetencySection.TECHNICAL, name='Cloud Infrastructure',
            weight=Decimal('100.00'), benchmark_score=Decimal('5.0')
        )
        TechnicalCapabilityParameter.objects.create(
            cycle=cycle, name='Legacy Residue Param', category='BACKEND',
            benchmark_score=Decimal('4.0'), weight=Decimal('30.00'), created_by=self.mentor
        )

        mig = self._get_migration_module()
        # No manifest supplied - must auto-classify as modern
        mig.populate_scoring_models(apps, None, manifest_override={})
        cycle.refresh_from_db()
        self.assertEqual(cycle.scoring_model, ScoringModel.COMPETENCY_FRAMEWORK)

    def test_hybrid_manifest_entry_without_required_acknowledgement_rejected(self):
        """Scenario 6: Hybrid manifest without acknowledged_hybrid=True or claiming COMPETENCY_FRAMEWORK is rejected."""
        from django.apps import apps
        from apps.performance.models import (
            PerformanceCycle, CycleStatus, EvaluationCriterion, Appraisal, AppraisalType,
            AppraisalRating, TechnicalCapabilityParameter
        )
        PerformanceCycle.objects.all().delete()

        crit = EvaluationCriterion.objects.create(
            name='Unacknowledged Hybrid Criterion', weight=Decimal('100.00'), maximum_score=Decimal('100.00')
        )
        cycle = PerformanceCycle.objects.create(
            name='Unacknowledged Hybrid Cycle 2025', start_date='2025-05-01', end_date='2025-08-31',
            status=CycleStatus.CLOSED
        )
        appraisal = Appraisal.objects.create(
            employee=self.intern, cycle=cycle, reviewer=self.mentor, appraisal_type=AppraisalType.MANAGER
        )
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit, score=Decimal('82.00'))
        TechnicalCapabilityParameter.objects.create(
            cycle=cycle, name='Unacknowledged Param', category='BACKEND',
            benchmark_score=Decimal('3.5'), weight=Decimal('50.00'), created_by=self.mentor
        )

        mig = self._get_migration_module()

        # 1. Manifest string 'LEGACY_CRITERIA' without acknowledged_hybrid flag -> REJECTED
        with self.assertRaises(RuntimeError) as ctx_unack:
            mig.populate_scoring_models(apps, None, manifest_override={str(cycle.id): 'LEGACY_CRITERIA'})
        self.assertIn("requires explicit operator acknowledgement: 'acknowledged_hybrid': true in manifest", str(ctx_unack.exception))

        # 2. Manifest dict with acknowledged_hybrid=False -> REJECTED
        with self.assertRaises(RuntimeError) as ctx_false:
            mig.populate_scoring_models(apps, None, manifest_override={str(cycle.id): {'scoring_model': 'LEGACY_CRITERIA', 'acknowledged_hybrid': False}})
        self.assertIn("requires explicit operator acknowledgement: 'acknowledged_hybrid': true in manifest", str(ctx_false.exception))

        # 3. Manifest claiming COMPETENCY_FRAMEWORK for hybrid cycle (which has ratings) -> REJECTED as contradictory
        with self.assertRaises(RuntimeError) as ctx_mod:
            mig.populate_scoring_models(apps, None, manifest_override={str(cycle.id): 'COMPETENCY_FRAMEWORK'})
        self.assertIn("contains legacy AppraisalRating records referencing EvaluationCriterion", str(ctx_mod.exception))


class MentorAppraisalExecutionPhase2Workstream1Tests(TestCase):
    """
    Phase 2 Workstream 1 Test Suite: Mentor Technical Appraisal Execution.
    Covers:
      1. Deterministic active cycle resolution (0 cycles, 1 cycle, >1 cycles).
      2. Rejection of latest-cycle fallback.
      3. Strict evaluator assignment authorization via CycleEvaluatorAssignment.
      4. Explicit cycle selection and access validation.
      5. Progress calculation telemetry (NOT_STARTED, IN_PROGRESS, SUBMITTED).
      6. Zero active competencies configuration error handling.
      7. Historical cycle protection (read-only for FINALIZED/PUBLISHED/CLOSED).
      8. Direct manager without assignment authorization refusal.
      9. Decimal score precision and range validation (0.00 to scale_max).
      10. Complete vs incomplete submission enforcement.
    """

    def setUp(self):
        from datetime import date
        import uuid
        from rest_framework.test import APIClient
        from apps.accounts.models import User, UserRole
        from apps.organization.models import Department
        from apps.employees.models import EmployeeProfile, EmploymentStatus
        from apps.performance.models import (
            PerformanceCycle,
            CycleStatus,
            CycleParticipant,
            CycleCompetency,
            CompetencySection,
            CycleEvaluatorAssignment,
            EvaluatorSectionType,
            TechnicalCapabilityReview,
            ScoringModel,
        )

        self.client = APIClient()

        # Users
        self.mentor = User.objects.create_user(
            email='ws1_mentor@test.com',
            username='ws1_mentor',
            password='Password123!',
            role=UserRole.MANAGER
        )
        self.unassigned_mentor = User.objects.create_user(
            email='ws1_unassigned@test.com',
            username='ws1_unassigned',
            password='Password123!',
            role=UserRole.MANAGER
        )
        self.direct_manager = User.objects.create_user(
            email='ws1_manager@test.com',
            username='ws1_manager',
            password='Password123!',
            role=UserRole.MANAGER
        )
        self.hr = User.objects.create_user(
            email='ws1_hr@test.com',
            username='ws1_hr',
            password='Password123!',
            role=UserRole.HR
        )
        self.intern_user = User.objects.create_user(
            email='ws1_intern@test.com',
            username='ws1_intern',
            password='Password123!',
            role=UserRole.INTERN
        )

        self.dept = Department.objects.create(name='Platform Engineering')
        self.intern_profile = EmployeeProfile.objects.create(
            user=self.intern_user,
            employee_code='INT-WS1-01',
            first_name='Aarav',
            last_name='Sharma',
            department=self.dept,
            employment_status=EmploymentStatus.ACTIVE,
            manager=self.direct_manager  # direct manager is NOT assigned as technical evaluator
        )

        # Standard active cycle
        self.cycle1 = PerformanceCycle.objects.create(
            name='2026 Q4 Intern Technical Review',
            start_date=date(2026, 10, 1),
            end_date=date(2026, 12, 31),
            status=CycleStatus.ACTIVE,
            rating_scale_max=Decimal('5.0'),
            scoring_model=ScoringModel.COMPETENCY_FRAMEWORK
        )
        self.participant1 = CycleParticipant.objects.create(
            cycle=self.cycle1,
            employee=self.intern_profile
        )
        self.comp1 = CycleCompetency.objects.create(
            cycle=self.cycle1,
            name='Backend Architecture',
            section=CompetencySection.TECHNICAL,
            weight=Decimal('50.00'),
            benchmark_score=Decimal('4.00'),
            order=1,
            is_active=True
        )
        self.comp2 = CycleCompetency.objects.create(
            cycle=self.cycle1,
            name='API Design & REST Principles',
            section=CompetencySection.TECHNICAL,
            weight=Decimal('50.00'),
            benchmark_score=Decimal('3.50'),
            order=2,
            is_active=True
        )
        self.assignment1 = CycleEvaluatorAssignment.objects.create(
            cycle=self.cycle1,
            participant=self.participant1,
            evaluator=self.mentor,
            section=EvaluatorSectionType.TECHNICAL,
            is_mandatory=True
        )

    def test_no_eligible_cycles(self):
        """When user has no assignments in active cycles, returns empty state without errors."""
        self.client.force_authenticate(user=self.unassigned_mentor)
        resp = self.client.get('/api/performance/evaluations/mentor/assigned/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data['requires_cycle_selection'])
        self.assertIsNone(data['selected_cycle'])
        self.assertEqual(data['assigned_evaluations'], [])

    def test_single_active_cycle_auto_selected(self):
        """When exactly one active cycle has assignments for the mentor, it is automatically selected."""
        self.client.force_authenticate(user=self.mentor)
        resp = self.client.get('/api/performance/evaluations/mentor/assigned/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data['requires_cycle_selection'])
        self.assertIsNotNone(data['selected_cycle'])
        self.assertEqual(data['selected_cycle']['id'], str(self.cycle1.id))
        self.assertEqual(len(data['assigned_evaluations']), 1)
        eval_item = data['assigned_evaluations'][0]
        self.assertEqual(eval_item['participant_id'], str(self.participant1.id))
        self.assertEqual(eval_item['employee_code'], 'INT-WS1-01')
        self.assertEqual(eval_item['progress']['status'], 'NOT_STARTED')
        self.assertEqual(eval_item['progress']['total_competencies'], 2)
        self.assertEqual(eval_item['progress']['scored_competencies'], 0)

    def test_multiple_active_cycles_requires_cycle_selection(self):
        """When multiple active cycles exist with assignments, requires_cycle_selection is True."""
        from datetime import date
        from apps.performance.models import PerformanceCycle, CycleStatus, CycleParticipant, CycleEvaluatorAssignment, EvaluatorSectionType, ScoringModel
        cycle2 = PerformanceCycle.objects.create(
            name='2026 Special Mid-Term Evaluation',
            start_date=date(2026, 11, 1),
            end_date=date(2026, 12, 15),
            status=CycleStatus.IN_PROGRESS,
            rating_scale_max=Decimal('5.0'),
            scoring_model=ScoringModel.COMPETENCY_FRAMEWORK
        )
        p2 = CycleParticipant.objects.create(cycle=cycle2, employee=self.intern_profile)
        CycleEvaluatorAssignment.objects.create(
            cycle=cycle2, participant=p2, evaluator=self.mentor, section=EvaluatorSectionType.TECHNICAL
        )

        self.client.force_authenticate(user=self.mentor)
        resp = self.client.get('/api/performance/evaluations/mentor/assigned/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data['requires_cycle_selection'])
        self.assertIsNone(data['selected_cycle'])
        self.assertEqual(len(data['eligible_cycles']), 2)
        self.assertEqual(data['assigned_evaluations'], [])

    def test_explicit_cycle_selection(self):
        """Passing explicit cycle_id resolves the requested cycle regardless of other active cycles."""
        self.client.force_authenticate(user=self.mentor)
        resp = self.client.get(f'/api/performance/evaluations/mentor/assigned/?cycle_id={self.cycle1.id}')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data['requires_cycle_selection'])
        self.assertEqual(data['selected_cycle']['id'], str(self.cycle1.id))
        self.assertEqual(len(data['assigned_evaluations']), 1)

    def test_invalid_cycle_id_returns_404(self):
        """Non-existent cycle_id returns 404 CYCLE_NOT_FOUND."""
        import uuid
        self.client.force_authenticate(user=self.mentor)
        bad_id = uuid.uuid4()
        resp = self.client.get(f'/api/performance/evaluations/mentor/assigned/?cycle_id={bad_id}')
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.json()['error'], 'CYCLE_NOT_FOUND')

    def test_unassigned_evaluator_access_denied_on_explicit_cycle(self):
        """Mentor requesting a cycle where they have no assignments receives 403 ACCESS_DENIED."""
        self.client.force_authenticate(user=self.unassigned_mentor)
        resp = self.client.get(f'/api/performance/evaluations/mentor/assigned/?cycle_id={self.cycle1.id}')
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.json()['error'], 'ACCESS_DENIED')

    def test_direct_manager_without_assignment_cannot_access_or_submit(self):
        """Direct manager hierarchy does not bypass CycleEvaluatorAssignment check."""
        self.client.force_authenticate(user=self.direct_manager)
        # Attempt GET technical evaluation sheet
        resp_get = self.client.get(f'/api/performance/evaluations/technical/?participant_id={self.participant1.id}')
        self.assertEqual(resp_get.status_code, 403)

        # Attempt POST technical evaluation submission
        payload = {
            'participant_id': str(self.participant1.id),
            'cycle_id': str(self.cycle1.id),
            'status': 'DRAFT',
            'reviews': [{'competency_id': str(self.comp1.id), 'score': 4.0}]
        }
        resp_post = self.client.post('/api/performance/evaluations/technical/', data=payload, format='json')
        self.assertEqual(resp_post.status_code, 403)

    def test_zero_active_competencies_configuration_error(self):
        """Cycle with 0 active competencies reports configuration error and cannot represent completed evaluation."""
        from datetime import date
        from apps.performance.models import PerformanceCycle, CycleStatus, CycleParticipant, CycleEvaluatorAssignment, EvaluatorSectionType, ScoringModel
        cycle_empty = PerformanceCycle.objects.create(
            name='2026 Misconfigured Cycle',
            start_date=date(2026, 10, 1),
            end_date=date(2026, 12, 31),
            status=CycleStatus.ACTIVE,
            scoring_model=ScoringModel.COMPETENCY_FRAMEWORK
        )
        p = CycleParticipant.objects.create(cycle=cycle_empty, employee=self.intern_profile)
        CycleEvaluatorAssignment.objects.create(
            cycle=cycle_empty, participant=p, evaluator=self.mentor, section=EvaluatorSectionType.TECHNICAL
        )

        self.client.force_authenticate(user=self.mentor)
        resp = self.client.get(f'/api/performance/evaluations/mentor/assigned/?cycle_id={cycle_empty.id}')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        eval_item = data['assigned_evaluations'][0]
        self.assertTrue(eval_item['progress']['has_configuration_error'])
        self.assertNotEqual(eval_item['progress']['status'], 'SUBMITTED')

    def test_partial_draft_and_progress_telemetry(self):
        """Saving draft with 1 of 2 competencies scored updates progress to IN_PROGRESS."""
        self.client.force_authenticate(user=self.mentor)
        payload = {
            'participant_id': str(self.participant1.id),
            'cycle_id': str(self.cycle1.id),
            'status': 'DRAFT',
            'reviews': [
                {
                    'competency_id': str(self.comp1.id),
                    'score': 3.75,
                    'mentor_assessment': 'Good design progress',
                    'evidence_url': 'https://github.com/pull/42'
                }
            ]
        }
        resp = self.client.post('/api/performance/evaluations/technical/', data=payload, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['status'], 'DRAFT')

        # Check assigned evaluations progress
        resp_assigned = self.client.get(f'/api/performance/evaluations/mentor/assigned/?cycle_id={self.cycle1.id}')
        eval_item = resp_assigned.json()['assigned_evaluations'][0]
        self.assertEqual(eval_item['progress']['status'], 'IN_PROGRESS')
        self.assertEqual(eval_item['progress']['scored_competencies'], 1)
        self.assertEqual(eval_item['progress']['total_competencies'], 2)
        self.assertIsNotNone(eval_item['progress']['last_updated_at'])

    def test_incomplete_submission_blocked(self):
        """Submitting review when competencies remain unscored returns 400 INCOMPLETE_SUBMISSION."""
        self.client.force_authenticate(user=self.mentor)
        payload = {
            'participant_id': str(self.participant1.id),
            'cycle_id': str(self.cycle1.id),
            'status': 'SUBMITTED',
            'reviews': [
                {
                    'competency_id': str(self.comp1.id),
                    'score': 4.0,
                    'mentor_assessment': 'Comp 1 completed'
                }
                # Comp 2 is missing!
            ]
        }
        resp = self.client.post('/api/performance/evaluations/technical/', data=payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'INCOMPLETE_SUBMISSION')

    def test_valid_decimal_scores_and_complete_submission(self):
        """Submitting all competencies with valid two-decimal precision scores succeeds."""
        self.client.force_authenticate(user=self.mentor)
        payload = {
            'participant_id': str(self.participant1.id),
            'cycle_id': str(self.cycle1.id),
            'status': 'SUBMITTED',
            'reviews': [
                {
                    'competency_id': str(self.comp1.id),
                    'score': 3.75,
                    'mentor_assessment': 'Exceeds standard'
                },
                {
                    'competency_id': str(self.comp2.id),
                    'score': 4.25,
                    'mentor_assessment': 'Excellent API architecture'
                }
            ]
        }
        resp = self.client.post('/api/performance/evaluations/technical/', data=payload, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['status'], 'SUBMITTED')

        # Check assigned evaluations progress reflects SUBMITTED
        resp_assigned = self.client.get(f'/api/performance/evaluations/mentor/assigned/?cycle_id={self.cycle1.id}')
        eval_item = resp_assigned.json()['assigned_evaluations'][0]
        self.assertEqual(eval_item['progress']['status'], 'SUBMITTED')
        self.assertEqual(eval_item['progress']['scored_competencies'], 2)

    def test_invalid_score_range_blocked(self):
        """Score exceeding rating_scale_max or below 0.00 is blocked."""
        self.client.force_authenticate(user=self.mentor)
        payload = {
            'participant_id': str(self.participant1.id),
            'cycle_id': str(self.cycle1.id),
            'status': 'DRAFT',
            'reviews': [
                {
                    'competency_id': str(self.comp1.id),
                    'score': 6.00  # Scale max is 5.0!
                }
            ]
        }
        resp = self.client.post('/api/performance/evaluations/technical/', data=payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'INVALID_SCORE')

    def test_historical_cycle_read_only(self):
        """Cycles in FINALIZED, PUBLISHED, or CLOSED status allow GET but reject POST modifications."""
        from apps.performance.models import CycleStatus
        self.cycle1.status = CycleStatus.FINALIZED
        self.cycle1.save()

        self.client.force_authenticate(user=self.mentor)
        # GET is allowed (read-only)
        resp_get = self.client.get(f'/api/performance/evaluations/technical/?participant_id={self.participant1.id}')
        self.assertEqual(resp_get.status_code, 200)

        # POST is blocked with CYCLE_CLOSED
        payload = {
            'participant_id': str(self.participant1.id),
            'cycle_id': str(self.cycle1.id),
            'status': 'DRAFT',
            'reviews': [{'competency_id': str(self.comp1.id), 'score': 4.0}]
        }
        resp_post = self.client.post('/api/performance/evaluations/technical/', data=payload, format='json')
        self.assertEqual(resp_post.status_code, 400)
        self.assertEqual(resp_post.json()['error'], 'CYCLE_CLOSED')

    def test_zero_decimal_score_is_valid(self):
        """0.00 is accepted as a valid complete evaluation score."""
        self.client.force_authenticate(user=self.mentor)
        payload = {
            'participant_id': str(self.participant1.id),
            'cycle_id': str(self.cycle1.id),
            'status': 'SUBMITTED',
            'reviews': [
                {
                    'competency_id': str(self.comp1.id),
                    'score': 0.00,
                    'mentor_assessment': 'Baseline level'
                },
                {
                    'competency_id': str(self.comp2.id),
                    'score': 0.00,
                    'mentor_assessment': 'Baseline level'
                }
            ]
        }
        resp = self.client.post('/api/performance/evaluations/technical/', data=payload, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['status'], 'SUBMITTED')

        from apps.performance.models import TechnicalCapabilityReview
        rev = TechnicalCapabilityReview.objects.get(cycle=self.cycle1, competency=self.comp1, employee=self.intern_profile)
        self.assertEqual(rev.score, Decimal('0.00'))

    def test_historical_cycle_mutation_blocked_across_all_routes(self):
        """Verify TechnicalCapabilityReviewViewSet and ManagerTechnicalReviewsView block writes on closed cycles."""
        from apps.performance.models import CycleStatus, TechnicalCapabilityReview, TechnicalCapabilityParameter
        self.cycle1.status = CycleStatus.CLOSED
        self.cycle1.save()

        # 1. TechnicalCapabilityReviewViewSet create blocked
        self.client.force_authenticate(user=self.hr)
        payload = {
            'cycle': str(self.cycle1.id),
            'employee': str(self.intern_profile.id),
            'competency': str(self.comp1.id),
            'score': '4.00',
            'status': 'SUBMITTED'
        }
        resp_viewset_create = self.client.post('/api/performance/technical-reviews/', data=payload, format='json')
        self.assertIn(resp_viewset_create.status_code, [400, 403])

        # 2. Existing review update blocked on closed cycle
        existing_rev = TechnicalCapabilityReview.objects.create(
            cycle=self.cycle1,
            competency=self.comp1,
            employee=self.intern_profile,
            reviewer=self.mentor,
            score=Decimal('3.50'),
            status='DRAFT'
        )
        resp_viewset_update = self.client.patch(
            f'/api/performance/technical-reviews/{existing_rev.id}/',
            data={'score': '4.50'},
            format='json'
        )
        self.assertIn(resp_viewset_update.status_code, [400, 403])

        # 3. Existing review delete blocked on closed cycle
        resp_viewset_delete = self.client.delete(f'/api/performance/technical-reviews/{existing_rev.id}/')
        self.assertIn(resp_viewset_delete.status_code, [400, 403])

        # 4. ManagerTechnicalReviewsView post blocked on closed cycle
        param = TechnicalCapabilityParameter.objects.create(
            cycle=self.cycle1,
            name='Historical Arch',
            category='BACKEND',
            benchmark_score=Decimal('3.5'),
            weight=Decimal('50.00'),
            created_by=self.mentor
        )
        resp_manager_post = self.client.post(
            '/api/manager/technical-reviews/',
            data={
                'employee_id': str(self.intern_profile.id),
                'reviews': [{'parameter_id': str(param.id), 'score': 5.0, 'mentor_assessment': 'Test'}]
            },
            format='json'
        )
        self.assertEqual(resp_manager_post.status_code, 400)
        self.assertEqual(resp_manager_post.json().get('error'), 'CYCLE_CLOSED')

    def test_behavioral_historical_cycle_write_protection(self):
        """
        Verify BehavioralCapabilityReviewViewSet blocks POST, PUT, PATCH, DELETE
        across FINALIZED, PUBLISHED, and CLOSED cycles, while preserving authorized HR GET access
        and maintaining the HR-only authorization model.
        """
        from apps.performance.models import (
            CycleStatus,
            CycleCompetency,
            CompetencySection,
            BehavioralCapabilityReview
        )

        b_comp1 = CycleCompetency.objects.create(
            cycle=self.cycle1,
            name='Teamwork & Communication',
            section=CompetencySection.BEHAVIORAL,
            weight=Decimal('50.00'),
            benchmark_score=Decimal('3.50'),
            order=1,
            is_active=True
        )
        b_comp2 = CycleCompetency.objects.create(
            cycle=self.cycle1,
            name='Leadership & Mentorship',
            section=CompetencySection.BEHAVIORAL,
            weight=Decimal('50.00'),
            benchmark_score=Decimal('4.00'),
            order=2,
            is_active=True
        )

        # 1. Non-HR cannot access GET or POST even on active cycle (HR-only model)
        self.client.force_authenticate(user=self.mentor)
        resp_mentor = self.client.get('/api/performance/behavioral-reviews/')
        self.assertEqual(resp_mentor.status_code, 403)
        resp_mentor_post = self.client.post(
            '/api/performance/behavioral-reviews/',
            data={
                'cycle': str(self.cycle1.id),
                'competency': str(b_comp1.id),
                'employee': str(self.intern_profile.id),
                'score': '4.00',
                'status': 'SUBMITTED'
            },
            format='json'
        )
        self.assertEqual(resp_mentor_post.status_code, 403)

        # Test across all historical statuses: FINALIZED, PUBLISHED, CLOSED
        for historical_status in [CycleStatus.FINALIZED, CycleStatus.PUBLISHED, CycleStatus.CLOSED]:
            self.cycle1.status = historical_status
            self.cycle1.save()

            # Create an existing review in DB on b_comp1 for testing update/delete/get
            review = BehavioralCapabilityReview.objects.create(
                cycle=self.cycle1,
                competency=b_comp1,
                employee=self.intern_profile,
                reviewer=self.hr,
                score=Decimal('3.50'),
                status='DRAFT'
            )

            self.client.force_authenticate(user=self.hr)

            # A. GET (list & retrieve) is permitted for authorized HR on historical cycles
            resp_list = self.client.get(f'/api/performance/behavioral-reviews/?cycle={self.cycle1.id}')
            self.assertEqual(resp_list.status_code, 200)
            resp_retrieve = self.client.get(f'/api/performance/behavioral-reviews/{review.id}/')
            self.assertEqual(resp_retrieve.status_code, 200)
            self.assertEqual(resp_retrieve.json()['score'], '3.50')

            # B. POST/create on historical cycle is rejected (403 PermissionDenied from perform_create)
            post_payload = {
                'cycle': str(self.cycle1.id),
                'competency': str(b_comp2.id),
                'employee': str(self.intern_profile.id),
                'score': '4.00',
                'status': 'SUBMITTED'
            }
            resp_post = self.client.post('/api/performance/behavioral-reviews/', data=post_payload, format='json')
            self.assertEqual(resp_post.status_code, 403)
            self.assertIn('Cannot create behavioral reviews on a cycle in', resp_post.json().get('detail', ''))

            # C. PATCH/update on historical cycle is rejected (403 PermissionDenied from perform_update)
            resp_patch = self.client.patch(
                f'/api/performance/behavioral-reviews/{review.id}/',
                data={'score': '4.50'},
                format='json'
            )
            self.assertEqual(resp_patch.status_code, 403)
            self.assertIn('Cannot modify behavioral reviews on a cycle in', resp_patch.json().get('detail', ''))

            # D. PUT/update on historical cycle is rejected (403 PermissionDenied from perform_update)
            put_payload = {
                'cycle': str(self.cycle1.id),
                'competency': str(b_comp1.id),
                'employee': str(self.intern_profile.id),
                'score': '4.20',
                'status': 'SUBMITTED'
            }
            resp_put = self.client.put(
                f'/api/performance/behavioral-reviews/{review.id}/',
                data=put_payload,
                format='json'
            )
            self.assertEqual(resp_put.status_code, 403)
            self.assertIn('Cannot modify behavioral reviews on a cycle in', resp_put.json().get('detail', ''))

            # E. DELETE/destroy on historical cycle is rejected (403 PermissionDenied from perform_destroy)
            resp_delete = self.client.delete(f'/api/performance/behavioral-reviews/{review.id}/')
            self.assertEqual(resp_delete.status_code, 403)
            self.assertIn('Cannot delete behavioral reviews on a cycle in', resp_delete.json().get('detail', ''))

            # Verify review still exists in DB (not deleted)
            self.assertTrue(BehavioralCapabilityReview.objects.filter(id=review.id).exists())

            # Cleanup this review before next status test iteration
            BehavioralCapabilityReview.objects.filter(id=review.id).delete()

        # Reset cycle to ACTIVE
        self.cycle1.status = CycleStatus.ACTIVE
        self.cycle1.save()


class MentorAppraisalExecutionPhase2Workstream2Tests(TestCase):
    """
    Workstream 2 Backend Test Suite:
    - HR Evaluation Progress Dashboard (GET /api/performance/cycles/{id}/evaluation-progress/)
    - Behavioral Evaluation Execution & HR Authorization (GET & POST /api/performance/evaluations/behavioral/)
    - Japanese mandatory/optional/unconfigured lifecycle & readiness gates
    - Deterministic readiness blockers & operational completeness verification
    """

    def setUp(self):
        from datetime import date
        from apps.accounts.models import UserRole
        from apps.organization.models import Department
        from apps.employees.models import EmployeeProfile, EmploymentStatus
        from apps.performance.models import (
            PerformanceCycle,
            CycleStatus,
            CycleParticipant,
            CycleCompetency,
            CompetencySection,
            CycleEvaluatorAssignment,
            EvaluatorSectionType,
            TechnicalCapabilityReview,
            BehavioralCapabilityReview,
            ScoringModel,
        )

        self.client = APIClient()

        # Users
        self.hr = User.objects.create_user(
            email='ws2_hr@test.com',
            username='ws2_hr',
            password='Password123!',
            role=UserRole.HR
        )
        self.hr2 = User.objects.create_user(
            email='ws2_hr2@test.com',
            username='ws2_hr2',
            password='Password123!',
            role=UserRole.HR
        )
        self.mentor = User.objects.create_user(
            email='ws2_mentor@test.com',
            username='ws2_mentor',
            password='Password123!',
            role=UserRole.MANAGER
        )
        self.intern_user = User.objects.create_user(
            email='ws2_intern@test.com',
            username='ws2_intern',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.instructor = User.objects.create_user(
            email='ws2_instructor@test.com',
            username='ws2_instructor',
            password='Password123!',
            role='INSTRUCTOR'
        )

        self.dept = Department.objects.create(name='Core Engineering')
        self.intern_profile = EmployeeProfile.objects.create(
            user=self.intern_user,
            employee_code='INT-WS2-01',
            first_name='Kavya',
            last_name='Iyer',
            department=self.dept,
            employment_status=EmploymentStatus.ACTIVE,
            manager=self.mentor
        )

        # Performance Cycle
        self.cycle = PerformanceCycle.objects.create(
            name='2026 Q4 Engineering Evaluation',
            start_date=date(2026, 10, 1),
            end_date=date(2026, 12, 31),
            status=CycleStatus.ACTIVE,
            rating_scale_max=Decimal('5.0'),
            technical_weight=Decimal('60.00'),
            behavioral_weight=Decimal('40.00'),
            japanese_evaluation_mandatory=False,
            scoring_model=ScoringModel.COMPETENCY_FRAMEWORK
        )

        self.participant = CycleParticipant.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile
        )

        # Technical Competencies (sum to 100%)
        self.tech_comp1 = CycleCompetency.objects.create(
            cycle=self.cycle,
            name='System Architecture',
            section=CompetencySection.TECHNICAL,
            weight=Decimal('50.00'),
            benchmark_score=Decimal('4.0'),
            order=1,
            is_active=True
        )
        self.tech_comp2 = CycleCompetency.objects.create(
            cycle=self.cycle,
            name='Clean Code & Testing',
            section=CompetencySection.TECHNICAL,
            weight=Decimal('50.00'),
            benchmark_score=Decimal('3.5'),
            order=2,
            is_active=True
        )

        # Behavioral Competencies (sum to 100%)
        self.behav_comp1 = CycleCompetency.objects.create(
            cycle=self.cycle,
            name='Effective Communication',
            section=CompetencySection.BEHAVIORAL,
            weight=Decimal('50.00'),
            benchmark_score=Decimal('4.0'),
            order=1,
            is_active=True
        )
        self.behav_comp2 = CycleCompetency.objects.create(
            cycle=self.cycle,
            name='Collaboration & Teamwork',
            section=CompetencySection.BEHAVIORAL,
            weight=Decimal('50.00'),
            benchmark_score=Decimal('3.5'),
            order=2,
            is_active=True
        )

        # Valid Evaluator Assignments
        self.tech_asgn = CycleEvaluatorAssignment.objects.create(
            cycle=self.cycle,
            participant=self.participant,
            section=EvaluatorSectionType.TECHNICAL,
            evaluator=self.mentor
        )
        self.behav_asgn = CycleEvaluatorAssignment.objects.create(
            cycle=self.cycle,
            participant=self.participant,
            section=EvaluatorSectionType.BEHAVIORAL,
            evaluator=self.hr
        )

    def test_hr_only_progress_authorization(self):
        """Only HR and Super Admin can access the evaluation-progress endpoint."""
        # HR gets 200 OK
        self.client.force_authenticate(user=self.hr)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['cycle_id'], str(self.cycle.id))

        # Mentor gets 403 Forbidden
        self.client.force_authenticate(user=self.mentor)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        self.assertEqual(resp.status_code, 403)

        # Intern gets 403 Forbidden
        self.client.force_authenticate(user=self.intern_user)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        self.assertEqual(resp.status_code, 403)

        # Instructor gets 403 Forbidden
        self.client.force_authenticate(user=self.instructor)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        self.assertEqual(resp.status_code, 403)

    def test_technical_and_behavioral_progress_aggregation(self):
        """Tests progression from NOT_STARTED to IN_PROGRESS to SUBMITTED for both tracks."""
        from apps.performance.models import TechnicalCapabilityReview, BehavioralCapabilityReview

        self.client.force_authenticate(user=self.hr)

        # 1. Initially NOT_STARTED for both
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p_data = resp.json()['participants'][0]
        self.assertEqual(p_data['technical']['status'], 'NOT_STARTED')
        self.assertEqual(p_data['behavioral']['status'], 'NOT_STARTED')
        self.assertFalse(p_data['is_ready_for_review'])

        # 2. In progress when partial scoring or draft exists
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            competency=self.tech_comp1,
            reviewer=self.mentor,
            score=Decimal('4.50'),
            status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            competency=self.behav_comp1,
            reviewer=self.hr,
            score=Decimal('4.00'),
            status='DRAFT'
        )

        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p_data = resp.json()['participants'][0]
        self.assertEqual(p_data['technical']['status'], 'IN_PROGRESS')
        self.assertEqual(p_data['technical']['scored_competencies'], 1)
        self.assertEqual(p_data['behavioral']['status'], 'IN_PROGRESS')
        self.assertEqual(p_data['behavioral']['scored_competencies'], 1)
        self.assertFalse(p_data['is_ready_for_review'])

        # 3. Fully submitted when all competencies are scored & SUBMITTED
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            competency=self.tech_comp2,
            reviewer=self.mentor,
            score=Decimal('4.00'),
            status='SUBMITTED'
        )
        # Update first behavioral to SUBMITTED and create second as SUBMITTED
        BehavioralCapabilityReview.objects.filter(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp1
        ).update(status='SUBMITTED')

        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            competency=self.behav_comp2,
            reviewer=self.hr,
            score=Decimal('3.80'),
            status='SUBMITTED'
        )

        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p_data = resp.json()['participants'][0]
        self.assertEqual(p_data['technical']['status'], 'SUBMITTED')
        self.assertEqual(p_data['technical']['scored_competencies'], 2)
        self.assertEqual(p_data['behavioral']['status'], 'SUBMITTED')
        self.assertEqual(p_data['behavioral']['scored_competencies'], 2)
        # Japanese is optional (False) so candidate is fully ready!
        self.assertTrue(p_data['is_ready_for_review'])
        self.assertEqual(p_data['readiness_blockers'], [])

    def test_zero_competencies_reports_unconfigured(self):
        """When 0 active competencies exist in a section, reports UNCONFIGURED and never complete."""
        self.tech_comp1.is_active = False
        self.tech_comp1.save()
        self.tech_comp2.is_active = False
        self.tech_comp2.save()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p_data = resp.json()['participants'][0]
        self.assertEqual(p_data['technical']['status'], 'UNCONFIGURED')
        self.assertFalse(p_data['is_ready_for_review'])
        self.assertIn("No active Technical competencies configured for cycle", p_data['readiness_blockers'][0])

    def test_correct_assignment_flags_and_metadata(self):
        """Verifies technical_evaluator_assigned, behavioral_evaluator_assigned and nested details."""
        self.client.force_authenticate(user=self.hr)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p_data = resp.json()['participants'][0]
        self.assertTrue(p_data['technical_evaluator_assigned'])
        self.assertTrue(p_data['behavioral_evaluator_assigned'])
        self.assertEqual(p_data['technical']['evaluator_id'], str(self.mentor.id))
        self.assertEqual(p_data['behavioral']['evaluator_id'], str(self.hr.id))

        # Delete behavioral assignment
        self.behav_asgn.delete()
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p_data = resp.json()['participants'][0]
        self.assertFalse(p_data['behavioral_evaluator_assigned'])
        self.assertIsNone(p_data['behavioral']['evaluator_id'])
        self.assertIn("Missing required Behavioral evaluator assignment.", p_data['readiness_blockers'])

    def test_missing_behavioral_assignment_blocks_is_ready_for_review(self):
        """Missing behavioral evaluator assignment strictly keeps is_ready_for_review = False."""
        from apps.performance.models import TechnicalCapabilityReview, BehavioralCapabilityReview

        # Fully complete reviews
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp1,
            reviewer=self.mentor, score=Decimal('4.50'), status='SUBMITTED'
        )
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp2,
            reviewer=self.mentor, score=Decimal('4.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp1,
            reviewer=self.hr, score=Decimal('4.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp2,
            reviewer=self.hr, score=Decimal('3.80'), status='SUBMITTED'
        )

        # Delete behavioral assignment
        self.behav_asgn.delete()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p_data = resp.json()['participants'][0]
        self.assertEqual(p_data['technical']['status'], 'SUBMITTED')
        self.assertEqual(p_data['behavioral']['status'], 'SUBMITTED')
        self.assertFalse(p_data['behavioral_evaluator_assigned'])
        self.assertFalse(p_data['is_ready_for_review'])
        self.assertIn("Missing required Behavioral evaluator assignment.", p_data['readiness_blockers'])

    def test_weight_calibration_blockers(self):
        """Miscalibrated competency weights generate deterministic blockers."""
        self.tech_comp1.weight = Decimal('30.00')  # Sum becomes 30 + 50 = 80% != 100%
        self.tech_comp1.save()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        data = resp.json()
        self.assertFalse(data['configuration_health']['is_valid'])
        self.assertTrue(any('Technical competency weights sum to 80.00%' in err for err in data['configuration_health']['errors']))

    def test_section_weights_not_totaling_100_percent(self):
        """Technical + Behavioral section weights not summing to 100% blocks readiness."""
        self.cycle.technical_weight = Decimal('70.00')
        self.cycle.behavioral_weight = Decimal('40.00')  # Sum = 110%
        self.cycle.save()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        data = resp.json()
        self.assertFalse(data['configuration_health']['is_valid'])
        self.assertTrue(any('section weights must sum to exactly 100.00%' in err for err in data['configuration_health']['errors']))
        p_data = data['participants'][0]
        self.assertFalse(p_data['is_ready_for_review'])
        self.assertTrue(any('section weights must sum to exactly 100.00%' in b for b in p_data['readiness_blockers']))

    def test_mandatory_japanese_criteria_missing_or_miscalibrated(self):
        """Missing or miscalibrated Japanese criteria when Japanese is mandatory blocks readiness."""
        from apps.japanese.models import JapaneseEvalCriterion

        self.cycle.japanese_evaluation_mandatory = True
        self.cycle.save()

        self.client.force_authenticate(user=self.hr)

        # 1. Zero criteria configured
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        data = resp.json()
        self.assertFalse(data['configuration_health']['is_valid'])
        self.assertTrue(any('Japanese evaluation criteria must be configured' in err for err in data['configuration_health']['errors']))
        self.assertFalse(data['participants'][0]['is_ready_for_review'])

        # 2. Criteria weight != 100% (e.g. 80%)
        crit = JapaneseEvalCriterion.objects.create(
            cycle=self.cycle, name='Oral Exam', weight=Decimal('80.00'), order=1
        )
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        data = resp.json()
        self.assertFalse(data['configuration_health']['is_valid'])
        self.assertTrue(any('Japanese evaluation criteria weights sum to 80.00%' in err for err in data['configuration_health']['errors']))
        self.assertFalse(data['participants'][0]['is_ready_for_review'])

        # 3. Exactly 100% resolves the configuration health blocker
        crit.weight = Decimal('100.00')
        crit.save()
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        data = resp.json()
        self.assertTrue(data['configuration_health']['is_valid'])

    def test_japanese_none_blocks_readiness(self):
        """japanese_evaluation_mandatory is None always blocks readiness and reports UNCONFIGURED."""
        self.cycle.japanese_evaluation_mandatory = None
        self.cycle.save()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        self.assertEqual(resp.status_code, 200)
        p_data = resp.json()['participants'][0]
        self.assertEqual(p_data['japanese']['mode'], 'UNCONFIGURED')
        self.assertEqual(p_data['japanese']['status'], 'UNCONFIGURED')
        self.assertTrue(p_data['japanese']['is_blocking'])
        self.assertFalse(p_data['is_ready_for_review'])
        self.assertTrue(any('Japanese evaluation requirement is unconfigured' in b for b in p_data['readiness_blockers']))

    def test_japanese_mandatory_submitted_does_not_satisfy_readiness(self):
        """Mandatory Japanese evaluation in SUBMITTED status does not satisfy readiness; only ACCEPTED satisfies."""
        from apps.japanese.models import JapaneseEvaluation, EvaluationStatus, JapaneseEvalCriterion

        self.cycle.japanese_evaluation_mandatory = True
        self.cycle.save()
        JapaneseEvalCriterion.objects.create(
            cycle=self.cycle, name='Language Proficiency', weight=Decimal('100.00'), order=1
        )

        JapaneseEvaluation.objects.create(
            cycle=self.cycle,
            intern=self.intern_profile,
            evaluator=self.instructor,
            status=EvaluationStatus.SUBMITTED,
            overall_language_score=Decimal('4.50')
        )

        self.client.force_authenticate(user=self.hr)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p_data = resp.json()['participants'][0]
        self.assertEqual(p_data['japanese']['mode'], 'MANDATORY')
        self.assertEqual(p_data['japanese']['status'], EvaluationStatus.SUBMITTED)
        self.assertTrue(p_data['japanese']['is_blocking'])
        self.assertFalse(p_data['is_ready_for_review'])
        self.assertTrue(any('Mandatory Japanese evaluation is not accepted' in b for b in p_data['readiness_blockers']))

    def test_japanese_mandatory_accepted_satisfies_readiness(self):
        """Mandatory Japanese evaluation in ACCEPTED status satisfies readiness when all other requirements met."""
        from apps.japanese.models import JapaneseEvaluation, EvaluationStatus, JapaneseEvalCriterion
        from apps.performance.models import TechnicalCapabilityReview, BehavioralCapabilityReview

        self.cycle.japanese_evaluation_mandatory = True
        self.cycle.save()
        JapaneseEvalCriterion.objects.create(
            cycle=self.cycle, name='Language Proficiency', weight=Decimal('100.00'), order=1
        )

        # Complete technical and behavioral reviews
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp1,
            reviewer=self.mentor, score=Decimal('4.50'), status='SUBMITTED'
        )
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp2,
            reviewer=self.mentor, score=Decimal('4.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp1,
            reviewer=self.hr, score=Decimal('4.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp2,
            reviewer=self.hr, score=Decimal('3.80'), status='SUBMITTED'
        )

        JapaneseEvaluation.objects.create(
            cycle=self.cycle,
            intern=self.intern_profile,
            evaluator=self.instructor,
            status=EvaluationStatus.ACCEPTED,
            overall_language_score=Decimal('4.50')
        )

        self.client.force_authenticate(user=self.hr)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p_data = resp.json()['participants'][0]
        self.assertEqual(p_data['japanese']['mode'], 'MANDATORY')
        self.assertEqual(p_data['japanese']['status'], EvaluationStatus.ACCEPTED)
        self.assertFalse(p_data['japanese']['is_blocking'])
        self.assertTrue(p_data['is_ready_for_review'])
        self.assertEqual(p_data['readiness_blockers'], [])

    def test_incomplete_technical_multi_competency_submission(self):
        """Single submitted review in a multi-competency technical section leaves status IN_PROGRESS and blocks readiness."""
        from apps.performance.models import TechnicalCapabilityReview

        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp1,
            reviewer=self.mentor, score=Decimal('4.50'), status='SUBMITTED'
        )

        self.client.force_authenticate(user=self.hr)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p_data = resp.json()['participants'][0]
        self.assertEqual(p_data['technical']['status'], 'IN_PROGRESS')
        self.assertEqual(p_data['technical']['scored_competencies'], 1)
        self.assertFalse(p_data['is_ready_for_review'])
        self.assertTrue(any('Technical evaluation in progress (1 of 2 competencies submitted)' in b for b in p_data['readiness_blockers']))

    def test_incomplete_behavioral_multi_competency_submission(self):
        """Single submitted review in a multi-competency behavioral section leaves status IN_PROGRESS and blocks readiness."""
        from apps.performance.models import BehavioralCapabilityReview

        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp1,
            reviewer=self.hr, score=Decimal('4.00'), status='SUBMITTED'
        )

        self.client.force_authenticate(user=self.hr)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p_data = resp.json()['participants'][0]
        self.assertEqual(p_data['behavioral']['status'], 'IN_PROGRESS')
        self.assertEqual(p_data['behavioral']['scored_competencies'], 1)
        self.assertFalse(p_data['is_ready_for_review'])
        self.assertTrue(any('Behavioral evaluation in progress (1 of 2 competencies submitted)' in b for b in p_data['readiness_blockers']))

    def test_missing_technical_assignment_blocks_readiness(self):
        """Missing technical evaluator assignment marks technical_evaluator_assigned=False and blocks readiness."""
        from apps.performance.models import TechnicalCapabilityReview, BehavioralCapabilityReview

        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp1,
            reviewer=self.mentor, score=Decimal('4.50'), status='SUBMITTED'
        )
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp2,
            reviewer=self.mentor, score=Decimal('4.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp1,
            reviewer=self.hr, score=Decimal('4.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp2,
            reviewer=self.hr, score=Decimal('3.80'), status='SUBMITTED'
        )

        # Delete technical assignment
        self.tech_asgn.delete()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p_data = resp.json()['participants'][0]
        self.assertEqual(p_data['technical']['status'], 'SUBMITTED')
        self.assertFalse(p_data['technical_evaluator_assigned'])
        self.assertFalse(p_data['is_ready_for_review'])
        self.assertIn("Missing required Technical evaluator assignment.", p_data['readiness_blockers'])

    def test_missing_behavioral_assignment_blocks_readiness_even_when_all_evaluations_complete(self):
        """Missing behavioral evaluator assignment strictly blocks readiness even when all evaluations are complete."""
        from apps.performance.models import TechnicalCapabilityReview, BehavioralCapabilityReview

        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp1,
            reviewer=self.mentor, score=Decimal('4.50'), status='SUBMITTED'
        )
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp2,
            reviewer=self.mentor, score=Decimal('4.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp1,
            reviewer=self.hr, score=Decimal('4.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp2,
            reviewer=self.hr, score=Decimal('3.80'), status='SUBMITTED'
        )

        # Delete behavioral assignment
        self.behav_asgn.delete()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p_data = resp.json()['participants'][0]
        self.assertEqual(p_data['technical']['status'], 'SUBMITTED')
        self.assertEqual(p_data['behavioral']['status'], 'SUBMITTED')
        self.assertFalse(p_data['behavioral_evaluator_assigned'])
        self.assertFalse(p_data['is_ready_for_review'])
        self.assertIn("Missing required Behavioral evaluator assignment.", p_data['readiness_blockers'])

    def test_any_hr_user_can_execute_behavioral_evaluation_regardless_of_assignment_owner(self):
        """Any authenticated HR user can submit a behavioral evaluation regardless of assigned evaluator."""
        self.client.force_authenticate(user=self.hr2)  # Different HR than self.behav_asgn.evaluator (self.hr)
        payload = {
            'participant_id': str(self.participant.id),
            'cycle_id': str(self.cycle.id),
            'status': 'SUBMITTED',
            'reviews': [
                {
                    'competency_id': str(self.behav_comp1.id),
                    'score': 4.25,
                    'hr_assessment': 'Strong communicative clarity'
                },
                {
                    'competency_id': str(self.behav_comp2.id),
                    'score': 4.00,
                    'hr_assessment': 'Collaborative team member'
                }
            ]
        }
        resp = self.client.post('/api/performance/evaluations/behavioral/', data=payload, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['status'], 'SUBMITTED')
        self.assertEqual(resp.json()['saved_count'], 2)

        from apps.performance.models import BehavioralCapabilityReview
        rev = BehavioralCapabilityReview.objects.get(
            cycle=self.cycle, competency=self.behav_comp1, employee=self.intern_profile
        )
        self.assertEqual(rev.reviewer, self.hr2)
        self.assertEqual(rev.score, Decimal('4.25'))

    def test_behavioral_draft_and_submission_validation(self):
        """Draft allows partial scores; submit requires all active competencies scored."""
        self.client.force_authenticate(user=self.hr)

        # 1. Partial draft succeeds
        draft_payload = {
            'participant_id': str(self.participant.id),
            'cycle_id': str(self.cycle.id),
            'status': 'DRAFT',
            'reviews': [
                {'competency_id': str(self.behav_comp1.id), 'score': 3.50, 'hr_assessment': 'Initial draft'}
            ]
        }
        resp = self.client.post('/api/performance/evaluations/behavioral/', data=draft_payload, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['status'], 'DRAFT')

        # 2. Incomplete submit fails
        submit_payload = {
            'participant_id': str(self.participant.id),
            'cycle_id': str(self.cycle.id),
            'status': 'SUBMITTED',
            'reviews': [
                {'competency_id': str(self.behav_comp1.id), 'score': 3.50, 'hr_assessment': 'Incomplete'}
            ]
        }
        resp = self.client.post('/api/performance/evaluations/behavioral/', data=submit_payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'INCOMPLETE_SUBMISSION')

    def test_behavioral_score_boundaries_including_zero(self):
        """0.00 is a valid score; scores outside 0.00 to rating_scale_max are rejected."""
        self.client.force_authenticate(user=self.hr)

        # Valid zero score
        payload_zero = {
            'participant_id': str(self.participant.id),
            'cycle_id': str(self.cycle.id),
            'status': 'SUBMITTED',
            'reviews': [
                {'competency_id': str(self.behav_comp1.id), 'score': 0.00, 'hr_assessment': 'Baseline score'},
                {'competency_id': str(self.behav_comp2.id), 'score': 0.00, 'hr_assessment': 'Baseline score'}
            ]
        }
        resp = self.client.post('/api/performance/evaluations/behavioral/', data=payload_zero, format='json')
        self.assertEqual(resp.status_code, 200)

        from apps.performance.models import BehavioralCapabilityReview
        rev = BehavioralCapabilityReview.objects.get(
            cycle=self.cycle, competency=self.behav_comp1, employee=self.intern_profile
        )
        self.assertEqual(rev.score, Decimal('0.00'))

        # Score > scale_max (scale max is 5.0)
        payload_invalid = {
            'participant_id': str(self.participant.id),
            'cycle_id': str(self.cycle.id),
            'status': 'DRAFT',
            'reviews': [
                {'competency_id': str(self.behav_comp1.id), 'score': 5.50}
            ]
        }
        resp = self.client.post('/api/performance/evaluations/behavioral/', data=payload_invalid, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'INVALID_SCORE')

    def test_historical_cycle_write_protection_across_behavioral_mutation_routes(self):
        """Finalized or closed cycles reject mutations across all behavioral review endpoints."""
        from apps.performance.models import CycleStatus, BehavioralCapabilityReview

        rev = BehavioralCapabilityReview.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            competency=self.behav_comp1,
            reviewer=self.hr,
            score=Decimal('4.00'),
            status='DRAFT'
        )

        self.cycle.status = CycleStatus.CLOSED
        self.cycle.save()

        self.client.force_authenticate(user=self.hr)

        # Route 1: POST /api/performance/evaluations/behavioral/
        payload = {
            'participant_id': str(self.participant.id),
            'cycle_id': str(self.cycle.id),
            'status': 'DRAFT',
            'reviews': [{'competency_id': str(self.behav_comp1.id), 'score': 4.0}]
        }
        resp = self.client.post('/api/performance/evaluations/behavioral/', data=payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'CYCLE_CLOSED')

        # Route 2: POST /api/performance/behavioral-reviews/
        resp2 = self.client.post('/api/performance/behavioral-reviews/', data={
            'cycle': str(self.cycle.id),
            'employee': str(self.intern_profile.id),
            'competency': str(self.behav_comp2.id),
            'score': 4.0
        }, format='json')
        self.assertEqual(resp2.status_code, 403)

        # Route 3: PATCH /api/performance/behavioral-reviews/{id}/
        resp3 = self.client.patch(f'/api/performance/behavioral-reviews/{rev.id}/', data={'score': 4.5}, format='json')
        self.assertEqual(resp3.status_code, 403)

        # Route 4: DELETE /api/performance/behavioral-reviews/{id}/
        resp4 = self.client.delete(f'/api/performance/behavioral-reviews/{rev.id}/')
        self.assertEqual(resp4.status_code, 403)


class Phase2Workstream3FinalScoringCalibrationAndPublicationTests(TestCase):
    """
    Phase 2 Workstream 3: Final Scoring, Calibration & Publication Test Suite.
    Verifies:
    - 10-Gate Shared Readiness Contract
    - Participant-scoped individual publication (POST /api/performance/cycles/{c_id}/participants/{p_id}/publish/)
    - Idempotency & Repeat Publication Conflict (HTTP 409 ALREADY_PUBLISHED)
    - Canonical MANAGER appraisal isolation (never touches SELF or ANNUAL_REVIEW)
    - Intern Privacy Boundary & Snooping Prevention
    - Serializer-level confidential notes exclusion & allowInternReply removal
    - Mutually exclusive 4-state publication status precedence (DRAFT, BLOCKED, READY_TO_PUBLISH, PUBLISHED)
    """

    def setUp(self):
        from datetime import date
        from apps.accounts.models import UserRole
        from apps.organization.models import Department
        from apps.employees.models import EmployeeProfile, EmploymentStatus
        from apps.performance.models import (
            PerformanceCycle,
            CycleStatus,
            CycleParticipant,
            CycleCompetency,
            CompetencySection,
            CycleEvaluatorAssignment,
            EvaluatorSectionType,
            TechnicalCapabilityReview,
            BehavioralCapabilityReview,
            Appraisal,
            AppraisalType,
            AppraisalStatus,
            ScoringModel,
        )

        self.client = APIClient()

        # Users
        self.hr = User.objects.create_user(
            email='ws3_hr@test.com',
            username='ws3_hr',
            password='Password123!',
            role=UserRole.HR
        )
        self.mentor = User.objects.create_user(
            email='ws3_mentor@test.com',
            username='ws3_mentor',
            password='Password123!',
            role=UserRole.MANAGER
        )
        self.intern_user = User.objects.create_user(
            email='ws3_intern@test.com',
            username='ws3_intern',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.intern_user2 = User.objects.create_user(
            email='ws3_intern2@test.com',
            username='ws3_intern2',
            password='Password123!',
            role=UserRole.INTERN
        )
        self.instructor = User.objects.create_user(
            email='ws3_instructor@test.com',
            username='ws3_instructor',
            password='Password123!',
            role='INSTRUCTOR'
        )

        self.dept = Department.objects.create(name='Systems & Infrastructure')
        self.intern_profile = EmployeeProfile.objects.create(
            user=self.intern_user,
            employee_code='INT-WS3-01',
            first_name='Ananya',
            last_name='Nair',
            department=self.dept,
            employment_status=EmploymentStatus.ACTIVE,
            manager=self.mentor
        )
        self.intern_profile2 = EmployeeProfile.objects.create(
            user=self.intern_user2,
            employee_code='INT-WS3-02',
            first_name='Rohan',
            last_name='Verma',
            department=self.dept,
            employment_status=EmploymentStatus.ACTIVE,
            manager=self.mentor
        )

        # Performance Cycle
        self.cycle = PerformanceCycle.objects.create(
            name='2026 Q4 Full Cycle Calibration',
            start_date=date(2026, 10, 1),
            end_date=date(2026, 12, 31),
            status=CycleStatus.ACTIVE,
            rating_scale_max=Decimal('5.0'),
            technical_weight=Decimal('60.00'),
            behavioral_weight=Decimal('40.00'),
            japanese_evaluation_mandatory=False,
            scoring_model=ScoringModel.COMPETENCY_FRAMEWORK
        )

        self.participant = CycleParticipant.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile
        )
        self.participant2 = CycleParticipant.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile2
        )

        # Technical Competencies (sum to 100%)
        self.tech_comp1 = CycleCompetency.objects.create(
            cycle=self.cycle,
            name='Cloud Architecture & DevOps',
            section=CompetencySection.TECHNICAL,
            weight=Decimal('60.00'),
            benchmark_score=Decimal('4.0'),
            order=1,
            is_active=True
        )
        self.tech_comp2 = CycleCompetency.objects.create(
            cycle=self.cycle,
            name='Database Performance & Indexing',
            section=CompetencySection.TECHNICAL,
            weight=Decimal('40.00'),
            benchmark_score=Decimal('3.5'),
            order=2,
            is_active=True
        )

        # Behavioral Competencies (sum to 100%)
        self.behav_comp1 = CycleCompetency.objects.create(
            cycle=self.cycle,
            name='Executive Presence & Communication',
            section=CompetencySection.BEHAVIORAL,
            weight=Decimal('50.00'),
            benchmark_score=Decimal('4.0'),
            order=1,
            is_active=True
        )
        self.behav_comp2 = CycleCompetency.objects.create(
            cycle=self.cycle,
            name='Agile Ownership & Delivery',
            section=CompetencySection.BEHAVIORAL,
            weight=Decimal('50.00'),
            benchmark_score=Decimal('3.5'),
            order=2,
            is_active=True
        )

        # Evaluator Assignments
        self.tech_asgn = CycleEvaluatorAssignment.objects.create(
            cycle=self.cycle,
            participant=self.participant,
            section=EvaluatorSectionType.TECHNICAL,
            evaluator=self.mentor
        )
        self.behav_asgn = CycleEvaluatorAssignment.objects.create(
            cycle=self.cycle,
            participant=self.participant,
            section=EvaluatorSectionType.BEHAVIORAL,
            evaluator=self.hr
        )

    def _submit_all_competencies(self):
        """Helper to create submitted reviews for all technical and behavioral competencies."""
        from apps.performance.models import TechnicalCapabilityReview, BehavioralCapabilityReview
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            competency=self.tech_comp1,
            reviewer=self.mentor,
            score=Decimal('4.50'),
            status='SUBMITTED'
        )
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            competency=self.tech_comp2,
            reviewer=self.mentor,
            score=Decimal('4.00'),
            status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            competency=self.behav_comp1,
            reviewer=self.hr,
            score=Decimal('4.50'),
            status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            competency=self.behav_comp2,
            reviewer=self.hr,
            score=Decimal('4.00'),
            status='SUBMITTED'
        )

    # --- 10-Gate Readiness Tests ---

    def test_gate_1_technical_weights_not_100_blocks_publication(self):
        """Gate 1: Active Technical competency weights != 100.00% blocks publication."""
        self._submit_all_competencies()
        self.tech_comp1.weight = Decimal('40.00')
        self.tech_comp1.save()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(resp.json()['error'], 'READINESS_CHECK_FAILED')
        self.assertTrue(any('Technical competency weights sum to 80.00%' in b for b in resp.json()['readiness_blockers']))

    def test_gate_2_behavioral_weights_not_100_blocks_publication(self):
        """Gate 2: Active Behavioral competency weights != 100.00% blocks publication."""
        self._submit_all_competencies()
        self.behav_comp1.weight = Decimal('30.00')
        self.behav_comp1.save()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(resp.json()['error'], 'READINESS_CHECK_FAILED')
        self.assertTrue(any('Behavioral competency weights sum to 80.00%' in b for b in resp.json()['readiness_blockers']))

    def test_gate_3_section_weights_not_100_blocks_publication(self):
        """Gate 3: Technical and Behavioral section weights != 100.00% blocks publication."""
        self._submit_all_competencies()
        self.cycle.technical_weight = Decimal('50.00')
        self.cycle.save()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(resp.json()['error'], 'READINESS_CHECK_FAILED')
        self.assertTrue(any('section weights must sum to exactly 100.00%' in b for b in resp.json()['readiness_blockers']))

    def test_gate_4_japanese_unconfigured_blocks_publication(self):
        """Gate 4: Cycle Japanese evaluation requirement is None blocks publication."""
        self._submit_all_competencies()
        self.cycle.japanese_evaluation_mandatory = None
        self.cycle.save()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(resp.json()['error'], 'READINESS_CHECK_FAILED')
        self.assertTrue(any('Japanese evaluation requirement is unconfigured' in b for b in resp.json()['readiness_blockers']))

    def test_gate_5_mandatory_japanese_criteria_weights_not_100_blocks_publication(self):
        """Gate 5: Mandatory Japanese criteria weights != 100.00% blocks publication."""
        from apps.japanese.models import JapaneseEvalCriterion
        self._submit_all_competencies()
        self.cycle.japanese_evaluation_mandatory = True
        self.cycle.save()

        JapaneseEvalCriterion.objects.create(
            cycle=self.cycle,
            name='Grammar',
            weight=Decimal('80.00')
        )

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertTrue(any('Japanese evaluation criteria weights sum to 80.00%' in b for b in resp.json()['readiness_blockers']))

    def test_gate_6_mandatory_japanese_not_accepted_blocks_publication(self):
        """Gate 6: Mandatory Japanese evaluation not in ACCEPTED state blocks publication."""
        from apps.japanese.models import JapaneseEvalCriterion, JapaneseEvaluation, EvaluationStatus
        self._submit_all_competencies()
        self.cycle.japanese_evaluation_mandatory = True
        self.cycle.save()

        JapaneseEvalCriterion.objects.create(cycle=self.cycle, name='Language Proficiency', weight=Decimal('100.00'))
        JapaneseEvaluation.objects.create(
            cycle=self.cycle,
            intern=self.intern_profile,
            evaluator=self.instructor,
            status=EvaluationStatus.SUBMITTED,
            overall_language_score=Decimal('85.00')
        )

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertTrue(any('Mandatory Japanese evaluation is not accepted' in b for b in resp.json()['readiness_blockers']))

    def test_gate_7_missing_technical_evaluator_assignment_blocks_publication(self):
        """Gate 7: Missing technical evaluator assignment blocks publication."""
        self._submit_all_competencies()
        self.tech_asgn.delete()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertTrue(any('Missing required Technical evaluator assignment' in b for b in resp.json()['readiness_blockers']))

    def test_gate_8_missing_behavioral_evaluator_assignment_blocks_publication(self):
        """Gate 8: Missing behavioral evaluator assignment blocks publication."""
        self._submit_all_competencies()
        self.behav_asgn.delete()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertTrue(any('Missing required Behavioral evaluator assignment' in b for b in resp.json()['readiness_blockers']))

    def test_gate_9_technical_competency_unscored_blocks_publication(self):
        """Gate 9: Technical review with missing score blocks publication."""
        from apps.performance.models import TechnicalCapabilityReview, BehavioralCapabilityReview
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            competency=self.tech_comp1,
            reviewer=self.mentor,
            score=None,
            status='DRAFT'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            competency=self.behav_comp1,
            reviewer=self.hr,
            score=Decimal('4.00'),
            status='SUBMITTED'
        )

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(resp.json()['publication_status'], 'DRAFT')
        self.assertTrue(any('Technical evaluation' in b for b in resp.json()['readiness_blockers']))

    def test_gate_10_behavioral_competency_unscored_or_closed_cycle_blocks_publication(self):
        """Gate 10: Behavioral review missing or closed cycle status blocks publication."""
        from apps.performance.models import CycleStatus
        self._submit_all_competencies()
        self.cycle.status = CycleStatus.CLOSED
        self.cycle.save()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertTrue(any('not eligible for evaluation publication' in b for b in resp.json()['readiness_blockers']))

    # --- Publication & Idempotency Tests ---

    def test_all_10_gates_satisfied_publishes_successfully(self):
        """When all 10 gates pass, HR successfully publishes the appraisal."""
        from apps.performance.models import Appraisal, AppraisalType, AppraisalStatus
        self._submit_all_competencies()

        payload = {
            'strengths': ['Deep mastery of distributed databases', 'Proactive communication'],
            'areas_for_improvement': ['Enhance automated integration test coverage'],
            'recommendations': 'Strongly recommended for transition to full-time Software Engineer.',
            'final_comments': 'Outstanding performance throughout the calibration cycle.'
        }

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(
            f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/',
            data=payload,
            format='json'
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['status'], 'SUCCESS')
        self.assertIsNotNone(data['appraisal_id'])
        self.assertIsNotNone(data['overall_score'])
        self.assertIsNotNone(data['published_at'])

        # Verify database record
        appraisal = Appraisal.objects.get(id=data['appraisal_id'])
        self.assertEqual(appraisal.status, AppraisalStatus.PUBLISHED)
        self.assertEqual(appraisal.appraisal_type, AppraisalType.MANAGER)
        self.assertEqual(len(appraisal.strengths), 2)
        self.assertEqual(len(appraisal.areas_for_improvement), 1)
        self.assertEqual(appraisal.recommendations, payload['recommendations'])
        self.assertEqual(appraisal.final_comments, payload['final_comments'])

    def test_repeat_publication_returns_409_conflict(self):
        """Attempting to publish an already published appraisal returns HTTP 409 Conflict."""
        self._submit_all_competencies()

        self.client.force_authenticate(user=self.hr)
        # First publish: 200 OK
        resp1 = self.client.post(
            f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/',
            data={'final_comments': 'First pass.'},
            format='json'
        )
        self.assertEqual(resp1.status_code, 200)

        # Second publish: 409 Conflict
        resp2 = self.client.post(
            f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/',
            data={'final_comments': 'Attempted overwrite.'},
            format='json'
        )
        self.assertEqual(resp2.status_code, 409)
        self.assertEqual(resp2.json()['error'], 'ALREADY_PUBLISHED')

    def test_canonical_manager_appraisal_isolation(self):
        """Publication creates/updates exclusively AppraisalType.MANAGER and preserves SELF and ANNUAL_REVIEW."""
        from apps.performance.models import Appraisal, AppraisalType, AppraisalStatus
        self._submit_all_competencies()

        # Pre-existing SELF appraisal
        self_appraisal = Appraisal.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            appraisal_type=AppraisalType.SELF,
            status=AppraisalStatus.SUBMITTED,
            self_comments='My personal self reflection.'
        )

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp.status_code, 200)

        # Self appraisal is completely unchanged
        self_appraisal.refresh_from_db()
        self.assertEqual(self_appraisal.appraisal_type, AppraisalType.SELF)
        self.assertEqual(self_appraisal.self_comments, 'My personal self reflection.')
        self.assertEqual(self_appraisal.status, AppraisalStatus.SUBMITTED)

        # Manager appraisal is published separately
        mgr_appraisal = Appraisal.objects.get(
            cycle=self.cycle,
            employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER
        )
        self.assertEqual(mgr_appraisal.status, AppraisalStatus.PUBLISHED)
        self.assertNotEqual(mgr_appraisal.id, self_appraisal.id)

    # --- Privacy & Serializer Tests ---

    def test_intern_cannot_inspect_other_participant_summary(self):
        """Intern cannot pass another participant ID to EvaluationSummaryView."""
        self._submit_all_competencies()
        self.client.force_authenticate(user=self.intern_user)

        # Query own participant: 403 because not published yet
        resp_own = self.client.get(f'/api/performance/evaluations/summary/?participant_id={self.participant.id}')
        self.assertEqual(resp_own.status_code, 403)
        self.assertIn('not been published', resp_own.json()['error'])

        # Query other participant: 403 Access denied
        resp_other = self.client.get(f'/api/performance/evaluations/summary/?participant_id={self.participant2.id}')
        self.assertEqual(resp_other.status_code, 403)
        self.assertIn('Access denied', resp_other.json()['error'])

    def test_intern_published_feedback_removes_allow_intern_reply(self):
        """Published feedback response for intern omits allowInternReply."""
        from apps.performance.models import Appraisal, AppraisalType, AppraisalStatus
        self._submit_all_competencies()

        # Publish evaluation
        Appraisal.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.PUBLISHED,
            overall_score=Decimal('88.50'),
            reviewer=self.mentor,
            strengths=['Technical depth'],
            allow_intern_reply=True
        )

        self.client.force_authenticate(user=self.intern_user)
        resp = self.client.get(f'/api/intern/published-feedback/?cycle_id={self.cycle.id}')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()['data']
        self.assertTrue(data['isPublished'])
        self.assertNotIn('allowInternReply', data)

    # --- 4-State UI Classification Semantics ---

    def test_4_state_api_classification_precedence(self):
        """Verify DRAFT, BLOCKED, READY_TO_PUBLISH, and PUBLISHED mutual exclusivity and precedence."""
        self.client.force_authenticate(user=self.hr)

        # 1. Initially DRAFT (no config blockers, reviews not started)
        resp1 = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p1 = resp1.json()['participants'][0]
        self.assertEqual(p1['publication_status'], 'DRAFT')
        self.assertFalse(p1['is_ready_for_review'])
        self.assertTrue(p1['evaluation_incomplete'])
        self.assertFalse(p1['has_configuration_blockers'])

        # 2. BLOCKED when configuration error introduced
        self.cycle.japanese_evaluation_mandatory = None
        self.cycle.save()
        resp2 = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p2 = resp2.json()['participants'][0]
        self.assertEqual(p2['publication_status'], 'BLOCKED')
        self.assertTrue(p2['has_configuration_blockers'])

        # Restore Japanese config to False (valid)
        self.cycle.japanese_evaluation_mandatory = False
        self.cycle.save()

        # 3. READY_TO_PUBLISH when all reviews complete
        self._submit_all_competencies()
        resp3 = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p3 = resp3.json()['participants'][0]
        self.assertEqual(p3['publication_status'], 'READY_TO_PUBLISH')
        self.assertTrue(p3['is_ready_for_review'])
        self.assertFalse(p3['evaluation_incomplete'])
        self.assertFalse(p3['has_configuration_blockers'])
        self.assertTrue(p3['scorecard']['has_scores'])

        # 4. PUBLISHED after HR publishes
        self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        resp4 = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        p4 = resp4.json()['participants'][0]
        self.assertEqual(p4['publication_status'], 'PUBLISHED')
        self.assertIsNotNone(p4['appraisal']['published_at'])

    def test_non_hr_user_cannot_publish_evaluation(self):
        """Mentors and Interns are prohibited from executing publication."""
        self._submit_all_competencies()

        # Mentor gets 403
        self.client.force_authenticate(user=self.mentor)
        resp_mentor = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp_mentor.status_code, 403)

        # Intern gets 403
        self.client.force_authenticate(user=self.intern_user)
        resp_intern = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp_intern.status_code, 403)

    def test_gate_2_inactive_participant_blocks_publication(self):
        """Gate 2: Inactive participant is classified as BLOCKED and cannot be published."""
        self._submit_all_competencies()

        # Mark user inactive
        self.intern_user.is_active = False
        self.intern_user.save()

        # 1. Check evaluation-progress cohort telemetry
        self.client.force_authenticate(user=self.hr)
        prog_resp = self.client.get(f'/api/performance/cycles/{self.cycle.id}/evaluation-progress/')
        self.assertEqual(prog_resp.status_code, 200)
        p_data = [p for p in prog_resp.json()['participants'] if p['participant_id'] == str(self.participant.id)][0]
        self.assertEqual(p_data['publication_status'], 'BLOCKED')
        self.assertTrue(p_data['has_configuration_blockers'])
        self.assertFalse(p_data['is_ready_for_review'])
        self.assertTrue(any('is inactive and cannot be published' in b for b in p_data['configuration_blockers']))

        # 2. Check publication endpoint
        pub_resp = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(pub_resp.status_code, 422)
        pub_data = pub_resp.json()
        self.assertEqual(pub_data['error'], 'READINESS_CHECK_FAILED')
        self.assertEqual(pub_data['publication_status'], 'BLOCKED')
        self.assertTrue(any('is inactive and cannot be published' in b for b in pub_data['configuration_blockers']))

    def test_japanese_all_three_states_publication_behavior(self):
        """
        Verify persisted behavior across all 3 values of japanese_evaluation_mandatory:
        - None: Publication blocked as unconfigured.
        - True: Accepted evaluation required.
        - False: Evaluation optional (passes even with zero Japanese records).
        """
        from apps.japanese.models import JapaneseEvalCriterion, JapaneseEvaluation, EvaluationStatus
        self._submit_all_competencies()
        self.client.force_authenticate(user=self.hr)

        # 1. State: None -> Blocked as unconfigured
        self.cycle.japanese_evaluation_mandatory = None
        self.cycle.save()
        resp_none = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp_none.status_code, 422)
        self.assertTrue(any('requirement is unconfigured' in b for b in resp_none.json()['configuration_blockers']))

        # 2. State: True -> Requires ACCEPTED evaluation
        self.cycle.japanese_evaluation_mandatory = True
        self.cycle.save()
        JapaneseEvalCriterion.objects.create(cycle=self.cycle, name='Spoken Fluency', weight=Decimal('100.00'))

        # 2a. With SUBMITTED evaluation (not ACCEPTED) -> Blocked
        jp_eval = JapaneseEvaluation.objects.create(
            cycle=self.cycle,
            intern=self.intern_profile,
            evaluator=self.instructor,
            status=EvaluationStatus.SUBMITTED,
            overall_language_score=Decimal('80.00')
        )
        resp_sub = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp_sub.status_code, 422)
        self.assertTrue(any('Mandatory Japanese evaluation is not accepted' in b for b in resp_sub.json()['configuration_blockers']))

        # 2b. With ACCEPTED evaluation -> Passes!
        jp_eval.status = EvaluationStatus.ACCEPTED
        jp_eval.save()
        resp_acc = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp_acc.status_code, 200)
        self.assertEqual(resp_acc.json()['status'], 'SUCCESS')

        # 3. State: False -> Optional on participant2 (no Japanese evaluation exists at all)
        from apps.performance.models import TechnicalCapabilityReview, BehavioralCapabilityReview, CycleEvaluatorAssignment, EvaluatorSectionType
        CycleEvaluatorAssignment.objects.create(
            cycle=self.cycle, participant=self.participant2, section=EvaluatorSectionType.TECHNICAL, evaluator=self.mentor
        )
        CycleEvaluatorAssignment.objects.create(
            cycle=self.cycle, participant=self.participant2, section=EvaluatorSectionType.BEHAVIORAL, evaluator=self.hr
        )
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile2, competency=self.tech_comp1, reviewer=self.mentor, score=Decimal('4.00'), status='SUBMITTED'
        )
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile2, competency=self.tech_comp2, reviewer=self.mentor, score=Decimal('4.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile2, competency=self.behav_comp1, reviewer=self.hr, score=Decimal('4.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile2, competency=self.behav_comp2, reviewer=self.hr, score=Decimal('4.00'), status='SUBMITTED'
        )
        self.cycle.japanese_evaluation_mandatory = False
        self.cycle.save()
        resp_opt = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant2.id}/publish/')
        self.assertEqual(resp_opt.status_code, 200)
        self.assertEqual(resp_opt.json()['status'], 'SUCCESS')

    def test_score_bounds_and_zero_valid(self):
        """
        Verify:
        - Score of 0.00 is a valid evaluative score and calculated.
        - Null remains missing.
        - Score exceeding rating_scale_max is invalid.
        - Section weights are cycle-configured without defaults.
        """
        from apps.performance.models import TechnicalCapabilityReview, BehavioralCapabilityReview
        from apps.performance.services.scoring import ScoringService
        self.client.force_authenticate(user=self.hr)

        # 1. Zero score is valid
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp1, reviewer=self.mentor, score=Decimal('0.00'), status='SUBMITTED'
        )
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp2, reviewer=self.mentor, score=Decimal('5.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp1, reviewer=self.hr, score=Decimal('0.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp2, reviewer=self.hr, score=Decimal('5.00'), status='SUBMITTED'
        )

        calc = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle)
        self.assertTrue(calc['is_complete'])
        self.assertIsNotNone(calc['final_score'])
        # Tech: comp1 (60% * 0.00) + comp2 (40% * 100.00) = 40.00. Contrib: 40.00 * 0.60 = 24.00.
        # Behav: comp1 (50% * 0.00) + comp2 (50% * 100.00) = 50.00. Contrib: 50.00 * 0.40 = 20.00.
        # Final: 24.00 + 20.00 = 44.00.
        self.assertEqual(calc['final_score'], 44.0)

        # 2. Score exceeding scale_max (e.g. 6.00 on 5.0 scale) is rejected by scoring
        TechnicalCapabilityReview.objects.filter(employee=self.intern_profile, competency=self.tech_comp2).update(score=Decimal('6.00'))
        calc_invalid = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle)
        self.assertFalse(calc_invalid['is_complete'])
        self.assertTrue(any('outside rating scale bounds' in e for e in calc_invalid['verification_errors']))

        # 3. Cycle invalid section weights sum fails scoring without fallback defaults
        self.cycle.technical_weight = Decimal('50.00')
        self.cycle.behavioral_weight = Decimal('40.00')
        self.cycle.save()
        calc_no_weights = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle)
        self.assertFalse(calc_no_weights['is_complete'])
        self.assertTrue(any('section weights must sum to exactly 100.00%' in e for e in calc_no_weights['verification_errors']))

    def test_reviewer_attribution_preserved_and_atomic_repeat_protection(self):
        """
        Verify canonical AppraisalType.MANAGER preserves assigned reviewer attribution
        and repeat publication returns 409 without overwriting qualitative feedback.
        """
        from apps.performance.models import Appraisal, AppraisalType, AppraisalStatus
        self._submit_all_competencies()

        # Existing draft with assigned mentor as reviewer
        existing_draft = Appraisal.objects.create(
            cycle=self.cycle,
            employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.DRAFT,
            reviewer=self.mentor,
            reviewer_comments='Mentor initial qualitative draft notes.'
        )

        self.client.force_authenticate(user=self.hr)
        resp1 = self.client.post(
            f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/',
            data={
                'strengths': ['System design'],
                'areas_for_improvement': ['Punctuality'],
                'recommendations': 'Promote to SDE 1',
                'final_comments': 'Calibrated and approved by HR.'
            },
            format='json'
        )
        self.assertEqual(resp1.status_code, 200)

        existing_draft.refresh_from_db()
        self.assertEqual(existing_draft.status, AppraisalStatus.PUBLISHED)
        # Reviewer remains the mentor, not overwritten by HR user!
        self.assertEqual(existing_draft.reviewer, self.mentor)
        self.assertEqual(existing_draft.reviewer_comments, 'Mentor initial qualitative draft notes.')
        self.assertEqual(existing_draft.final_comments, 'Calibrated and approved by HR.')

        # Attempt repeat publication with malicious/different payload
        resp2 = self.client.post(
            f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/',
            data={'final_comments': 'Overwrite attempt!'},
            format='json'
        )
        self.assertEqual(resp2.status_code, 409)
        self.assertEqual(resp2.json()['error'], 'ALREADY_PUBLISHED')

        existing_draft.refresh_from_db()
        self.assertEqual(existing_draft.final_comments, 'Calibrated and approved by HR.')

    # =========================================================================
    # PR 1 Targeted Remediation Regression Tests (Findings 1, 2, 3)
    # =========================================================================

    # --- Finding 1: Positive Rating-Scale Validation ---

    def test_remediation_readiness_rejects_zero_rating_scale_max(self):
        """Readiness 10 gates rejects cycle where rating_scale_max is 0.0."""
        from apps.performance.views import check_participant_readiness_10_gates
        self._submit_all_competencies()
        self.cycle.rating_scale_max = Decimal('0.0')
        self.cycle.save()

        is_ready, pub_status, config_blockers, eval_reasons, all_blockers = check_participant_readiness_10_gates(self.cycle, self.participant)
        self.assertFalse(is_ready)
        self.assertEqual(pub_status, 'BLOCKED')
        self.assertTrue(any('rating scale maximum is unconfigured or non-positive' in b for b in config_blockers))

    def test_remediation_readiness_rejects_missing_rating_scale_max(self):
        """Readiness 10 gates rejects cycle where rating_scale_max is None."""
        from apps.performance.views import check_participant_readiness_10_gates
        self._submit_all_competencies()
        self.cycle.rating_scale_max = None
        is_ready, pub_status, config_blockers, eval_reasons, all_blockers = check_participant_readiness_10_gates(self.cycle, self.participant)
        self.assertFalse(is_ready)
        self.assertEqual(pub_status, 'BLOCKED')
        self.assertTrue(any('rating scale maximum is unconfigured or non-positive' in b for b in config_blockers))

    def test_remediation_scoring_service_rejects_zero_rating_scale(self):
        """ScoringService independently rejects rating_scale_max <= 0."""
        from apps.performance.services.scoring import IncompleteEvaluationError
        self._submit_all_competencies()
        self.cycle.rating_scale_max = Decimal('0.0')
        self.cycle.save()

        calc = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle)
        self.assertFalse(calc['is_complete'])
        self.assertTrue(any('rating scale maximum is invalid' in err for err in calc['verification_errors']))

        with self.assertRaises(IncompleteEvaluationError):
            ScoringService.calculate_cycle_score(self.intern_profile, self.cycle, raise_on_incomplete=True)

    def test_remediation_scoring_service_rejects_none_rating_scale(self):
        """ScoringService independently rejects in-memory None rating_scale_max."""
        self._submit_all_competencies()
        self.cycle.rating_scale_max = None
        calc = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle)
        self.assertFalse(calc['is_complete'])
        self.assertTrue(any('rating scale maximum is invalid' in err for err in calc['verification_errors']))

    def test_remediation_scoring_service_positive_custom_scale_10(self):
        """ScoringService calculates correctly with valid positive custom scale (10.0)."""
        from apps.performance.models import TechnicalCapabilityReview, BehavioralCapabilityReview
        self.cycle.rating_scale_max = Decimal('10.0')
        self.cycle.save()

        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp1,
            reviewer=self.mentor, score=Decimal('8.00'), status='SUBMITTED'
        )
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp2,
            reviewer=self.mentor, score=Decimal('8.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp1,
            reviewer=self.hr, score=Decimal('9.00'), status='SUBMITTED'
        )
        BehavioralCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.behav_comp2,
            reviewer=self.hr, score=Decimal('9.00'), status='SUBMITTED'
        )

        calc = ScoringService.calculate_cycle_score(self.intern_profile, self.cycle, raise_on_incomplete=True)
        self.assertTrue(calc['is_complete'])
        self.assertEqual(calc['rating_scale_max'], 10.0)
        self.assertEqual(calc['technical_section']['section_score'], 80.0)
        self.assertEqual(calc['behavioral_section']['section_score'], 90.0)
        self.assertEqual(calc['final_score'], 84.0)

    def test_remediation_invalid_scale_rejected_by_both_endpoints(self):
        """Both participant-level and appraisal-level publication endpoints reject 0.0 scale."""
        self._submit_all_competencies()
        self.cycle.rating_scale_max = Decimal('0.0')
        self.cycle.save()

        appraisal = Appraisal.objects.create(
            cycle=self.cycle, employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.DRAFT,
            reviewer=self.mentor
        )

        self.client.force_authenticate(user=self.hr)

        resp1 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp1.status_code, 422)
        self.assertEqual(resp1.json()['error'], 'READINESS_CHECK_FAILED')
        self.assertTrue(any('rating scale maximum is unconfigured or non-positive' in b for b in resp1.json()['configuration_blockers']))

        resp2 = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertIn(resp2.status_code, [400, 422])
        self.assertIn(resp2.json().get('error'), ['JAPANESE_EVALUATION_NOT_ACCEPTED', 'READINESS_CHECK_FAILED', 'EVALUATION_INCOMPLETE'])
        self.assertEqual(resp2.json()['error'], 'READINESS_CHECK_FAILED')
        self.assertTrue(any('rating scale maximum is unconfigured or non-positive' in b for b in resp2.json()['configuration_blockers']))

    # --- Finding 3: Published Cycle Eligibility ---

    def test_remediation_published_cycle_rejected_by_shared_validator_and_both_endpoints(self):
        """CycleStatus.PUBLISHED blocks publication in shared validator and both endpoints."""
        from apps.performance.views import check_participant_readiness_10_gates
        self._submit_all_competencies()
        self.cycle.status = CycleStatus.PUBLISHED
        self.cycle.save()

        is_ready, pub_status, config_blockers, eval_reasons, all_blockers = check_participant_readiness_10_gates(self.cycle, self.participant)
        self.assertFalse(is_ready)
        self.assertEqual(pub_status, 'BLOCKED')
        self.assertTrue(any('is not eligible for evaluation publication' in b for b in config_blockers))

        appraisal = Appraisal.objects.create(
            cycle=self.cycle, employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.DRAFT,
            reviewer=self.mentor
        )

        self.client.force_authenticate(user=self.hr)

        resp1 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp1.status_code, 422)
        self.assertEqual(resp1.json()['error'], 'READINESS_CHECK_FAILED')

        resp2 = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertIn(resp2.status_code, [400, 422])
        self.assertIn(resp2.json().get('error'), ['JAPANESE_EVALUATION_NOT_ACCEPTED', 'READINESS_CHECK_FAILED', 'EVALUATION_INCOMPLETE'])
        self.assertEqual(resp2.json()['error'], 'READINESS_CHECK_FAILED')

    # --- Finding 2: Unified Publication Endpoints ---

    def test_remediation_inactive_participant_rejected_by_both_endpoints(self):
        """Inactive participant is rejected by both publication endpoints."""
        self._submit_all_competencies()
        self.intern_user.is_active = False
        self.intern_user.save()

        appraisal = Appraisal.objects.create(
            cycle=self.cycle, employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.DRAFT,
            reviewer=self.mentor
        )
        self.client.force_authenticate(user=self.hr)

        resp1 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp1.status_code, 422)
        self.assertTrue(any('is inactive and cannot be published' in b for b in resp1.json()['configuration_blockers']))

        resp2 = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertIn(resp2.status_code, [400, 422])
        self.assertIn(resp2.json().get('error'), ['JAPANESE_EVALUATION_NOT_ACCEPTED', 'READINESS_CHECK_FAILED', 'EVALUATION_INCOMPLETE'])
        self.assertTrue(any('is inactive and cannot be published' in b for b in resp2.json()['configuration_blockers']))

    def test_remediation_unconfigured_japanese_rejected_by_both_endpoints(self):
        """Unconfigured Japanese requirement (None) is rejected by both endpoints."""
        self._submit_all_competencies()
        self.cycle.japanese_evaluation_mandatory = None
        self.cycle.save()

        appraisal = Appraisal.objects.create(
            cycle=self.cycle, employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.DRAFT,
            reviewer=self.mentor
        )
        self.client.force_authenticate(user=self.hr)

        resp1 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp1.status_code, 422)
        self.assertTrue(any('Japanese evaluation requirement is unconfigured' in b for b in resp1.json()['configuration_blockers']))

        resp2 = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertIn(resp2.status_code, [400, 422])
        self.assertIn(resp2.json().get('error'), ['JAPANESE_EVALUATION_NOT_ACCEPTED', 'READINESS_CHECK_FAILED', 'EVALUATION_INCOMPLETE'])
        self.assertTrue(any('Japanese evaluation requirement is unconfigured' in b for b in resp2.json()['configuration_blockers']))

    def test_remediation_missing_mandatory_japanese_rejected_by_both_endpoints(self):
        """Missing accepted Japanese evaluation when mandatory is rejected by both endpoints."""
        from apps.japanese.models import JapaneseEvalCriterion
        self._submit_all_competencies()
        self.cycle.japanese_evaluation_mandatory = True
        self.cycle.save()
        JapaneseEvalCriterion.objects.create(cycle=self.cycle, name='Language', weight=Decimal('100.00'))

        appraisal = Appraisal.objects.create(
            cycle=self.cycle, employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.DRAFT,
            reviewer=self.mentor
        )
        self.client.force_authenticate(user=self.hr)

        resp1 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp1.status_code, 422)

        resp2 = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertIn(resp2.status_code, [400, 422])
        self.assertIn(resp2.json().get('error'), ['JAPANESE_EVALUATION_NOT_ACCEPTED', 'READINESS_CHECK_FAILED', 'EVALUATION_INCOMPLETE'])

    def test_remediation_missing_evaluator_assignment_rejected_by_both_endpoints(self):
        """Missing evaluator assignment is rejected by both endpoints."""
        self._submit_all_competencies()
        self.behav_asgn.delete()

        appraisal = Appraisal.objects.create(
            cycle=self.cycle, employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.DRAFT,
            reviewer=self.mentor
        )
        self.client.force_authenticate(user=self.hr)

        resp1 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp1.status_code, 422)
        self.assertTrue(any('Missing required Behavioral evaluator assignment' in b for b in resp1.json()['configuration_blockers']))

        resp2 = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertIn(resp2.status_code, [400, 422])
        self.assertIn(resp2.json().get('error'), ['JAPANESE_EVALUATION_NOT_ACCEPTED', 'READINESS_CHECK_FAILED', 'EVALUATION_INCOMPLETE'])
        self.assertTrue(any('Missing required Behavioral evaluator assignment' in b for b in resp2.json()['configuration_blockers']))

    def test_remediation_incomplete_reviews_rejected_by_both_endpoints(self):
        """Incomplete competency reviews are rejected by both endpoints."""
        from apps.performance.models import TechnicalCapabilityReview
        TechnicalCapabilityReview.objects.create(
            cycle=self.cycle, employee=self.intern_profile, competency=self.tech_comp1,
            reviewer=self.mentor, score=Decimal('4.50'), status='SUBMITTED'
        )

        appraisal = Appraisal.objects.create(
            cycle=self.cycle, employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.DRAFT,
            reviewer=self.mentor
        )
        self.client.force_authenticate(user=self.hr)

        resp1 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp1.status_code, 422)
        self.assertEqual(resp1.json()['error'], 'READINESS_CHECK_FAILED')

        resp2 = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertIn(resp2.status_code, [400, 422])
        self.assertIn(resp2.json().get('error'), ['JAPANESE_EVALUATION_NOT_ACCEPTED', 'READINESS_CHECK_FAILED', 'EVALUATION_INCOMPLETE'])

    def test_remediation_non_manager_appraisal_rejected(self):
        """AppraisalViewSet.publish_appraisal rejects non-MANAGER appraisal with HTTP 400."""
        self._submit_all_competencies()
        self_appraisal = Appraisal.objects.create(
            cycle=self.cycle, employee=self.intern_profile,
            appraisal_type=AppraisalType.SELF, status=AppraisalStatus.SUBMITTED,
            self_comments='Self reflection'
        )
        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{self_appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'INVALID_APPRAISAL_TYPE')

    def test_remediation_duplicate_publication_returns_409_on_both_endpoints(self):
        """Both endpoints return HTTP 409 on duplicate publication."""
        self._submit_all_competencies()
        appraisal = Appraisal.objects.create(
            cycle=self.cycle, employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.DRAFT,
            reviewer=self.mentor
        )
        self.client.force_authenticate(user=self.hr)

        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 200)

        resp2 = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp2.status_code, 409)
        self.assertEqual(resp2.json()['error'], 'ALREADY_PUBLISHED')

        resp1 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
        self.assertEqual(resp1.status_code, 409)
        self.assertEqual(resp1.json()['error'], 'ALREADY_PUBLISHED')

    def test_remediation_non_hr_publication_returns_403_on_both_endpoints(self):
        """Non-HR users (mentor, intern) receive HTTP 403 on both endpoints."""
        self._submit_all_competencies()
        appraisal = Appraisal.objects.create(
            cycle=self.cycle, employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.DRAFT,
            reviewer=self.mentor
        )

        for user in [self.mentor, self.intern_user]:
            self.client.force_authenticate(user=user)
            resp1 = self.client.post(f'/api/performance/cycles/{self.cycle.id}/participants/{self.participant.id}/publish/')
            self.assertEqual(resp1.status_code, 403)

            resp2 = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
            self.assertEqual(resp2.status_code, 403)

    def test_remediation_publication_preserves_reviewer_attribution(self):
        """Appraisal published via AppraisalViewSet preserves mentor reviewer attribution."""
        self._submit_all_competencies()
        appraisal = Appraisal.objects.create(
            cycle=self.cycle, employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER, status=AppraisalStatus.DRAFT,
            reviewer=self.mentor, reviewer_comments='Mentor review comments.'
        )
        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/', data={'final_comments': 'HR publication note.'}, format='json')
        self.assertEqual(resp.status_code, 200)

        appraisal.refresh_from_db()
        self.assertEqual(appraisal.status, AppraisalStatus.PUBLISHED)
        self.assertEqual(appraisal.reviewer, self.mentor)
        self.assertEqual(appraisal.reviewer_comments, 'Mentor review comments.')
        self.assertEqual(appraisal.final_comments, 'HR publication note.')

    # --- PR 1 Legacy Governance and Evaluation Completeness Remediation Tests ---

    def _setup_legacy_cycle(self, japanese_mandatory=False):
        """Helper to configure a clean legacy criteria cycle with participant and criteria."""
        import uuid
        from datetime import date
        legacy_cycle = PerformanceCycle.objects.create(
            name=f'Legacy Test Cycle {uuid.uuid4().hex[:6]}',
            start_date=date(2026, 1, 1),
            end_date=date(2026, 3, 31),
            status=CycleStatus.ACTIVE,
            japanese_evaluation_mandatory=japanese_mandatory,
            scoring_model=ScoringModel.LEGACY_CRITERIA
        )
        participant = CycleParticipant.objects.create(
            cycle=legacy_cycle,
            employee=self.intern_profile
        )
        crit1, _ = EvaluationCriterion.objects.get_or_create(
            name=f'Legacy Criterion 1 {uuid.uuid4().hex[:6]}',
            defaults={'maximum_score': Decimal('100.00'), 'weight': Decimal('50.00'), 'is_active': True}
        )
        crit2, _ = EvaluationCriterion.objects.get_or_create(
            name=f'Legacy Criterion 2 {uuid.uuid4().hex[:6]}',
            defaults={'maximum_score': Decimal('100.00'), 'weight': Decimal('50.00'), 'is_active': True}
        )
        crit1.is_active = True
        crit1.save()
        crit2.is_active = True
        crit2.save()

        appraisal = Appraisal.objects.create(
            cycle=legacy_cycle,
            employee=self.intern_profile,
            appraisal_type=AppraisalType.MANAGER,
            status=AppraisalStatus.SUBMITTED,
            reviewer=self.mentor
        )
        return legacy_cycle, participant, appraisal, crit1, crit2

    def test_remediation_legacy_participant_inactive_blocks_publication(self):
        """Legacy publication is rejected with HTTP 422 when participant.is_active is False."""
        from unittest.mock import patch
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle()
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit1, score=Decimal('85.00'))
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit2, score=Decimal('90.00'))

        self.client.force_authenticate(user=self.hr)
        with patch.object(CycleParticipant, 'is_active', False, create=True):
            resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(resp.json()['error'], 'PARTICIPANT_NOT_ELIGIBLE')
        self.assertTrue(any('is inactive and cannot be published' in b for b in resp.json()['configuration_blockers']))

    def test_remediation_legacy_employee_user_inactive_blocks_publication(self):
        """Legacy publication is rejected with HTTP 422 when employee user account is inactive."""
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle()
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit1, score=Decimal('85.00'))
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit2, score=Decimal('90.00'))

        self.intern_user.is_active = False
        self.intern_user.save()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(resp.json()['error'], 'PARTICIPANT_NOT_ELIGIBLE')
        self.assertTrue(any('is inactive and cannot be published' in b for b in resp.json()['configuration_blockers']))

    def test_remediation_legacy_employee_terminated_blocks_publication(self):
        """Legacy publication is rejected with HTTP 422 when employee employment_status is TERMINATED or INACTIVE."""
        from apps.employees.models import EmploymentStatus
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle()
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit1, score=Decimal('85.00'))
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit2, score=Decimal('90.00'))

        self.intern_profile.employment_status = EmploymentStatus.TERMINATED
        self.intern_profile.save()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(resp.json()['error'], 'PARTICIPANT_NOT_ELIGIBLE')

    def test_remediation_legacy_valid_active_participant_succeeds(self):
        """Active legacy participant with valid submitted ratings publishes successfully."""
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle(japanese_mandatory=False)
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit1, score=Decimal('85.00'))
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit2, score=Decimal('90.00'))

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['status'], AppraisalStatus.PUBLISHED)
        appraisal.refresh_from_db()
        self.assertEqual(appraisal.status, AppraisalStatus.PUBLISHED)

    def test_remediation_legacy_japanese_unconfigured_none_blocks_publication(self):
        """Legacy cycle with japanese_evaluation_mandatory=None is blocked with HTTP 422."""
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle(japanese_mandatory=None)
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit1, score=Decimal('85.00'))
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit2, score=Decimal('90.00'))

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(resp.json()['error'], 'READINESS_CHECK_FAILED')
        self.assertTrue(any('Japanese evaluation requirement is unconfigured' in b for b in resp.json()['configuration_blockers']))

    def test_remediation_legacy_japanese_mandatory_no_eval_blocks_publication(self):
        """Legacy cycle with japanese_evaluation_mandatory=True but no evaluation blocks publication with HTTP 400."""
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle(japanese_mandatory=True)
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit1, score=Decimal('85.00'))
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit2, score=Decimal('90.00'))

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'JAPANESE_EVALUATION_NOT_ACCEPTED')

    def test_remediation_legacy_japanese_mandatory_pending_blocks_publication(self):
        """Legacy cycle with japanese_evaluation_mandatory=True and non-accepted evaluation blocks publication with HTTP 400."""
        from apps.japanese.models import JapaneseEvaluation, EvaluationStatus
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle(japanese_mandatory=True)
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit1, score=Decimal('85.00'))
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit2, score=Decimal('90.00'))

        jp_eval = JapaneseEvaluation.objects.create(
            intern=self.intern_profile, cycle=cycle, evaluator=self.instructor,
            status=EvaluationStatus.PENDING, overall_language_score=Decimal('80.00')
        )

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'JAPANESE_EVALUATION_NOT_ACCEPTED')

    def test_remediation_legacy_japanese_mandatory_accepted_succeeds(self):
        """Legacy cycle with japanese_evaluation_mandatory=True and ACCEPTED evaluation succeeds."""
        from apps.japanese.models import JapaneseEvaluation, EvaluationStatus
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle(japanese_mandatory=True)
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit1, score=Decimal('85.00'))
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit2, score=Decimal('90.00'))

        jp_eval = JapaneseEvaluation.objects.create(
            intern=self.intern_profile, cycle=cycle, evaluator=self.instructor,
            status=EvaluationStatus.ACCEPTED, overall_language_score=Decimal('90.00')
        )

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['status'], AppraisalStatus.PUBLISHED)

    def test_remediation_legacy_japanese_optional_false_succeeds(self):
        """Legacy cycle with japanese_evaluation_mandatory=False publishes without a Japanese evaluation."""
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle(japanese_mandatory=False)
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit1, score=Decimal('85.00'))
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit2, score=Decimal('90.00'))

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 200)

    def test_remediation_legacy_missing_manager_ratings_scoring_incomplete(self):
        """Legacy scoring returns is_complete=False when manager appraisal has no submitted ratings."""
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle(japanese_mandatory=False)

        calc = ScoringService.calculate_legacy_score(self.intern_profile, cycle)
        self.assertFalse(calc['is_complete'])
        self.assertIsNone(calc['final_score'])
        self.assertTrue(len(calc['verification_errors']) > 0)
        self.assertTrue(any('Missing required manager rating' in err for err in calc['verification_errors']))

        # Publication must also be blocked
        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'EVALUATION_INCOMPLETE')

    def test_remediation_legacy_partially_submitted_ratings_scoring_incomplete(self):
        """Legacy scoring returns is_complete=False when manager rates only some of the configured criteria."""
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle(japanese_mandatory=False)
        # Only rate crit1, leave crit2 unrated
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit1, score=Decimal('85.00'))

        calc = ScoringService.calculate_legacy_score(self.intern_profile, cycle)
        self.assertFalse(calc['is_complete'])
        self.assertIsNone(calc['final_score'])
        self.assertTrue(any(f"Missing required manager rating for criterion '{crit2.name}'" in err for err in calc['verification_errors']))

        # Publication must also be blocked
        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'EVALUATION_INCOMPLETE')

    def test_remediation_legacy_all_required_ratings_submitted_succeeds(self):
        """Legacy scoring returns is_complete=True and computes valid score when all criteria are rated."""
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle(japanese_mandatory=False)
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit1, score=Decimal('80.00'))
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit2, score=Decimal('90.00'))

        calc = ScoringService.calculate_legacy_score(self.intern_profile, cycle)
        self.assertTrue(calc['is_complete'])
        self.assertIsNotNone(calc['final_score'])
        self.assertEqual(calc['verification_errors'], [])
        self.assertEqual(calc['manager_criteria_score'], 85.0)

        # Publication succeeds
        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['status'], AppraisalStatus.PUBLISHED)

    def test_remediation_legacy_employee_inactive_raw_status_blocks_publication(self):
        """Legacy publication is rejected with HTTP 422 when employee employment_status is set to raw string 'INACTIVE'."""
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle()
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit1, score=Decimal('85.00'))
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit2, score=Decimal('90.00'))

        self.intern_profile.employment_status = 'INACTIVE'
        self.intern_profile.save()

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(resp.json()['error'], 'PARTICIPANT_NOT_ELIGIBLE')
        self.assertTrue(any('is inactive and cannot be published' in b for b in resp.json()['configuration_blockers']))

    def test_remediation_legacy_japanese_mandatory_returned_blocks_publication(self):
        """Legacy cycle with japanese_evaluation_mandatory=True and RETURNED evaluation blocks publication with HTTP 400."""
        from apps.japanese.models import JapaneseEvaluation, EvaluationStatus
        cycle, participant, appraisal, crit1, crit2 = self._setup_legacy_cycle(japanese_mandatory=True)
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit1, score=Decimal('85.00'))
        AppraisalRating.objects.create(appraisal=appraisal, criterion=crit2, score=Decimal('90.00'))

        jp_eval = JapaneseEvaluation.objects.create(
            intern=self.intern_profile, cycle=cycle, evaluator=self.instructor,
            status=EvaluationStatus.RETURNED, overall_language_score=Decimal('70.00')
        )

        self.client.force_authenticate(user=self.hr)
        resp = self.client.post(f'/api/performance/appraisals/{appraisal.id}/publish/')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'JAPANESE_EVALUATION_NOT_ACCEPTED')
