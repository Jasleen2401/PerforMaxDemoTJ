import React from 'react';

interface SideBySideProps {
  leftTitle: string;
  leftContent: React.ReactNode;
  rightTitle: string;
  rightContent: React.ReactNode;
  leftTheme?: 'indigo' | 'slate';
  rightTheme?: 'emerald' | 'indigo';
}

const SideBySide: React.FC<SideBySideProps> = ({
  leftTitle,
  leftContent,
  rightTitle,
  rightContent,
  leftTheme = 'indigo',
  rightTheme = 'emerald'
}) => {
  const leftHeaderClass = leftTheme === 'indigo' ? 'text-indigo-600' : 'text-slate-600';
  const rightHeaderClass = rightTheme === 'emerald' ? 'text-emerald-600' : 'text-indigo-600';
  const leftBgClass = leftTheme === 'indigo' ? 'bg-indigo-50/30' : 'bg-slate-50';

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col lg:flex-row">
      <div className={`flex-1 p-8 border-b lg:border-b-0 lg:border-r border-slate-100 ${leftBgClass}`}>
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${leftHeaderClass}`}>{leftTitle}</h4>
        {leftContent}
      </div>
      
      <div className="flex-[1.5] p-8">
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${rightHeaderClass}`}>{rightTitle}</h4>
        {rightContent}
      </div>
    </div>
  );
};

export default SideBySide;
