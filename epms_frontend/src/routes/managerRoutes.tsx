import { Navigate } from "react-router-dom";
import ManagerHubPage from "../pages/manager/ManagerHubPage";

export const managerRoutes = [
  { path: "/manager", element: <Navigate to="/manager/mentees" replace /> },
  { path: "/manager/mentees", element: <ManagerHubPage /> },
  { path: "/manager/tasks", element: <ManagerHubPage /> },
  { path: "/manager/technical-capabilities", element: <ManagerHubPage /> },
  { path: "/manager/evidence", element: <ManagerHubPage /> },
  { path: "/manager/hub", element: <ManagerHubPage /> },
];
