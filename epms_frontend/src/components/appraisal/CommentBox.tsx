import React from 'react';

interface CommentBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}

const CommentBox: React.FC<CommentBoxProps> = ({ 
  value, 
  onChange, 
  placeholder = "Add your comments...", 
  disabled = false,
  rows = 4
}) => {
  return (
    <textarea
      disabled={disabled}
      rows={rows}
      placeholder={placeholder}
      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default CommentBox;
