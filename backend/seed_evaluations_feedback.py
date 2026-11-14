import os
import sys
from pathlib import Path
from decimal import Decimal
from datetime import datetime, timedelta

backend_dir = Path(r"c:\Users\jasle\Downloads\FinalMVP\destination_performax\backend")
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir / "apps"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

import django
django.setup()

from django.contrib.auth import get_user_model
from apps.employees.models import EmployeeProfile
from apps.japanese.models import (
    JapaneseEvaluation, JapaneseEvalCriterion, JapaneseEvalRating,
    JapaneseLearningPlan, JapanesePracticeResult, JapaneseTopic,
    JapaneseBatch, EvaluationStatus
)
from apps.feedback.models import Feedback, FeedbackType, FeedbackVisibility, FeedbackStatus, FeedbackComment
from apps.performance.models import PerformanceCycle, CycleStatus

User = get_user_model()
tanaka = User.objects.filter(username="instructor_tanaka").first()
cycle = PerformanceCycle.objects.filter(status=CycleStatus.ACTIVE).first() or PerformanceCycle.objects.first()

print(f"Seeding evaluations & feedback for Tanaka ({tanaka}) and cycle ({cycle.name})...")

criteria = list(JapaneseEvalCriterion.objects.filter(cycle=cycle).order_by('order'))
if not criteria:
    criteria = list(JapaneseEvalCriterion.objects.all().order_by('order'))

print(f"Found {len(criteria)} evaluation criteria.")

# 1. Ensure all 16 interns have evaluation records with ratings
interns = EmployeeProfile.objects.filter(user__role='INTERN').order_by('employee_code')

eval_scores_data = {
    # Batch A
    "INT-2025-001": {"status": "DRAFT", "scores": [8.5, 8.0, 9.0, 8.5], "strengths": "Strong grasping of technical Kanji and Jira ticket terminology.", "areas": "Needs practice with sonkeigo honorifics during sprint reviews.", "notes": "Draft in progress, on track for N4."},
    "INT-2025-002": {"status": "SUBMITTED", "scores": [8.0, 7.5, 8.0, 7.5], "strengths": "Consistent daily standup reporting in polite Japanese.", "areas": "Listening speed when requirements are presented rapidly.", "notes": "Submitted to HR for review."},
    "INT-2025-003": {"status": "RETURNED", "scores": [7.5, 7.0, 7.5, 8.0], "strengths": "Great enthusiasm and clear pronunciation.", "areas": "Technical vocabulary acquisition for QA bug reporting needs more depth.", "return_reason": "Please add specific comments regarding technical vocabulary acquisition for QA before resubmitting.", "notes": "Requires revisions per HR remarks."},
    "INT-2025-004": {"status": "SUBMITTED", "scores": [8.5, 8.5, 8.0, 8.5], "strengths": "Accurate sentence particles and clear email writing.", "areas": "Spontaneous conversational fluency during ad-hoc meetings.", "notes": "Submitted on schedule."},
    "INT-2025-005": {"status": "SUBMITTED", "scores": [8.0, 8.5, 8.0, 8.0], "strengths": "Diligent homework submission and vocabulary retention.", "areas": "Speed of reading kanji without furigana.", "notes": "Submitted on schedule."},
    # Batch B
    "INT-2025-006": {"status": "DRAFT", "scores": [9.0, 8.5, 9.0, 8.5], "strengths": "Advanced grammar usage and confidence in speaking.", "areas": "Nuances in kenjougo humble language.", "notes": "Draft evaluation saved."},
    "INT-2025-007": {"status": "SUBMITTED", "scores": [8.0, 8.0, 8.5, 8.5], "strengths": "Active participation in listening drills.", "areas": "Pitch accent on common software engineering terms.", "notes": "Submitted to HR."},
    "INT-2025-008": {"status": "SUBMITTED", "scores": [7.5, 7.5, 7.0, 7.5], "strengths": "Hardworking and receptive to correction.", "areas": "Aural comprehension of complex conditionals.", "notes": "Submitted with remedial listening plan."},
    # Batch C
    "INT-2025-009": {"status": "SUBMITTED", "scores": [9.0, 9.0, 8.5, 8.5], "strengths": "Exceptional technical reading capability and documentation speed.", "areas": "Informal peer communication versus formal client communication.", "notes": "Candidate for accelerated N3 track."},
    "INT-2025-010": {"status": "SUBMITTED", "scores": [8.5, 8.0, 8.5, 8.5], "strengths": "Very polite demeanor and accurate business phone etiquette.", "areas": "Technical bug reporting phrasing.", "notes": "Submitted on schedule."},
    "INT-2025-011": {"status": "SUBMITTED", "scores": [8.0, 8.5, 8.0, 8.5], "strengths": "Clear written documentation in Confluence.", "areas": "Confidence in verbal technical presentations.", "notes": "Submitted on schedule."},
    "INT-2025-012": {"status": "SUBMITTED", "scores": [8.5, 8.0, 8.5, 8.5], "strengths": "Excellent listening and meeting minutes note-taking.", "areas": "Expanding active engineering vocabulary.", "notes": "Submitted on schedule."},
    # Batch D
    "INT-2025-013": {"status": "ACCEPTED", "scores": [9.0, 9.0, 9.5, 9.0], "strengths": "Outstanding standup delivery and client interaction skills.", "areas": "Specialized legal and architectural Japanese terminology.", "notes": "Accepted and published by HR."},
    "INT-2025-014": {"status": "ACCEPTED", "scores": [8.5, 9.0, 9.0, 9.0], "strengths": "Steady progress and excellent kanji reading.", "areas": "Speaking pace during high-pressure demos.", "notes": "Accepted and published by HR."},
    "INT-2025-015": {"status": "ACCEPTED", "scores": [9.0, 9.5, 9.0, 9.0], "strengths": "Top-tier written communication and code comments in Japanese.", "areas": "Negotiation language nuances.", "notes": "Accepted and published by HR."},
    "INT-2025-016": {"status": "ACCEPTED", "scores": [9.0, 9.0, 9.0, 9.5], "strengths": "Superb listening comprehension and accurate interpretation.", "areas": "Refining written architectural design documents.", "notes": "Accepted and published by HR."},
}

