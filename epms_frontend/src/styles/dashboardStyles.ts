import type { CSSProperties } from 'react';

export const DASHBOARD_COLORS = {
  primary: '#7C3AED',
  primarySoft: '#F5F3FF',
  primaryBorder: '#DDD6FE',
  success: '#059669',
  successSoft: '#ECFDF5',
  successBorder: '#A7F3D0',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  warningBorder: '#FDE68A',
  danger: '#E11D48',
  dangerSoft: '#FFF1F2',
  dangerBorder: '#FECDD3',
  ink: '#0F172A',
  muted: '#64748B',
  subtle: '#94A3B8',
  line: '#E2E8F0',
  grid: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  dark: '#0F172A',
} as const;

export const DASHBOARD_SPACING = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  xxl: 24,
} as const;

export const DASHBOARD_BORDER = `1px solid ${DASHBOARD_COLORS.line}`;

export const dashboardStyles = {
  card: {
    background: DASHBOARD_COLORS.surface,
    border: DASHBOARD_BORDER,
    borderRadius: 12,
    padding: '18px 20px',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  } satisfies CSSProperties,
  cardCompact: {
    background: DASHBOARD_COLORS.surface,
    border: DASHBOARD_BORDER,
    borderRadius: 12,
    padding: '14px 18px',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  } satisfies CSSProperties,
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  } satisfies CSSProperties,
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: DASHBOARD_COLORS.ink,
    letterSpacing: '-0.01em',
  } satisfies CSSProperties,
  select: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 12,
    fontWeight: 600,
    color: DASHBOARD_COLORS.ink,
    fontFamily: 'inherit',
    minHeight: 28,
  } satisfies CSSProperties,
  filterControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    background: DASHBOARD_COLORS.surfaceAlt,
    border: DASHBOARD_BORDER,
    borderRadius: 8,
  } satisfies CSSProperties,
  iconButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    background: DASHBOARD_COLORS.surfaceAlt,
    border: DASHBOARD_BORDER,
    borderRadius: 8,
    cursor: 'pointer',
  } satisfies CSSProperties,
  chartHeightSm: { height: 220 } satisfies CSSProperties,
  chartHeightMd: { height: 260 } satisfies CSSProperties,
  chartHeightLg: { height: 280 } satisfies CSSProperties,
  tooltip: {
    borderRadius: 8,
    border: DASHBOARD_BORDER,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    background: DASHBOARD_COLORS.surface,
    fontSize: 12,
  } satisfies CSSProperties,
};

export const chartPalette = [
  '#7C3AED',
  '#059669',
  '#D97706',
  '#E11D48',
  '#6366F1',
] as const;
