/**
 * Canonical KPI goal-set status badge styles.
 *
 * Import this constant in every component that renders a goal-set status badge
 * so that colours, labels, and border tokens stay consistent across the entire
 * KPI journey (GoalManagement table → GoalAssignmentWorkspace header, etc.).
 *
 * Design-spec colours (neutral palette):
 *   DRAFT    — light blue
 *   APPROVED — light green
 *   LOCKED   — warm neutral gray  (spec-compliant, NOT dark #111827)
 *   ARCHIVED — cool neutral gray
 */
export interface KpiStatusStyle {
  bg: string;
  text: string;
  border: string;
  /** Human-readable label shown in badges / tables. */
  label: string;
}

export const KPI_STATUS_STYLE: Record<string, KpiStatusStyle> = {
  DRAFT:    { bg: '#EEF3FD', text: '#0C447C', border: '#B5D4F4', label: 'Drafting'       },
  APPROVED: { bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0', label: 'Approved'       },
  LOCKED:   { bg: '#F1EFE8', text: '#444441', border: '#DDDBD2', label: 'Locked (Active)' },
  SCORED:   { bg: '#EAF3DE', text: '#27500A', border: '#B8DCA0', label: 'Score Calculated' },
  ARCHIVED: { bg: '#F5F6F8', text: '#9EA3B0', border: '#E0E2E8', label: 'Archived'       },
};

/** Fallback style for unknown/undefined statuses. */
export const KPI_STATUS_FALLBACK: KpiStatusStyle = {
  bg: '#F5F6F8', text: '#9EA3B0', border: '#E0E2E8', label: '—',
};
