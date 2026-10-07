import React, { useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { useGetCyclesQuery, useCreateCycleMutation } from '../../features/appraisal/appraisalApi';

interface Field {
  id: string;
  type: 'RATING' | 'TEXTAREA';
  required: boolean;
  label: string;
}

interface Section {
  id: string;
  title: string;
  fields: Field[];
}

const inputStyle: React.CSSProperties = { background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 };

const CYCLE_STATUS_STYLE: Record<string, { background: string; color: string; border: string }> = {
  Active: { background: '#EEF3FD', color: '#0C447C', border: '0.5px solid #B5D4F4' },
  Closed: { background: '#F1EFE8', color: '#444441', border: '0.5px solid #DDDBD2' },
  Draft: { background: '#FAEEDA', color: '#633806', border: '0.5px solid #F0D4A4' },
  PLANNING: { background: '#F5F6F8', color: '#5A6070', border: '0.5px solid #E4E6EC' },
  IN_PROGRESS: { background: '#EEF3FD', color: '#0C447C', border: '0.5px solid #B5D4F4' },
  EVALUATION: { background: '#FAEEDA', color: '#633806', border: '0.5px solid #F0D4A4' },
  ARCHIVED: { background: '#64748B', color: '#FFFFFF', border: '0.5px solid #475569' },
};

const AppraisalAdminDashboard = () => {
  const { data: cycles = [], isLoading, isError } = useGetCyclesQuery();
  const [createCycle, { isLoading: isCreating }] = useCreateCycleMutation();

  const [cycleName, setCycleName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [frequency, setFrequency] = useState('Annual');

  const [sections, setSections] = useState<Section[]>([
    {
      id: 's1',
      title: 'Employee Self-Reflection',
      fields: [{ id: 'f1', type: 'RATING', required: true, label: 'Quantitative Performance' }]
    }
  ]);

  const handleAddSection = () => {
    setSections([...sections, { id: Date.now().toString(), title: 'New Section', fields: [] }]);
  };

  const handleAddField = (sectionId: string) => {
    setSections(sections.map(s => s.id === sectionId
      ? { ...s, fields: [...s.fields, { id: Date.now().toString(), type: 'TEXTAREA', required: false, label: 'New Field' }] }
      : s
    ));
  };

  const handleRemoveField = (sectionId: string, fieldId: string) => {
    setSections(sections.map(s => s.id === sectionId
      ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
      : s
    ));
  };

  const handleRemoveSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const handleLaunchCycle = async () => {
    if (!cycleName || !startDate || !endDate) return alert('Please fill all cycle parameters.');
    try {
      await createCycle({ cycleName, startDate, endDate, evaluationPeriod: frequency }).unwrap();
      alert('Appraisal cycle launched successfully!');
      setCycleName(''); setStartDate(''); setEndDate('');
    } catch (err: any) {
      alert('Operation failed. Please try again.');
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Appraisal Management</h1>
          <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>Orchestrate performance cycles and design strategic review frameworks.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#5A6070', background: '#F5F6F8', border: '0.5px solid #E4E6EC', borderRadius: 8, cursor: 'pointer' }}
            className="hover:border-[#9EA3B0] transition-colors">
            Archive Selected
          </button>
          <button onClick={handleLaunchCycle} disabled={isCreating}
            style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: isCreating ? 0.6 : 1 }}
            className="hover:opacity-90 transition-opacity disabled:opacity-50">
            {isCreating ? 'Launching...' : 'Launch Cycle'}
          </button>
        </div>
      </div>

      {/* Top Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cycle Parameters */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }} className="lg:col-span-4">
          <h2 style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Cycle Parameters</h2>
          <div className="space-y-4">
            <div>
              <label style={labelStyle}>Cycle Title</label>
              <input type="text" value={cycleName} onChange={e => setCycleName(e.target.value)}
                placeholder="e.g., Annual Performance Review 2" style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)} style={inputStyle}>
                <option value="Annual">Annual</option>
                <option value="Semi-Annual">Semi-Annual</option>
                <option value="Quarterly">Quarterly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Form Builder */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }} className="lg:col-span-8">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dynamic Form Builder</h2>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9EA3B0', display: 'flex' }}
              className="hover:text-[#111827] transition-colors" title="Save Draft">
              <Save size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {sections.map((section, sIndex) => (
              <div key={section.id} style={{ borderLeft: '2px solid #1A56DB', background: '#F5F6F8', border: '0.5px solid #E4E6EC', borderRadius: 8, padding: '12px 14px', position: 'relative' }}>
                <button onClick={() => handleRemoveSection(section.id)}
                  style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9EA3B0', display: 'flex' }}
                  className="hover:text-[#791F1F] transition-colors">
                  <Trash2 size={14} />
                </button>
                <input type="text" value={section.title}
                  onChange={e => { const ns = [...sections]; ns[sIndex].title = e.target.value; setSections(ns); }}
                  style={{ fontSize: 13, fontWeight: 500, color: '#111827', background: 'transparent', border: 'none', borderBottom: '1px dashed #E4E6EC', outline: 'none', marginBottom: 10, fontFamily: 'inherit', width: 'calc(100% - 28px)' }} />

                <div className="space-y-2">
                  {section.fields.map((field, fIndex) => (
                    <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center', background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 6, padding: '8px 10px' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Field Label</div>
                        <input type="text" value={field.label}
                          onChange={e => { const ns = [...sections]; ns[sIndex].fields[fIndex].label = e.target.value; setSections(ns); }}
                          style={{ fontSize: 13, color: '#111827', border: 'none', borderBottom: '0.5px solid #E0E2E8', outline: 'none', background: 'transparent', fontFamily: 'inherit', width: '100%' }} />
                      </div>
                      <select value={field.type}
                        onChange={e => { const ns = [...sections]; ns[sIndex].fields[fIndex].type = e.target.value as 'RATING' | 'TEXTAREA'; setSections(ns); }}
                        style={{ fontSize: 12, color: '#5A6070', background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '4px 6px', outline: 'none', fontFamily: 'inherit' }}>
                        <option value="RATING">Rating (1-5)</option>
                        <option value="TEXTAREA">Textarea</option>
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9EA3B0', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={field.required}
                          onChange={e => { const ns = [...sections]; ns[sIndex].fields[fIndex].required = e.target.checked; setSections(ns); }}
                          style={{ accentColor: '#1A56DB' }} />
                        Req.
                      </label>
                      <button onClick={() => handleRemoveField(section.id, field.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9EA3B0', display: 'flex' }}
                        className="hover:text-[#791F1F] transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => handleAddField(section.id)}
                    style={{ fontSize: 12, fontWeight: 500, color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontFamily: 'inherit' }}
                    className="hover:underline">
                    <Plus size={12} /> Add Field
                  </button>
                </div>
              </div>
            ))}

            <button onClick={handleAddSection}
              style={{ width: '100%', padding: '10px', border: '2px dashed #E4E6EC', borderRadius: 8, background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', fontFamily: 'inherit' }}
              className="hover:border-[#B5D4F4] hover:bg-[#EEF3FD] transition-colors group">
              <div style={{ width: 24, height: 24, background: '#E4E6EC', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                className="group-hover:bg-[#1A56DB] transition-colors">
                <Plus size={13} color="#9EA3B0" className="group-hover:text-white" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                className="group-hover:text-[#1A56DB] transition-colors">Add Section</span>
            </button>
          </div>
        </div>
      </div>

      {/* Existing Cycles */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #E4E6EC' }}>
          <h2 style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Existing Cycles</h2>
        </div>

        {isLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading cycles...</div>
        ) : isError ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: 13, color: '#791F1F' }}>Failed to load cycles.</div>
        ) : cycles.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>No cycles created yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #E4E6EC', background: '#F5F6F8' }}>
                  {['Cycle Name', 'Period', 'Frequency', 'Status'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle, idx) => {
                  const statusKey = cycle.status || 'Draft';
                  const statusStyle = CYCLE_STATUS_STYLE[statusKey] || CYCLE_STATUS_STYLE['Draft'];
                  return (
                    <tr key={cycle.cycleId} style={{ borderBottom: idx < cycles.length - 1 ? '0.5px solid #F0F2F6' : 'none' }}
                      className="hover:bg-[#FAFBFF] transition-colors">
                      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500, color: '#111827' }}>{cycle.cycleName}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#5A6070' }}>{cycle.startDate} – {cycle.endDate}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#5A6070' }}>{cycle.evaluationPeriod}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ ...statusStyle, display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>
                          {statusKey}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppraisalAdminDashboard;
