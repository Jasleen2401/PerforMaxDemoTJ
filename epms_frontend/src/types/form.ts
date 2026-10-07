export type QuestionType = 'TEXT' | 'RATING' | 'SELECT' | 'NUMBER';

export interface FormQuestion {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  weightage?: number;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
  weightage?: number;
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  sections: FormSection[];
  totalWeightage: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}
