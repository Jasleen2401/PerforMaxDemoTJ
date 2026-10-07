import KpiHub from "../pages/kpi/KpiHub";
import MyKpiDashboard from "../pages/kpi/MyKpiDashboard";
import TeamKpiDashboard from "../pages/kpi/TeamKpiDashboard";
import KpiLibraryDashboard from "../pages/kpi/KpiLibraryDashboard";
import KpiLibraryEntry from "../pages/kpi/KpiLibraryEntry";
import GoalManagement from "../pages/kpi/GoalManagement";
import GoalDetail from "../pages/kpi/GoalDetail";
import GoalAssignmentWorkspace from "../pages/kpi/GoalAssignmentWorkspace";
import EmployeeKpiHistory from "../pages/kpi/EmployeeKpiHistory";
import OrgKpiHistory from "../pages/kpi/OrgKpiHistory";


export const kpiRoutes = [
  { path: "/kpi", element: <KpiHub /> },
  { path: "/kpi/my", element: <MyKpiDashboard /> },

  { path: "/kpi/team", element: <TeamKpiDashboard /> },
  { path: "/kpi/library", element: <KpiLibraryDashboard /> },
  { path: "/kpi/library/new", element: <KpiLibraryEntry /> },
  { path: "/kpi/library/edit/:id", element: <KpiLibraryEntry /> },
  { path: "/kpi/manage", element: <GoalManagement /> },
  { path: "/kpi/assign/:employeeId", element: <GoalAssignmentWorkspace /> },
  { path: "/kpi/goals/:employeeId", element: <GoalDetail /> },
  { path: "/kpi/history/:employeeId", element: <EmployeeKpiHistory /> },
  { path: "/kpi/org-history", element: <OrgKpiHistory /> },
];
