import { Lock } from 'lucide-react';

interface SuppressionNoticeProps {
  message?: string;
  relationship?: string;
}

const REL_LABEL: Record<string, string> = {
  DIRECT_MANAGER: 'manager',
  PEER:           'peer',
  SUBORDINATE:    'subordinate',
  SELF:           'self',
};

const SuppressionNotice = ({ message, relationship }: SuppressionNoticeProps) => {
  const text = message
    ?? (relationship
      ? `${REL_LABEL[relationship] ?? relationship} comments hidden — fewer than the minimum required.`
      : 'Comments from this group are hidden — fewer than the minimum required.');
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '10px 14px',
      background: '#F5F6F8',
      border: '0.5px solid #E4E6EC',
      borderRadius: 8,
      fontSize: 12,
      color: '#5A6070',
    }}>
      <Lock size={14} color="#9EA3B0" style={{ marginTop: 1, flexShrink: 0 }} />
      <div>
        <p style={{ margin: 0, fontWeight: 600 }}>{text}</p>
        <p style={{ margin: '4px 0 0', color: '#9EA3B0' }}>
          To protect evaluator anonymity, this section is hidden until enough evaluators submit feedback.
        </p>
      </div>
    </div>
  );
};

export default SuppressionNotice;
