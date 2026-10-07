import { Lock } from 'lucide-react';

const AnonymousChip = () => (
  <span
    aria-label="This comment is anonymous"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 7px',
      borderRadius: 20,
      background: '#F5F6F8',
      color: '#5A6070',
    }}
  >
    <Lock size={9} />
    Anonymous
  </span>
);

export default AnonymousChip;
