import React from 'react';

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  theme?: 'indigo' | 'emerald' | 'blue';
}

const RatingInput: React.FC<RatingInputProps> = ({ value, onChange, disabled, theme = 'blue' }) => {
  const getThemeClasses = (active: boolean) => {
    if (!active) return 'bg-white text-gray-400 border-gray-100 hover:border-gray-200';
    
    switch (theme) {
      case 'indigo': return 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-110';
      case 'emerald': return 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-110';
      default: return 'bg-blue-600 text-white border-blue-600 shadow-lg scale-110';
    }
  };

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onChange(rating)}
          className={`w-10 h-10 rounded-lg font-bold transition-all border-2 ${getThemeClasses(value === rating)} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          {rating}
        </button>
      ))}
    </div>
  );
};

export default RatingInput;
