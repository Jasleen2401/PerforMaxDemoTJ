import React from 'react';
import { Bell, ChevronRight } from 'lucide-react';

interface Milestone {
  id: number;
  date: string;
  title: string;
  category: string;
  status: string;
}

interface KpiTimelineProps {
  milestones: Milestone[];
}

const KpiTimeline: React.FC<KpiTimelineProps> = ({ milestones }) => {
  return (
    <section className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
          <Bell className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Due Soon</h2>
      </div>

      <div className="relative pl-8 space-y-12">
        {/* Timeline Line */}
        <div className="absolute left-[0.875rem] top-2 bottom-2 w-0.5 bg-slate-50"></div>
        
        {milestones.map((ms, idx) => (
          <div key={ms.id} className="relative">
            {/* Timeline Dot */}
            <div className={`absolute -left-[2.375rem] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-[0_0_0_2px_#f1f5f9] z-10 transition-colors duration-300 ${idx === 0 ? 'bg-blue-600 shadow-[0_0_0_4px_#dbeafe]' : 'bg-slate-300'}`}></div>
            
            <div className="space-y-1.5 group cursor-default">
              <p className="text-[10px] font-black text-blue-600 tracking-widest uppercase">
                {ms.date}
              </p>
              <h4 className="text-[14px] font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                {ms.title}
              </h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                {ms.category}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-10 py-4 bg-white border border-slate-200 hover:border-blue-200 text-slate-400 hover:text-blue-600 text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all duration-300">
        View All Milestones
      </button>
    </section>
  );
};

export default KpiTimeline;
