const REL_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DIRECT_MANAGER: { label: 'Manager',     bg: '#EEF3FD', text: '#1A56DB', border: '#BFCFFA' },
  PEER:           { label: 'Peer',        bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  SUBORDINATE:    { label: 'Subordinate', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  SELF:           { label: 'Self',        bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
};

interface RelBadgeProps {
  rel: string;
  size?: 'sm' | 'md';
}

const RelBadge = ({ rel, size = 'sm' }: RelBadgeProps) => {
  const cfg = REL_CONFIG[rel] ?? { label: rel, bg: '#F5F6F8', text: '#5A6070', border: '#E4E6EC' };
  return (
    <span style={{
      fontSize: size === 'md' ? 12 : 11,
      fontWeight: 600,
      padding: size === 'md' ? '3px 10px' : '2px 8px',
      borderRadius: 20,
      background: cfg.bg,
      color: cfg.text,
      border: `0.5px solid ${cfg.border}`,
      display: 'inline-block',
    }}>
      {cfg.label}
    </span>
  );
};

export default RelBadge;
