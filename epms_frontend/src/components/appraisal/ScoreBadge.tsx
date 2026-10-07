import React from 'react';

interface ScoreBadgeProps {
  score: number | string;
  label?: string;
  theme?: 'indigo' | 'emerald' | 'amber' | 'slate';
  size?: 'sm' | 'md' | 'lg';
}

const ScoreBadge: React.FC<ScoreBadgeProps> = ({ 
  score, 
  label, 
  theme = 'indigo', 
  size = 'md' 
}) => {
  const themes = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    slate: 'text-slate-600 bg-slate-50 border-slate-100',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-5 py-3 text-2xl font-black',
  };

  return (
    <div className={`inline-flex flex-col items-center justify-center rounded-2xl border ${themes[theme]} ${sizes[size]}`}>
      {label && <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-0.5">{label}</span>}
      <span>{score}</span>
    </div>
  );
};

export default ScoreBadge;
