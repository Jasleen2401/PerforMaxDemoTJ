import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.employees.models import EmployeeProfile
from apps.performance.models import (
    PerformanceCycle,
    TechnicalCapabilityParameter,
    TechnicalCapabilityReview,
)
from apps.training.models import TrainingCourse, EmployeeTraining, TrainingStatus
from apps.feedback.models import Feedback, FeedbackType, FeedbackVisibility, FeedbackStatus
from apps.intern.models import (
    InternTask,
    TaskStatus,
    TaskPriority,
    QuarterCode,
    QuarterStatus,
    CertificationStatus,
    VerificationStatus,
    MiraiQuarterProgress,
    MiraiCertification,
    MiraiTimelineEvent,
    TimelineEventType,
)
from apps.intern.services import MiraiJourneyService

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds realistic 4-quarter MIRAI journey progress, certifications, courses, and technical evaluations.'

    def handle(self, *args, **options):
        self.stdout.write("Seeding MIRAI 4-Quarter Journey data...")

        # Find or create users
        marcus = User.objects.filter(username='manager_marcus').first()
        sarah = User.objects.filter(username='hr_sarah').first() or marcus
        alex_user = User.objects.filter(username='intern_alex').first()

        if not alex_user:
            self.stdout.write(self.style.WARNING("intern_alex not found. Skipping intern_alex seeding."))
            return

        alex_profile = EmployeeProfile.objects.filter(user=alex_user).first()
        if not alex_profile:
            self.stdout.write(self.style.WARNING("alex_profile not found."))
            return

        # 1. Ensure Training Courses Exist
        agentic_course, _ = TrainingCourse.objects.get_or_create(
            title="FD Agentic AI Engineering & Workflow Automation",
            defaults={
                'description': "Comprehensive training on building autonomous AI agents, tool integration, and prompt engineering.",
                'provider': "Performax Technical Academy",
                'duration_hours': Decimal('32.0'),
                'is_active': True,
            }
        )

        n5_course, _ = TrainingCourse.objects.get_or_create(
            title="Japanese Foundations: JLPT N5 Immersion",
            defaults={
                'description': "Hiragana, Katakana, basic Kanji, and conversational Japanese grammar for software engineers.",
                'provider': "Global Language Institute",
                'duration_hours': Decimal('48.0'),
                'is_active': True,
            }
        )

        n4_course, _ = TrainingCourse.objects.get_or_create(
            title="Intermediate Japanese: JLPT N4 Workplace Communication",
            defaults={
                'description': "Technical Japanese, keigo, workplace coordination, and N4 grammar patterns.",
                'provider': "Global Language Institute",
                'duration_hours': Decimal('60.0'),
                'is_active': True,
            }
        )

        # Enroll Alex
        EmployeeTraining.objects.update_or_create(
            employee=alex_profile,
            course=agentic_course,
            defaults={
                'enrollment_status': TrainingStatus.COMPLETED,
                'completion_percentage': Decimal('100.00'),
                'completion_date': datetime.date(2025, 2, 5),
            }
        )

        EmployeeTraining.objects.update_or_create(
            employee=alex_profile,
            course=n5_course,
            defaults={
                'enrollment_status': TrainingStatus.COMPLETED,
                'completion_percentage': Decimal('100.00'),
                'completion_date': datetime.date(2025, 2, 10),
            }
        )

        EmployeeTraining.objects.update_or_create(
            employee=alex_profile,
            course=n4_course,
            defaults={
                'enrollment_status': TrainingStatus.IN_PROGRESS,
                'completion_percentage': Decimal('65.00'),
                'completion_date': None,
            }
        )

        # 2. Ensure Technical Capability Parameters & Reviews
        cycle = PerformanceCycle.objects.filter(status='ACTIVE').first()
        param_configs = [
            ("Python Core & Algorithm Efficiency", "Foundational Technical", Decimal('4.0'), Decimal('25.0')),
            ("Relational DB Modeling & PostgreSQL", "Foundational Technical", Decimal('4.0'), Decimal('25.0')),
            ("Django REST Framework Architecture", "Implementation Sprint", Decimal('4.0'), Decimal('25.0')),
            ("React 19 & TypeScript State Management", "Implementation Sprint", Decimal('4.0'), Decimal('25.0')),
            ("Microservice System Architecture", "Competency Mastery", Decimal('4.5'), Decimal('30.0')),
            ("Automated Testing & CI/CD Pipelines", "Competency Mastery", Decimal('4.5'), Decimal('30.0')),
            ("Production Incident Reliability & SLOs", "Production Readiness", Decimal('4.5'), Decimal('40.0')),
        ]

        scores = [4.5, 4.2, 4.0, 3.8, 3.5, 3.6, 3.0]

        for i, (p_name, p_cat, bench, wt) in enumerate(param_configs):
            param, _ = TechnicalCapabilityParameter.objects.get_or_create(
                name=p_name,
                defaults={
                    'category': p_cat,
                    'benchmark_score': bench,
                    'weight': wt,
                    'cycle': cycle,
                    'created_by': marcus,
                    'is_active': True,
                }
            )

            TechnicalCapabilityReview.objects.update_or_create(
                parameter=param,
                employee=alex_profile,
                cycle=cycle,
                defaults={
                    'reviewer': marcus,
                    'score': Decimal(str(scores[i])),
                    'mentor_assessment': f"Demonstrates solid grasp of {p_name}. Applied effectively in assigned sprint deliverables.",
                    'evidence_url': "https://github.com/PerformaxCorp/intern-deliverables/pull/42",
                    'status': 'SUBMITTED',
                }
            )

        # 3. JLPT Certifications for Alex
        # N5 - Cleared and Verified
        MiraiCertification.objects.update_or_create(
            intern=alex_profile,
            jlpt_level='N5',
            defaults={
                'name': 'JLPT N5 Japanese Proficiency Examination',
                'quarter_code': QuarterCode.Q1,
                'status': CertificationStatus.CLEARED,
                'score': '142 / 180 (Passed)',
                'exam_date': datetime.date(2025, 2, 2),
                'clearance_date': datetime.date(2025, 2, 10),
                'certificate_url': 'https://storage.performax.io/certificates/alex_n5_verified.pdf',
                'verification_status': VerificationStatus.VERIFIED,
                'verified_by': sarah,
                'verified_at': datetime.datetime(2025, 2, 12, 10, 30, tzinfo=datetime.timezone.utc),
                'verification_notes': 'Official JLPT Japanese Language Testing score report verified and authenticated by HR.',
            }
        )

        # N4 - In Progress for Q2
        MiraiCertification.objects.update_or_create(
            intern=alex_profile,
            jlpt_level='N4',
            defaults={
                'name': 'JLPT N4 Japanese Proficiency Examination',
                'quarter_code': QuarterCode.Q2,
                'status': CertificationStatus.IN_PROGRESS,
                'score': 'Mock Test: 128 / 180',
                'exam_date': datetime.date(2025, 7, 6),
                'clearance_date': None,
                'certificate_url': '',
                'verification_status': VerificationStatus.NOT_SUBMITTED,
                'verified_by': None,
                'verified_at': None,
                'verification_notes': 'Registered for July official testing window. Currently completing mock drills.',
            }
        )

        # N3 - Target for Q3
        MiraiCertification.objects.update_or_create(
            intern=alex_profile,
            jlpt_level='N3',
            defaults={
                'name': 'JLPT N3 Business Japanese Proficiency',
                'quarter_code': QuarterCode.Q3,
                'status': CertificationStatus.NOT_STARTED,
                'score': '',
                'exam_date': datetime.date(2025, 12, 7),
                'clearance_date': None,
                'certificate_url': '',
                'verification_status': VerificationStatus.NOT_SUBMITTED,
                'verified_by': None,
                'verification_notes': '',
            }
        )

        # 4. Continuous Feedback from Mentor
        if marcus:
            Feedback.objects.get_or_create(
                sender=marcus,
                recipient=alex_user,
                defaults={
                    'feedback_type': FeedbackType.POSITIVE,
                    'message': "Outstanding work clearing JLPT N5 ahead of schedule and adapting quickly to our backend APIs. Alex demonstrates high autonomy and thorough documentation habits.",
                    'visibility': FeedbackVisibility.PUBLIC,
                    'status': FeedbackStatus.PUBLISHED,
                }
            )

        # 5. Timeline Events
        events_data = [
            (QuarterCode.Q1, TimelineEventType.STATUS_CHANGE, "Q1 Japanese Foundations Commenced", "Internship cohort kicked off. Enrollment in Japanese immersion and Agentic AI modules.", datetime.date(2025, 1, 15), "HR Admin"),
            (QuarterCode.Q1, TimelineEventType.COURSE_COMPLETED, "FD Agentic AI Course Completed", "Successfully achieved 100% completion in Agentic AI Engineering module.", datetime.date(2025, 2, 5), "System"),
            (QuarterCode.Q1, TimelineEventType.EXAM_CLEARED, "JLPT N5 Cleared (Score: 142/180)", "Official examination passed. Score card uploaded to portal.", datetime.date(2025, 2, 10), "Alex Chen"),
            (QuarterCode.Q1, TimelineEventType.STATUS_CHANGE, "JLPT N5 Certificate Authenticated", "HR verified test registration and credentials. Q1 language gateway cleared.", datetime.date(2025, 2, 12), "Sarah Jenkins (HR)"),
            (QuarterCode.Q1, TimelineEventType.TASK_COMPLETED, "Q1 Japanese Foundations Completed", "All foundational criteria satisfied. Transitioning to Q2 Internship Sprint phase.", datetime.date(2025, 2, 14), "System"),
            (QuarterCode.Q2, TimelineEventType.STATUS_CHANGE, "Q2 Internship Begins", "Joined Engineering Core Team. Marcus Vance assigned as primary technical mentor.", datetime.date(2025, 2, 15), "Engineering Dept"),
            (QuarterCode.Q2, TimelineEventType.TASK_COMPLETED, "Performax API Feature PR Merged", "Implemented caching layer for high-throughput dashboard endpoints.", datetime.date(2025, 3, 1), "Alex Chen"),
            (QuarterCode.Q2, TimelineEventType.FEEDBACK_RECEIVED, "Mid-Quarter Sprint Assessment Logged", "Marcus Vance reviewed sprint velocity and code reviews.", datetime.date(2025, 3, 15), "Marcus Vance"),
        ]

        for q_code, ev_type, title, desc, ev_date, actor in events_data:
            MiraiTimelineEvent.objects.get_or_create(
                intern=alex_profile,
                quarter_code=q_code,
                title=title,
                defaults={
                    'event_type': ev_type,
                    'description': desc,
                    'event_date': ev_date,
                    'actor': actor,
                }
            )

        # Evaluate journey to refresh DB state
        res = MiraiJourneyService.evaluate_intern_journey(alex_profile)
        self.stdout.write(self.style.SUCCESS(f"Successfully seeded MIRAI Journey for {alex_profile}! Overall progress: {res['overallProgressPercent']}%, Current Quarter: {res['currentQuarter']}"))
