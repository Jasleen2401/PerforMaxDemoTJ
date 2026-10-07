export interface MidcycleChangeRequest {
  employeeId: number;
  cycleId: number;
  changeDate: string; // 'YYYY-MM-DDTHH:mm'
  changeReason: string;
}

export interface MidcyclePhaseResponse {
  phaseNumber: number;
  startDate: string;
  endDate: string | null;
  days: number;
  weight: number;
  score: number | null;
  weightedContribution: number | null;
  goalSetId: number | null;
  status: 'OPEN' | 'LOCKED' | 'SCORED';
  changeReason: string;
}

export interface MidcycleSummaryResponse {
  employeeId: number;
  employeeName: string;
  cycleId: number;
  cycleName: string;
  totalCycleDays: number;
  hasOpenPhase: boolean;
  phases: MidcyclePhaseResponse[];
  compositeScore: number | null;
}
