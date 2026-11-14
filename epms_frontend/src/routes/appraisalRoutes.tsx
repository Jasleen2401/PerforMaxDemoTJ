import React from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import AppraisalManagementWorkspace from "../pages/appraisal/AppraisalManagementWorkspace";
import AppraisalList from "../pages/appraisal/AppraisalList";
import AppraisalDetail from "../pages/appraisal/AppraisalDetail";
import SelfAssessment from "../pages/appraisal/SelfAssessment";
import ManagerEvaluation from "../pages/appraisal/ManagerEvaluation";
import ResultPage from "../pages/appraisal/ResultPage";
import ScorePreviewPage from "../pages/appraisal/ScorePreviewPage";
import DiagnosticPage from "../pages/appraisal/DiagnosticPage";
import CreateCycle from "../pages/appraisal/CreateCycle";
import AppraisalFormDesign from "../pages/appraisal/AppraisalFormDesign";
import AppraisalAssignment from "../pages/appraisal/AppraisalAssignment";
import FormView from "../pages/appraisal/FormView";

// Helper component to preserve cycleId and all query parameters when redirecting legacy appraisal routes
const LegacyAppraisalRedirect: React.FC<{ defaultTab: string }> = ({ defaultTab }) => {
  const [searchParams] = useSearchParams();
  const targetParams = new URLSearchParams(searchParams);
  targetParams.set('tab', defaultTab);
  const legacyId = searchParams.get('id');
  if (legacyId && !targetParams.has('cycleId')) {
    targetParams.set('cycleId', legacyId);
    targetParams.delete('id');
  }
  return <Navigate to={`/appraisals/manage?${targetParams.toString()}`} replace />;
};

export const appraisalRoutes = [
  // Primary Unified Appraisal Management Workspace
  { path: "/appraisals/manage", element: <AppraisalManagementWorkspace /> },
  { path: "/appraisal/manage", element: <LegacyAppraisalRedirect defaultTab="overview" /> },

  // Preserved Backward-Compatibility Redirects to Workspace (Preserves cycleId)
  { path: "/appraisal", element: <LegacyAppraisalRedirect defaultTab="overview" /> },
  { path: "/appraisal-cycles", element: <LegacyAppraisalRedirect defaultTab="overview" /> },
  { path: "/appraisal/create-cycle", element: <LegacyAppraisalRedirect defaultTab="setup" /> },
  { path: "/appraisal/assign", element: <LegacyAppraisalRedirect defaultTab="participants" /> },

  // Dedicated Evaluation & Detail Routes (Preserved Intact)
  { path: "/appraisals/legacy", element: <AppraisalList /> },
  { path: "/appraisal/:id", element: <AppraisalDetail /> },
  { path: "/appraisal/forms/:id", element: <FormView /> },
  { path: "/appraisal/:id/self-assessment", element: <SelfAssessment /> },
  { path: "/appraisal/:id/manager-evaluation", element: <ManagerEvaluation /> },
  { path: "/appraisal/:id/manager-eval", element: <ManagerEvaluation /> },
  { path: "/appraisal/evaluation/:id", element: <ManagerEvaluation /> },
  { path: "/appraisal/:id/results", element: <ResultPage /> },
  { path: "/appraisal/:id/score", element: <ScorePreviewPage /> },
  { path: "/appraisal/diagnostic", element: <DiagnosticPage /> },
  { path: "/appraisal/design-form", element: <AppraisalFormDesign /> },
  { path: "/appraisal-forms/design", element: <AppraisalFormDesign /> },
  { path: "/appraisal/assign-legacy", element: <AppraisalAssignment /> },
  { path: "/appraisal/create-cycle-legacy", element: <CreateCycle /> },
];
