import React from 'react';
import { History, Eye } from 'lucide-react';

import type { KpiProgressHistory } from '../../features/kpi/kpiTypes';
import { formatRelativeTime } from '../../utils/timeUtils';

interface KpiUpdateHistoryCardProps {
  history: KpiProgressHistory[];
}

const KpiUpdateHistoryCard: React.FC<KpiUpdateHistoryCardProps> = ({ history }) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Recent Updates</h3>
        <History className="w-4 h-4 text-gray-400" />
      </div>

      <div className="grid grid-cols-12 gap-4 mb-3 px-2">
        <div className="col-span-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date & Goal</div>
        <div className="col-span-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Value</div>
      </div>

      <div className="space-y-3 mb-6">
        {history.length > 0 ? (
          history.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-4 items-center bg-gray-50/50 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group cursor-pointer" title={item.evidenceNote}>
              <div className="col-span-8 overflow-hidden">
                <p className="text-sm font-bold text-gray-900">{formatRelativeTime(item.updatedAt)}</p>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5 truncate" title={item.goalTitle}>{item.goalTitle}</p>
              </div>
              <div className="col-span-4 text-right">
                <span className="text-sm font-bold text-gray-900">{item.actualValue}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-sm text-gray-400 font-medium bg-gray-50 rounded-lg border border-dashed border-gray-200">
            No updates recorded yet.
          </div>
        )}
      </div>

      <button className="w-full py-2 bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
        View Full Log
      </button>
    </div>
  );
};

export default KpiUpdateHistoryCard;
