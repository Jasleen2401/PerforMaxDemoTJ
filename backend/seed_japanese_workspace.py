"""
Seed script for Japanese Instructor Workspace in PERFORMAX.
Populates:
- Japanese Instructor user (instructor_tanaka / TanakaPassword123!)
- Evaluation criteria for active cycle
- Learning plans, topics, materials for interns
- Practice results (reviewed, submitted, in progress)
- JLPT attempts & eligibility records (verified, pending)
- Japanese evaluations (DRAFT, SUBMITTED, RETURNED with HR reason)
"""

import os
import django
from decimal import Decimal
from datetime import date, timedelta

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

def seed_japanese_workspace():
    print("Seeding Japanese Instructor Workspace...")

    # 1. Get or create Department for Language/Training
    dept, _ = Department.objects.get_or_create(
        name="Language & Training",
        defaults={"description": "Japanese Language, Cultural & Professional Training"}
    )

    # 2. Create Japanese Instructor User
    instructor_user, created = User.objects.get_or_create(
        username="instructor_tanaka",
        defaults={
            "email": "tanaka.japanese@company.com",
            "role": UserRole.INSTRUCTOR if hasattr(UserRole, 'INSTRUCTOR') else UserRole.MANAGER,
            "is_active": True,
        }
    )
    instructor_user.set_password("TanakaPassword123!")
    if hasattr(UserRole, 'INSTRUCTOR'):
        instructor_user.role = UserRole.INSTRUCTOR
    instructor_user.save()

    instructor_profile, _ = EmployeeProfile.objects.get_or_create(
        user=instructor_user,
        defaults={
            "employee_code": "INS-JPN-001",
            "first_name": "Kenji",
            "last_name": "Tanaka",
            "designation": "Senior Japanese Language Instructor",
            "department": dept,
            "employment_status": EmploymentStatus.ACTIVE,
            "joining_date": date(2024, 1, 15),
        }
    )
    print(f"  [+] Instructor User: {instructor_user.username} (TanakaPassword123!)")

    # 3. Get Active Performance Cycle
    cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).first()
    if not cycle:
        cycle = PerformanceCycle.objects.first()
    print(f"  [+] Using Cycle: {cycle.name if cycle else 'None'}")

    # 4. Create Japanese Evaluation Criteria for cycle
    criteria_defs = [
        ("Business Japanese Communication (Keigo & Etiquette)", "Practical use of Sonkeigo, Kenjougo, and formal email etiquette.", Decimal("25.00"), 1),
        ("Technical Reading & Documentation", "Comprehending system specifications, API docs, and error logs in Japanese.", Decimal("25.00"), 2),
        ("Verbal Fluency & Daily Standup Reporting", "Speaking fluency during daily scrums, status updates, and blockers reporting.", Decimal("25.00"), 3),
        ("Listening Comprehension & Requirement Gathering", "Following sprint planning, client instructions, and technical meetings.", Decimal("25.00"), 4),
    ]

    criteria_objs = []
    if cycle:
        for name, desc, weight, order in criteria_defs:
            crit, _ = JapaneseEvalCriterion.objects.get_or_create(
                cycle=cycle,
                name=name,
                defaults={"description": desc, "weight": weight, "order": order}
            )
            criteria_objs.append(crit)
        print(f"  [+] Configured {len(criteria_objs)} Japanese Evaluation Criteria for {cycle.name}")

    # 5. Fetch Interns
    interns = list(EmployeeProfile.objects.filter(user__role=UserRole.INTERN).select_related('user'))
    if not interns:
        print("  [!] No interns found to seed Japanese plans.")
        return

    alex = next((i for i in interns if 'alex' in i.user.username.lower()), interns[0])
    maya = next((i for i in interns if 'maya' in i.user.username.lower()), (interns[1] if len(interns) > 1 else interns[0]))
    liam = next((i for i in interns if 'liam' in i.user.username.lower()), (interns[2] if len(interns) > 2 else interns[0]))

    today = date.today()

    # 6. Seed Learning Plans, Topics, and Materials
    plan_defs = [
        (alex, "Q2 Technical Japanese & JLPT N4 Mastery", JLPTLevel.N4, today + timedelta(days=35), [
            ("朝会・スクラム用語 (Daily Standup & Agile Terminology)", today + timedelta(days=7), [
                ("Agile Standup Vocabulary Sheet", "VOCABULARY", "https://example.com/vocab-standup.pdf", "Key phrases: 完了しました、進行中です、ブロッカーがあります。"),
                ("Standup Audio Simulation Practice", "LISTENING", "https://example.com/standup-audio.mp3", "Listen to a 3-minute Japanese scrum and identify blockers."),
                ("Verb Conjugation in Status Reporting", "EXERCISE", "", "Conjugate verbs into formal past and ongoing forms for standups."),
            ]),
            ("基本設計書と敬語表現 (Technical Design Reviews & Keigo)", today + timedelta(days=21), [
                ("Architecture Review Guide (JP)", "READING", "https://example.com/arch-guide-jp.pdf", "Reading comprehension on database design in Japanese."),
                ("Cross-team Discussion Simulation", "OTHER", "https://example.com/discussion-simulation", "Roleplay scenario responding to a QA defect inquiry."),
            ]),
            ("IT専門漢字マスター 150 (Software Engineering Kanji Drill)", today + timedelta(days=35), [
                ("Kanji Radicals & Compound Words Drill", "EXERCISE", "", "Drill on 漢字: 開発, 実装, 障害, 修正, 承認, 権限, 連携."),
            ]),
        ]),
        (maya, "Q1 Fundamental Japanese & Office Manners", JLPTLevel.N5, today + timedelta(days=20), [
            ("オフィスでの挨拶と自己紹介 (Office Greetings & Introductions)", today + timedelta(days=5), [
                ("Essential Office Phrases", "VOCABULARY", "https://example.com/phrases.pdf", "Greetings, asking for help, leaving early manners."),
                ("Audio Pronunciation Drill", "LISTENING", "https://example.com/pronunciation.mp3", "Polite intonation practice."),
            ]),
            ("基本文法と数字・日時の表現 (Basic Grammar & Schedule Expressions)", today + timedelta(days=15), [
                ("Scheduling & Deadlines Workbook", "EXERCISE", "", "Practice stating deadlines and sprint end dates."),
            ]),
        ]),
        (liam, "Q2 Cross-Functional Japanese & JLPT N4", JLPTLevel.N4, today + timedelta(days=40), [
            ("テスト報告とバグチケットの日本語表現 (QA Bug Reporting in Japanese)", today + timedelta(days=10), [
                ("Bug Ticket Vocabulary Reference", "VOCABULARY", "https://example.com/qa-vocab.pdf", "Reproduce (再現), Defect (不具合), Expected (期待値)."),
                ("QA Defect Report Submission Exercise", "EXERCISE", "", "Write a mock defect report in Japanese for Jira."),
            ]),
            ("チーム間コミュニケーションと確認の表現 (Cross-Team Verification)", today + timedelta(days=25), [
                ("Confirmation & Follow-up Templates", "READING", "https://example.com/confirm-templates.pdf", "Polite confirmation emails to developers."),
            ]),
        ]),
    ]

    for intern, plan_title, jlpt_target, target_date, topics_data in plan_defs:
        if not cycle:
            continue
        plan, _ = JapaneseLearningPlan.objects.get_or_create(
            intern=intern,
            cycle=cycle,
            defaults={
                "instructor": instructor_user,
                "title": plan_title,
                "description": f"Curated language curriculum targeting JLPT {jlpt_target} competencies.",
                "target_jlpt_level": jlpt_target,
                "target_date": target_date,
                "is_active": True,
            }
        )

        for t_order, (t_title, t_due, materials_data) in enumerate(topics_data, start=1):
            topic, _ = JapaneseTopic.objects.get_or_create(
                plan=plan,
                title=t_title,
                defaults={"description": f"Curriculum module {t_order}", "order": t_order, "due_date": t_due}
            )

            for m_title, m_type, m_url, m_notes in materials_data:
                mat, _ = JapaneseMaterial.objects.get_or_create(
                    topic=topic,
                    title=m_title,
                    defaults={
                        "material_type": m_type,
                        "external_url": m_url,
                        "notes": m_notes,
                    }
                )

        print(f"  [+] Created Learning Plan: '{plan.title}' for {intern.full_name}")

    # 7. Seed Practice Results (Alex Chen has reviewed and submitted results)
    alex_plan = JapaneseLearningPlan.objects.filter(intern=alex).first()
    if alex_plan and alex_plan.topics.exists():
        t1 = alex_plan.topics.first()
        m1 = t1.materials.filter(material_type="EXERCISE").first() or t1.materials.first()
        res1, _ = JapanesePracticeResult.objects.get_or_create(
            intern=alex,
            topic=t1,
            material=m1,
            defaults={
                "status": PracticeStatus.REVIEWED,
                "score": Decimal("90.00"),
                "max_score": Decimal("100.00"),
                "notes": "Completed status reporting exercise using formal te-form and desu/masu.",
                "external_url": "https://github.com/company/intern-drills/pull/12",
                "instructor_remarks": "Excellent grasp of 完了形 (completed form). Great progress on sprint terminology!",
                "reviewed_by": instructor_user,
                "reviewed_at": timezone.now() - timedelta(days=2),
                "submitted_at": timezone.now() - timedelta(days=4),
            }
        )

        t2 = alex_plan.topics.all()[1] if alex_plan.topics.count() > 1 else t1
        m2 = t2.materials.first()
        res2, _ = JapanesePracticeResult.objects.get_or_create(
            intern=alex,
            topic=t2,
            material=m2,
            defaults={
                "status": PracticeStatus.SUBMITTED,
                "score": None,
                "max_score": Decimal("100.00"),
                "notes": "Submitted architecture discussion roleplay script. Ready for review.",
                "external_url": "https://docs.google.com/document/d/example-script-1",
                "submitted_at": timezone.now() - timedelta(hours=18),
            }
        )
        print("  [+] Seeded Practice Results for Alex Chen (1 Reviewed, 1 Submitted pending review)")

    # 8. Seed JLPT Attempts & Eligibility Records
    # Alex: Passed N5 (Verified), Attempted N4 (Pending Verification)
    jlpt_n5, _ = JLPTAttempt.objects.get_or_create(
        intern=alex,
        level=JLPTLevel.N5,
        exam_date=date(2025, 7, 6),
        defaults={
            "passed": True,
            "score": 158,
            "verified": True,
            "verified_by": instructor_user,
            "verified_at": timezone.now() - timedelta(days=90),
            "notes": "Official certificate presented and verified.",
        }
    )
    jlpt_n4_pending, _ = JLPTAttempt.objects.get_or_create(
        intern=alex,
        level=JLPTLevel.N4,
        exam_date=date(2026, 12, 6),
        defaults={
            "passed": None,
            "score": None,
            "verified": False,
            "notes": "Registered for official JLPT N4 exam. Verification pending score release.",
        }
    )

    # Maya: Passed N5
    JLPTAttempt.objects.get_or_create(
        intern=maya,
        level=JLPTLevel.N5,
        exam_date=date(2025, 12, 7),
        defaults={
            "passed": True,
            "score": 145,
            "verified": True,
            "verified_by": instructor_user,
            "verified_at": timezone.now() - timedelta(days=45),
            "notes": "Score sheet verified.",
        }
    )

    # Liam: Attempted N4, certificate submitted pending review
    JLPTAttempt.objects.get_or_create(
        intern=liam,
        level=JLPTLevel.N4,
        exam_date=date(2026, 7, 5),
        defaults={
            "passed": True,
            "score": 138,
            "verified": False,
            "notes": "Scanned certificate uploaded by intern. Requires instructor verification.",
        }
    )

    # JLPT Eligibility Records per cycle
    if cycle:
        JLPTEligibilityRecord.objects.update_or_create(
            intern=alex,
            cycle=cycle,
            defaults={
                "required_level": JLPTLevel.N4,
                "eligibility_status": JLPTEligibility.PENDING_VERIFICATION,
                "linked_attempt": jlpt_n4_pending,
                "notes": "N4 exam attempt logged. Awaiting verified score release for Q2 gate.",
                "updated_by": instructor_user,
            }
        )
        JLPTEligibilityRecord.objects.update_or_create(
            intern=maya,
            cycle=cycle,
            defaults={
                "required_level": JLPTLevel.N5,
                "eligibility_status": JLPTEligibility.MEETS_REQUIREMENT,
                "notes": "Verified N5 certification on file.",
                "updated_by": instructor_user,
            }
        )
        JLPTEligibilityRecord.objects.update_or_create(
            intern=liam,
            cycle=cycle,
            defaults={
                "required_level": JLPTLevel.N4,
                "eligibility_status": JLPTEligibility.PENDING_VERIFICATION,
                "notes": "N4 attempt uploaded, verification pending.",
                "updated_by": instructor_user,
            }
        )
        print("  [+] Seeded JLPT Attempts & Eligibility Records")

    # 9. Seed Japanese Evaluations in 3 realistic states:
    # Alex: DRAFT (Instructor is currently evaluating)
    # Maya: SUBMITTED (Submitted to HR)
    # Liam: RETURNED (Returned by HR with a reason, testing the return/resubmit workflow!)
    if cycle and criteria_objs:
        # Alex -> DRAFT
        ev_alex, _ = JapaneseEvaluation.objects.update_or_create(
            intern=alex,
            cycle=cycle,
            defaults={
                "evaluator": instructor_user,
                "status": EvaluationStatus.DRAFT,
                "overall_language_score": Decimal("8.50"),
                "strengths": "Quick to adopt scrum terminology and participates actively in morning standups in Japanese. High dedication to kanji practice.",
                "areas_for_improvement": "Needs more practice with Sonkeigo (honorific speech) when communicating with external Japanese client stakeholders.",
                "instructor_remarks": "Confidential evaluator note: Alex is performing at upper-N4 level in speaking, though written email syntax needs minor polish.",
                "developmental_feedback": "Focus on email opening and closing salutations (お世話になっております / よろしくお願いいたします).",
                "is_developmental_feedback_visible": True,
                "jlpt_status_summary": JLPTEligibility.PENDING_VERIFICATION,
            }
        )
        for crit, score in zip(criteria_objs, [Decimal("8.50"), Decimal("8.00"), Decimal("9.00"), Decimal("8.50")]):
            JapaneseEvalRating.objects.update_or_create(
                evaluation=ev_alex,
                criterion=crit,
                defaults={"score": score, "comments": f"Demonstrates solid proficiency in {crit.name}."}
            )

        # Maya -> SUBMITTED
        ev_maya, _ = JapaneseEvaluation.objects.update_or_create(
            intern=maya,
            cycle=cycle,
            defaults={
                "evaluator": instructor_user,
                "status": EvaluationStatus.SUBMITTED,
                "overall_language_score": Decimal("7.80"),
                "strengths": "Clear pronunciation and polite demeanor during all Japanese office interactions.",
                "areas_for_improvement": "Technical documentation comprehension speed.",
                "instructor_remarks": "Submitted to HR for review. Overall solid baseline N5 competence.",
                "developmental_feedback": "Review technical vocabulary flashcards daily for 15 minutes.",
                "is_developmental_feedback_visible": True,
                "jlpt_status_summary": JLPTEligibility.MEETS_REQUIREMENT,
                "submitted_at": timezone.now() - timedelta(days=1),
            }
        )
        for crit, score in zip(criteria_objs, [Decimal("8.00"), Decimal("7.20"), Decimal("8.00"), Decimal("8.00")]):
            JapaneseEvalRating.objects.update_or_create(
                evaluation=ev_maya,
                criterion=crit,
                defaults={"score": score, "comments": "Good baseline competency."}
            )

        # Liam -> RETURNED (Demonstrating HR Return Reason!)
        hr_user = User.objects.filter(role=UserRole.HR).first() or instructor_user
        ev_liam, _ = JapaneseEvaluation.objects.update_or_create(
            intern=liam,
            cycle=cycle,
            defaults={
                "evaluator": instructor_user,
                "status": EvaluationStatus.RETURNED,
                "overall_language_score": Decimal("7.50"),
                "strengths": "Strong motivation in learning QA terminology.",
                "areas_for_improvement": "Listening comprehension during rapid speech.",
                "instructor_remarks": "Initial draft submitted.",
                "developmental_feedback": "Practice listening with Japanese audio simulations.",
                "is_developmental_feedback_visible": False,
                "jlpt_status_summary": JLPTEligibility.PENDING_VERIFICATION,
                "return_reason": "Please add specific comments regarding technical vocabulary acquisition for QA before resubmitting.",
                "returned_at": timezone.now() - timedelta(hours=6),
                "returned_by": hr_user,
            }
        )
        for crit, score in zip(criteria_objs, [Decimal("7.50"), Decimal("7.50"), Decimal("7.50"), Decimal("7.50")]):
            JapaneseEvalRating.objects.update_or_create(
                evaluation=ev_liam,
                criterion=crit,
                defaults={"score": score, "comments": "Pending revision based on HR feedback."}
            )

        print("  [+] Seeded Japanese Evaluations (Alex: DRAFT, Maya: SUBMITTED, Liam: RETURNED)")

    # 10. Seed Japanese Batches (Created by HR & Super Admin, assigned to Tanaka)
    hr_user = User.objects.filter(role=UserRole.HR).first()
    admin_user = User.objects.filter(role=UserRole.SUPER_ADMIN).first() or User.objects.filter(is_superuser=True).first()

    # Batch 1: Created by HR, Assigned to Tanaka, Interns: Alex & Maya
    batch_1, b1_created = JapaneseBatch.objects.update_or_create(
        name="Batch 2026-A (Tokyo Software Track)",
        defaults={
            "cohort": "MIRAI Cohort 2026",
            "description": "Accelerated software engineering & cloud platform intern cohort with business Japanese immersion.",
            "created_by": hr_user,
        }
    )
    batch_1.instructors.set([instructor_user])
    batch_1.interns.set([alex, maya])

    # Batch 2: Created by Super Admin, Assigned to Tanaka, Interns: Liam
    batch_2, b2_created = JapaneseBatch.objects.update_or_create(
        name="Batch 2026-B (Kyoto AI & QA Track)",
        defaults={
            "cohort": "MIRAI Cohort 2026",
            "description": "AI systems and test automation intern cohort focusing on technical documentation and QA Japanese.",
            "created_by": admin_user,
        }
    )
    batch_2.instructors.set([instructor_user])
    batch_2.interns.set([liam])

    # Batch 3: Created by Super Admin, NOT assigned to Tanaka (for strict RBAC boundary testing)
    batch_3, b3_created = JapaneseBatch.objects.update_or_create(
        name="Batch 2026-C (Osaka Systems Track)",
        defaults={
            "cohort": "MIRAI Cohort 2026",
            "description": "Embedded hardware & systems track (restricted batch, unauthorized for Tanaka).",
            "created_by": admin_user,
        }
    )
    batch_3.instructors.clear()
    batch_3.interns.clear()

    print("  [+] Seeded Japanese Batches:")
    print("      - Batch 2026-A (Creator: HR Partner Sarah Jenkins, Interns: Alex, Maya)")
    print("      - Batch 2026-B (Creator: Super Admin, Intern: Liam)")
    print("      - Batch 2026-C (Creator: Super Admin, Unassigned to Tanaka - RBAC test)")

    print("\n✅ Successfully seeded Japanese Instructor Workspace!")

if __name__ == '__main__':
    seed_japanese_workspace()
