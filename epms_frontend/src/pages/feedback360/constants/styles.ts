import type React from 'react';

export const panel: React.CSSProperties = {
  background: '#FFFFFF',
  border: '0.5px solid #E4E6EC',
  borderRadius: 12,
  padding: '20px 22px',
};

export const sectionTitle: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 16,
};

export const inputStyle: React.CSSProperties = {
  fontSize: 13, color: '#111827', background: '#FAFBFC',
  border: '0.5px solid #E4E6EC', borderRadius: 8,
  padding: '8px 12px', outline: 'none', width: '100%',
  boxSizing: 'border-box' as const,
};

export const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: '#5A6070',
  marginBottom: 4, display: 'block',
};

export const primaryBtn = (disabled = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontSize: 13, fontWeight: 500, color: '#FFFFFF',
  background: disabled ? '#93A8E8' : '#1A56DB',
  border: 'none', borderRadius: 8, padding: '8px 16px',
  cursor: disabled ? 'not-allowed' : 'pointer',
});

export const secondaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontSize: 13, fontWeight: 500, color: '#1A56DB',
  background: '#EEF3FD', border: '0.5px solid #BFCFFA',
  borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
};

export const smBtn = (variant: 'danger' | 'neutral' | 'success'): React.CSSProperties => {
  const map = {
    danger: { bg: '#FCEBEB', text: '#791F1F', border: '#F5C6C6' },
    neutral: { bg: '#F5F6F8', text: '#5A6070', border: '#E4E6EC' },
    success: { bg: '#EAF3DE', text: '#27500A', border: '#B7E0A0' },
  };
  const c = map[variant];
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 500, color: c.text,
    background: c.bg, border: `0.5px solid ${c.border}`,
    borderRadius: 6, padding: '3px 9px', cursor: 'pointer',
  };
};

// ── Scoring Policy Editor ──────────────────────────────────────────────────────
