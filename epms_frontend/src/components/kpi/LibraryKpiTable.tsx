import React, { useState } from "react";
import { Trash2, Plus, AlertTriangle, Lock } from "lucide-react";

interface LibraryKpiTableProps {
  details: any[];
  categories?: any[];
  onDetailChange?: (index: number, field: string, value: any) => void;
  onAddRow?: () => void;
  onRemoveRow?: (index: number) => void;
  totalWeight?: number;
  isReadOnly?: boolean;
}

const LibraryKpiTable: React.FC<LibraryKpiTableProps> = ({
  details,
  categories = [],
  onDetailChange = () => {},
  onAddRow = () => {},
  onRemoveRow = () => {},
  totalWeight = 0,
  isReadOnly = false,
}) => {
  // READ-ONLY mode: compact table used in modals / history view
  if (isReadOnly) {
    return (
      <section className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 w-1/3">KPI</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 w-1/5">Category</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 w-24 text-center">Target</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 w-32">Unit</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 w-24 text-center">Weight</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20 text-center">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {details.map((detail, index) => (
                <tr key={index} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">{detail.goalTitle}</td>
                  <td className="px-3 py-2 text-sm text-gray-600 border-r border-gray-100">
                    {detail.categoryName || categories.find(c => c.id === detail.categoryId)?.name || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100 text-right">{detail.targetValue}</td>
                  <td className="px-3 py-2 text-sm text-gray-600 border-r border-gray-100">{detail.unit}</td>
                  <td className="px-3 py-2 text-sm font-semibold text-blue-700 border-r border-gray-100 text-center">{detail.weightPercent}%</td>
                  <td className="px-3 py-2 text-center">
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
                      background: detail.isCompliance ? '#EEF3FD' : '#F5F6F8',
                      color: detail.isCompliance ? '#0C447C' : '#9EA3B0',
                      border: `0.5px solid ${detail.isCompliance ? '#B5D4F4' : '#E0E2E8'}` }}>
                      {detail.isCompliance ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold text-gray-700 border-r border-gray-200">
                  Total Weight
                </td>
                <td className="px-3 py-2 text-center border-r border-gray-200">
                  <span className={`text-sm font-bold ${totalWeight === 100 ? 'text-green-600' : totalWeight > 100 ? 'text-red-600' : 'text-blue-600'}`}>
                    {totalWeight}%
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    );
  }

  // EDIT MODE: card grid layout
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);

  const remaining = 100 - totalWeight;
  const isOver = totalWeight > 100;
  const isExact = totalWeight === 100;
  const isLocked = totalWeight >= 100;

  // Clamp weight so this card can't push total above 100.
  // Max for card[i] = current weight of card[i] + remaining budget (negative means must reduce).
  const handleWeightChange = (index: number, raw: string) => {
    const parsed = raw === '' ? '' : Math.max(0, Number(raw));
    if (parsed === '') { onDetailChange(index, 'weightPercent', ''); return; }
    const currentCardWeight = Number(details[index].weightPercent) || 0;
    const budget = currentCardWeight + (100 - totalWeight); // max this card can be
    const capped = Math.min(parsed as number, Math.min(35, Math.max(0, budget)));
    onDetailChange(index, 'weightPercent', capped);
  };

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid #E4E6EC',
    borderRadius: 8,
    fontSize: 13,
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#FFFFFF',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: '#9EA3B0',
    display: 'block',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  };

  return (
    <div>
      {/* Card Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {details.map((detail, index) => (
          <div key={index} style={{ background: '#FFFFFF', border: '1px solid #E4E6EC', borderRadius: 12, padding: '16px' }}>
            {/* Card header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={labelStyle}>Goal Title</span>
              {details.length > 1 && (
                <button
                  onClick={() => onRemoveRow(index)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#D1D5DB', display: 'flex', alignItems: 'center' }}
                  className="hover:text-red-500 transition-colors"
                  title="Remove goal">
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Goal title */}
            <input
              type="text"
              value={detail.goalTitle}
              onChange={e => onDetailChange(index, 'goalTitle', e.target.value)}
              placeholder="Enter goal title..."
              style={{ ...inputBase, marginBottom: 12 }}
              className="focus:border-blue-400"
            />

            {/* Category + Weight row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select
                  value={detail.categoryId}
                  onChange={e => onDetailChange(index, 'categoryId', e.target.value)}
                  style={{ ...inputBase, fontSize: 12 }}>
                  <option value={0}>Select...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.categoryName || c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                {/* Label row with lock icon + tooltip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, position: 'relative' }}>
                  <span style={labelStyle}>Weight %</span>
                  {isLocked && (
                    <div
                      style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'default' }}
                      onMouseEnter={() => setTooltipIndex(index)}
                      onMouseLeave={() => setTooltipIndex(null)}>
                      <Lock size={11} style={{ color: '#F59E0B' }} />
                      {tooltipIndex === index && (
                        <div style={{
                          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
                          transform: 'translateX(-50%)',
                          background: '#1F2937', color: '#F9FAFB',
                          fontSize: 11, fontWeight: 500, lineHeight: 1.5,
                          padding: '6px 10px', borderRadius: 7,
                          whiteSpace: 'nowrap', pointerEvents: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                          zIndex: 50,
                        }}>
                          {isExact
                            ? 'Total is 100%. Reduce another card to add more here.'
                            : 'Total exceeded 100%. You must reduce this weight.'}
                          <div style={{
                            position: 'absolute', top: '100%', left: '50%',
                            transform: 'translateX(-50%)',
                            width: 0, height: 0,
                            borderLeft: '5px solid transparent',
                            borderRight: '5px solid transparent',
                            borderTop: '5px solid #1F2937',
                          }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  max="35"
                  value={detail.weightPercent}
                  onKeyDown={e => e.key === '-' && e.preventDefault()}
                  onChange={e => handleWeightChange(index, e.target.value)}
                  style={{
                    ...inputBase,
                    border: `1.5px solid ${detail.weightPercent > 35 ? '#EF4444' : isLocked ? '#F59E0B' : '#1A56DB'}`,
                    background: detail.weightPercent > 35 ? '#FEF2F2' : isLocked ? '#FFFBEB' : '#EEF3FD',
                    color: detail.weightPercent > 35 ? '#DC2626' : isLocked ? '#B45309' : '#1A56DB',
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                />
                {detail.weightPercent > 35 && (
                  <p style={{ fontSize: 10, color: '#DC2626', marginTop: 3 }}>Max 35% per goal</p>
                )}
              </div>
            </div>

            {/* Target value + Unit row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Target Value</label>
                <input
                  type="number"
                  min="1"
                  value={detail.targetValue}
                  disabled={detail.isCompliance}
                  onKeyDown={e => e.key === '-' && e.preventDefault()}
                  onChange={e => {
                    const v = e.target.value;
                    onDetailChange(index, 'targetValue', v === '' ? '' : Math.max(1, Number(v)));
                  }}
                  style={{
                    ...inputBase,
                    color: detail.isCompliance ? '#9EA3B0' : '#111827',
                    background: detail.isCompliance ? '#F5F6F8' : '#FFFFFF',
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Unit</label>
                <input
                  type="text"
                  value={detail.unit}
                  onChange={e => onDetailChange(index, 'unit', e.target.value)}
                  placeholder="e.g., %, Count"
                  style={inputBase}
                  className="focus:border-blue-400"
                />
              </div>
            </div>

            {/* Compliance Tracking toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #F0F2F6' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Compliance Tracking</span>
              <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={detail.isCompliance || false}
                  onChange={e => onDetailChange(index, 'isCompliance', e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                />
                <div style={{
                  width: 42, height: 24, background: detail.isCompliance ? '#1A56DB' : '#D1D5DB',
                  borderRadius: 12, position: 'relative', transition: 'background 0.2s ease',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 3,
                    left: detail.isCompliance ? 21 : 3,
                    width: 18, height: 18,
                    background: '#FFFFFF',
                    borderRadius: 9,
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                  }} />
                </div>
              </label>
            </div>
          </div>
        ))}

        {/* Add New Goal Card */}
        <button
          onClick={onAddRow}
          style={{
            border: '1.5px dashed #D1D5DB', borderRadius: 12, padding: '24px 16px',
            background: 'transparent', cursor: 'pointer', minHeight: 200,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}
          className="hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F5F6F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={20} style={{ color: '#9EA3B0' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#9EA3B0' }}>Add New Goal Card</span>
        </button>
      </div>

      {/* Dark footer */}
      <div style={{
        background: '#111827', borderRadius: 12, padding: '18px 24px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        {/* Total Goals */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Total Goals</p>
          <p style={{ fontSize: 30, fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>{details.length}</p>
        </div>

        {/* Weight bar */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Current Total Weight</p>
          <p style={{ fontSize: 26, fontWeight: 700, color: isOver ? '#F87171' : isExact ? '#4ADE80' : '#FBBF24', marginBottom: 8, lineHeight: 1 }}>
            {totalWeight}%
          </p>
          <div style={{ width: 180, height: 6, background: '#374151', borderRadius: 3, overflow: 'hidden', margin: '0 auto' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(totalWeight, 100)}%`,
              background: isOver ? '#EF4444' : isExact ? '#22C55E' : '#F59E0B',
              borderRadius: 3,
              transition: 'width 0.3s ease, background 0.3s ease',
            }} />
          </div>
        </div>

        {/* Status label */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 6 }}>
            <AlertTriangle size={15} style={{ color: isExact ? '#4ADE80' : '#F59E0B', flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: isOver ? '#F87171' : isExact ? '#4ADE80' : '#FBBF24' }}>
              {isExact ? 'Verified' : isOver ? `Exceeded by ${totalWeight - 100}%` : `${remaining}% Remaining`}
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#6B7280' }}>
            {isExact ? 'Ready to publish' : 'Allocation must reach 100% to publish'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LibraryKpiTable;
