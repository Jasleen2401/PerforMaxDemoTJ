import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  disabled?: boolean;
  readOnly?: boolean;
  size?: number;
}

const StarRating = ({ value, onChange, disabled, readOnly, size = 20 }: StarRatingProps) => {
  const interactive = !disabled && !readOnly && !!onChange;

  return (
    <div
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? 'Rating 1 to 5' : `Rating: ${value} out of 5`}
      style={{ display: 'flex', gap: 4 }}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === 'ArrowRight' && value < 5) onChange!(value + 1);
        if (e.key === 'ArrowLeft'  && value > 1) onChange!(value - 1);
      }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          role={interactive ? 'radio' : undefined}
          aria-checked={interactive ? value === n : undefined}
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
          tabIndex={interactive ? (value === n ? 0 : -1) : -1}
          disabled={disabled}
          onClick={() => interactive && onChange!(n)}
          onKeyDown={(e) => {
            if (!interactive) return;
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange!(n); }
          }}
          style={{
            background: 'none', border: 'none',
            cursor: interactive ? 'pointer' : 'default',
            padding: 2,
          }}
        >
          <Star
            size={size}
            fill={n <= value ? '#F59E0B' : 'none'}
            color={n <= value ? '#F59E0B' : '#D1D5DB'}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
