import { Navigate } from "react-router-dom";
import DashboardRouter from "../pages/DashboardRouter";
import ProfilePage from "../pages/ProfilePage";
import EditProfilePage from "../pages/EditProfilePage";
import NotificationsPage from "../pages/NotificationsPage";
import InternModule from "../modules/intern/InternModule";

export const generalRoutes = [
  { path: "/dashboard", element: <DashboardRouter /> },
  { path: "/goals", element: <Navigate to="/dashboard?tab=goals" replace /> },
  { path: "/my-goals", element: <Navigate to="/dashboard?tab=goals" replace /> },
  { path: "/journey", element: <Navigate to="/dashboard?tab=journey" replace /> },
  { path: "/mirai-journey", element: <Navigate to="/dashboard?tab=journey" replace /> },
  { path: "/tasks", element: <Navigate to="/dashboard?tab=tasks" replace /> },
  { path: "/profile", element: <ProfilePage /> },
  { path: "/profile/edit", element: <EditProfilePage /> },
  { path: "/notifications", element: <NotificationsPage /> },
  { path: "/intern", element: <InternModule /> },
];

