import React from 'react';

interface QuestionItemProps {
  index: number;
  question: string;
  primaryType: 'RATING' | 'TEXT' | 'YESNO';
  secondaryType?: 'RATING' | 'TEXT' | 'YESNO' | 'NONE';
  ratingValue: number;
  isCompleted: boolean | null;
  textValue?: string;
  onRatingChange: (val: number) => void;
  onCompletionChange: (val: boolean) => void;
  onTextChange?: (val: string) => void;
  disabled?: boolean;
  employeeRating?: number;
  employeeCompletion?: boolean | null;
  employeeText?: string;
}

const QuestionItem: React.FC<QuestionItemProps> = ({
  index,
  question,
  primaryType,
  secondaryType = 'NONE',
  ratingValue,
  isCompleted,
  textValue = '',
  onRatingChange,
  onCompletionChange,
  onTextChange,
  disabled,
}) => {
  const hasYesNo = primaryType === 'YESNO' || secondaryType === 'YESNO';
  const hasRating = primaryType === 'RATING' || secondaryType === 'RATING';

  // Rating is locked until Yes/No is answered when both exist
  const ratingLocked = hasYesNo && hasRating && isCompleted === null;

  return (
    <div
      className="flex items-start gap-4 px-5 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors"
      style={{ borderLeft: '3px solid #3b82f6' }}
    >
      {/* Index badge */}
      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 mt-0.5">
        {index}
      </div>

      {/* Question text + controls */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700 leading-snug mb-3">
          {question}
        </p>

        {/* Inline controls row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Yes / No buttons */}
          {hasYesNo && (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onCompletionChange(true)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold border transition-all
                  ${isCompleted === true
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }
                  ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                Yes
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onCompletionChange(false)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold border transition-all
                  ${isCompleted === false
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }
                  ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                No
              </button>
            </>
          )}

          {/* Rating 1–5 buttons */}
          {hasRating && (
            <>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={disabled || ratingLocked}
                  onClick={() => onRatingChange(n)}
                  className={`w-9 h-9 rounded-md text-sm font-bold border-2 transition-all
                    ${ratingValue === n
                      ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    }
                    ${disabled || ratingLocked ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  {n}
                </button>
              ))}
            </>
          )}

          {/* Text input */}
          {(primaryType === 'TEXT' || secondaryType === 'TEXT') && (
            <input
              type="text"
              value={textValue}
              disabled={disabled || ratingLocked}
              onChange={(e) => onTextChange?.(e.target.value)}
              placeholder={ratingLocked ? 'Select Yes/No first' : 'Your note...'}
              className="flex-1 min-w-[160px] bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionItem;
