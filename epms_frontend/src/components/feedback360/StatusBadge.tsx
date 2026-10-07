const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:     { label: 'Pending',     bg: '#FAEEDA', text: '#633806' },
  IN_PROGRESS: { label: 'In Progress', bg: '#EEF3FD', text: '#1A56DB' },
  COMPLETED:   { label: 'Completed',   bg: '#EAF3DE', text: '#27500A' },
  CANCELLED:   { label: 'Cancelled',   bg: '#FCEBEB', text: '#791F1F' },
};

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#F5F6F8', text: '#5A6070' };
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 20,
      background: cfg.bg,
      color: cfg.text,
      display: 'inline-block',
    }}>
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
