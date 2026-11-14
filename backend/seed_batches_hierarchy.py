import os
import django
from decimal import Decimal
from datetime import date, timedelta
from pathlib import Path
import sys

base_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(base_dir))
sys.path.insert(0, str(base_dir / 'apps'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.utils import timezone
from apps.accounts.models import User, UserRole
from apps.organization.models import Department
from apps.employees.models import EmployeeProfile, EmploymentStatus
from apps.performance.models import PerformanceCycle, CycleStatus
from apps.japanese.models import (
    JLPTLevel, JLPTEligibility, PracticeStatus, EvaluationStatus,
    JapaneseLearningPlan, JapaneseTopic, JapaneseMaterial,
    JapanesePracticeResult, JLPTAttempt, JLPTEligibilityRecord,
    JapaneseEvaluation, JapaneseEvalCriterion, JapaneseEvalRating,
    JapaneseBatch,
)

def seed_batches_hierarchy():
    print("Seeding Batches & Sub-Batches Hierarchy...")

    dept, _ = Department.objects.get_or_create(
        name="Language & Training",
        defaults={"description": "Japanese Language, Cultural & Professional Training"}
    )
    cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).first() or PerformanceCycle.objects.first()

    instructor_user = User.objects.filter(username="instructor_tanaka").first()
    hr_user = User.objects.filter(role=UserRole.HR).first()
    admin_user = User.objects.filter(role=UserRole.SUPER_ADMIN).first() or User.objects.filter(is_superuser=True).first()

    # List of interns to ensure for each sub-batch
    intern_roster_spec = [
        # (username, email, code, first_name, last_name, sub_batch_code)
        ("intern_alex", "alex.chen@company.com", "INT-2025-001", "Alex", "Chen", "A1"),
        ("intern_ren", "ren.sato@company.com", "INT-2025-004", "Ren", "Sato", "A1"),
        ("intern_maya", "maya.lin@company.com", "INT-2025-002", "Maya", "Lin", "A2"),
        ("intern_yuki", "yuki.tanaka@company.com", "INT-2025-005", "Yuki", "Tanaka", "A2"),

        ("intern_liam", "liam.patel@company.com", "INT-2025-003", "Liam", "Patel", "B1"),
        ("intern_haruto", "haruto.mori@company.com", "INT-2025-006", "Haruto", "Mori", "B1"),
        ("intern_aoi", "aoi.takahashi@company.com", "INT-2025-007", "Aoi", "Takahashi", "B2"),
        ("intern_daiki", "daiki.watanabe@company.com", "INT-2025-008", "Daiki", "Watanabe", "B2"),

        ("intern_sota", "sota.yamamoto@company.com", "INT-2025-009", "Sota", "Yamamoto", "C1"),
        ("intern_mei", "mei.ito@company.com", "INT-2025-010", "Mei", "Ito", "C1"),
        ("intern_kaito", "kaito.nakamura@company.com", "INT-2025-011", "Kaito", "Nakamura", "C2"),
        ("intern_riko", "riko.kobayashi@company.com", "INT-2025-012", "Riko", "Kobayashi", "C2"),

        ("intern_hinata", "hinata.kato@company.com", "INT-2025-013", "Hinata", "Kato", "D1"),
        ("intern_sora", "sora.yoshida@company.com", "INT-2025-014", "Sora", "Yoshida", "D1"),
        ("intern_yuna", "yuna.yamada@company.com", "INT-2025-015", "Yuna", "Yamada", "D2"),
        ("intern_ryota", "ryota.sasaki@company.com", "INT-2025-016", "Ryota", "Sasaki", "D2"),
    ]

    created_profiles = {}
    today = date.today()

    for uname, email, code, fn, ln, sbatch in intern_roster_spec:
        user, ucreated = User.objects.get_or_create(
            username=uname,
            defaults={"email": email, "role": UserRole.INTERN, "is_active": True}
        )
        if ucreated or not user.check_password("InternPassword123!"):
            user.set_password("InternPassword123!")
            user.role = UserRole.INTERN
            user.save()

        profile, pcreated = EmployeeProfile.objects.get_or_create(
            user=user,
            defaults={
                "employee_code": code,
                "first_name": fn,
                "last_name": ln,
                "designation": "Software Engineering Intern",
                "department": dept,
                "employment_status": EmploymentStatus.ACTIVE,
                "joining_date": date(2025, 1, 10),
            }
        )
        # Ensure full_name is set
        if not profile.full_name:
            profile.full_name = f"{fn} {ln}"
            profile.save()

        created_profiles[code] = profile

        # Ensure learning plan
        plan, pl_created = JapaneseLearningPlan.objects.get_or_create(
            intern=profile,
            cycle=cycle,
            defaults={
                "instructor": instructor_user,
                "title": f"Business Japanese & JLPT Training ({code})",
                "target_jlpt_level": JLPTLevel.N4 if code in ("INT-2025-001", "INT-2025-003", "INT-2025-006", "INT-2025-009") else JLPTLevel.N5,
                "target_date": today + timedelta(days=45),
                "is_active": True,
            }
        )

        # Ensure topics & practice
        topic, _ = JapaneseTopic.objects.get_or_create(
            plan=plan,
            title="Business Etiquette & Daily Standups",
            defaults={"order": 1}
        )
        topic2, _ = JapaneseTopic.objects.get_or_create(
            plan=plan,
            title="Technical Documentation Reading",
            defaults={"order": 2}
        )

        # Seed 2 practice results
        p1, _ = JapanesePracticeResult.objects.get_or_create(
            intern=profile,
            topic=topic,
            defaults={
                "status": PracticeStatus.REVIEWED,
                "score": Decimal("88.00"),
                "max_score": Decimal("100.00"),
                "instructor_remarks": "Solid comprehension of workplace greetings.",
                "reviewed_by": instructor_user,
                "reviewed_at": timezone.now(),
            }
        )
        p2, _ = JapanesePracticeResult.objects.get_or_create(
            intern=profile,
            topic=topic2,
            defaults={
                "status": PracticeStatus.REVIEWED if code in ("INT-2025-001", "INT-2025-005", "INT-2025-007", "INT-2025-013") else PracticeStatus.SUBMITTED,
                "score": Decimal("82.00") if code in ("INT-2025-001", "INT-2025-005", "INT-2025-007", "INT-2025-013") else None,
                "max_score": Decimal("100.00"),
            }
        )

        # Ensure evaluation
        ev_status = EvaluationStatus.SUBMITTED
        return_msg = ""
        score_val = Decimal("84.50")
        if code == "INT-2025-003":  # Liam
            ev_status = EvaluationStatus.RETURNED
            return_msg = "Please add specific comments regarding technical vocabulary acquisition for QA before resubmitting."
            score_val = Decimal("72.00")
        elif code in ("INT-2025-001", "INT-2025-006"):
            ev_status = EvaluationStatus.DRAFT
            score_val = Decimal("88.00")
        elif code in ("INT-2025-013", "INT-2025-014", "INT-2025-015", "INT-2025-016"):
            ev_status = EvaluationStatus.ACCEPTED
            score_val = Decimal("91.00")

        ev, _ = JapaneseEvaluation.objects.get_or_create(
            intern=profile,
            cycle=cycle,
            defaults={
                "evaluator": instructor_user,
                "status": ev_status,
                "overall_language_score": score_val,
                "strengths": "Demonstrates excellent grammar retention and active listening in meetings.",
                "areas_for_improvement": "Continue practicing technical documentation kanji speed.",
                "instructor_remarks": "Consistent engagement in daily Japanese scrums.",
                "return_reason": return_msg,
            }
        )

    # -----------------------------------------------------------------------
    # Seed 4 Main Batches and 8 Sub-Batches
    # -----------------------------------------------------------------------
    batches_spec = [
        # (main_name, main_code, cohort, status, desc, [ (sub_name, sub_code, [intern_codes]) ])
        ("Batch A", "BATCH-A", "MIRAI Cohort 2026", "Active", "Accelerated Software Engineering & Cloud Systems intern track with business Japanese immersion.", [
            ("Sub-Batch A1", "A1", ["INT-2025-001", "INT-2025-004"]),
            ("Sub-Batch A2", "A2", ["INT-2025-002", "INT-2025-005"]),
        ]),
        ("Batch B", "BATCH-B", "MIRAI Cohort 2026", "Active", "AI Systems, Data Engineering, and QA Test Automation intern track.", [
            ("Sub-Batch B1", "B1", ["INT-2025-003", "INT-2025-006"]),
            ("Sub-Batch B2", "B2", ["INT-2025-007", "INT-2025-008"]),
        ]),
        ("Batch C", "BATCH-C", "MIRAI Cohort 2026", "Active", "Cybersecurity, Infrastructure, and DevOps intern cohort.", [
            ("Sub-Batch C1", "C1", ["INT-2025-009", "INT-2025-010"]),
            ("Sub-Batch C2", "C2", ["INT-2025-011", "INT-2025-012"]),
        ]),
        ("Batch D", "BATCH-D", "MIRAI Cohort 2025", "Completed", "Embedded Hardware, Robotics, and Business Analytics track (Completed).", [
            ("Sub-Batch D1", "D1", ["INT-2025-013", "INT-2025-014"]),
            ("Sub-Batch D2", "D2", ["INT-2025-015", "INT-2025-016"]),
        ]),
    ]

    for m_name, m_code, cohort, status, desc, sub_specs in batches_spec:
        main_batch, _ = JapaneseBatch.objects.update_or_create(
            code=m_code,
            defaults={
                "name": m_name,
                "cohort": cohort,
                "status": status,
                "description": desc,
                "created_by": hr_user if m_code in ("BATCH-A", "BATCH-C") else admin_user,
                "parent_batch": None,
            }
        )
        main_batch.instructors.set([instructor_user])

        all_main_interns = []

        for s_name, s_code, intern_codes in sub_specs:
            sub_batch, _ = JapaneseBatch.objects.update_or_create(
                code=s_code,
                defaults={
                    "name": s_name,
                    "cohort": cohort,
                    "status": status,
                    "description": f"{m_name} - {s_name}",
                    "created_by": main_batch.created_by,
                    "parent_batch": main_batch,
                }
            )
            sub_batch.instructors.set([instructor_user])

            assigned_intern_objs = [created_profiles[c] for c in intern_codes if c in created_profiles]
            sub_batch.interns.set(assigned_intern_objs)
            all_main_interns.extend(assigned_intern_objs)

        # Set union on main batch
        main_batch.interns.set(all_main_interns)
        print(f"  [+] Configured {m_name} ({m_code}): {len(all_main_interns)} interns across {len(sub_specs)} sub-batches")

    # Clean up any old test batches if they exist
    old_batches = JapaneseBatch.objects.filter(code__in=["", None]).exclude(name__in=["Batch A", "Batch B", "Batch C", "Batch D"])
    if old_batches.exists():
        old_count = old_batches.count()
        old_batches.delete()
        print(f"  [-] Removed {old_count} legacy batches without code.")

    print("\n✅ Successfully seeded Japanese Batches & Sub-Batches Hierarchy!")

if __name__ == '__main__':
    seed_batches_hierarchy()
