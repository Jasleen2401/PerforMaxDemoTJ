import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminDashboard from './AdminDashboard';
import HrDashboard from './HrDashboard';
import ManagerDashboard from './ManagerDashboard';
import EmployeeDashboard from './EmployeeDashboard';

const DashboardRouter: React.FC = () => {
  const { isAdmin, isHR, isManager, isLoading } = useAuth();

  if (isLoading) return <div className="p-8 text-center animate-pulse text-gray-500">Initializing your workspace...</div>;

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isHR) {
    return <HrDashboard />;
  }

  if (isManager) {
    return <ManagerDashboard />;
  }

  return <EmployeeDashboard />;
};

export default DashboardRouter;
