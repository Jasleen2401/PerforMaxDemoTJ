import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface KpiSummaryCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

const KpiSummaryCard: React.FC<KpiSummaryCardProps> = ({ label, value, icon: Icon, color = 'blue' }) => {
  return (
    <div className="bg-white rounded-xl p-5 flex items-center gap-4 border border-gray-100 shadow-sm flex-1 lg:flex-none lg:min-w-[200px]">
      <div className={`w-10 h-10 bg-${color}-50 rounded-lg flex items-center justify-center text-${color}-600`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1.5 tracking-wider">{label}</p>
      </div>
    </div>
  );
};

export default KpiSummaryCard;
