import type { CategoryGap } from '../../features/feedback360/feedback360Types';

interface GapBarProps {
  item: CategoryGap;
}

const GapBar = ({ item }: GapBarProps) => {
  const highlight = item.gap !== null && Math.abs(item.gap) >= 1.0;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto auto auto',
      alignItems: 'center',
      gap: 12,
      padding: '8px 10px',
      background: highlight ? '#FFFBEB' : '#FAFBFC',
      border: `0.5px solid ${highlight ? '#FDE68A' : '#E4E6EC'}`,
      borderRadius: 8,
      marginBottom: 6,
    }}>
      <span style={{ fontSize: 13, color: '#111827', fontWeight: highlight ? 600 : 400 }}>
        {item.categoryName}
        {highlight && (
          <span style={{ fontSize: 10, marginLeft: 6, color: '#D97706', fontWeight: 600 }}>
            Blind spot
          </span>
        )}
      </span>
      <span style={{ fontSize: 12, color: '#1A56DB', whiteSpace: 'nowrap' }}>
        Self: {item.selfScore !== null ? item.selfScore.toFixed(2) : 'N/A'}
      </span>
      <span style={{ fontSize: 12, color: '#5A6070', whiteSpace: 'nowrap' }}>
        Others: {item.othersScore !== null ? item.othersScore.toFixed(2) : 'N/A'}
      </span>
      <span style={{
        fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
        color: item.gap === null ? '#9EA3B0' : item.gap > 0 ? '#059669' : '#EF4444',
      }}>
        {item.gap !== null ? `${item.gap > 0 ? '+' : ''}${item.gap.toFixed(2)}` : '—'}
      </span>
    </div>
  );
};

export default GapBar;
