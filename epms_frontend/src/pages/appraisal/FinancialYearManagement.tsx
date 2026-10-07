import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useGetFinancialYearsQuery,
  useCreateFinancialYearMutation,
  useSetCurrentFinancialYearMutation,
  useDeleteFinancialYearMutation,
  useDeactivateFinancialYearMutation
} from '../../features/appraisal/financialYearApi';
import { Plus, CheckCircle2, Trash2, History, ShieldCheck, AlertTriangle, Power, Archive, Clock3 } from 'lucide-react';
import { Can } from '../../components/Can';
import { format, addYears, subDays, parseISO, isValid } from 'date-fns';
import { CustomDateInput } from '../../components/common/CustomDateInput';

const inputStyle: React.CSSProperties = {
  background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8,
  padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5,
};

type FinancialYearStatus = 'NOT_USED' | 'CURRENT' | 'HISTORICAL';

const getYearStatus = (year: any): FinancialYearStatus => {
  if (year.status) return year.status;
  return year.isCurrent || year.current ? 'CURRENT' : 'NOT_USED';
};

const statusMeta: Record<FinancialYearStatus, { label: string; bg: string; text: string; border: string }> = {
  CURRENT: { label: 'Current', bg: '#EEF3FD', text: '#0C447C', border: '#B5D4F4' },
  HISTORICAL: { label: 'Historical', bg: '#F1EFE8', text: '#444441', border: '#DDDBD2' },
  NOT_USED: { label: 'Not Used', bg: '#FAEEDA', text: '#633806', border: '#F0D4A4' },
};

