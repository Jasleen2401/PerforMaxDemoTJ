/** Job level ranks that are excluded from all KPI views */
export const KPI_EXCLUDED_LEVEL_RANKS = new Set<number>([]);

/** Returns true if the employee should be shown in KPI views */
export const isKpiEligible = (emp: { levelRank?: number }): boolean =>
  !KPI_EXCLUDED_LEVEL_RANKS.has(emp.levelRank ?? -1);
