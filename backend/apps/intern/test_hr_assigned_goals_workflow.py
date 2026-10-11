from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, UserRole
from apps.employees.models import EmployeeProfile
from apps.performance.models import PerformanceCycle, CycleStatus
from apps.goals.models import Goal, GoalStatus, KPI


class HRAssignedGoalsWorkflowE2ETest(TestCase):
    def setUp(self):
        # 1. Create Performance Cycle
        self.cycle = PerformanceCycle.objects.create(
            name="Q4 2026 Appraisal Cycle",
            start_date="2026-10-01",
            end_date="2026-12-31",
            status=CycleStatus.ACTIVE
        )

        # 2. Create HR user
        self.hr_user = User.objects.create_user(
            username="hr_test",
            email="hr_test@example.com",
            password="Password123!",
            role=UserRole.HR
        )

        # 3. Create Intern A and Profile
        self.intern_a = User.objects.create_user(
            username="intern_a",
            email="intern_a@example.com",
            password="Password123!",
            role=UserRole.INTERN
        )
        self.profile_a = EmployeeProfile.objects.create(
            user=self.intern_a,
            employee_code="INT-001",
            first_name="Intern",
            last_name="Alpha"
        )

        # 4. Create Intern B and Profile
        self.intern_b = User.objects.create_user(
            username="intern_b",
            email="intern_b@example.com",
            password="Password123!",
            role=UserRole.INTERN
        )
        self.profile_b = EmployeeProfile.objects.create(
            user=self.intern_b,
            employee_code="INT-002",
            first_name="Intern",
            last_name="Beta"
        )

        self.client = APIClient()

    def test_complete_hr_to_intern_workflow(self):
        # Step 1 & 2: HR assigns a goal to Intern A
        self.client.force_authenticate(user=self.hr_user)
        payload = {
            "employee": str(self.profile_a.id),
            "title": "Master Distributed Microservices",
            "description": "Architect event-driven pipelines using RabbitMQ and Redis",
            "category": "TECHNICAL",
            "priority": "HIGH",
            "due_date": "2026-12-25",
            "target_value": 100,
            "weightage": 30
        }
        create_res = self.client.post("/api/goals/", payload, format="json")
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        goal_id = create_res.data["id"]

        # Step 3: Confirm assignment is persisted in the database
        goal = Goal.objects.filter(id=goal_id).first()
        self.assertIsNotNone(goal)
        self.assertEqual(goal.employee, self.profile_a)
        self.assertEqual(goal.title, "Master Distributed Microservices")
        self.assertEqual(goal.status, GoalStatus.NOT_STARTED)
        self.assertEqual(goal.category, "TECHNICAL")
        self.assertEqual(goal.completion_percentage, Decimal("0.00"))

        # Step 4 & 5: Intern A requests My Goals
        self.client.force_authenticate(user=self.intern_a)
        res_a = self.client.get("/api/intern/my-goals/")
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        goals_a = res_a.data.get("data", [])
        self.assertEqual(len(goals_a), 1)
        self.assertEqual(goals_a[0]["id"], str(goal_id))
        self.assertEqual(goals_a[0]["title"], "Master Distributed Microservices")
        self.assertEqual(goals_a[0]["category"], "TECHNICAL")
        self.assertEqual(goals_a[0]["status"], "NOT_STARTED")
        self.assertEqual(goals_a[0]["progress"], 0.0)

        # Step 6: Refresh (re-fetch) and verify it remains visible
        refresh_res = self.client.get("/api/intern/my-goals/")
        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(refresh_res.data.get("data", [])), 1)

        # Step 7: Intern B logs in and verifies Intern A's goal is NOT visible
        self.client.force_authenticate(user=self.intern_b)
        res_b = self.client.get("/api/intern/my-goals/")
        self.assertEqual(res_b.status_code, status.HTTP_200_OK)
        goals_b = res_b.data.get("data", [])
        self.assertEqual(len(goals_b), 0)

        # Intern B directly requesting Intern A's goal by ID must return 404
        direct_res = self.client.get(f"/api/intern/my-goals/{goal_id}/")
        self.assertEqual(direct_res.status_code, status.HTTP_404_NOT_FOUND)

        # Step 8: Intern A updates goal progress to 75%
        self.client.force_authenticate(user=self.intern_a)
        update_res = self.client.post(
            f"/api/intern/my-goals/{goal_id}/progress/",
            {"progress": 75.0, "comment": "Completed consumer service and test coverage."},
            format="json"
        )
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res.data["data"]["progress"], 75.0)

        # Verify database persistence & status auto-transition to IN_PROGRESS
        goal.refresh_from_db()
        self.assertEqual(goal.completion_percentage, Decimal("75.00"))
        self.assertEqual(goal.status, GoalStatus.IN_PROGRESS)

        # Step 9: Confirm HR can view the assigned goal and its updated progress
        self.client.force_authenticate(user=self.hr_user)
        hr_res = self.client.get("/api/goals/")
        self.assertEqual(hr_res.status_code, status.HTTP_200_OK)
        results = hr_res.data.get("results", [])
        found_in_hr = False
        for g in results:
            if str(g["id"]) == str(goal_id):
                found_in_hr = True
                self.assertEqual(float(g["completion_percentage"]), 75.0)
                self.assertEqual(g["status"], "IN_PROGRESS")
                self.assertEqual(g["employee_name"], "Intern Alpha")
        self.assertTrue(found_in_hr)

        # Step 10: Verify compatibility endpoint /kpi/goal-set/employee/<id> returns synthesized goals
        compat_res = self.client.get(f"/kpi/goal-set/employee/{self.profile_a.id}")
        self.assertEqual(compat_res.status_code, status.HTTP_200_OK)
        compat_data = compat_res.data.get("data")
        self.assertIsNotNone(compat_data)
        self.assertEqual(len(compat_data["items"]), 1)
        self.assertEqual(compat_data["items"][0]["kpiTitle"], "Master Distributed Microservices")
        self.assertEqual(compat_data["items"][0]["currentProgress"], 75.0)
