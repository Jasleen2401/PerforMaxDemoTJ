import React, { useRef } from 'react';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';

interface CustomDateInputProps {
  value: string; // expected in yyyy-MM-dd format
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  placeholder?: string;
}

export const CustomDateInput: React.FC<CustomDateInputProps> = ({
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  style,
  className,
  placeholder = "DD/MM/YYYY"
}) => {
  const nativeInputRef = useRef<HTMLInputElement>(null);

  // Convert yyyy-MM-dd to dd/MM/yyyy safely for display
  const getDisplayValue = () => {
    if (!value) return '';
    try {
      const parts = value.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        return `${day}/${month}/${year}`;
      }
      return format(new Date(value), 'dd/MM/yyyy');
    } catch {
      return value;
    }
  };

  const handleTextClick = () => {
    if (disabled) return;
    if (nativeInputRef.current) {
      try {
        if (typeof nativeInputRef.current.showPicker === 'function') {
          nativeInputRef.current.showPicker();
        } else {
          nativeInputRef.current.focus();
        }
      } catch (err) {
        nativeInputRef.current.focus();
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', display: 'inline-block' }}>
      {/* Visual text input showing dd/MM/yyyy */}
      <input
        type="text"
        readOnly
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={getDisplayValue()}
        onClick={handleTextClick}
        className={className}
        style={{
          ...style,
          cursor: disabled ? 'not-allowed' : 'pointer',
          paddingRight: '36px', // make room for the calendar icon
          opacity: disabled ? 0.6 : 1,
        }}
      />
      
      {/* Calendar icon */}
      <div 
        onClick={handleTextClick}
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#9EA3B0',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Calendar size={14} />
      </div>

      {/* Hidden native date input that controls the state and date-picker */}
      <input
        ref={nativeInputRef}
        type="date"
        value={value || ''}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0,
          width: '100%',
          height: '100%',
          cursor: disabled ? 'not-allowed' : 'pointer',
          zIndex: -1, // behind the text input but clickable
        }}
      />
    </div>
  );
};
