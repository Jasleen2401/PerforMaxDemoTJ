import React from 'react';
import { AlertTriangle } from 'lucide-react';

const LibrarySyncInfo: React.FC = () => {
  return (
    <div style={{
      background: '#FFF7ED',
      border: '1px solid #FED7AA',
      borderRadius: 12,
      padding: '14px 18px',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 34, height: 34, background: '#FFEDD5', borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <AlertTriangle size={17} style={{ color: '#C2410C' }} />
      </div>
      <div>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#C2410C', marginBottom: 6 }}>Entry Validation Rules</h4>
        <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: '#92400E', lineHeight: 1.7 }}>
          <li>Total weight must equal 100%</li>
          <li>No single item weight may exceed 35%</li>
        </ul>
      </div>
    </div>
  );
};

export default LibrarySyncInfo;
