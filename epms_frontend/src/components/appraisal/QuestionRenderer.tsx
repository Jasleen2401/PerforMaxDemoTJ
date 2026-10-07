import React from 'react';
import type { FormQuestion } from '../../types/form';
import type { AssessmentResponse } from '../../types/appraisal';
import RatingInput from './RatingInput';
import CommentBox from './CommentBox';

interface QuestionRendererProps {
  question: FormQuestion;
  response?: AssessmentResponse;
  onRatingChange?: (rating: number) => void;
  onCommentChange?: (comment: string) => void;
  disabled?: boolean;
  theme?: 'indigo' | 'emerald';
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  response,
  onRatingChange,
  onCommentChange,
  disabled = false,
  theme = 'indigo'
}) => {
  return (
    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm transition-all hover:border-slate-300">
      <div className="flex items-start justify-between mb-4">
        <p className="text-lg font-bold text-slate-800">{question.text}</p>
        {question.required && (
          <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md">Required</span>
        )}
      </div>

      {question.type === 'RATING' && onRatingChange && (
        <div className="mb-6">
          <RatingInput 
            value={response?.rating || 0} 
            onChange={onRatingChange} 
            disabled={disabled}
            theme={theme}
          />
        </div>
      )}

      {onCommentChange && (
        <CommentBox 
          value={response?.comment || ''} 
          onChange={onCommentChange} 
          disabled={disabled}
          placeholder={question.placeholder || "Provide justification or specific examples..."}
        />
      )}
    </div>
  );
};

export default QuestionRenderer;
