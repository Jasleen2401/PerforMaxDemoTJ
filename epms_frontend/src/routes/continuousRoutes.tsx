import FeedbackPage from "../pages/continuous/FeedbackPage";
import MeetingPage from "../pages/continuous/MeetingPage";
import PerformanceHistoryAdminPage from "../pages/continuous/PerformanceHistoryAdminPage";
import PerformanceHistoryManagerPage from "../pages/continuous/PerformanceHistoryManagerPage";

export const continuousRoutes = [
  { path: "/continuous-feedback", element: <FeedbackPage /> },
  { path: "/meetings", element: <MeetingPage /> },
  { path: "/continuous/meetings", element: <MeetingPage /> },
  { path: "/performance-history/admin", element: <PerformanceHistoryAdminPage /> },
  { path: "/performance-history/manager", element: <PerformanceHistoryManagerPage /> },
];
