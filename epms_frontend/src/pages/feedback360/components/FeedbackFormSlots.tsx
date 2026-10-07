import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Edit3, Loader2, Plus } from 'lucide-react';
import { useGetFeedbackFormsByCycleQuery } from '../../../features/appraisal/appraisalApi';
import type { AppraisalForm } from '../../../features/appraisal/appraisalApi';
import { sectionTitle, smBtn } from '../constants/styles';

const REL_SLOTS: Array<{ rel: string; label: string; color: string }> = [
  { rel: 'DIRECT_MANAGER', label: 'Manager → Target', color: '#1A56DB' },
  { rel: 'PEER', label: 'Peer → Target', color: '#7C3AED' },
  { rel: 'SUBORDINATE', label: 'Subordinate → Target', color: '#059669' },
  { rel: 'SELF', label: 'Self-Assessment', color: '#D97706' },
];

interface FeedbackFormSlotsProps { cycleId: number; }

const FeedbackFormSlots = ({ cycleId }: FeedbackFormSlotsProps) => {
  const navigate = useNavigate();
  const { data: forms = [], isLoading } = useGetFeedbackFormsByCycleQuery(cycleId, { skip: !cycleId });

  const byRel: Record<string, AppraisalForm | undefined> = {};
  forms.forEach((f) => { if (f.targetRelationship) byRel[f.targetRelationship] = f; });

  const filled = REL_SLOTS.filter((s) => byRel[s.rel]).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={sectionTitle}>360° Feedback Forms</p>
          <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: -12, marginBottom: 0 }}>
            Each relationship type needs its own form. {filled}/4 slots filled.
          </p>
        </div>
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9EA3B0', padding: '8px 0' }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13 }}>Loading forms…</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {REL_SLOTS.map(({ rel, label, color }) => {
            const form = byRel[rel];
            return (
              <div key={rel} style={{
                border: `0.5px solid ${form ? '#A7F3D0' : '#E4E6EC'}`,
                borderRadius: 10,
                padding: '14px 16px',
                background: form ? '#F0FDF4' : '#FAFBFC',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</span>
                  {form && <CheckCircle size={13} color="#059669" style={{ marginLeft: 'auto' }} />}
                </div>
                {form ? (
                  <>
                    <p style={{ fontSize: 12, color: '#374151', margin: 0, fontWeight: 500 }}>{form.formName}</p>
                    <button
                      style={{ ...smBtn('neutral'), fontSize: 11, padding: '5px 10px', alignSelf: 'flex-start' }}
                      onClick={() => navigate(`/appraisal-forms/design?edit=true&formId=${form.formId}&type=FEEDBACK&cycleId=${cycleId}&relationship=${rel}`)}
                    >
                      <Edit3 size={10} /> Edit Form
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 11, color: '#9EA3B0', margin: 0 }}>No form assigned</p>
                    <button
                      style={{ ...smBtn('neutral'), fontSize: 11, padding: '5px 10px', alignSelf: 'flex-start', background: '#EEF3FD', color: '#1A56DB', borderColor: '#BFCFFA' }}
                      onClick={() => navigate(`/appraisal-forms/design?type=FEEDBACK&cycleId=${cycleId}&relationship=${rel}`)}
                    >
                      <Plus size={10} /> Create Form
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {filled < 4 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 12px', background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: 8 }}>
          <AlertCircle size={13} color="#D97706" />
          <span style={{ fontSize: 12, color: '#92400E' }}>
            {4 - filled} form{4 - filled !== 1 ? 's' : ''} missing — Generate will use a generic fallback form for those relationships.
          </span>
        </div>
      )}
    </div>
  );
};

// ── Cycle Dashboard Tab (Step 3) ──────────────────────────────────────────────

export default FeedbackFormSlots;
