import { Filter, RefreshCw, Users, FileSpreadsheet } from 'lucide-react';
import type { AppraisalCycle } from '../../features/appraisal/appraisalApi';
import type { DepartmentResponse } from '../../features/org/orgTypes';

interface FilterBarProps {
  cycles?: AppraisalCycle[];
  departments?: DepartmentResponse[];
  selectedCycle: number | '';
  selectedDept: number | '';
  isRefreshing: boolean;
  onCycleChange: (value: number | '') => void;
  onDeptChange: (value: number | '') => void;
  onRefresh: () => void;
  onExportRoster?: () => void;
  isExporting?: boolean;
}

export const FilterBar = ({
  cycles,
  departments,
  selectedCycle,
  selectedDept,
  isRefreshing,
  onCycleChange,
  onDeptChange,
  onRefresh,
  onExportRoster,
  isExporting,
}: FilterBarProps) => (
  <header className="bg-white border border-slate-200/90 rounded-2xl p-3.5 md:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-600" />
        <h2 className="text-xs md:text-sm font-bold text-slate-900 tracking-tight">Cycle & Department Scope</h2>
      </div>
      <p className="text-[11px] md:text-xs text-slate-500 font-medium mt-0.5">
        Filter verified appraisal outcomes and goal achievement across review cycles.
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      {/* Appraisal Cycle Selector */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-400 transition-colors">
        <Filter size={13} className="text-slate-400 shrink-0" />
        <select
          aria-label="Select appraisal cycle"
          className="bg-transparent border-none outline-none text-xs font-semibold text-slate-800 cursor-pointer pr-1"
          value={selectedCycle}
          onChange={(event) => onCycleChange(event.target.value ? Number(event.target.value) : '')}
        >
          <option value="">Select Appraisal Cycle</option>
          {cycles?.map((cycle) => {
            const cId = cycle.cycleId ?? (cycle as any).id;
            const cName = cycle.cycleName ?? (cycle as any).name;
            return <option key={cId} value={cId}>{cName}</option>;
          })}
        </select>
      </div>

      {/* Department Selector */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-400 transition-colors">
        <Users size={13} className="text-slate-400 shrink-0" />
        <select
          aria-label="Filter by department"
          className="bg-transparent border-none outline-none text-xs font-semibold text-slate-800 cursor-pointer pr-1"
          value={selectedDept}
          onChange={(event) => onDeptChange(event.target.value ? Number(event.target.value) : '')}
        >
          <option value="">All Departments</option>
          {departments?.map((department) => {
            const dId = department.id ?? (department as any).departmentId;
            const dName = department.departmentName ?? (department as any).name;
            return <option key={dId} value={dId}>{dName}</option>;
          })}
        </select>
      </div>

      {/* Export Roster Button */}
      {onExportRoster && (
        <button
          onClick={onExportRoster}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200/80 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          title="Export organizational employee directory roster"
        >
          <FileSpreadsheet size={13} className="text-emerald-600 shrink-0" />
          <span>{isExporting ? 'Exporting...' : 'Export Roster'}</span>
        </button>
      )}

      {/* Refresh Button */}
      <button
        aria-label="Refresh dashboard data"
        aria-busy={isRefreshing}
        disabled={isRefreshing}
        onClick={onRefresh}
        className="flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-slate-200/90 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200/80 text-slate-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
        title="Refresh performance analytics"
      >
        <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-purple-600' : ''} />
      </button>
    </div>
  </header>
);
