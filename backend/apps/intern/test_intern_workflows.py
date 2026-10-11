import io
from decimal import Decimal
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import UserRole
from apps.employees.models import EmployeeProfile
from apps.organization.models import Department
from apps.performance.models import PerformanceCycle, CycleStatus
from apps.goals.models import Goal, GoalStatus
from apps.intern.models import InternTask, TaskStatus
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.feedback.models import Feedback, FeedbackStatus, FeedbackVisibility, FeedbackType

User = get_user_model()


class CoreInternWorkflowsIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Department
        self.dept = Department.objects.create(name="Engineering", code="ENG")

        # HR User
        self.hr_user = User.objects.create_user(
            email="sarah.hr@test.com",
            username="sarah_hr",
            password="SarahPassword123!",
            role=UserRole.HR
        )
        self.hr_profile = EmployeeProfile.objects.create(
            user=self.hr_user,
            employee_code="HR-001",
            first_name="Sarah",
            last_name="Jenkins",
            department=self.dept,
            designation="HR Executive"
        )

        # Manager
        self.manager_user = User.objects.create_user(
            email="marcus.tech@test.com",
            username="marcus_tech",
            password="MarcusPassword123!",
            role=UserRole.MANAGER
        )
        self.manager_profile = EmployeeProfile.objects.create(
            user=self.manager_user,
            employee_code="MGR-001",
            first_name="Marcus",
            last_name="Vance",
            department=self.dept,
            designation="Engineering Lead"
        )

        # Intern A (Alex)
        self.alex_user = User.objects.create_user(
            email="alex.dev@test.com",
            username="alex_dev",
            password="AlexPassword123!",
            role=UserRole.INTERN
        )
        self.alex_profile = EmployeeProfile.objects.create(
            user=self.alex_user,
            employee_code="INT-001",
            first_name="Alex",
            last_name="Chen",
            department=self.dept,
            manager=self.manager_user,
            designation="Backend Intern"
        )

        # Intern B (Maya)
        self.maya_user = User.objects.create_user(
            email="maya.ux@test.com",
            username="maya_ux",
            password="MayaPassword123!",
            role=UserRole.INTERN
        )
        self.maya_profile = EmployeeProfile.objects.create(
            user=self.maya_user,
            employee_code="INT-002",
            first_name="Maya",
            last_name="Patel",
            department=self.dept,
            manager=self.manager_user,
            designation="Frontend Intern"
        )

        # Active Performance Cycle
        self.cycle = PerformanceCycle.objects.create(
            name="Q3 2026 Evaluation",
            start_date="2026-07-01",
            end_date="2026-09-30",
            status=CycleStatus.ACTIVE
        )

    # =========================================================================
    # PHASE 2 TESTS: HR Assigns Goals to Interns & Visibility
    # =========================================================================
    def test_hr_assigns_goal_and_intern_visibility(self):
        # 1. HR creates and assigns goal to Alex
        self.client.force_authenticate(user=self.hr_user)
        payload = {
            "employee": str(self.alex_profile.id),
            "title": "Master Distributed Caching with Redis",
            "description": "Implement multi-region cache invalidation protocol",
            "category": "TECHNICAL",
            "priority": "HIGH",
            "start_date": "2026-07-01",
            "due_date": "2026-09-15",
            "target_value": 100,
            "weightage": 25,
        }
        resp = self.client.post("/api/goals/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        goal_id = resp.data["id"]

        # 2. Alex sees the goal in My Goals
        self.client.force_authenticate(user=self.alex_user)
        alex_resp = self.client.get("/api/intern/my-goals/")
        self.assertEqual(alex_resp.status_code, status.HTTP_200_OK)
        goal_ids = [g["id"] for g in alex_resp.data["data"]]
        self.assertIn(goal_id, goal_ids)
        alex_goal = next(g for g in alex_resp.data["data"] if g["id"] == goal_id)
        self.assertEqual(alex_goal["title"], "Master Distributed Caching with Redis")
        self.assertEqual(alex_goal["weightage"], 25.0)

        # 3. Maya DOES NOT see Alex's goal
        self.client.force_authenticate(user=self.maya_user)
        maya_resp = self.client.get("/api/intern/my-goals/")
        self.assertEqual(maya_resp.status_code, status.HTTP_200_OK)
        maya_goal_ids = [g["id"] for g in maya_resp.data["data"]]
        self.assertNotIn(goal_id, maya_goal_ids)

    def test_intern_cannot_create_or_tamper_goals(self):
        # Intern cannot create HR-controlled goals
        self.client.force_authenticate(user=self.alex_user)
        payload = {
            "employee": str(self.alex_profile.id),
            "title": "Self-Assigned Rogue Goal",
            "description": "Should fail",
            "due_date": "2026-09-15"
        }
        resp = self.client.post("/api/goals/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_intern_goal_progress_persistence(self):
        goal = Goal.objects.create(
            employee=self.alex_profile,
            cycle=self.cycle,
            assigned_by=self.hr_user,
            title="Deploy Service Mesh",
            description="Production rollout",
            due_date="2026-09-30"
        )

        # Alex updates progress to 60%
        self.client.force_authenticate(user=self.alex_user)
        resp = self.client.post(f"/api/intern/my-goals/{goal.id}/progress/", {
            "progress": 60,
            "comment": "Configured Istio routing rules in staging."
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        goal.refresh_from_db()
        self.assertEqual(float(goal.completion_percentage), 60.0)
        self.assertEqual(goal.status, GoalStatus.IN_PROGRESS)

        # Maya cannot update Alex's goal progress
        self.client.force_authenticate(user=self.maya_user)
        unauth_resp = self.client.post(f"/api/intern/my-goals/{goal.id}/progress/", {
            "progress": 90
        })
        self.assertEqual(unauth_resp.status_code, status.HTTP_404_NOT_FOUND)

        # HR sees the updated progress
        self.client.force_authenticate(user=self.hr_user)
        hr_resp = self.client.get(f"/api/goals/{goal.id}/")
        self.assertEqual(hr_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(float(hr_resp.data["completion_percentage"]), 60.0)

    # =========================================================================
    # PHASE 3 TESTS: Intern Tasks & HR Visibility
    # =========================================================================
    def test_intern_creates_and_manages_own_task(self):
        goal = Goal.objects.create(
            employee=self.alex_profile,
            cycle=self.cycle,
            assigned_by=self.hr_user,
            title="Database Optimization",
            due_date="2026-09-30"
        )

        # Alex creates a personal task linked to their goal
        self.client.force_authenticate(user=self.alex_user)
        task_payload = {
            "title": "Analyze Slow Query Logs",
            "description": "Generate pg_stat_statements report",
            "goalId": str(goal.id),
            "dueDate": "2026-08-15",
            "priority": "HIGH",
            "status": "IN_PROGRESS"
        }
        resp = self.client.post("/api/intern/tasks/", task_payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        task_id = resp.data["data"]["id"]
        self.assertTrue(resp.data["data"]["isSelfCreated"])
        self.assertEqual(resp.data["data"]["goalTitle"], "Database Optimization")

        # Alex updates the task status to COMPLETED
        update_resp = self.client.patch(f"/api/intern/tasks/{task_id}/", {
            "status": "COMPLETED"
        })
        self.assertEqual(update_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(update_resp.data["data"]["status"], "COMPLETED")

        # Maya CANNOT modify Alex's task
        self.client.force_authenticate(user=self.maya_user)
        tamper_resp = self.client.patch(f"/api/intern/tasks/{task_id}/", {
            "title": "Tampered Title"
        })
        self.assertEqual(tamper_resp.status_code, status.HTTP_404_NOT_FOUND)

        # Maya CANNOT delete Alex's task
        delete_resp = self.client.delete(f"/api/intern/tasks/{task_id}/")
        self.assertEqual(delete_resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_hr_visibility_of_intern_tasks(self):
        # Alex creates a task
        task = InternTask.objects.create(
            intern=self.alex_profile,
            created_by=self.alex_user,
            title="Setup Prometheus Grafana Dashboards",
            description="Monitor latency and RPS",
            priority="MEDIUM",
            status=TaskStatus.IN_PROGRESS,
            due_date="2026-08-20"
        )

        # HR queries all intern tasks
        self.client.force_authenticate(user=self.hr_user)
        hr_resp = self.client.get("/api/hr/intern-tasks/")
        self.assertEqual(hr_resp.status_code, status.HTTP_200_OK)
        task_titles = [t["title"] for t in hr_resp.data["data"]]
        self.assertIn("Setup Prometheus Grafana Dashboards", task_titles)

        # Filter by employee
        filter_resp = self.client.get(f"/api/hr/intern-tasks/?employee_id={self.alex_profile.id}")
        self.assertEqual(filter_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filter_resp.data["data"]), 1)
        self.assertEqual(filter_resp.data["data"][0]["internName"], "Alex Chen")

    # =========================================================================
    # PHASE 4 TESTS: Feedback Privacy & Publication Control
    # =========================================================================
    def test_feedback_privacy_and_publication_filtering(self):
        # Manager creates DRAFT feedback for Alex
        draft_fb = Feedback.objects.create(
            sender=self.manager_user,
            recipient=self.alex_user,
            message="Private mentor draft notes on Alex's technical velocity.",
            feedback_type=FeedbackType.PRAISE,
            visibility=FeedbackVisibility.PUBLIC,
            status=FeedbackStatus.DRAFT
        )

        # 1. Alex CANNOT view the draft feedback via /feedbacks
        self.client.force_authenticate(user=self.alex_user)
        list_resp = self.client.get("/feedbacks")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data["data"]["content"]), 0)

        # 2. Alex CANNOT view draft feedback via /feedbacks/employee/{alex.id}
        emp_resp = self.client.get(f"/feedbacks/employee/{self.alex_profile.id}")
        self.assertEqual(emp_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(emp_resp.data["data"]["content"]), 0)

        # 3. HR publishes the feedback
        self.client.force_authenticate(user=self.hr_user)
        pub_resp = self.client.post(f"/feedbacks/{draft_fb.id}/publish")
        self.assertEqual(pub_resp.status_code, status.HTTP_200_OK)
        draft_fb.refresh_from_db()
        self.assertEqual(draft_fb.status, FeedbackStatus.PUBLISHED)

        # 4. Alex can now view the published feedback
        self.client.force_authenticate(user=self.alex_user)
        alex_published_resp = self.client.get("/feedbacks")
        self.assertEqual(alex_published_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(alex_published_resp.data["data"]["content"]), 1)
        self.assertEqual(alex_published_resp.data["data"]["content"][0]["id"], str(draft_fb.id))

        # 5. Maya CANNOT view Alex's published feedback (attempting IDOR on employee feed)
        self.client.force_authenticate(user=self.maya_user)
        maya_idor_resp = self.client.get(f"/feedbacks/employee/{self.alex_profile.id}")
        self.assertEqual(maya_idor_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Maya's own feed does not contain Alex's feedback
        maya_feed = self.client.get("/feedbacks")
        self.assertEqual(maya_feed.status_code, status.HTTP_200_OK)
        self.assertEqual(len(maya_feed.data["data"]["content"]), 0)

        # Maya CANNOT access Alex's feedback by direct ID
        maya_detail = self.client.get(f"/api/feedback/{draft_fb.id}/")
        self.assertEqual(maya_detail.status_code, status.HTTP_404_NOT_FOUND)

    # =========================================================================
    # PHASE 5 TESTS: Evidence Upload, File Security & HR Access
    # =========================================================================
    def test_evidence_submission_and_secure_download(self):
        goal = Goal.objects.create(
            employee=self.alex_profile,
            cycle=self.cycle,
            assigned_by=self.hr_user,
            title="CI/CD Hardening",
            due_date="2026-09-30"
        )

        fake_pdf = SimpleUploadedFile(
            "security_audit.pdf",
            b"%PDF-1.4 test secure evidence artifact content",
            content_type="application/pdf"
        )

        # Alex uploads evidence with PDF attachment
        self.client.force_authenticate(user=self.alex_user)
        ev_resp = self.client.post("/api/intern/evidence/", {
            "goalId": str(goal.id),
            "title": "Security Audit Report PDF",
            "description": "Vulnerability scanning results",
            "file": fake_pdf
        }, format="multipart")
        self.assertEqual(ev_resp.status_code, status.HTTP_201_CREATED)
        ev_id = ev_resp.data["data"]["id"]

        # HR views evidence list
        self.client.force_authenticate(user=self.hr_user)
        hr_ev_list = self.client.get("/api/evidence/")
        self.assertEqual(hr_ev_list.status_code, status.HTTP_200_OK)
        found_ev = next(e for e in hr_ev_list.data["results"] if e["id"] == ev_id)
        self.assertEqual(found_ev["employee_name"], "Alex Chen")

        # HR reviews evidence
        review_resp = self.client.post(f"/api/evidence/{ev_id}/review/", {
            "review_status": "APPROVED",
            "review_notes": "Clean audit report. Verified!"
        })
        self.assertEqual(review_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(review_resp.data["review_status"], "APPROVED")

        # HR downloads evidence file
        hr_download = self.client.get(f"/api/evidence/{ev_id}/download/")
        self.assertEqual(hr_download.status_code, status.HTTP_200_OK)

        # Submitting intern Alex downloads evidence file
        self.client.force_authenticate(user=self.alex_user)
        alex_download = self.client.get(f"/api/evidence/{ev_id}/download/")
        self.assertEqual(alex_download.status_code, status.HTTP_200_OK)

        # Maya (another intern) CANNOT download Alex's evidence file
        self.client.force_authenticate(user=self.maya_user)
        maya_download = self.client.get(f"/api/evidence/{ev_id}/download/")
        self.assertEqual(maya_download.status_code, status.HTTP_404_NOT_FOUND)

        # Unauthenticated user CANNOT download evidence file
        self.client.logout()
        anon_download = self.client.get(f"/api/evidence/{ev_id}/download/")
        self.assertEqual(anon_download.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_file_upload_security_blocks_malicious_extensions(self):
        goal = Goal.objects.create(
            employee=self.alex_profile,
            cycle=self.cycle,
            assigned_by=self.hr_user,
            title="Backend Security Goal",
            due_date="2026-09-30"
        )

        malicious_script = SimpleUploadedFile(
            "exploit.py",
            b"import os; os.system('echo hacked')",
            content_type="text/x-python"
        )

        self.client.force_authenticate(user=self.alex_user)
        resp = self.client.post("/api/intern/evidence/", {
            "goalId": str(goal.id),
            "title": "Script attempt",
            "file": malicious_script
        }, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("strictly forbidden", resp.data["message"].lower())
