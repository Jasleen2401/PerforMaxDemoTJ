export type CycleStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
