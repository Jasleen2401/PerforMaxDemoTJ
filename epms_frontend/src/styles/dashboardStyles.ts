import type { CSSProperties } from 'react';

export const DASHBOARD_COLORS = {
  primary: '#1A56DB',
  primarySoft: '#EEF3FD',
  primaryBorder: '#B5D4F4',
  success: '#27500A',
  successSoft: '#EAF3DE',
  successBorder: '#B8DCA0',
  warning: '#633806',
  warningSoft: '#FFF7D6',
  danger: '#791F1F',
  dangerSoft: '#FDECEC',
  ink: '#111827',
  muted: '#5A6070',
  subtle: '#9EA3B0',
  line: '#E4E6EC',
  grid: '#F0F2F6',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F6F8',
  dark: '#111827',
} as const;

export const DASHBOARD_SPACING = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  xxl: 24,
} as const;

export const DASHBOARD_BORDER = `0.5px solid ${DASHBOARD_COLORS.line}`;

export const dashboardStyles = {
  card: {
    background: DASHBOARD_COLORS.surface,
    border: DASHBOARD_BORDER,
    borderRadius: 8,
    padding: '16px 18px',
  } satisfies CSSProperties,
  cardCompact: {
    background: DASHBOARD_COLORS.surface,
    border: DASHBOARD_BORDER,
    borderRadius: 8,
    padding: '12px 16px',
  } satisfies CSSProperties,
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  } satisfies CSSProperties,
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: DASHBOARD_COLORS.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0,
  } satisfies CSSProperties,
  select: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 13,
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
    boxShadow: 'none',
    background: DASHBOARD_COLORS.surface,
    fontSize: 12,
  } satisfies CSSProperties,
};

export const chartPalette = [
  DASHBOARD_COLORS.primary,
  DASHBOARD_COLORS.success,
  DASHBOARD_COLORS.warning,
  DASHBOARD_COLORS.danger,
  DASHBOARD_COLORS.subtle,
] as const;
