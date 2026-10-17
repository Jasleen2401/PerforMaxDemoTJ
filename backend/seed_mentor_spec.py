"""
Seed script for Technical Manager & Mentor Specification (TM-01 to TM-12)
========================================================================
Seeds:
- 8 Core MIRAI Technical Capability Parameters
- Relational Projects (PRJ-MIRAI-001, PRJ-QA-002, PRJ-PULSE-003)
- Intern Academic Backgrounds & University Cohorts
- Project links on existing Tasks/Goals
- Initial Relational 1-on-1 Sync Meetings & Action Items
"""

import os
import sys
import uuid
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone

import django

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    django.setup()

from apps.accounts.models import User, UserRole
from apps.organization.models import Department
from apps.employees.models import EmployeeProfile
from apps.goals.models import Project, Goal, ProjectStatus
from apps.performance.models import (
    TechnicalCapabilityParameter,
    PerformanceCycle,
    SyncMeeting,
    ActionItem,
    MeetingStatus,
    ActionItemStatus
)

def run_seed():
    print("[*] Seeding Technical Manager & Mentor Specification data...")

    # 1. Active Cycle
    active_cycle = PerformanceCycle.objects.filter(status='ACTIVE').first()
    if not active_cycle:
        active_cycle = PerformanceCycle.objects.create(
            name="MIRAI Intern Performance Cycle 2026",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status='ACTIVE'
        )

    # 2. Managers
    marcus = User.objects.filter(email='marcus.tech@company.com').first() or User.objects.filter(role=UserRole.MANAGER).first()
    elena = User.objects.filter(email='elena.qa@company.com').first()

    eng_dept = Department.objects.filter(name__icontains='Engineering').first() or Department.objects.first()
    qa_dept = Department.objects.filter(name__icontains='QA').first() or eng_dept

    # 3. 8 Core Technical Competencies
    print("  [1/5] Seeding 8 Core MIRAI Technical Competencies...")
    competencies_def = [
        {
            "name": "Technical Problem Solving & Debugging",
            "category": "Core Technical",
            "description": "Analytical capability to debug distributed systems, isolate root causes, and engineer resilient solutions.",
            "benchmark_score": Decimal("8.00"),
            "weight": Decimal("15.00"),
        },
        {
            "name": "Code Quality & Clean Architecture",
            "category": "Engineering Standards",
            "description": "Adherence to SOLID principles, modularity, DRY principles, and self-documenting clean code practices.",
            "benchmark_score": Decimal("8.00"),
            "weight": Decimal("15.00"),
        },
        {
            "name": "System Architecture & Database Design",
            "category": "Engineering Standards",
            "description": "Ability to design normalized relational schemas, scalable REST APIs, and robust system workflows.",
            "benchmark_score": Decimal("7.50"),
            "weight": Decimal("15.00"),
        },
        {
            "name": "Testing & Quality Assurance Automation",
            "category": "Verification & Quality",
            "description": "Execution of comprehensive unit, integration, and E2E test suites with high code coverage.",
            "benchmark_score": Decimal("7.50"),
            "weight": Decimal("10.00"),
        },
        {
            "name": "Delivery Velocity & Sprint Execution",
            "category": "Delivery & Velocity",
            "description": "Consistent task progression, milestone delivery within sprint bounds, and reliable turnaround velocity.",
            "benchmark_score": Decimal("8.00"),
            "weight": Decimal("15.00"),
        },
        {
            "name": "Technical Documentation & PR Quality",
            "category": "Communication & Process",
            "description": "Creation of clear architectural RFCs, pull request context, OpenAPI docs, and thorough commit notes.",
            "benchmark_score": Decimal("7.50"),
            "weight": Decimal("10.00"),
        },
        {
            "name": "Engineering Agility & Adaptability",
            "category": "Growth & Agility",
            "description": "Fast ramp-up on unfamiliar stacks, proactive unblocking, and receptiveness to code review feedback.",
            "benchmark_score": Decimal("8.00"),
            "weight": Decimal("10.00"),
        },
        {
            "name": "Collaboration & Code Review Participation",
            "category": "Core Technical",
            "description": "Constructive peer reviews, active pair-programming contribution, and clear cross-functional alignment.",
            "benchmark_score": Decimal("8.00"),
            "weight": Decimal("10.00"),
        },
    ]

    for item in competencies_def:
        param, created = TechnicalCapabilityParameter.objects.get_or_create(
            name=item["name"],
            defaults={
                "category": item["category"],
                "description": item["description"],
                "benchmark_score": item["benchmark_score"],
                "weight": item["weight"],
                "cycle": active_cycle,
                "created_by": marcus,
                "is_active": True,
            }
        )
        if not created:
            param.category = item["category"]
            param.description = item["description"]
            param.benchmark_score = item["benchmark_score"]
            param.weight = item["weight"]
            param.is_active = True
            param.save()

    # 4. Multi-Project Setup (TM-02)
    print("  [2/5] Seeding Relational Projects (TM-02)...")
    projects_def = [
        {
            "title": "MIRAI Core Platform Engineering",
            "code": "PRJ-MIRAI-001",
            "description": "High-throughput microservices architecture and core relational data layer for the MIRAI intern lifecycle.",
            "tech_stack": ["Python", "Django REST", "PostgreSQL", "React", "TypeScript"],
            "target_cohort": "MIRAI Cohort 2026",
            "status": ProjectStatus.ACTIVE,
            "owner": marcus,
            "department": eng_dept,
            "milestones": [
                {"title": "M1: Architecture Blueprint & ORM Models", "status": "COMPLETED", "due": "2026-03-15"},
                {"title": "M2: RESTful API Integration & RBAC Gates", "status": "ACTIVE", "due": "2026-06-30"},
                {"title": "M3: Production Load & Stress Verification", "status": "PENDING", "due": "2026-09-30"}
            ],
            "start_date": date(2026, 1, 10),
            "end_date": date(2026, 10, 31),
        },
        {
            "title": "Automated QA & CI/CD Pipeline",
            "code": "PRJ-QA-002",
            "description": "Automated end-to-end regression test suite, contract validation, and GitHub Actions CD deployment pipeline.",
            "tech_stack": ["Playwright", "Jest", "Pytest", "Docker", "GitHub Actions"],
            "target_cohort": "MIRAI Cohort 2026",
            "status": ProjectStatus.ACTIVE,
            "owner": elena or marcus,
            "department": qa_dept,
            "milestones": [
                {"title": "M1: API Contract Tests Suite", "status": "COMPLETED", "due": "2026-03-31"},
                {"title": "M2: Browser Subagent Automated Runs", "status": "ACTIVE", "due": "2026-07-15"}
            ],
            "start_date": date(2026, 2, 1),
            "end_date": date(2026, 11, 15),
        },
        {
            "title": "Performance Pulse Telemetry & Analytics",
            "code": "PRJ-PULSE-003",
            "description": "Real-time performance radar, 60/40 scoring synthesis calculations, and executive PPO calibration matrix.",
            "tech_stack": ["React", "TailwindCSS", "Django", "Chart.js"],
            "target_cohort": "MIRAI Cohort 2026",
            "status": ProjectStatus.ACTIVE,
            "owner": marcus,
            "department": eng_dept,
            "milestones": [
                {"title": "M1: Pulse Aggregation Engine", "status": "COMPLETED", "due": "2026-04-15"},
                {"title": "M2: Talent Radar & Stage-Gate Verdict", "status": "ACTIVE", "due": "2026-08-30"}
            ],
            "start_date": date(2026, 2, 15),
            "end_date": date(2026, 12, 15),
        }
    ]

    created_projects = []
    for p in projects_def:
        proj, _ = Project.objects.update_or_create(
            code=p["code"],
            defaults=p
        )
        created_projects.append(proj)

    primary_project = created_projects[0]

    # 5. Connect existing tasks/goals to parent projects (TM-03)
    print("  [3/5] Binding orphan tasks to parent projects (TM-03)...")
    Goal.objects.filter(project__isnull=True).update(
        project=primary_project,
        expected_evidence_type='CODE_PR',
        linked_competency='Technical Problem Solving & Debugging'
    )

    # 6. Enhance Intern Profiles with Academic History & University Cohort (TM-01)
    print("  [4/5] Enhancing intern profiles with academic history (TM-01)...")
    intern_profiles = EmployeeProfile.objects.filter(user__role=UserRole.INTERN)
    academic_samples = [
        {
            "university": "Tokyo Institute of Technology",
            "degree": "B.S. in Computer Science & Information Engineering",
            "graduation_year": "2026",
            "gpa": "3.85 / 4.0",
            "relevant_coursework": ["Distributed Systems", "Database Internals", "Algorithm Design", "Machine Learning"],
            "cohort": "MIRAI Cohort 2026",
        },
        {
            "university": "Waseda University",
            "degree": "B.Eng. in Software Engineering",
            "graduation_year": "2026",
            "gpa": "3.90 / 4.0",
            "relevant_coursework": ["Web Architectures", "Cloud Computing", "Compiler Design", "Security Engineering"],
            "cohort": "MIRAI Cohort 2026",
        },
        {
            "university": "Kyoto University",
            "degree": "B.S. in Applied Informatics",
            "graduation_year": "2026",
            "gpa": "3.78 / 4.0",
            "relevant_coursework": ["Object-Oriented Design", "Operating Systems", "Test Automation", "Data Structures"],
            "cohort": "MIRAI Cohort 2026",
        }
    ]

    for idx, profile in enumerate(intern_profiles):
        sample = academic_samples[idx % len(academic_samples)]
        profile.academic_history = sample
        profile.university_cohort = sample["cohort"]
        profile.save()

    # 7. Seed Relational 1-on-1 Sync Meetings (TM-07)
    print("  [5/5] Seeding Relational 1-on-1 Sync Meetings (TM-07)...")
    first_intern = intern_profiles.first()
    if first_intern and marcus:
        meeting, created = SyncMeeting.objects.get_or_create(
            employee=first_intern,
            manager=marcus,
            meeting_title="Sprint 4 Technical Alignment & Capability Calibration",
            meeting_date=date.today() - timedelta(days=2),
            defaults={
                "meeting_time": "14:00",
                "discussion_points": "Reviewed PR #42 MVC separation, discussed automated pytest coverage, and scoped milestone M2 goals.",
                "key_issues": "Temporary mock dependencies in database layer resolved. Japanese language sync balanced with engineering sprint.",
                "confidential_notes": "Demonstrates high autonomy and solid technical problem-solving. Strong candidate for PPO fast-track upon Q4 panel validation.",
                "status": MeetingStatus.PUBLISHED,
                "created_by": marcus,
                "published_at": timezone.now() - timedelta(days=2),
            }
        )
        if created:
            ActionItem.objects.create(
                meeting=meeting,
                content="Complete integration test coverage for authentication JWT flow (>85%)",
                assigned_to=first_intern.user,
                due_date=date.today() + timedelta(days=5),
                status=ActionItemStatus.IN_PROGRESS
            )
            ActionItem.objects.create(
                meeting=meeting,
                content="Submit RFC architectural document for cache invalidation strategy",
                assigned_to=first_intern.user,
                due_date=date.today() + timedelta(days=10),
                status=ActionItemStatus.PENDING
            )

    print("[+] Technical Manager & Mentor Specification seeding completed successfully!")

if __name__ == '__main__':
    run_seed()
