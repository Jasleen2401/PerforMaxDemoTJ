import type { ParticipationStat } from '../../features/feedback360/feedback360Types';

const REL_LABEL: Record<string, string> = {
  DIRECT_MANAGER: 'Manager',
  PEER:           'Peers',
  SUBORDINATE:    'Subordinates',
  SELF:           'Self',
};

interface ParticipationStripProps {
  stats: ParticipationStat[];
}

const ParticipationStrip = ({ stats }: ParticipationStripProps) => (
  <div style={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    padding: '10px 14px',
    background: '#F5F6F8',
    borderRadius: 8,
  }}>
    {stats.map((s) => (
      <div key={s.relationship} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 12, color: '#5A6070' }}>
          {REL_LABEL[s.relationship] ?? s.relationship}{' '}
          <strong style={{ color: '#111827' }}>{s.submitted}/{s.requested}</strong>
        </span>
        {s.suppressed && (
          <span style={{ fontSize: 10, color: '#9EA3B0' }}>
            (comments hidden — fewer than minimum required)
          </span>
        )}
      </div>
    ))}
  </div>
);

export default ParticipationStrip;
