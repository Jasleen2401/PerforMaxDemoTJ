from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.db import models

from apps.performance.models import (
    PerformanceCycle,
    CycleCompetency,
    CompetencySection,
    TechnicalCapabilityReview,
    BehavioralCapabilityReview,
    Appraisal,
    AppraisalType,
)
from apps.goals.models import Goal, KPI, GoalStatus
from apps.japanese.models import JapaneseEvaluation, EvaluationStatus


class IncompleteEvaluationError(Exception):
    """Raised when an appraisal score calculation is attempted on incomplete evaluations."""
    def __init__(self, message: str, missing_competencies: Optional[List[str]] = None):
        super().__init__(message)
        self.missing_competencies = missing_competencies or []


class ScoringService:
    """
    Canonical Production Scoring Service for Performax.

    Approved Formula:
    Final Appraisal Score =
        (Technical Section Score × Cycle Technical Weight) +
        (Behavioral Section Score × Cycle Behavioral Weight)

    Approved Rules:
    1. Technical and Behavioral section weights come dynamically from PerformanceCycle (default 60% / 40%).
    2. Technical competency weights within their section total 100%.
    3. Behavioral competency weights within their section total 100%.
    4. Individual competency scores normalized against cycle.rating_scale_max.
    5. Pure Decimal arithmetic throughout calculations.
    6. Goal completion contributes 0% directly to the final score (read-only telemetry).
    7. Self-assessment contributes 0% directly to the final score (reflective input).
    8. Japanese evaluation contributes 0% directly to the final score (completion gate only).
    9. Missing or incomplete evaluations NEVER receive fabricated fallback scores.
    """

    @classmethod
    def calculate_weighted_goal_progress(cls, goals) -> Decimal:
        """Utility method used across intern progress views."""
        if not goals:
            return Decimal('0.00')
        total = Decimal(len(goals))
        total_pct = sum(Decimal(str(getattr(g, 'completion_percentage', 0) or 0)) for g in goals)
        return round(total_pct / total, 2)

    @classmethod
    def calculate_appraisal_score(cls, appraisal, raise_on_incomplete: bool = False) -> Dict[str, Any]:
        """Backward-compatible wrapper around calculate_cycle_score."""
        return cls.calculate_cycle_score(appraisal.employee, appraisal.cycle, raise_on_incomplete=raise_on_incomplete)

    @classmethod
    def is_explicitly_legacy_cycle(cls, cycle) -> bool:
        """
        A cycle is eligible for legacy scoring if and only if its persistent
        scoring_model is explicitly configured as LEGACY_CRITERIA.
        Competency deletion, deactivation, empty competency sections, or legacy
        rating records never convert a COMPETENCY_FRAMEWORK cycle to legacy.
        """
        from apps.performance.models import ScoringModel
        return getattr(cycle, 'scoring_model', None) == ScoringModel.LEGACY_CRITERIA

    @classmethod
    def calculate_cycle_score(cls, employee, cycle, raise_on_incomplete: bool = False) -> Dict[str, Any]:
        """
        Pure, deterministic Decimal calculation of appraisal composite score.
        Never defaults missing scores to 0 or arbitrary numbers.
        """
        if cls.is_explicitly_legacy_cycle(cycle):
            return cls.calculate_legacy_score(employee, cycle, raise_on_incomplete=raise_on_incomplete)

        # Rating scale resolution and independent validation
        raw_scale_max = getattr(cycle, 'rating_scale_max', None)
        if raw_scale_max is None or Decimal(str(raw_scale_max)) <= Decimal('0.0'):
            # Defensive non-zero scale to prevent ZeroDivisionError during downstream evaluation
            scale_max = Decimal('5.0')
            scale_is_valid = False
        else:
            scale_max = Decimal(str(raw_scale_max))
            scale_is_valid = True

        tw_val = cycle.technical_weight
        bw_val = cycle.behavioral_weight

        # 1. Retrieve Active Cycle Competencies
        tech_comps = list(
            cycle.competencies.filter(section=CompetencySection.TECHNICAL, is_active=True).order_by('order', 'name')
        )
        behav_comps = list(
            cycle.competencies.filter(section=CompetencySection.BEHAVIORAL, is_active=True).order_by('order', 'name')
        )

        # 2. Retrieve Corresponding Reviews
        tech_reviews = {
            r.competency_id: r
            for r in TechnicalCapabilityReview.objects.filter(
                employee=employee,
                cycle=cycle,
                competency__in=tech_comps
            )
        }
        behav_reviews = {
            r.competency_id: r
            for r in BehavioralCapabilityReview.objects.filter(
                employee=employee,
                cycle=cycle,
                competency__in=behav_comps
            )
        }

        # 3. Completeness & Calibration Verification
        errors: List[str] = []
        missing_tech_comp_ids: List[str] = []
        missing_behav_comp_ids: List[str] = []

        if not scale_is_valid:
            errors.append(f"Cycle '{cycle.name}' rating scale maximum is invalid ({raw_scale_max}). Must be strictly greater than 0.")

        if tw_val is None or bw_val is None:
            errors.append(f"Cycle '{cycle.name}' technical and behavioral section weights are not configured.")
            tech_weight_pct = Decimal(str(tw_val or 0))
            behav_weight_pct = Decimal(str(bw_val or 0))
        else:
            tech_weight_pct = Decimal(str(tw_val))
            behav_weight_pct = Decimal(str(bw_val))
            if (tech_weight_pct + behav_weight_pct) != Decimal('100.00'):
                errors.append(f"Cycle '{cycle.name}' section weights must sum to exactly 100.00% (currently {tech_weight_pct + behav_weight_pct}%).")

        if not tech_comps:
            errors.append(f"No active Technical competencies configured for cycle '{cycle.name}'.")
        else:
            tech_total_weight = sum((Decimal(str(c.weight)) for c in tech_comps), Decimal('0.00'))
            if tech_total_weight != Decimal('100.00'):
                errors.append(f"Active Technical competency weights total {tech_total_weight}%, expected exactly 100.00%.")

        if not behav_comps:
            errors.append(f"No active Behavioral competencies configured for cycle '{cycle.name}'.")
        else:
            behav_total_weight = sum((Decimal(str(c.weight)) for c in behav_comps), Decimal('0.00'))
            if behav_total_weight != Decimal('100.00'):
                errors.append(f"Active Behavioral competency weights total {behav_total_weight}%, expected exactly 100.00%.")

        # 4. Technical Section Calculation
        tech_breakdown = []
        tech_weighted_sum = Decimal('0.0000')

        for comp in tech_comps:
            rev = tech_reviews.get(comp.id)
            if not rev or rev.status != 'SUBMITTED' or rev.score is None:
                missing_tech_comp_ids.append(str(comp.id))
                errors.append(f"Missing submitted Technical review for competency: '{comp.name}'.")
                score_val = None
                norm_pct = None
            else:
                score_val = Decimal(str(rev.score))
                if score_val < Decimal('0.00') or score_val > scale_max:
                    missing_tech_comp_ids.append(str(comp.id))
                    errors.append(f"Technical review score {score_val} for '{comp.name}' is outside rating scale bounds [0.00, {scale_max}].")
                    score_val = None
                    norm_pct = None
                else:
                    norm_pct = min(Decimal('100.00'), max(Decimal('0.00'), (score_val / scale_max) * Decimal('100.00')))
                    weight_factor = Decimal(str(comp.weight)) / Decimal('100.00')
                    tech_weighted_sum += norm_pct * weight_factor

            tech_breakdown.append({
                'competency_id': str(comp.id),
                'competency_name': comp.name,
                'weight': float(comp.weight),
                'raw_score': float(score_val) if score_val is not None else None,
                'benchmark_score': float(comp.benchmark_score),
                'normalized_percentage': float(round(norm_pct, 2)) if norm_pct is not None else None,
                'status': rev.status if rev else 'MISSING',
            })

        # 5. Behavioral Section Calculation
        behav_breakdown = []
        behav_weighted_sum = Decimal('0.0000')

        for comp in behav_comps:
            rev = behav_reviews.get(comp.id)
            if not rev or rev.status != 'SUBMITTED' or rev.score is None:
                missing_behav_comp_ids.append(str(comp.id))
                errors.append(f"Missing submitted Behavioral review for competency: '{comp.name}'.")
                score_val = None
                norm_pct = None
            else:
                score_val = Decimal(str(rev.score))
                if score_val < Decimal('0.00') or score_val > scale_max:
                    missing_behav_comp_ids.append(str(comp.id))
                    errors.append(f"Behavioral review score {score_val} for '{comp.name}' is outside rating scale bounds [0.00, {scale_max}].")
                    score_val = None
                    norm_pct = None
                else:
                    norm_pct = min(Decimal('100.00'), max(Decimal('0.00'), (score_val / scale_max) * Decimal('100.00')))
                    weight_factor = Decimal(str(comp.weight)) / Decimal('100.00')
                    behav_weighted_sum += norm_pct * weight_factor

            behav_breakdown.append({
                'competency_id': str(comp.id),
                'competency_name': comp.name,
                'weight': float(comp.weight),
                'raw_score': float(score_val) if score_val is not None else None,
                'benchmark_score': float(comp.benchmark_score),
                'normalized_percentage': float(round(norm_pct, 2)) if norm_pct is not None else None,
                'status': rev.status if rev else 'MISSING',
            })

        # 6. Evaluation Completeness Determination
        is_complete = (len(errors) == 0 and len(tech_comps) > 0 and len(behav_comps) > 0)

        if raise_on_incomplete and not is_complete:
            raise IncompleteEvaluationError(
                f"Evaluation for {employee.full_name} is incomplete: {'; '.join(errors)}",
                missing_competencies=missing_tech_comp_ids + missing_behav_comp_ids
            )

        # 7. Final Score (ONLY computed when complete — never fabricated)
        if is_complete:
            tech_section_score = round(tech_weighted_sum, 2)
            behav_section_score = round(behav_weighted_sum, 2)
            tech_contribution = round(tech_section_score * (tech_weight_pct / Decimal('100.00')), 2)
            behav_contribution = round(behav_section_score * (behav_weight_pct / Decimal('100.00')), 2)
            final_score = min(Decimal('100.00'), max(Decimal('0.00'), round(tech_contribution + behav_contribution, 2)))
        else:
            tech_section_score = round(tech_weighted_sum, 2) if tech_comps and not missing_tech_comp_ids else None
            behav_section_score = round(behav_weighted_sum, 2) if behav_comps and not missing_behav_comp_ids else None
            tech_contribution = None
            behav_contribution = None
            final_score = None

        # 8. Operational Telemetry (Strictly 0% score weight contribution)
        # Goals telemetry
        goals = Goal.objects.filter(employee=employee, cycle=cycle)
        total_goals = goals.count()
        completed_goals = goals.filter(status=GoalStatus.COMPLETED).count()
        avg_goal_pct = goals.aggregate(models.Avg('completion_percentage'))['completion_percentage__avg'] or 0.0

        # Self-assessment telemetry
        self_appraisal = Appraisal.objects.filter(
            employee=employee,
            cycle=cycle,
            appraisal_type=AppraisalType.SELF
        ).first()
        self_submitted = bool(self_appraisal and self_appraisal.status in ['SUBMITTED', 'PUBLISHED'])

        # Japanese telemetry & completion gate
        jp_eval = JapaneseEvaluation.objects.filter(intern=employee, cycle=cycle).first()
        jp_mandatory = cycle.japanese_evaluation_mandatory is True
        jp_accepted = bool(jp_eval and jp_eval.status == EvaluationStatus.ACCEPTED)
        jp_gating_passed = (not jp_mandatory) or jp_accepted

        return {
            'is_complete': is_complete,
            'verification_errors': errors,
            'rating_scale_max': float(scale_max),
            'cycle_weights': {
                'technical_weight': float(tech_weight_pct),
                'behavioral_weight': float(behav_weight_pct),
            },
            'technical_section': {
                'section_score': float(tech_section_score) if tech_section_score is not None else None,
                'weight': float(tech_weight_pct),
                'weighted_contribution': float(tech_contribution) if tech_contribution is not None else None,
                'total_competencies': len(tech_comps),
                'scored_competencies': len(tech_comps) - len(missing_tech_comp_ids),
                'competencies': tech_breakdown,
            },
            'behavioral_section': {
                'section_score': float(behav_section_score) if behav_section_score is not None else None,
                'weight': float(behav_weight_pct),
                'weighted_contribution': float(behav_contribution) if behav_contribution is not None else None,
                'total_competencies': len(behav_comps),
                'scored_competencies': len(behav_comps) - len(missing_behav_comp_ids),
                'competencies': behav_breakdown,
            },
            'technical_section_score': float(tech_section_score) if tech_section_score is not None else None,
            'behavioral_section_score': float(behav_section_score) if behav_section_score is not None else None,
            'final_score': float(final_score) if final_score is not None else None,
            'overall_score': float(final_score) if final_score is not None else None,
            'missing_technical_competency_ids': missing_tech_comp_ids,
            'missing_behavioral_competency_ids': missing_behav_comp_ids,
            'operational_telemetry': {
                'goals_count': total_goals,
                'completed_goals_count': completed_goals,
                'avg_goal_progress': float(round(Decimal(str(avg_goal_pct)), 2)),
                'self_assessment_submitted': self_submitted,
                'self_comments': self_appraisal.self_comments if self_appraisal else '',
                'japanese_evaluation_mandatory': jp_mandatory,
                'japanese_evaluation_status': jp_eval.status if jp_eval else 'NOT_FOUND',
                'japanese_overall_score': float(jp_eval.overall_language_score) if jp_eval and jp_eval.overall_language_score is not None else None,
                'japanese_gating_passed': jp_gating_passed,
            }
        }

    @classmethod
    def calculate_legacy_score(cls, employee, cycle, raise_on_incomplete: bool = False) -> Dict[str, Any]:
        """
        Backward compatibility for legacy cycles evaluated using EvaluationCriterion and AppraisalRating.
        Enforces completeness for configured evaluation criteria.
        """
        from apps.performance.models import EvaluationCriterion

        active_criteria = list(EvaluationCriterion.objects.filter(is_active=True).order_by('name'))
        errors: List[str] = []
        is_complete = True
        missing_criteria_names: List[str] = []

        goals = Goal.objects.filter(employee=employee, cycle=cycle)
        total_goals = goals.count()

        if total_goals > 0:
            avg_goal_progress = sum(g.completion_percentage for g in goals) / Decimal(total_goals)
            all_kpis = KPI.objects.filter(goal__in=goals)
            total_kpis = all_kpis.count()
            if total_kpis > 0:
                avg_kpi_pct = sum(k.achievement_percentage for k in all_kpis) / Decimal(total_kpis)
                goals_composite = (avg_goal_progress * Decimal('0.5')) + (avg_kpi_pct * Decimal('0.5'))
            else:
                avg_kpi_pct = avg_goal_progress
                goals_composite = avg_goal_progress
        else:
            avg_goal_progress = Decimal('0.00')
            avg_kpi_pct = Decimal('0.00')
            goals_composite = Decimal('0.00')

        mgr_appraisal = Appraisal.objects.filter(
            employee=employee,
            cycle=cycle,
            appraisal_type=AppraisalType.MANAGER
        ).prefetch_related('ratings__criterion').first()

        manager_criteria_score = Decimal('0.00')
        manager_ratings_breakdown = []

        if active_criteria:
            if not mgr_appraisal:
                errors.append("Manager appraisal record has not been created.")
                is_complete = False
                missing_criteria_names = [c.name for c in active_criteria]
            else:
                existing_ratings = {r.criterion_id: r for r in mgr_appraisal.ratings.all()}
                missing_criteria = [c for c in active_criteria if c.id not in existing_ratings or existing_ratings[c.id].score is None]
                if missing_criteria:
                    is_complete = False
                    missing_criteria_names = [c.name for c in missing_criteria]
                    for c in missing_criteria:
                        errors.append(f"Missing required manager rating for criterion '{c.name}'.")

        if mgr_appraisal and mgr_appraisal.ratings.exists():
            ratings = mgr_appraisal.ratings.all()
            total_weight = sum(r.criterion.weight for r in ratings if r.criterion.weight > 0)
            if total_weight > 0:
                weighted_sum = Decimal('0.00')
                for r in ratings:
                    max_s = r.criterion.maximum_score or Decimal('100.00')
                    norm = (r.score / max_s) * Decimal('100.00')
                    w = r.criterion.weight / total_weight
                    weighted_sum += norm * w
                    manager_ratings_breakdown.append({
                        'criterion': r.criterion.name,
                        'score': float(r.score),
                        'max_score': float(max_s),
                        'weight': float(r.criterion.weight),
                        'normalized_percentage': float(round(norm, 2))
                    })
                manager_criteria_score = min(Decimal('100.00'), max(Decimal('0.00'), weighted_sum))

        self_appraisal = Appraisal.objects.filter(
            employee=employee,
            cycle=cycle,
            appraisal_type=AppraisalType.SELF
        ).prefetch_related('ratings__criterion').first()

        self_assessment_score = Decimal('0.00')
        self_ratings_breakdown = []
        if self_appraisal and self_appraisal.ratings.exists():
            ratings = self_appraisal.ratings.all()
            total_weight = sum(r.criterion.weight for r in ratings if r.criterion.weight > 0)
            if total_weight > 0:
                weighted_sum = Decimal('0.00')
                for r in ratings:
                    max_s = r.criterion.maximum_score or Decimal('100.00')
                    norm = (r.score / max_s) * Decimal('100.00')
                    w = r.criterion.weight / total_weight
                    weighted_sum += norm * w
                    self_ratings_breakdown.append({
                        'criterion': r.criterion.name,
                        'score': float(r.score),
                        'max_score': float(max_s),
                        'weight': float(r.criterion.weight),
                        'normalized_percentage': float(round(norm, 2))
                    })
                self_assessment_score = min(Decimal('100.00'), max(Decimal('0.00'), weighted_sum))

        if raise_on_incomplete and not is_complete:
            raise IncompleteEvaluationError(
                f"Cannot score incomplete legacy evaluation: {'; '.join(errors)}",
                missing_competencies=missing_criteria_names
            )

        if not is_complete:
            final_score = None
        else:
            overall = (
                (goals_composite * Decimal('0.40')) +
                (manager_criteria_score * Decimal('0.40')) +
                (self_assessment_score * Decimal('0.20'))
            )
            overall = min(Decimal('100.00'), max(Decimal('0.00'), round(overall, 2)))
            final_score = float(overall)

        return {
            'is_complete': is_complete,
            'final_score': final_score,
            'overall_score': final_score,
            'goals_progress_avg': float(round(avg_goal_progress, 2)),
            'kpis_achievement_avg': float(round(avg_kpi_pct, 2)),
            'goals_composite_score': float(round(goals_composite, 2)),
            'manager_criteria_score': float(round(manager_criteria_score, 2)),
            'self_assessment_score': float(round(self_assessment_score, 2)),
            'is_legacy': True,
            'verification_errors': errors,
            'weight_distribution': {
                'goals_and_kpis': 40.0,
                'manager_evaluation': 40.0,
                'self_assessment': 20.0
            },
            'breakdown': {
                'manager_ratings': manager_ratings_breakdown,
                'self_ratings': self_ratings_breakdown
            }
        }
