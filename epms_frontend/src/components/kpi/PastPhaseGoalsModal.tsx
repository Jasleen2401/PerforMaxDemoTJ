import React from 'react';
import { X, Calendar } from 'lucide-react';
import LibraryKpiTable from './LibraryKpiTable';
import { useGetGoalSetByIdQuery } from '../../services/kpiApi';

interface PastPhaseGoalsModalProps {
  phase: any;
  categories?: any[];
  onClose: () => void;
}

const formatDate = (d?: string | null) => {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleString();
  } catch (e) {
    return String(d);
  }
};

const mapDetails = (phase: any) => {
  const raw = phase?.details || phase?.goalDetails || phase?.goals || phase?.kpis || [];
  return raw.map((item: any) => ({
    goalTitle: item.goalTitle || item.title || item.name || item.kpiTitle || '',
    categoryId: item.categoryId ?? item.category?.id ?? 0,
    categoryName: item.categoryName ?? item.category?.name ?? item.category?.categoryName ?? '',
    targetValue: item.targetValue ?? item.target ?? item.targetValueDisplay ?? '',
    unit: item.unit ?? item.unitName ?? '',
    weightPercent: item.weightPercent ?? item.weight ?? Math.round((item.weightDecimal ?? 0) * 100) ?? 0,
    isCompliance: !!item.isCompliance || !!item.compliance,
  }));
};

const PastPhaseGoalsModal: React.FC<PastPhaseGoalsModalProps> = ({ phase, categories = [], onClose }) => {
  const goalSetId = phase?.goalSetId;
  const { data: goalSetResponse, isLoading, isError, error } = useGetGoalSetByIdQuery(goalSetId ?? 0, { skip: !goalSetId });

  const itemsSource = goalSetResponse?.data?.items || phase?.details || phase?.goalDetails || phase?.goals || phase?.kpis || [];
  const details = itemsSource.map((item: any) => ({
    goalTitle: item.title ?? item.goalTitle ?? item.name ?? item.kpiTitle ?? '',
    categoryId: item.categoryId ?? item.category?.id ?? 0,
    categoryName: item.categoryName ?? item.category?.name ?? item.category?.categoryName ?? '',
    targetValue: item.targetValue ?? item.target ?? item.targetValueDisplay ?? item.targetValue ?? '',
    unit: item.unit ?? item.unitName ?? '',
    weightPercent: item.weightPercent ?? item.weight ?? Math.round((item.weightDecimal ?? 0) * 100) ?? 0,
    isCompliance: !!item.isCompliance || !!item.compliance,
  }));

  const totalWeight = details.reduce((s: number, d: any) => s + (Number(d.weightPercent) || 0), 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
        backdropFilter: 'blur(3px)',
      }}
    >
      <div style={{ width: '92%', maxWidth: 920, background: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Calendar size={18} className="text-blue-600" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Phase {phase?.phaseNumber ?? '—'} Goals</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{phase?.status ?? 'Unknown'} • {formatDate(phase?.startDate)} — {formatDate(phase?.endDate)}</div>
            </div>
          </div>

          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 8 }} title="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {phase?.changeReason && (
            <p style={{ fontSize: 13, color: '#374151', marginBottom: 12, fontStyle: 'italic' }}>
              Reason: "{phase.changeReason}"
            </p>
          )}

          {isLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#6B7280' }}>Loading goals…</div>
          ) : isError ? (
            <div style={{ padding: 20, border: '1px solid #FECACA', borderRadius: 8, background: '#FFF1F2', color: '#991B1B' }}>
              Failed to load goals. {(error as any)?.data?.message || (error as any)?.message || ''}
            </div>
          ) : details.length > 0 ? (
            <LibraryKpiTable details={details} categories={categories} totalWeight={totalWeight} isReadOnly />
          ) : (
            <div style={{ padding: 20, border: '1px dashed #E5E7EB', borderRadius: 8, textAlign: 'center', color: '#6B7280' }}>
              No goals found for this phase.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PastPhaseGoalsModal;
