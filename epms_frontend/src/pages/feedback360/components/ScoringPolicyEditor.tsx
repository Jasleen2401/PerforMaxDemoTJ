import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { useGetScoringPoliciesQuery, useUpsertScoringPolicyMutation } from '../../../features/feedback360/feedback360Api';
import type { ScoringPolicy } from '../../../features/feedback360/feedback360Types';
import { useGetJobLevelsQuery } from '../../../features/org/jobLevelApi';
import { inputStyle, smBtn } from '../constants/styles';

// ── Types ──────────────────────────────────────────────────────────────────────

const WEIGHT_KEYS: Array<keyof Pick<ScoringPolicy, 'managerWeight' | 'peerWeight' | 'subordinateWeight' | 'selfWeight'>> =
  ['managerWeight', 'peerWeight', 'subordinateWeight', 'selfWeight'];

const WEIGHT_LABELS: Record<string, string> = {
  managerWeight: 'Manager',
  peerWeight: 'Peer',
  subordinateWeight: 'Subordinate',
  selfWeight: 'Self',
};

interface PolicyRowState {
  jobLevelId?: number;
  label: string;
  managerWeight: number;
  peerWeight: number;
  subordinateWeight: number;
  selfWeight: number;
  includeSelfInFinal: boolean;
  suppressionThreshold: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

const ScoringPolicyEditor = ({ cycleId }: { cycleId: number }) => {
  const { data: policies, isLoading } = useGetScoringPoliciesQuery(cycleId, { skip: !cycleId });
  const { data: allLevels = [] } = useGetJobLevelsQuery();
  const [upsert, { isLoading: saving }] = useUpsertScoringPolicyMutation();
  const [rows, setRows] = useState<PolicyRowState[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');

  // Only rank 4–7 participate in 360 Feedback
  const eligibleLevels = allLevels.filter((l) => l.levelRank >= 4 && l.levelRank <= 7);

  const makeLevelLabel = (levelId: number) => {
    const lvl = eligibleLevels.find((l) => l.levelId === levelId);
    return lvl ? `${lvl.levelCode} — ${lvl.levelName}` : `Job Level ${levelId}`;
  };

  useEffect(() => {
    if (!policies) return;
    setRows(
      policies.map((p) => ({
        jobLevelId: p.jobLevelId ?? undefined,
        label: p.jobLevelId ? makeLevelLabel(p.jobLevelId) : 'Base Policy (fallback)',
        managerWeight: p.managerWeight,
        peerWeight: p.peerWeight,
        subordinateWeight: p.subordinateWeight,
        selfWeight: p.selfWeight,
        includeSelfInFinal: p.includeSelfInFinal,
        suppressionThreshold: p.suppressionThreshold,
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policies, eligibleLevels.length]);

  const updateRow = (i: number, patch: Partial<PolicyRowState>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const rowTotal = (row: PolicyRowState) =>
    +(row.managerWeight + row.peerWeight + row.subordinateWeight + row.selfWeight).toFixed(3);

  const handleSave = async (i: number) => {
    const row = rows[i];
    const total = rowTotal(row);
    if (Math.abs(total - 1) > 0.001) {
      toast.error(`Weights must sum to 1.00 (currently ${total.toFixed(3)}).`);
      return;
    }
    try {
      await upsert({ cycleId, ...row }).unwrap();
      toast.success('Scoring policy saved.');
    } catch {
      toast.error('Failed to save scoring policy.');
    }
  };

  // Levels not yet in the table
  const availableLevels = eligibleLevels.filter(
    (l) => !rows.some((r) => r.jobLevelId === l.levelId)
  );

  const handleAddLevel = () => {
    if (!selectedLevelId) return;
    const levelId = parseInt(selectedLevelId);
    if (rows.some((r) => r.jobLevelId === levelId)) {
      toast.warn('This level already has a policy row.');
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        jobLevelId: levelId,
        label: makeLevelLabel(levelId),
        managerWeight: 0.5,
        peerWeight: 0.3,
        subordinateWeight: 0.2,
        selfWeight: 0,
        includeSelfInFinal: false,
        suppressionThreshold: 3,
      },
    ]);
    setSelectedLevelId('');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) return <p style={{ fontSize: 13, color: '#9EA3B0' }}>Loading policies…</p>;
  if (!rows.length) return <p style={{ fontSize: 13, color: '#9EA3B0' }}>No scoring policies found for this cycle.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Add Level Policy bar ── */}
      {availableLevels.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: '#F8FAFF',
            border: '1px dashed #BFD4F5',
            borderRadius: 8,
          }}
        >
          <select
            value={selectedLevelId}
            onChange={(e) => setSelectedLevelId(e.target.value)}
            style={{ ...inputStyle, flex: 1, maxWidth: 340 }}
          >
            <option value="">— Select Level to add policy —</option>
            {availableLevels.map((l) => (
              <option key={l.levelId} value={l.levelId}>
                {l.levelCode} — {l.levelName}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddLevel}
            disabled={!selectedLevelId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              background: selectedLevelId ? '#1A56DB' : '#E4E6EC',
              color: selectedLevelId ? '#fff' : '#9EA3B0',
              border: 'none',
              borderRadius: 8,
              cursor: selectedLevelId ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            <Plus size={13} />
            Add Level Policy
          </button>
          <span style={{ fontSize: 11, color: '#9EA3B0' }}>
            Weights must sum to 1.00 before saving
          </span>
        </div>
      )}

      {/* ── Policy Table ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E4E6EC', background: '#FAFBFC' }}>
              <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase' }}>
                Level
              </th>
              {WEIGHT_KEYS.map((k) => (
                <th
                  key={k}
                  style={{ textAlign: 'center', padding: '6px 8px', fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase' }}
                >
                  {WEIGHT_LABELS[k]}
                </th>
              ))}
              <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase' }}>
                Self in Final
              </th>
              <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase' }}>
                Min. Group
              </th>
              <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: 11, fontWeight: 600, color: '#5A6070', textTransform: 'uppercase' }}>
                Total
              </th>
              <th style={{ padding: '6px 8px' }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const total = rowTotal(row);
              const valid = Math.abs(total - 1) <= 0.001;
              const isBase = !row.jobLevelId;
              return (
                <tr key={i} style={{ borderBottom: '0.5px solid #F0F2F8', background: isBase ? '#FAFBFE' : 'white' }}>
                  {/* Level label */}
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isBase && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            background: '#EEF3FD',
                            color: '#1A56DB',
                            borderRadius: 10,
                            border: '0.5px solid #BFD4F5',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          FALLBACK
                        </span>
                      )}
                      <span style={{ color: '#111827', fontWeight: isBase ? 600 : 500 }}>
                        {row.label}
                      </span>
                    </div>
                  </td>

                  {/* Weight inputs */}
                  {WEIGHT_KEYS.map((k) => (
                    <td key={k} style={{ padding: '4px 6px', textAlign: 'center' }}>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={row[k]}
                        onChange={(e) => updateRow(i, { [k]: parseFloat(e.target.value) || 0 })}
                        style={{ ...inputStyle, width: 70, textAlign: 'center', padding: '5px 6px' }}
                      />
                    </td>
                  ))}

                  {/* Self in Final */}
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={row.includeSelfInFinal}
                      onChange={(e) => updateRow(i, { includeSelfInFinal: e.target.checked })}
                      style={{ width: 15, height: 15, cursor: 'pointer' }}
                    />
                  </td>

                  {/* Suppression Threshold */}
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step={1}
                      value={row.suppressionThreshold}
                      onChange={(e) => updateRow(i, { suppressionThreshold: parseInt(e.target.value) || 1 })}
                      style={{ ...inputStyle, width: 60, textAlign: 'center', padding: '5px 6px' }}
                    />
                  </td>

                  {/* Total */}
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: valid ? '#059669' : '#EF4444' }}>
                      {total.toFixed(2)}
                    </span>
                  </td>

                  {/* Save button */}
                  <td style={{ padding: '4px 8px' }}>
                    <button
                      style={smBtn('success')}
                      onClick={() => handleSave(i)}
                      disabled={!valid || saving}
                    >
                      {saving ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScoringPolicyEditor;
