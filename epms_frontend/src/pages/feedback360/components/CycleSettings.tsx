import { inputStyle, labelStyle, panel, sectionTitle } from '../constants/styles';

interface CycleOption {
  cycleId: number;
  cycleName: string;
}

interface CycleSettingsProps {
  cycles: CycleOption[];
  cyclesLoading: boolean;
  cycleId: number;
  previousCycleId: string;
  globalMaxLimit: number;
  excludeLongTermLeave: boolean;
  setCycleId: (cycleId: number) => void;
  setPreviousCycleId: (cycleId: string) => void;
  setGlobalMaxLimit: (limit: number) => void;
  setExcludeLongTermLeave: (exclude: boolean) => void;
}

const CycleSettings = ({
  cycles,
  cyclesLoading,
  cycleId,
  previousCycleId,
  globalMaxLimit,
  excludeLongTermLeave,
  setCycleId,
  setPreviousCycleId,
  setGlobalMaxLimit,
  setExcludeLongTermLeave,
}: CycleSettingsProps) => (
  <div style={panel}>
    <p style={sectionTitle}>Cycle Settings</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
      <div>
        <label style={labelStyle}>Active Cycle *</label>
        {cyclesLoading ? (
          <select style={{ ...inputStyle, width: '100%' }} disabled><option>Loading cycles...</option></select>
        ) : (
          <select
            style={{ ...inputStyle, width: '100%' }}
            value={cycleId || ''}
            onChange={(e) => setCycleId(Number(e.target.value) || 0)}
          >
            <option value="">-- Select Cycle --</option>
            {cycles.map((c) => (
              <option key={c.cycleId} value={c.cycleId}>
                {c.cycleName} (ID: {c.cycleId})
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label style={labelStyle}>Previous Cycle</label>
        {cyclesLoading ? (
          <select style={{ ...inputStyle, width: '100%' }} disabled><option>Loading cycles...</option></select>
        ) : (
          <select
            style={{ ...inputStyle, width: '100%' }}
            value={previousCycleId}
            onChange={(e) => setPreviousCycleId(e.target.value)}
          >
            <option value="">-- None / Select Previous Cycle --</option>
            {cycles
              .filter((c) => c.cycleId !== cycleId)
              .map((c) => (
                <option key={c.cycleId} value={String(c.cycleId)}>
                  {c.cycleName} (ID: {c.cycleId})
                </option>
              ))}
          </select>
        )}
      </div>
      <div>
        <label style={labelStyle}>Max Evaluators per Person</label>
        <input
          type="number"
          style={{ ...inputStyle, width: '100%', textAlign: 'right' }}
          value={globalMaxLimit}
          min={1}
          max={20}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            if (value >= 1 && value <= 20) {
              setGlobalMaxLimit(value);
            } else if (e.target.value === '') {
              setGlobalMaxLimit(1);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === '-' || e.key === 'e') {
              e.preventDefault();
            }
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={labelStyle}>Exclude Long-Term Leave</label>
        <div style={{ display: 'flex', alignItems: 'center', height: 36 }}>
          <input type="checkbox" id="excludeLTL" checked={excludeLongTermLeave} onChange={(e) => setExcludeLongTermLeave(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
          <label htmlFor="excludeLTL" style={{ fontSize: 13, color: '#5A6070', marginLeft: 8, cursor: 'pointer' }}>Yes</label>
        </div>
      </div>
    </div>
  </div>
);

export default CycleSettings;
