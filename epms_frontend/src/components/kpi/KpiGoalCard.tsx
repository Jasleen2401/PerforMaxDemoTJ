import React from 'react';
import { Award, TrendingUp, Play, Lock } from 'lucide-react';

interface KpiGoalCardProps {
  kpi: any;
  idx: number;
  onUpdate: (kpi: any) => void;
  canUpdate?: boolean;
}

const KpiGoalCard: React.FC<KpiGoalCardProps> = ({ kpi, onUpdate, canUpdate = false }) => {
  const progress = Math.min(Math.floor((kpi.currentProgress || 0) / (kpi.targetValue || 1) * 100), 100);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'COMPLETED': return { label: 'Completed', color: 'bg-emerald-500' };
      case 'IN_PROGRESS': return { label: 'In Progress', color: 'bg-blue-500' };
      case 'NOT_STARTED':
      default:
        return { label: 'Not Started', color: 'bg-slate-300' };
    }
  };
  const statusDisplay = getStatusDisplay(kpi.status || 'NOT_STARTED');

  const getCategoryStyles = (category?: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('strategic')) return 'bg-blue-50 text-blue-600';
    if (cat.includes('efficiency')) return 'bg-rose-50 text-rose-600';
    if (cat.includes('learning')) return 'bg-emerald-50 text-emerald-600';
    return 'bg-slate-50 text-slate-600';
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-2 mb-4">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${getCategoryStyles(kpi.categoryName)}`}>
          {kpi.categoryName || 'Strategic'}
        </span>
        <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 flex items-center gap-1">
          <Award className="w-3 h-3" /> {kpi.weightPercent}% Weight
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {kpi.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              {kpi.description || 'Implement proactive engagement strategies to optimize results and achieve targets.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Target</p>
              <p className="text-sm font-bold text-gray-900">{kpi.targetValue}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Actual</p>
              <p className="text-sm font-bold text-blue-600">{kpi.currentProgress}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Score</p>
              <p className="text-sm font-bold text-emerald-600">{kpi.scorePercent ? `${kpi.scorePercent.toFixed(1)}%` : '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Weighted</p>
              <p className="text-sm font-bold text-emerald-600">{kpi.weightedScore ? kpi.weightedScore.toFixed(2) : '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Unit</p>
              <p className="text-sm font-bold text-gray-600">{kpi.unit || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Status</p>
              <div className="flex items-center text-xs font-bold text-gray-700">
                <span className={`w-2 h-2 rounded-full mr-1.5 ${statusDisplay.color}`}></span>
                {statusDisplay.label}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 min-w-[200px]">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${kpi.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-600'}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          {!kpi.isCompliance ? (
            canUpdate ? (
              <button
                onClick={() => onUpdate(kpi)}
                className="w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                {progress === 0 ? <Play className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {progress === 0 ? 'Start Goal' : 'Update Progress'}
              </button>
            ) : (
              <div className="w-full py-2 bg-gray-50 text-gray-400 border border-gray-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-not-allowed">
                <Lock size={12} />
                Awaiting Approval
              </div>
            )
          ) : (
            <div className="w-full py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-default">
              <Award className="w-3 h-3" />
              Verified by Manager
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KpiGoalCard;
