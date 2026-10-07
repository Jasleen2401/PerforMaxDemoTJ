import React from 'react';

interface LibraryBasicInfoProps {
  formData: {
    title: string;
    description: string;
    positionId: number;
    targetLevelId: number;
  };
  positions: any[];
  jobLevels: any[];
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #E4E6EC',
  borderRadius: 8,
  fontSize: 13,
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#FFFFFF',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: '#374151',
  display: 'block',
  marginBottom: 6,
};

const LibraryBasicInfo: React.FC<LibraryBasicInfoProps> = ({ formData, positions, onChange }) => {
  return (
    <section style={{ background: '#FFFFFF', border: '1px solid #E4E6EC', borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
        <div>
          <label style={labelStyle}>Template Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={onChange}
            placeholder="e.g., Q4 Sales Performance Template"
            style={inputStyle}
            className="focus:border-blue-400"
          />
        </div>

        <div>
          <label style={labelStyle}>Target Position</label>
          <select
            name="positionId"
            value={formData.positionId}
            onChange={onChange}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value={0}>Select Position</option>
            {positions.map(p => (
              <option key={p.positionId} value={p.positionId}>{p.positionName}</option>
            ))}
          </select>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={onChange}
            rows={3}
            placeholder="Enter objective description and template usage guidelines..."
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
            className="focus:border-blue-400"
          />
        </div>
      </div>
    </section>
  );
};

export default LibraryBasicInfo;