for intern in interns:
    data = eval_scores_data.get(intern.employee_code, {
        "status": "SUBMITTED",
        "scores": [8.0, 8.0, 8.0, 8.0],
        "strengths": "Consistent daily engagement with curriculum.",
        "areas": "Continue expanding technical terminology.",
        "notes": "Standard cohort performance.",
    })

    eval_obj, created = JapaneseEvaluation.objects.get_or_create(
        intern=intern,
        cycle=cycle,
        defaults={
            "evaluator": tanaka,
            "status": data["status"],
            "strengths": data["strengths"],
            "areas_for_improvement": data["areas"],
            "instructor_remarks": data["notes"],
            "developmental_feedback": f"Focus on {data['areas']} during next week's practical drills.",
            "is_developmental_feedback_visible": True,
            "return_reason": data.get("return_reason", ""),
        }
    )

    if not created:
        eval_obj.evaluator = tanaka
        eval_obj.status = data["status"]
        eval_obj.strengths = data["strengths"]
        eval_obj.areas_for_improvement = data["areas"]
        eval_obj.instructor_remarks = data["notes"]
        eval_obj.developmental_feedback = f"Focus on {data['areas']} during next week's practical drills."
        eval_obj.is_developmental_feedback_visible = True
        eval_obj.return_reason = data.get("return_reason", "")
        eval_obj.save()

    # Create ratings
    total_score = Decimal("0.00")
    total_weight = Decimal("0.00")
    for idx, crit in enumerate(criteria):
        score_val = Decimal(str(data["scores"][idx] if idx < len(data["scores"]) else 8.0))
        JapaneseEvalRating.objects.update_or_create(
            evaluation=eval_obj,
            criterion=crit,
            defaults={
                "score": score_val,
                "comments": f"Demonstrates solid capability in {crit.name}. Score: {score_val}/10.0.",
            }
        )
        weight = crit.weight if crit.weight else Decimal("25.00")
        total_score += score_val * (weight / Decimal("100.00"))
        total_weight += weight

    if total_weight > 0:
        eval_obj.overall_language_score = round(total_score, 2)
        eval_obj.save(update_fields=["overall_language_score"])

print("Successfully updated JapaneseEvaluations and ratings.")

# 2. Seed Developmental Feedbacks in apps.feedback.models.Feedback
Feedback.objects.filter(sender=tanaka).delete()

