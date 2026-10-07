/**
 * Centralized logic for KPI performance calculations.
 * Ensures consistency across HR, Manager, and Employee dashboards.
 */

export const calculateProgressPercent = (actual: number, target: number): number => {
  // Zero-tolerance rule: target=0 with actual=0 → 100%, actual>0 → 0%
  if (target === 0 || target == null) return actual === 0 ? 100 : 0;
  const percent = (actual / target) * 100;
  return Math.min(Math.round(percent), 100);
};

export const calculateWeightedScore = (actual: number, target: number, weight: number): number => {
  // Zero-tolerance rule: mirrors backend KpiProgressServiceImpl logic
  if (target === 0 || target == null) {
    return actual === 0 ? Number(weight.toFixed(2)) : 0;
  }
  const progress = actual / target;
  return Number((progress * weight).toFixed(2));
};

export interface WeightValidationResult {
  totalWeight: number;
  isValid: boolean;
  errors: string[];
}

export const validateKpiWeights = (items: { weightPercent: number, priority?: string }[]): WeightValidationResult => {
  const totalWeight = items.reduce((sum, item) => sum + (Number(item.weightPercent) || 0), 0);
  const errors: string[] = [];

  if (totalWeight !== 100) {
    errors.push(`Total weight must be exactly 100% (Current: ${totalWeight}%)`);
  }

  items.forEach((item, index) => {
    const weight = Number(item.weightPercent);
    if (weight > 35) {
      errors.push(`Row ${index + 1}: No single KPI item can exceed 35% weight.`);
    }
    if (weight < 5) {
      errors.push(`Row ${index + 1}: Each KPI item must have at least 5% weight.`);
    }
  });

  return {
    totalWeight,
    isValid: errors.length === 0,
    errors
  };
};

export const PRIORITY_MAP = {
  CRITICAL: { label: 'Critical', min: 20, max: 35, color: 'text-red-600 bg-red-50 border-red-200' },
  HIGH:     { label: 'High',     min: 10, max: 19, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  MEDIUM:   { label: 'Medium',   min: 7,  max: 9,  color: 'text-blue-600 bg-blue-50 border-blue-200' },
  LOWER:    { label: 'Lower',    min: 5,  max: 6,  color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

export const getPriorityFromWeight = (weight: number) => {
  if (weight >= 20) return PRIORITY_MAP.CRITICAL;
  if (weight >= 10) return PRIORITY_MAP.HIGH;
  if (weight >= 7) return PRIORITY_MAP.MEDIUM; // Loose match for Medium
  return PRIORITY_MAP.LOWER;
};

export const getStatusColor = (progress: number): string => {
  if (progress >= 100) return 'text-green-600 bg-green-50 border-green-100';
  if (progress >= 75) return 'text-blue-600 bg-blue-50 border-blue-100';
  if (progress >= 40) return 'text-amber-600 bg-amber-50 border-amber-100';
  return 'text-red-600 bg-red-50 border-red-100';
};
