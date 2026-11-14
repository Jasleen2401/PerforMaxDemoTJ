import os
import sys
from pathlib import Path
from datetime import date

backend_dir = Path(r"c:\Users\jasle\Downloads\FinalMVP\destination_performax\backend")
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "apps"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

import django
django.setup()

from django.contrib.auth import get_user_model
from apps.employees.models import EmployeeProfile
from apps.japanese.models import JLPTAttempt, JLPTEligibilityRecord
from apps.performance.models import PerformanceCycle

User = get_user_model()
tanaka = User.objects.filter(username="instructor_tanaka").first()
cycle = PerformanceCycle.objects.first()

print("Seeding JLPT data for Tanaka and cycle:", cycle.name)

# Clear existing attempts and eligibility to have a consistent clean dataset
JLPTAttempt.objects.all().delete()
JLPTEligibilityRecord.objects.all().delete()

intern_data = [
    # Batch A - A1
    {
        "code": "INT-2025-001", # Alex Chen
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 7, 6), "passed": True, "score": 158, "verified": True, "notes": "Excellent score in Vocabulary and Reading."},
            {"level": "N4", "exam_date": date(2025, 12, 7), "passed": True, "score": 142, "verified": False, "notes": "Official score report submitted; awaiting seal verification."},
        ],
        "eligibility": {"required_level": "N4", "status": "PENDING_VERIFICATION", "notes": "N4 passed, verification pending"},
    },
    {
        "code": "INT-2025-004", # Ren Sato
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 12, 7), "passed": True, "score": 135, "verified": True, "notes": "Strong grammar and listening fundamentals."},
            {"level": "N4", "exam_date": date(2026, 7, 5), "passed": None, "score": None, "verified": False, "notes": "Registered for July 2026 official session."},
        ],
        "eligibility": {"required_level": "N4", "status": "IN_PROGRESS", "notes": "Targeting N4 milestone for next cycle."},
    },
    # Batch A - A2
    {
        "code": "INT-2025-002", # Maya Lin
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 7, 6), "passed": True, "score": 145, "verified": True, "notes": "Passed on first attempt."},
            {"level": "N4", "exam_date": date(2026, 7, 5), "passed": None, "score": None, "verified": False, "notes": "Registered for July 2026 N4."},
        ],
        "eligibility": {"required_level": "N5", "status": "MEETS_REQUIREMENT", "notes": "Requirement satisfied."},
    },
    {
        "code": "INT-2025-005", # Yuki Tanaka
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 12, 7), "passed": True, "score": 124, "verified": True, "notes": "Basic conversational proficiency confirmed."},
        ],
        "eligibility": {"required_level": "N5", "status": "MEETS_REQUIREMENT", "notes": "Requirement satisfied."},
    },
    # Batch B - B1
    {
        "code": "INT-2025-003", # Liam Patel
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 7, 6), "passed": True, "score": 150, "verified": True, "notes": "High score on listening comprehension."},
            {"level": "N4", "exam_date": date(2025, 12, 7), "passed": True, "score": 138, "verified": False, "notes": "Certificate submitted via portal; pending instructor check."},
            {"level": "N3", "exam_date": date(2026, 12, 6), "passed": None, "score": None, "verified": False, "notes": "Pre-registered for December 2026 N3."},
        ],
        "eligibility": {"required_level": "N4", "status": "PENDING_VERIFICATION", "notes": "Awaiting certificate review."},
    },
    {
        "code": "INT-2025-006", # Haruto Mori
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 7, 6), "passed": True, "score": 162, "verified": True, "notes": "Top tier N5 score."},
            {"level": "N4", "exam_date": date(2025, 12, 7), "passed": True, "score": 148, "verified": True, "notes": "Official certificate verified by Sensei Tanaka."},
        ],
        "eligibility": {"required_level": "N4", "status": "MEETS_REQUIREMENT", "notes": "Exceeds standard pacing requirement."},
    },
    # Batch B - B2
    {
        "code": "INT-2025-007", # Aoi Takahashi
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 12, 7), "passed": True, "score": 128, "verified": True, "notes": "Consistent effort across all sections."},
        ],
        "eligibility": {"required_level": "N5", "status": "MEETS_REQUIREMENT", "notes": "Requirement satisfied."},
    },
    {
        "code": "INT-2025-008", # Daiki Watanabe
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 12, 7), "passed": False, "score": 82, "verified": True, "notes": "Did not meet passing threshold in Listening."},
            {"level": "N5", "exam_date": date(2026, 7, 5), "passed": None, "score": None, "verified": False, "notes": "Retake scheduled for July 2026."},
        ],
        "eligibility": {"required_level": "N5", "status": "IN_PROGRESS", "notes": "Targeting re-sit in July."},
    },
    # Batch C - C1
    {
        "code": "INT-2025-009", # Sota Yamamoto
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 7, 6), "passed": True, "score": 154, "verified": True, "notes": "Passed with distinction."},
            {"level": "N4", "exam_date": date(2025, 12, 7), "passed": True, "score": 131, "verified": True, "notes": "Passed N4."},
            {"level": "N3", "exam_date": date(2026, 7, 5), "passed": None, "score": None, "verified": False, "notes": "Advanced candidate targeting N3 milestone."},
        ],
        "eligibility": {"required_level": "N3", "status": "IN_PROGRESS", "notes": "Accelerated track for engineering deployment."},
    },
    {
        "code": "INT-2025-010", # Mei Ito
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 12, 7), "passed": True, "score": 140, "verified": False, "notes": "Scanned certificate uploaded; awaiting physical card validation."},
        ],
        "eligibility": {"required_level": "N5", "status": "PENDING_VERIFICATION", "notes": "Awaiting certificate verification."},
    },
    # Batch C - C2
    {
        "code": "INT-2025-011", # Kaito Nakamura
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 12, 7), "passed": True, "score": 119, "verified": True, "notes": "Solid performance in vocabulary."},
        ],
        "eligibility": {"required_level": "N5", "status": "MEETS_REQUIREMENT", "notes": "Requirement satisfied."},
    },
    {
        "code": "INT-2025-012", # Riko Kobayashi
        "attempts": [
            {"level": "N5", "exam_date": date(2026, 7, 5), "passed": None, "score": None, "verified": False, "notes": "First official JLPT attempt upcoming in July."},
        ],
        "eligibility": {"required_level": "N5", "status": "IN_PROGRESS", "notes": "Preparation in progress."},
    },
    # Batch D - D1
    {
        "code": "INT-2025-013", # Hinata Kato
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 12, 7), "passed": True, "score": 133, "verified": True, "notes": "Good baseline language proficiency."},
        ],
        "eligibility": {"required_level": "N5", "status": "MEETS_REQUIREMENT", "notes": "Requirement satisfied."},
    },
    {
        "code": "INT-2025-014", # Sora Yoshida
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 12, 7), "passed": False, "score": 78, "verified": True, "notes": "Requires additional remedial grammar practice."},
            {"level": "N5", "exam_date": date(2026, 7, 5), "passed": None, "score": None, "verified": False, "notes": "Enrolled in intensive review cohort."},
        ],
        "eligibility": {"required_level": "N5", "status": "IN_PROGRESS", "notes": "Remedial study plan active."},
    },
    # Batch D - D2
    {
        "code": "INT-2025-015", # Yuna Yamada
        "attempts": [
            {"level": "N5", "exam_date": date(2025, 12, 7), "passed": True, "score": 146, "verified": True, "notes": "Excellent Kanji reading abilities."},
        ],
        "eligibility": {"required_level": "N5", "status": "MEETS_REQUIREMENT", "notes": "Requirement satisfied."},
    },
    {
        "code": "INT-2025-016", # Ryota Sasaki
        "attempts": [
            {"level": "N5", "exam_date": date(2026, 7, 5), "passed": None, "score": None, "verified": False, "notes": "Upcoming exam candidate."},
        ],
        "eligibility": {"required_level": "N5", "status": "NOT_STARTED", "notes": "Orientation completed; preparing for July 2026 exam."},
    },
]

for item in intern_data:
    intern = EmployeeProfile.objects.filter(employee_code=item["code"]).first()
    if not intern:
        print(f"Warning: Intern {item['code']} not found!")
        continue

    created_attempts = []
    for att in item["attempts"]:
        attempt_obj = JLPTAttempt.objects.create(
            intern=intern,
            level=att["level"],
            exam_date=att["exam_date"],
            passed=att["passed"],
            score=att["score"],
            verified=att["verified"],
            verified_by=tanaka if att["verified"] else None,
            notes=att["notes"],
        )
        created_attempts.append(attempt_obj)

    # Pick linked attempt if passed
    last_passed_attempt = next((a for a in reversed(created_attempts) if a.passed), None)
    elig = item["eligibility"]
    JLPTEligibilityRecord.objects.create(
        intern=intern,
        cycle=cycle,
        required_level=elig["required_level"],
        eligibility_status=elig["status"],
        linked_attempt=last_passed_attempt,
        notes=elig["notes"],
        updated_by=tanaka,
    )

print("Successfully seeded JLPT attempts:", JLPTAttempt.objects.count())
print("Successfully seeded JLPT eligibility records:", JLPTEligibilityRecord.objects.count())