const FinancialYearManagement = () => {
  const { data: years, isLoading } = useGetFinancialYearsQuery();
  const [createYear] = useCreateFinancialYearMutation();
  const [setCurrent] = useSetCurrentFinancialYearMutation();
  const [deactivateYear] = useDeactivateFinancialYearMutation();
  const [deleteYear] = useDeleteFinancialYearMutation();

  const [showAddModal, setShowAddModal] = useState(false);
  const [warningModal, setWarningModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: '',
  });
  const [newYear, setNewYear] = useState({ title: '', startDate: '', endDate: '', isCurrent: false });
  const hasCurrentYear = !!years?.some(year => getYearStatus(year) === 'CURRENT');

  const handleStartDateChange = (startStr: string) => {
    if (!startStr) return;
    const startDate = parseISO(startStr);
    if (!isValid(startDate)) return;
    const calculatedEnd = subDays(addYears(startDate, 1), 1);
    const endStr = format(calculatedEnd, 'yyyy-MM-dd');
    const startYear = startDate.getFullYear();
    const generatedTitle = `FY ${startYear}-${startYear + 1}`;
    setNewYear({ ...newYear, startDate: startStr, endDate: endStr, title: newYear.title === '' || newYear.title.startsWith('FY ') ? generatedTitle : newYear.title });
  };

  const handleAdd = async () => {
    if (!newYear.title || !newYear.startDate || !newYear.endDate) { toast.warning('Please fill all required fields'); return; }
    const start = parseISO(newYear.startDate);
    const end = parseISO(newYear.endDate);
    if (end < addYears(start, 1) && format(end, 'yyyy-MM-dd') !== format(subDays(addYears(start, 1), 1), 'yyyy-MM-dd')) {
      if (!window.confirm('The period is less than one year. Proceed?')) return;
    }
    try {
      await createYear({ ...newYear, isCurrent: false }).unwrap();
      setShowAddModal(false);
      setNewYear({ title: '', startDate: '', endDate: '', isCurrent: false });
    } catch { toast.error('Failed to create financial year'); }
  };

  const handleSetCurrent = async (id: number) => {
    if (window.confirm('Activate this financial year?')) {
      try { await setCurrent(id).unwrap(); }
      catch (err: any) { toast.warning('Failed to activate financial year.'); }
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!window.confirm('Deactivate this financial year? It will become historical and cannot be reactivated.')) return;
    try {
      await deactivateYear(id).unwrap();
    } catch (err: any) {
      setWarningModal({
        isOpen: true,
        title: 'Active Appraisal Cycle Found',
        message: 'Finalize the active appraisal cycle related to this financial year before deactivating it.',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this financial year?')) await deleteYear(id);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Financial Year Configuration</h1>
          <p style={{ fontSize: 13, color: '#9EA3B0', marginTop: 2 }}>Manage corporate periods and active appraisal timelines.</p>
        </div>
        <Can permission="CYCLE_CONFIG_MANAGE">
          <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 transition-colors self-start sm:self-auto"
            style={{ background: '#1A56DB', color: '#FFFFFF', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, border: 'none' }}>
            <Plus size={14} /> Initialize New FY
          </button>
        </Can>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EEF3FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <History size={16} style={{ color: '#1A56DB' }} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Periods</p>
            <p style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>{years?.length || 0}</p>
          </div>
        </div>
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={16} style={{ color: '#27500A' }} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Status</p>
            <p style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>{years?.filter(y => getYearStatus(y) === 'CURRENT').length || 0} Period Live</p>
          </div>
        </div>
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock3 size={16} style={{ color: '#633806' }} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Not Used</p>
            <p style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>{years?.filter(y => getYearStatus(y) === 'NOT_USED').length || 0} Ready</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 520 }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #E4E6EC' }}>
                {['Financial Year', 'Start Date', 'End Date', 'Status', ''].map((h, i) => (
                  <th key={h + i} style={{ padding: '10px 18px', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading…</td></tr>
              ) : years?.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>No financial years configured.</td></tr>
              ) : years?.map((year, idx) => {
                const status = getYearStatus(year);
                const isCurrent = status === 'CURRENT';
                const isNotUsed = status === 'NOT_USED';
                const meta = statusMeta[status];
                return (
                  <tr key={year.id} style={{ borderBottom: idx < (years.length - 1) ? '0.5px solid #F0F2F6' : 'none' }}
                    className="hover:bg-[#FAFBFF] transition-colors">
                    <td style={{ padding: '11px 18px' }}>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: isCurrent ? '#1A56DB' : status === 'NOT_USED' ? '#F59E0B' : '#E4E6EC', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{year.title}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 18px', fontSize: 12, color: '#5A6070' }}>{format(new Date(year.startDate), 'dd/MM/yyyy')}</td>
                    <td style={{ padding: '11px 18px', fontSize: 12, color: '#5A6070' }}>{format(new Date(year.endDate), 'dd/MM/yyyy')}</td>
                    <td style={{ padding: '11px 18px' }}>
                      <span style={{ fontSize: 11, fontWeight: 500, background: meta.bg, color: meta.text, border: `0.5px solid ${meta.border}`, borderRadius: 20, padding: '2px 8px' }}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 18px', textAlign: 'right' }}>
                      <Can permission="CYCLE_CONFIG_MANAGE">
                        <div className="flex justify-end items-center gap-1">
                          {isNotUsed && (
                            <button onClick={() => handleSetCurrent(year.id)} disabled={hasCurrentYear} title={hasCurrentYear ? 'Deactivate the current year before activating another one' : 'Activate'}
                              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasCurrentYear ? '#D1D5DB' : '#9EA3B0', borderRadius: 6, cursor: hasCurrentYear ? 'not-allowed' : 'pointer' }}
                              className="hover:bg-[#EEF3FD] hover:text-[#1A56DB] transition-colors disabled:hover:bg-transparent disabled:hover:text-[#D1D5DB]">
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          {isCurrent && (
                            <button onClick={() => handleDeactivate(year.id)} title="Deactivate"
                              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9EA3B0', borderRadius: 6 }}
                              className="hover:bg-[#FAEEDA] hover:text-[#633806] transition-colors">
                              <Power size={14} />
                            </button>
                          )}
                          {isNotUsed && (
                            <button onClick={() => handleDelete(year.id)} title="Delete"
                              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9EA3B0', borderRadius: 6 }}
                              className="hover:bg-[#FCEBEB] hover:text-[#791F1F] transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                          {status === 'HISTORICAL' && (
                            <span title="Historical years are locked" style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D1D5DB' }}>
                              <Archive size={14} />
                            </span>
                          )}
                        </div>
                      </Can>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.5)' }}>
          <div onClick={() => setShowAddModal(false)} className="absolute inset-0" />
          <div style={{ position: 'relative', background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, width: '100%', maxWidth: 480 }}>
            <div style={{ padding: '16px 18px', borderBottom: '0.5px solid #E4E6EC' }}>
              <h3 style={{ fontSize: 16, fontWeight: 500, color: '#111827', marginBottom: 4 }}>Initialize Financial Year</h3>
              <p style={{ fontSize: 12, color: '#9EA3B0' }}>Define a new corporate calendar period.</p>
            </div>
            <div style={{ padding: '16px 18px' }} className="space-y-4">
              <div>
                <label style={labelStyle}>Financial Year Title</label>
                <input type="text" placeholder="e.g. FY 2024-2025" style={inputStyle}
                  value={newYear.title} onChange={e => setNewYear({ ...newYear, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <CustomDateInput style={inputStyle} value={newYear.startDate} onChange={handleStartDateChange} />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <CustomDateInput style={inputStyle} value={newYear.endDate} onChange={val => setNewYear({ ...newYear, endDate: val })} />
                </div>
              </div>
              <div style={{ background: '#FAEEDA', border: '0.5px solid #F0D4A4', borderRadius: 8, padding: '10px 12px' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#633806', display: 'block' }}>Created as Not Used</span>
                <span style={{ fontSize: 11, color: '#5A6070' }}>Activate this period later after the current year is deactivated.</span>
              </div>
            </div>
            <div className="flex gap-2" style={{ padding: '14px 18px', borderTop: '0.5px solid #E4E6EC' }}>
              <button onClick={() => setShowAddModal(false)} className="flex-1 transition-colors"
                style={{ background: '#F5F6F8', color: '#5A6070', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleAdd} className="flex-[2] transition-colors"
                style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 500 }}>
                Create Period
              </button>
            </div>
          </div>
        </div>
      )}
      {warningModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.5)' }}>
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: 22, maxWidth: 440, width: '100%' }}>
            <div className="flex items-start gap-3">
              <div style={{ width: 38, height: 38, borderRadius: 8, background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} style={{ color: '#633806' }} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 6 }}>{warningModal.title}</p>
                <p style={{ fontSize: 13, color: '#5A6070', lineHeight: 1.5 }}>{warningModal.message}</p>
              </div>
            </div>
            <div className="flex justify-end" style={{ marginTop: 18 }}>
              <button onClick={() => setWarningModal({ isOpen: false, title: '', message: '' })}
                style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500 }}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialYearManagement;
