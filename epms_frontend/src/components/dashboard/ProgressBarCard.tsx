import React from 'react';

interface ProgressBarCardProps {
  title: string;
  percentage: number;
  label?: string;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}

const ProgressBarCard: React.FC<ProgressBarCardProps> = ({ title, percentage, label, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    orange: 'bg-orange-600',
    red: 'bg-red-600',
    purple: 'bg-purple-600'
  };

  const progressColor = colors[color] || colors.blue;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-gray-700">{title}</h3>
        <span className="text-lg font-bold text-gray-900">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
        <div 
          className={`${progressColor} h-3 rounded-full transition-all duration-1000 ease-out`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      {label && <p className="text-xs text-gray-500">{label}</p>}
    </div>
  );
};

export default ProgressBarCard;
