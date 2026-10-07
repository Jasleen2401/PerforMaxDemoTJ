import type { GoalSetResponse } from '../features/kpi/kpiTypes';

/**
 * Interface for KPI metrics returned by calculation logic.
 */
export interface KpiMetrics {
  finalScore: number;
  completionRate: number;
}

/**
 * Extended GoalSetResponse with calculated metrics.
 */
export interface EnrichedGoalSet extends GoalSetResponse {
  finalScore: number;
  completionRate: number;
}

/**
 * Calculates metrics for a given goal set.
 * Returns a standalone metrics object.
 */
export const calculateGoalSetMetrics = (goalSet: GoalSetResponse): KpiMetrics => {
  const items = goalSet.items || [];

  if (items.length === 0) {
    return {
      finalScore: 0,
      completionRate: 0,
    };
  }

  let totalWeightedScore = 0;
  let totalCompletion = 0;

  items.forEach(item => {
    const weight = item.weightPercent || 0;

    // Prefer backend-computed values when available (post-progress-update state)
    // This avoids divergence after reviseKpi changes targetValue
    if (item.scorePercent != null && item.weightedScore != null) {
      const storedScore = Math.min(Number(item.scorePercent), 100);
      totalCompletion += storedScore;
      totalWeightedScore += Number(item.weightedScore);
      return;
    }

    // Fallback: recompute from raw progress (pre-first-update or missing stored values)
    const progress = item.currentProgress || 0;
    const target = item.targetValue;

    // Zero-tolerance rule: mirrors backend KpiProgressServiceImpl logic
    let itemCompletion: number;
    if (target === 0 || target == null) {
      itemCompletion = progress === 0 ? 100 : 0;
    } else {
      itemCompletion = Math.min((progress / target) * 100, 100);
    }

    totalCompletion += itemCompletion;
    totalWeightedScore += (itemCompletion * weight) / 100;
  });

  return {
    finalScore: Math.round(totalWeightedScore * 10) / 10,
    completionRate: (() => {
      const totalWeight = items.reduce((sum, i) => sum + (i.weightPercent || 0), 0);
      return totalWeight > 0
        ? Math.round(items.reduce((sum, i) => {
            const pct = Math.min(((i.currentProgress || 0) / (i.targetValue || 1)) * 100, 100);
            return sum + pct * (i.weightPercent || 0);
          }, 0) / totalWeight)
        : 0;
    })(),
  };
};

/**
 * Enriches a GoalSetResponse with calculated metrics.
 * Useful for components that need the entire object with scores attached.
 */
export const enrichGoalSet = (goalSet: GoalSetResponse): EnrichedGoalSet => {
  const metrics = calculateGoalSetMetrics(goalSet);
  return {
    ...goalSet,
    ...metrics,
    // Ensure we have a cycle name to display
    appraisalCycleName: goalSet.appraisalCycleName || 'Unknown Cycle'
  };
};

/**
 * Enriches a list of GoalSetResponses.
 */
export const enrichGoalSets = (goalSets: GoalSetResponse[]): EnrichedGoalSet[] => {
  return goalSets.map(enrichGoalSet);
};
