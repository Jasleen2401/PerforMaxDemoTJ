// src/routes/instructorRoutes.tsx
import React from "react";
import JapaneseInstructorDashboard from "../pages/instructor/JapaneseInstructorDashboard";
import JapaneseBatchesPage from "../pages/instructor/JapaneseBatchesPage";
import JapaneseEvaluationsPage from "../pages/instructor/JapaneseEvaluationsPage";
import JLPTTrackingPage from "../pages/instructor/JLPTTrackingPage";
import JapaneseFeedbackPage from "../pages/instructor/JapaneseFeedbackPage";
import JapaneseInternsPage from "../pages/instructor/JapaneseInternsPage";
import JapaneseLearningPlansPage from "../pages/instructor/JapaneseLearningPlansPage";
import JapaneseLearningProgressPage from "../pages/instructor/JapaneseLearningProgressPage";

export const instructorRoutes = [
  { path: "/japanese/dashboard", element: <JapaneseInstructorDashboard /> },
  { path: "/japanese/batches", element: <JapaneseBatchesPage /> },
  { path: "/japanese/evaluations", element: <JapaneseEvaluationsPage /> },
  { path: "/japanese/jlpt", element: <JLPTTrackingPage /> },
  { path: "/japanese/feedback", element: <JapaneseFeedbackPage /> },
  // Retained routes for backward compatibility / deep links
  { path: "/japanese/interns", element: <JapaneseInternsPage /> },
  { path: "/japanese/plans", element: <JapaneseLearningPlansPage /> },
  { path: "/japanese/progress", element: <JapaneseLearningProgressPage /> },
];
