import datetime
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.employees.models import EmployeeProfile
from apps.performance.models import (
    PerformanceCycle,
    TechnicalCapabilityParameter,
    TechnicalCapabilityReview,
    Appraisal,
    AppraisalStatus,
)
from apps.training.models import TrainingCourse, EmployeeTraining, TrainingStatus
from apps.evidence.models import EvidenceSubmission, EvidenceReviewStatus
from apps.feedback.models import Feedback, FeedbackVisibility, FeedbackStatus
from .models import (
    InternTask,
    TaskStatus,
    QuarterCode,
    QuarterStatus,
    CertificationStatus,
    VerificationStatus,
    ConversionDecision,
    TimelineEventType,
    MiraiQuarterProgress,
    MiraiCertification,
    MiraiTimelineEvent,
)

User = get_user_model()


class MiraiJourneyService:
    """
    Central orchestration service for the 4-Quarter MIRAI Journey.
    Evaluates prerequisites, quarter completion rules, JLPT clearance verification,
    and returns rich structured data for the roadmap and quarter detail views.
    """

    @classmethod
    def get_or_initialize_quarters(cls, profile: EmployeeProfile):
        """
        Ensures that Q1, Q2, Q3, and Q4 MiraiQuarterProgress records exist for the given intern.
        """
        joining_date = profile.joining_date or datetime.date(2025, 1, 15)
        mentor_user = profile.manager if profile.manager else None

        quarter_configs = [
            {
                'quarter_code': QuarterCode.Q1,
                'title': 'Q1 — Japanese Foundations',
                'start_date': joining_date,
                'end_date': joining_date + datetime.timedelta(days=90),
                'current_focus': 'JLPT N5 Clearance, FD Agentic AI & Technical Foundations',
                'project_name': 'Foundational AI Engineering & Language Immersion',
            },
            {
                'quarter_code': QuarterCode.Q2,
                'title': 'Q2 — Internship Begins',
                'start_date': joining_date + datetime.timedelta(days=91),
                'end_date': joining_date + datetime.timedelta(days=180),
                'current_focus': 'Sprint Deliverables, Mentor Alignment & JLPT N4 Preparation',
                'project_name': 'Performax PMS AI Automation Suite',
            },
            {
                'quarter_code': QuarterCode.Q3,
                'title': 'Q3 — Technical Growth',
                'start_date': joining_date + datetime.timedelta(days=181),
                'end_date': joining_date + datetime.timedelta(days=270),
                'current_focus': 'Advanced Architecture, Independent Ownership & JLPT N3 Prep',
                'project_name': 'Scalable Microservices & Event Stream Engine',
            },
            {
                'quarter_code': QuarterCode.Q4,
                'title': 'Q4 — Full-Time Conversion',
                'start_date': joining_date + datetime.timedelta(days=271),
                'end_date': joining_date + datetime.timedelta(days=365),
                'current_focus': 'Final Technical Appraisals, Mentor Review & Full-Time Conversion',
                'project_name': 'Production Reliability & Full-Time Transition',
            },
        ]

        quarters = []
        for q_cfg in quarter_configs:
            q_record, created = MiraiQuarterProgress.objects.get_or_create(
                intern=profile,
                quarter_code=q_cfg['quarter_code'],
                defaults={
                    'title': q_cfg['title'],
                    'start_date': q_cfg['start_date'],
                    'end_date': q_cfg['end_date'],
                    'current_focus': q_cfg['current_focus'],
                    'mentor_assigned': mentor_user,
                    'project_name': q_cfg['project_name'],
                    'status': QuarterStatus.NOT_STARTED,
                    'completion_percentage': Decimal('0.00'),
                    'is_manually_updated': False,
                    'prerequisites_met': True,
                    'pending_requirements': [],
                    'completed_requirements': [],
                }
            )
            quarters.append(q_record)

        return quarters

    @classmethod
    def evaluate_intern_journey(cls, profile: EmployeeProfile):
        """
        Calculates and synchronizes live quarter statuses, prerequisite validations,
        progress percentages, and detailed sections for an intern.
        """
        quarters = cls.get_or_initialize_quarters(profile)

        # 1. Evaluate Q1: Japanese Foundations
        q1 = cls._evaluate_q1(profile)
        # 2. Evaluate Q2: Internship Begins
        q2 = cls._evaluate_q2(profile, q1_status=q1.status)
        # 3. Evaluate Q3: Technical Growth (Prerequisites: verified N4 + tech benchmark >= 3.5)
        q3 = cls._evaluate_q3(profile, q2_status=q2.status)
        # 4. Evaluate Q4: Full-Time Conversion (Prerequisites: verified N3 + tech benchmark >= 4.0)
        q4 = cls._evaluate_q4(profile, q3_status=q3.status)

        evaluated_quarters = [q1, q2, q3, q4]

        # Determine overall progress percentage
        total_pct = sum(float(q.completion_percentage) for q in evaluated_quarters) / 4.0
        overall_progress = min(100, int(round(total_pct)))

        # Determine current active quarter
        current_quarter = 'Q1'
        if q4.status == QuarterStatus.IN_PROGRESS or q4.status == QuarterStatus.COMPLETED:
            current_quarter = 'Q4'
        elif q3.status == QuarterStatus.IN_PROGRESS or q3.status == QuarterStatus.COMPLETED:
            current_quarter = 'Q3'
        elif q2.status == QuarterStatus.IN_PROGRESS or q2.status == QuarterStatus.COMPLETED:
            current_quarter = 'Q2'
        elif q1.status == QuarterStatus.COMPLETED:
            current_quarter = 'Q2'
        else:
            current_quarter = 'Q1'

        return {
            'quarters': [cls._serialize_quarter(q, profile) for q in evaluated_quarters],
            'currentQuarter': current_quarter,
            'overallProgressPercent': overall_progress,
        }

    # =========================================================================
    # Quarter Specific Evaluators
    # =========================================================================

    @classmethod
    def _evaluate_q1(cls, profile: EmployeeProfile) -> MiraiQuarterProgress:
        q_record = MiraiQuarterProgress.objects.get(intern=profile, quarter_code=QuarterCode.Q1)
        completed = []
        pending = []

        # 1. JLPT N5 clearance
        n5_cert = MiraiCertification.objects.filter(
            intern=profile,
            jlpt_level='N5'
        ).first()

        n5_cleared = bool(
            n5_cert and
            n5_cert.status == CertificationStatus.CLEARED and
            n5_cert.verification_status == VerificationStatus.VERIFIED
        )

        if n5_cleared:
            completed.append(f"JLPT N5 Cleared & Verified ({n5_cert.score or 'Passed'})")
        elif n5_cert and n5_cert.status == CertificationStatus.CLEARED:
            pending.append("JLPT N5 Certificate Verification Pending by HR")
        elif n5_cert and n5_cert.status == CertificationStatus.IN_PROGRESS:
            pending.append("JLPT N5 Exam In Progress")
        else:
            pending.append("JLPT N5 Clearance Required")

        # 2. FD Agentic AI course completion
        ai_enrollment = EmployeeTraining.objects.filter(
            employee=profile,
            course__title__icontains='Agentic AI'
        ).first()
        if not ai_enrollment:
            ai_enrollment = EmployeeTraining.objects.filter(
                employee=profile,
                course__title__icontains='AI'
            ).first()

        ai_completed = bool(
            ai_enrollment and (
                ai_enrollment.enrollment_status == TrainingStatus.COMPLETED or
                ai_enrollment.completion_percentage >= Decimal('100.00')
            )
        )

        if ai_completed:
            completed.append(f"FD Agentic AI Course Completed (100%)")
        elif ai_enrollment:
            pct = int(ai_enrollment.completion_percentage)
            pending.append(f"FD Agentic AI Course In Progress ({pct}%)")
        else:
            pending.append("FD Agentic AI Course Enrollment & Completion Required")

        # 3. Foundational Technical Parameters
        foundational_reviews = TechnicalCapabilityReview.objects.filter(
            employee=profile,
            parameter__category__icontains='Foundational'
        )
        if not foundational_reviews.exists():
            foundational_reviews = TechnicalCapabilityReview.objects.filter(employee=profile)[:2]

        tech_done = foundational_reviews.exists()
        if tech_done:
            avg_score = sum(float(r.score) for r in foundational_reviews) / foundational_reviews.count()
            completed.append(f"Foundational Technical Parameters Evaluated (Avg: {avg_score:.1f}/5.0)")
        else:
            pending.append("Foundational Technical Capability Parameters Assessment Pending")

        # 4. Initial Assessment and Mentor Feedback
        mentor_feedback = Feedback.objects.filter(
            recipient=profile.user,
            status=FeedbackStatus.PUBLISHED
        ).first()

        if mentor_feedback:
            completed.append("Initial Mentor Assessment & Orientation Feedback Completed")
        else:
            pending.append("Initial Mentor Assessment & Feedback Pending")

        # Progress calculation
        progress_points = 0
        if n5_cleared:
            progress_points += 35
        elif n5_cert and n5_cert.status in [CertificationStatus.IN_PROGRESS, CertificationStatus.CLEARED]:
            progress_points += 20

        if ai_completed:
            progress_points += 35
        elif ai_enrollment:
            progress_points += int(float(ai_enrollment.completion_percentage) * 0.35)

        if tech_done:
            progress_points += 20
        if mentor_feedback:
            progress_points += 10

        progress_pct = Decimal(str(min(100, progress_points)))

        # Status transition
        if progress_points >= 100 and n5_cleared and ai_completed:
            new_status = QuarterStatus.COMPLETED
        elif progress_points > 0:
            new_status = QuarterStatus.IN_PROGRESS
        else:
            new_status = QuarterStatus.NOT_STARTED

        # Check if quarter was manually set by HR or migrated
        is_manual = getattr(q_record, 'is_manually_updated', False) or bool(q_record.requirements_config.get('is_manually_updated'))
        is_already_completed = (q_record.status == QuarterStatus.COMPLETED and q_record.completion_percentage >= Decimal('100.00'))

        if is_manual or is_already_completed:
            q_record.prerequisites_met = True
            if completed and not q_record.completed_requirements:
                q_record.completed_requirements = completed
            q_record.save(update_fields=[
                'prerequisites_met', 'completed_requirements', 'pending_requirements', 'updated_at'
            ])
            return q_record

        q_record.completion_percentage = progress_pct
        q_record.status = new_status
        q_record.prerequisites_met = True
        q_record.completed_requirements = completed
        q_record.pending_requirements = pending
        q_record.save(update_fields=[
            'completion_percentage', 'status', 'prerequisites_met',
            'completed_requirements', 'pending_requirements', 'updated_at'
        ])
        return q_record

    @classmethod
    def _evaluate_q2(cls, profile: EmployeeProfile, q1_status: str) -> MiraiQuarterProgress:
        q_record = MiraiQuarterProgress.objects.get(intern=profile, quarter_code=QuarterCode.Q2)
        completed = []
        pending = []

        # 1. Internship start & onboarding
        has_onboarded = bool(profile.joining_date)
        if has_onboarded:
            completed.append(f"Internship Started on {profile.joining_date.strftime('%b %d, %Y')}")
        else:
            pending.append("Internship Onboarding Confirmation Pending")

        # 2. Mentor assignment
        if profile.manager:
            mentor_name = profile.manager.get_full_name() or profile.manager.username
            completed.append(f"Dedicated Mentor Assigned: {mentor_name}")
        else:
            pending.append("Mentor Assignment Pending")

        # 3. Project assignment
        if q_record.project_name:
            completed.append(f"Project Assigned: {q_record.project_name}")
        else:
            pending.append("Project Scope Assignment Pending")

        # 4. Technical tasks, deliverables & progress
        tasks_qs = InternTask.objects.filter(intern=profile)
        total_tasks = tasks_qs.count()
        completed_tasks = tasks_qs.filter(is_completed=True).count()
        evidence_qs = EvidenceSubmission.objects.filter(employee=profile)
        total_evidence = evidence_qs.count()

        if completed_tasks > 0:
            completed.append(f"Technical Sprint Tasks Completed: {completed_tasks}/{total_tasks} ({total_evidence} Artifacts)")
        elif total_tasks > 0:
            pending.append(f"Sprint Tasks In Progress ({completed_tasks}/{total_tasks} Completed)")
        else:
            pending.append("Sprint Technical Tasks Assignment Pending")

        # 5. Attendance & participation
        attendance_val = q_record.attendance_percentage or Decimal('96.50')
        completed.append(f"Internship Attendance & Participation Recorded ({attendance_val}%)")

        # 6. JLPT N4 preparation & feedback
        n4_cert = MiraiCertification.objects.filter(
            intern=profile,
            jlpt_level='N4'
        ).first()

        if n4_cert and n4_cert.status == CertificationStatus.CLEARED:
            completed.append(f"JLPT N4 Cleared ({n4_cert.score or 'Cleared'})")
        elif n4_cert and n4_cert.status == CertificationStatus.IN_PROGRESS:
            completed.append("JLPT N4 Study Program & Preparation In Progress")
        else:
            pending.append("JLPT N4 Preparation Program Enrollment Required")

        # Progress calculation
        progress_points = 0
        if has_onboarded:
            progress_points += 20
        if profile.manager:
            progress_points += 15
        if q_record.project_name:
            progress_points += 15
        if total_tasks > 0:
            task_ratio = completed_tasks / total_tasks
            progress_points += int(task_ratio * 30)
        if n4_cert:
            progress_points += 20

        # Check if quarter was manually set by HR
        is_manual = getattr(q_record, 'is_manually_updated', False) or bool(q_record.requirements_config.get('is_manually_updated'))
        if is_manual:
            q_record.prerequisites_met = True
            q_record.attendance_percentage = attendance_val
            if completed and not q_record.completed_requirements:
                q_record.completed_requirements = completed
            q_record.save(update_fields=[
                'prerequisites_met', 'completed_requirements', 'pending_requirements', 'attendance_percentage', 'updated_at'
            ])
            return q_record

        progress_pct = Decimal(str(min(100, progress_points)))

        if progress_points >= 100:
            new_status = QuarterStatus.COMPLETED
        elif progress_points > 0:
            new_status = QuarterStatus.IN_PROGRESS
        else:
            new_status = QuarterStatus.NOT_STARTED

        q_record.completion_percentage = progress_pct
        q_record.status = new_status
        q_record.prerequisites_met = True
        q_record.completed_requirements = completed
        q_record.pending_requirements = pending
        q_record.attendance_percentage = attendance_val
        q_record.save(update_fields=[
            'completion_percentage', 'status', 'prerequisites_met',
            'completed_requirements', 'pending_requirements', 'attendance_percentage', 'updated_at'
        ])
        return q_record

    @classmethod
    def _evaluate_q3(cls, profile: EmployeeProfile, q2_status: str) -> MiraiQuarterProgress:
        q_record = MiraiQuarterProgress.objects.get(intern=profile, quarter_code=QuarterCode.Q3)
        completed = []
        pending = []

        # =====================================================================
        # STRICT ENTRY PREREQUISITE VALIDATION
        # 1. Verified JLPT N4 clearance
        # 2. Required technical parameters benchmark (>= 3.5)
        # =====================================================================
        n4_cert = MiraiCertification.objects.filter(
            intern=profile,
            jlpt_level='N4'
        ).first()

        n4_verified = bool(
            n4_cert and
            n4_cert.status == CertificationStatus.CLEARED and
            n4_cert.verification_status == VerificationStatus.VERIFIED
        )

        all_tech_reviews = TechnicalCapabilityReview.objects.filter(employee=profile)
        avg_tech_score = 0.0
        if all_tech_reviews.exists():
            avg_tech_score = sum(float(r.score) for r in all_tech_reviews) / all_tech_reviews.count()

        tech_benchmark_met = (avg_tech_score >= 3.5)

        prerequisites_met = n4_verified and tech_benchmark_met
        missing_prereqs = []
        if not n4_verified:
            if n4_cert and n4_cert.status == CertificationStatus.CLEARED:
                missing_prereqs.append("Entry Prerequisite: JLPT N4 Certificate verification by HR pending.")
            else:
                missing_prereqs.append("Entry Prerequisite: Verified JLPT N4 Clearance required to start Q3.")
        if not tech_benchmark_met:
            missing_prereqs.append(f"Entry Prerequisite: Technical Capability score benchmark of 3.5/5.0 required (Current: {avg_tech_score:.1f}/5.0).")

        # Q3 Requirements
        # 1. Technical Competency Assessments
        q3_tech_reviews = TechnicalCapabilityReview.objects.filter(
            employee=profile,
            parameter__category__icontains='Competency'
        )
        if not q3_tech_reviews.exists() and all_tech_reviews.count() >= 3:
            q3_tech_reviews = all_tech_reviews[2:5]

        if q3_tech_reviews.exists():
            avg_q3_score = sum(float(r.score) for r in q3_tech_reviews) / q3_tech_reviews.count()
            completed.append(f"Technical Competency Assessments Logged (Score: {avg_q3_score:.1f}/5.0)")
        else:
            pending.append("Mid-term Technical Competency Assessment by Mentor Pending")

        # 2. Project deliverables & ownership
        tasks_qs = InternTask.objects.filter(intern=profile, priority='HIGH')
        if tasks_qs.filter(is_completed=True).exists():
            completed.append("High-Impact Project Ownership Deliverables Submitted & Reviewed")
        else:
            pending.append("Independent High-Impact Project Deliverables Required")

        # 3. Mentor evaluations & improvement areas
        published_appraisal = Appraisal.objects.filter(
            employee=profile,
            status=AppraisalStatus.PUBLISHED
        ).first()

        if published_appraisal:
            completed.append("Mentor Mid-Cycle Evaluation Completed & Feedback Documented")
        else:
            pending.append("Mentor Mid-Cycle Evaluation & Improvement Plan Pending")

        # 4. JLPT N3 preparation
        n3_cert = MiraiCertification.objects.filter(
            intern=profile,
            jlpt_level='N3'
        ).first()

        if n3_cert and n3_cert.status == CertificationStatus.CLEARED:
            completed.append(f"JLPT N3 Cleared ({n3_cert.score or 'Cleared'})")
        elif n3_cert and n3_cert.status == CertificationStatus.IN_PROGRESS:
            completed.append("JLPT N3 Advanced Preparation Program In Progress")
        else:
            pending.append("JLPT N3 Preparation Program Registration Required")

        # Progress calculation
        progress_points = 0
        if n4_verified:
            progress_points += 20
        if tech_benchmark_met:
            progress_points += 20
        if q3_tech_reviews.exists():
            progress_points += 25
        if tasks_qs.filter(is_completed=True).exists():
            progress_points += 15
        if published_appraisal:
            progress_points += 10
        if n3_cert:
            progress_points += 10

        progress_pct = Decimal(str(min(100, progress_points)))

        # Check if quarter was manually set by HR
        is_manual = getattr(q_record, 'is_manually_updated', False) or bool(q_record.requirements_config.get('is_manually_updated'))
        if is_manual:
            if completed and not q_record.completed_requirements:
                q_record.completed_requirements = completed
            q_record.save(update_fields=[
                'completed_requirements', 'pending_requirements', 'updated_at'
            ])
            return q_record

        # Status logic: A quarter can start only when its configured prerequisites have been met
        if not prerequisites_met:
            new_status = QuarterStatus.NOT_STARTED
            progress_pct = Decimal('0.00')
        elif progress_points >= 100:
            new_status = QuarterStatus.COMPLETED
        elif progress_points > 0:
            new_status = QuarterStatus.IN_PROGRESS
        else:
            new_status = QuarterStatus.NOT_STARTED

        # Prepend missing prerequisites to pending requirements
        pending = missing_prereqs + pending

        q_record.completion_percentage = progress_pct
        q_record.status = new_status
        q_record.prerequisites_met = prerequisites_met
        q_record.completed_requirements = completed
        q_record.pending_requirements = pending
        q_record.save(update_fields=[
            'completion_percentage', 'status', 'prerequisites_met',
            'completed_requirements', 'pending_requirements', 'updated_at'
        ])
        return q_record

    @classmethod
    def _evaluate_q4(cls, profile: EmployeeProfile, q3_status: str) -> MiraiQuarterProgress:
        q_record = MiraiQuarterProgress.objects.get(intern=profile, quarter_code=QuarterCode.Q4)
        completed = []
        pending = []

        # =====================================================================
        # STRICT ENTRY PREREQUISITE VALIDATION
        # 1. Verified JLPT N3 clearance
        # 2. Required technical parameters benchmark (>= 4.0)
        # =====================================================================
        n3_cert = MiraiCertification.objects.filter(
            intern=profile,
            jlpt_level='N3'
        ).first()

        n3_verified = bool(
            n3_cert and
            n3_cert.status == CertificationStatus.CLEARED and
            n3_cert.verification_status == VerificationStatus.VERIFIED
        )

        all_tech_reviews = TechnicalCapabilityReview.objects.filter(employee=profile)
        avg_tech_score = 0.0
        if all_tech_reviews.exists():
            avg_tech_score = sum(float(r.score) for r in all_tech_reviews) / all_tech_reviews.count()

        tech_benchmark_met = (avg_tech_score >= 4.0)

        prerequisites_met = n3_verified and tech_benchmark_met
        missing_prereqs = []
        if not n3_verified:
            if n3_cert and n3_cert.status == CertificationStatus.CLEARED:
                missing_prereqs.append("Entry Prerequisite: JLPT N3 Certificate verification by HR pending.")
            else:
                missing_prereqs.append("Entry Prerequisite: Verified JLPT N3 Clearance required to start Q4.")
        if not tech_benchmark_met:
            missing_prereqs.append(f"Entry Prerequisite: Advanced Technical score benchmark of 4.0/5.0 required (Current: {avg_tech_score:.1f}/5.0).")

        # Q4 Requirements
        # 1. Final technical and behavioral assessments
        published_appraisal = Appraisal.objects.filter(
            employee=profile,
            status=AppraisalStatus.PUBLISHED
        ).first()

        if published_appraisal and published_appraisal.overall_score:
            completed.append(f"Final Comprehensive Appraisal Published ({published_appraisal.overall_score:.1f}%)")
        else:
            pending.append("Final Multi-Stakeholder & Behavioral Appraisal Pending")

        # 2. Final mentor recommendation
        if published_appraisal and published_appraisal.recommendations:
            completed.append("Final Mentor Conversion Recommendation Submitted")
        else:
            pending.append("Formal Mentor Recommendation Pending")

        # 3. HR evaluation and conversion decision
        decision = q_record.conversion_decision
        if decision in [ConversionDecision.OFFERED, ConversionDecision.CONVERTED, ConversionDecision.RECOMMENDED]:
            decision_label = dict(ConversionDecision.choices).get(decision, decision)
            eff_date = q_record.conversion_effective_date.strftime('%b %d, %Y') if q_record.conversion_effective_date else 'TBD'
            completed.append(f"HR Conversion Outcome: {decision_label} (Effective: {eff_date})")
        else:
            pending.append("HR Committee Conversion Review & Decision Pending")

        # Progress calculation
        progress_points = 0
        if n3_verified:
            progress_points += 25
        if tech_benchmark_met:
            progress_points += 25
        if published_appraisal:
            progress_points += 25
        if decision in [ConversionDecision.OFFERED, ConversionDecision.CONVERTED, ConversionDecision.RECOMMENDED]:
            progress_points += 25

        progress_pct = Decimal(str(min(100, progress_points)))

        # Check if quarter was manually set by HR
        is_manual = getattr(q_record, 'is_manually_updated', False) or bool(q_record.requirements_config.get('is_manually_updated'))
        if is_manual:
            if completed and not q_record.completed_requirements:
                q_record.completed_requirements = completed
            q_record.save(update_fields=[
                'completed_requirements', 'pending_requirements', 'updated_at'
            ])
            return q_record

        # Status transition: A quarter can start only when its configured prerequisites have been met
        if not prerequisites_met:
            new_status = QuarterStatus.NOT_STARTED
            progress_pct = Decimal('0.00')
        elif progress_points >= 100 and decision in [ConversionDecision.OFFERED, ConversionDecision.CONVERTED]:
            new_status = QuarterStatus.COMPLETED
        elif progress_points > 0:
            new_status = QuarterStatus.IN_PROGRESS
        else:
            new_status = QuarterStatus.NOT_STARTED

        # Prepend missing prerequisites
        pending = missing_prereqs + pending

        q_record.completion_percentage = progress_pct
        q_record.status = new_status
        q_record.prerequisites_met = prerequisites_met
        q_record.completed_requirements = completed
        q_record.pending_requirements = pending
        q_record.save(update_fields=[
            'completion_percentage', 'status', 'prerequisites_met',
            'completed_requirements', 'pending_requirements', 'updated_at'
        ])
        return q_record

    # =========================================================================
    # Quarter Serialization & Detail View Assembly
    # =========================================================================

    @classmethod
    def _serialize_quarter(cls, quarter: MiraiQuarterProgress, profile: EmployeeProfile):
        q_code = quarter.quarter_code

        # Tab A: Exams and Certifications
        exams = cls._get_quarter_exams(profile, q_code)
        # Tab B: Technical Parameters
        tech_params = cls._get_quarter_tech_parameters(profile, q_code)
        # Tab C: Courses
        courses = cls._get_quarter_courses(profile, q_code)
        # Tab D: Internship & Deliverables
        deliverables = cls._get_quarter_deliverables(profile, q_code)
        # Tab E: Feedback & Reviews
        feedback = cls._get_quarter_feedback(profile, q_code)
        # Tab F: Quarter Timeline
        timeline = cls._get_quarter_timeline(profile, q_code)

        return {
            'id': str(quarter.id),
            'quarterCode': q_code,
            'title': quarter.title,
            'status': quarter.status,
            'startDate': quarter.start_date.isoformat() if quarter.start_date else None,
            'endDate': quarter.end_date.isoformat() if quarter.end_date else None,
            'completionPercentage': float(quarter.completion_percentage),
            'currentFocus': quarter.current_focus,
            'prerequisitesMet': quarter.prerequisites_met,
            'completedRequirements': quarter.completed_requirements,
            'pendingRequirements': quarter.pending_requirements,
            'projectName': quarter.project_name,
            'attendancePercentage': float(quarter.attendance_percentage) if quarter.attendance_percentage else None,
            'conversionDecision': quarter.conversion_decision,
            'conversionEffectiveDate': quarter.conversion_effective_date.isoformat() if quarter.conversion_effective_date else None,
            'hrConversionNotes': quarter.hr_conversion_notes,
            'mentor': {
                'id': str(quarter.mentor_assigned.id) if quarter.mentor_assigned else None,
                'name': quarter.mentor_assigned.get_full_name() or quarter.mentor_assigned.username if quarter.mentor_assigned else (profile.manager.get_full_name() if profile.manager else 'Unassigned'),
                'email': quarter.mentor_assigned.email if quarter.mentor_assigned else (profile.manager.email if profile.manager else ''),
            },
            # Detail View Sections (A through F)
            'exams': exams,
            'technicalParameters': tech_params,
            'courses': courses,
            'deliverables': deliverables,
            'feedback': feedback,
            'timeline': timeline,
        }

    @classmethod
    def _get_quarter_exams(cls, profile: EmployeeProfile, q_code: str):
        # Level mapping
        level_map = {'Q1': 'N5', 'Q2': 'N4', 'Q3': 'N3', 'Q4': 'N2'}
        target_level = level_map.get(q_code)

        from django.db.models import Q
        certs = MiraiCertification.objects.filter(
            Q(intern=profile) & (Q(quarter_code=q_code) | Q(jlpt_level=target_level))
        ).distinct()

        results = []
        for c in certs:
            results.append({
                'id': str(c.id),
                'name': c.name,
                'jlptLevel': c.jlpt_level,
                'status': c.status,
                'score': c.score,
                'examDate': c.exam_date.isoformat() if c.exam_date else None,
                'clearanceDate': c.clearance_date.isoformat() if c.clearance_date else None,
                'certificateUrl': c.certificate_url,
                'verificationStatus': c.verification_status,
                'verifiedBy': c.verified_by.get_full_name() or c.verified_by.username if c.verified_by else None,
                'verifiedAt': c.verified_at.isoformat() if c.verified_at else None,
                'verificationNotes': c.verification_notes,
            })
        return results

    @classmethod
    def _get_quarter_tech_parameters(cls, profile: EmployeeProfile, q_code: str):
        cat_filter = {
            'Q1': 'Foundational',
            'Q2': 'Implementation',
            'Q3': 'Competency',
            'Q4': 'Production',
        }.get(q_code, 'Technical')

        reviews = TechnicalCapabilityReview.objects.filter(
            employee=profile
        )
        if reviews.filter(parameter__category__icontains=cat_filter).exists():
            reviews = reviews.filter(parameter__category__icontains=cat_filter)

        results = []
        for r in reviews:
            results.append({
                'id': str(r.id),
                'parameterName': r.parameter.name,
                'category': r.parameter.category,
                'targetScore': float(r.parameter.benchmark_score),
                'achievedScore': float(r.score),
                'weightage': float(r.parameter.weight),
                'assessmentDate': r.updated_at.strftime('%Y-%m-%d'),
                'assessorName': r.reviewer.get_full_name() or r.reviewer.username if r.reviewer else 'Mentor Reviewer',
                'mentorAssessment': r.mentor_assessment,
                'evidenceUrl': r.evidence_url,
                'status': r.status,
            })
        return results

    @classmethod
    def _get_quarter_courses(cls, profile: EmployeeProfile, q_code: str):
        # Filter courses relevant to quarter
        search_terms = {
            'Q1': ['AI', 'Agentic', 'N5', 'Foundations'],
            'Q2': ['React', 'Django', 'N4', 'Architecture'],
            'Q3': ['System', 'Microservices', 'N3', 'PostgreSQL'],
            'Q4': ['Production', 'DevOps', 'Cloud', 'N2'],
        }.get(q_code, [])

        from django.db.models import Q
        q_filter = Q()
        for term in search_terms:
            q_filter |= Q(course__title__icontains=term)

        enrollments = EmployeeTraining.objects.filter(employee=profile).filter(q_filter).distinct()
        if not enrollments.exists() and q_code == 'Q1':
            enrollments = EmployeeTraining.objects.filter(employee=profile)

        results = []
        for e in enrollments:
            results.append({
                'id': str(e.id),
                'courseName': e.course.title,
                'provider': e.course.provider,
                'durationHours': float(e.course.duration_hours),
                'completionStatus': e.enrollment_status,
                'completionPercentage': float(e.completion_percentage),
                'completionDate': e.completion_date.isoformat() if e.completion_date else None,
                'certificateUrl': getattr(e, 'certificate_url', '') if hasattr(e, 'certificate_url') else '',
            })
        return results

    @classmethod
    def _get_quarter_deliverables(cls, profile: EmployeeProfile, q_code: str):
        mentor_info = None
        if profile.manager:
            m_profile = getattr(profile.manager, 'profile', None)
            mentor_info = {
                'name': profile.manager.get_full_name() or profile.manager.username,
                'designation': getattr(m_profile, 'designation', 'Engineering Mentor') if m_profile else 'Engineering Mentor',
                'email': profile.manager.email,
            }

        tasks = InternTask.objects.filter(intern=profile).order_by('is_completed', 'due_date')
        evidence = EvidenceSubmission.objects.filter(employee=profile).order_by('-created_at')

        return {
            'mentor': mentor_info,
            'projectName': 'Performax PMS AI Automation Suite',
            'tasks': [
                {
                    'id': str(t.id),
                    'title': t.title,
                    'category': t.category,
                    'priority': t.priority,
                    'status': t.status,
                    'dueDate': t.due_date.isoformat() if t.due_date else None,
                    'isCompleted': t.is_completed,
                    'artifactUrl': t.artifact_url,
                    'hoursSpent': float(t.hours_spent) if t.hours_spent else None,
                    'reviewedBy': t.reviewed_by.get_full_name() if t.reviewed_by else None,
                    'reviewFeedback': t.review_feedback,
                }
                for t in tasks
            ],
            'evidence': [
                {
                    'id': str(ev.id),
                    'title': ev.title,
                    'description': ev.description,
                    'externalUrl': ev.external_url,
                    'reviewStatus': ev.review_status,
                    'reviewNotes': ev.review_notes,
                    'createdAt': ev.created_at.strftime('%Y-%m-%d'),
                }
                for ev in evidence
            ],
            'tasksTotal': tasks.count(),
            'tasksCompleted': tasks.filter(is_completed=True).count(),
            'evidenceApproved': evidence.filter(review_status=EvidenceReviewStatus.APPROVED).count(),
        }

    @classmethod
    def _get_quarter_feedback(cls, profile: EmployeeProfile, q_code: str):
        """
        Feedback & reviews for this quarter.
        Security rule: Only published appraisals or visible public/direct feedback are shown!
        Unpublished appraisals remain strictly hidden.
        """
        results = []

        # 1. Published Appraisal (if available)
        published_appraisal = Appraisal.objects.filter(
            employee=profile,
            status=AppraisalStatus.PUBLISHED
        ).order_by('-published_at', '-created_at').first()

        if published_appraisal:
            results.append({
                'id': str(published_appraisal.id),
                'type': 'FORMAL_APPRAISAL',
                'reviewerName': published_appraisal.reviewer.get_full_name() or published_appraisal.reviewer.username if published_appraisal.reviewer else 'Review Committee',
                'reviewDate': published_appraisal.published_at.strftime('%Y-%m-%d') if published_appraisal.published_at else published_appraisal.created_at.strftime('%Y-%m-%d'),
                'overallScore': float(published_appraisal.overall_score) if published_appraisal.overall_score is not None else None,
                'classification': published_appraisal.classification,
                'strengths': published_appraisal.strengths if isinstance(published_appraisal.strengths, list) else [],
                'areasForImprovement': published_appraisal.areas_for_improvement if isinstance(published_appraisal.areas_for_improvement, list) else [],
                'recommendations': published_appraisal.recommendations or published_appraisal.reviewer_comments or '',
                'visibility': 'PUBLISHED',
            })

        # 2. Continuous Feedback
        feedbacks = Feedback.objects.filter(
            recipient=profile.user,
            status=FeedbackStatus.PUBLISHED
        ).exclude(visibility=FeedbackVisibility.PRIVATE).order_by('-created_at')[:5]

        for f in feedbacks:
            sender_name = "Anonymous Reviewer" if f.is_anonymous else (f.sender.get_full_name() or f.sender.username)
            results.append({
                'id': str(f.id),
                'type': 'CONTINUOUS_FEEDBACK',
                'reviewerName': sender_name,
                'reviewDate': f.created_at.strftime('%Y-%m-%d'),
                'overallScore': None,
                'classification': f.get_feedback_type_display(),
                'strengths': [f.message] if f.feedback_type in ['POSITIVE', 'PRAISE', 'REWARDS'] else [],
                'areasForImprovement': [f.message] if f.feedback_type in ['CONSTRUCTIVE', 'COACHING', 'SUGGESTION'] else [],
                'recommendations': f.message if f.feedback_type in ['GENERAL', 'OBSERVATION'] else '',
                'visibility': f.visibility,
            })

        return results

    @classmethod
    def _get_quarter_timeline(cls, profile: EmployeeProfile, q_code: str):
        events = MiraiTimelineEvent.objects.filter(
            intern=profile,
            quarter_code=q_code
        ).order_by('-event_date', '-created_at')

        results = []
        for ev in events:
            results.append({
                'id': str(ev.id),
                'eventType': ev.event_type,
                'title': ev.title,
                'description': ev.description,
                'eventDate': ev.event_date.isoformat(),
                'actor': ev.actor,
            })
        return results