feedback_seed_data = [
    {
        "intern_code": "INT-2025-001", # Alex Chen
        "type": FeedbackType.COACHING,
        "visibility": FeedbackVisibility.PUBLIC,
        "status": FeedbackStatus.PUBLISHED,
        "days_ago": 2,
        "message": "Excellent improvement in daily standup reporting! Next milestone: focus on using polite humble phrasing (kenjougo) when referring to our internal team's work during client interactions.",
        "reply": "Thank you Sensei Tanaka! I am practicing the kenjougo verbs table and will try using them in tomorrow's standup.",
    },
    {
        "intern_code": "INT-2025-002", # Maya Lin
        "type": FeedbackType.PRAISE,
        "visibility": FeedbackVisibility.PUBLIC,
        "status": FeedbackStatus.PUBLISHED,
        "days_ago": 4,
        "message": "Outstanding score on the N5 Kanji assessment! Your attention to stroke order and radical components is paying off significantly.",
        "reply": "Arigatou gozaimasu Sensei! The flashcard review schedule you recommended helped a lot.",
    },
    {
        "intern_code": "INT-2025-003", # Liam Patel
        "type": FeedbackType.CONSTRUCTIVE,
        "visibility": FeedbackVisibility.PUBLIC,
        "status": FeedbackStatus.PUBLISHED,
        "days_ago": 1,
        "message": "Regarding your QA bug tickets in Japanese: please make sure to clearly distinguish between 'saigen-tejun' (reproduction steps) and 'kitai-kekka' (expected result). Let's review standard Jira ticket templates during Thursday's clinic.",
        "reply": "Understood Sensei. I will bring two sample bug reports to Thursday's session for your review.",
    },
    {
        "intern_code": "INT-2025-004", # Ren Sato
        "type": FeedbackType.TRAINING,
        "visibility": FeedbackVisibility.PUBLIC,
        "status": FeedbackStatus.PUBLISHED,
        "days_ago": 5,
        "message": "Good grasping of conditional structures (-tara vs -nara). Remember that -tara is preferred for sequential actions in procedural test plans.",
        "reply": None,
    },
    {
        "intern_code": "INT-2025-005", # Yuki Tanaka
        "type": FeedbackType.SUGGESTION,
        "visibility": FeedbackVisibility.PUBLIC,
        "status": FeedbackStatus.PUBLISHED,
        "days_ago": 6,
        "message": "Consider dedicating 15 minutes each morning to listening to technical podcasts like 'Rebuild.fm' to get accustomed to natural conversational cadence.",
        "reply": "Started listening this week! The pacing is fast but very helpful for ear training.",
    },
    {
        "intern_code": "INT-2025-006", # Haruto Mori
        "type": FeedbackType.PRAISE,
        "visibility": FeedbackVisibility.PUBLIC,
        "status": FeedbackStatus.PUBLISHED,
        "days_ago": 7,
        "message": "Exceptional presentation during the mid-cycle language showcase. Your slides and spoken Japanese were clear and well-structured.",
        "reply": "Thank you for the coaching and mock presentation sessions, Sensei!",
    },
    {
        "intern_code": "INT-2025-008", # Daiki Watanabe
        "type": FeedbackType.CONSTRUCTIVE,
        "visibility": FeedbackVisibility.PUBLIC,
        "status": FeedbackStatus.PUBLISHED,
        "days_ago": 3,
        "message": "Remedial listening plan is underway. Don't worry about past exam results—focus on the shadowing exercises in Module 3. Consistency will lead to mastery.",
        "reply": "Thank you for the encouragement. I am completing 20 minutes of shadowing daily.",
    },
    {
        "intern_code": "INT-2025-009", # Sota Yamamoto
        "type": FeedbackType.COACHING,
        "visibility": FeedbackVisibility.PUBLIC,
        "status": FeedbackStatus.PUBLISHED,
        "days_ago": 8,
        "message": "Preparing for N3: we will begin incorporating architectural design documentation in Japanese starting next sprint.",
        "reply": None,
    },
    {
        "intern_code": "INT-2025-010", # Mei Ito
        "type": FeedbackType.POSITIVE,
        "visibility": FeedbackVisibility.PUBLIC,
        "status": FeedbackStatus.PUBLISHED,
        "days_ago": 9,
        "message": "Great confidence when greeting visiting delegates from Tokyo office. Your aizuchi (active listening cues) made a strong impression.",
        "reply": None,
    },
    {
        "intern_code": "INT-2025-013", # Hinata Kato
        "type": FeedbackType.OBSERVATION,
        "visibility": FeedbackVisibility.PUBLIC,
        "status": FeedbackStatus.PUBLISHED,
        "days_ago": 10,
        "message": "Noticeable acceleration in reading speed. You completed the technical specification comprehension drill 5 minutes faster than cohort average.",
        "reply": "I've been reading Japanese API documentation directly, which has really sped up my comprehension!",
    },
    {
        "intern_code": "INT-2025-001", # Alex Chen - Confidential Draft
        "type": FeedbackType.TRAINING,
        "visibility": FeedbackVisibility.PRIVATE,
        "status": FeedbackStatus.DRAFT,
        "days_ago": 1,
        "message": "[Draft Guidance] Focus on sprint retro participation. Candidate understands questions well but hesitates to volunteer suggestions. Provide scaffolded speaking prompts.",
        "reply": None,
    },
    {
        "intern_code": "INT-2025-003", # Liam Patel - Confidential Note
        "type": FeedbackType.COACHING,
        "visibility": FeedbackVisibility.PRIVATE,
        "status": FeedbackStatus.PUBLISHED,
        "days_ago": 2,
        "message": "[Confidential Note for HR Calibration] Liam has shown significant effort in QA vocabulary after the evaluation was returned. Re-evaluating next Monday.",
        "reply": None,
    },
]

for fb in feedback_seed_data:
    intern = EmployeeProfile.objects.filter(employee_code=fb["intern_code"]).first()
    if not intern:
        continue

    created_time = datetime.now() - timedelta(days=fb["days_ago"])
    feedback_obj = Feedback.objects.create(
        sender=tanaka,
        recipient=intern.user,
        feedback_type=fb["type"],
        message=fb["message"],
        visibility=fb["visibility"],
        status=fb["status"],
    )
    # Set backdated timestamp
    Feedback.objects.filter(id=feedback_obj.id).update(created_at=created_time, updated_at=created_time)

    if fb.get("reply"):
        FeedbackComment.objects.create(
            feedback=feedback_obj,
            author=intern.user,
            comment=fb["reply"],
        )

print(f"Successfully seeded {Feedback.objects.filter(sender=tanaka).count()} feedback entries from Tanaka.")
print(f"Total FeedbackComments: {FeedbackComment.objects.count()}.")
