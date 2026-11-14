import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Users, FileClock, Database, Settings2, Bell, Building2, LogIn } from "lucide-react";

export const SuperAdminModule = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-indigo-600" size={28} />
            Super Admin Control Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global governance, system audit logs, user security permissions, and enterprise controls.
          </p>
        </div>
        <span className="bg-indigo-50 text-indigo-700 font-bold text-xs uppercase px-3 py-1 rounded-full border border-indigo-200">
          Super Admin Scope
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Link to="/employees" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all group">
          <Users className="text-indigo-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">Employee Directory & Access</h3>
          <p className="text-xs text-slate-500 mt-1">Manage all employees, lock/unlock accounts, assign roles.</p>
        </Link>

        <Link to="/admin/records" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all group">
          <Database className="text-indigo-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">Record Management</h3>
          <p className="text-xs text-slate-500 mt-1">Review system records and route exceptions to management workflows.</p>
        </Link>

        <Link to="/audit-logs" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all group">
          <FileClock className="text-indigo-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">System Audit Trails</h3>
          <p className="text-xs text-slate-500 mt-1">Immutable administrative action logs with IP addresses and timestamps.</p>
        </Link>

        <Link to="/superadmin/roles-permissions" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all group">
          <Settings2 className="text-indigo-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">Role & Permission Management</h3>
          <p className="text-xs text-slate-500 mt-1">Assign user roles and configure granular RBAC permission matrices.</p>
        </Link>

        <Link to="/superadmin/notifications" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all group">
          <Bell className="text-indigo-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">Announcement Hub</h3>
          <p className="text-xs text-slate-500 mt-1">Broadcast targeted announcements to Everyone, HR, Mentors, or Interns.</p>
        </Link>

        <Link to="/departments" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all group">
          <Building2 className="text-indigo-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">Departments & Structure</h3>
          <p className="text-xs text-slate-500 mt-1">Manage departmental hierarchies, teams, and organizational divisions.</p>
        </Link>

        <Link to="/dashboard?tab=impersonate" className="p-5 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/30 rounded-2xl border border-purple-200 hover:border-purple-400 shadow-xs hover:shadow-md transition-all group">
          <LogIn className="text-purple-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-purple-600">Login As (Demo Personas)</h3>
          <p className="text-xs text-slate-500 mt-1">One-click switch to demo HR, Mentor, or Intern personas from the dashboard.</p>
        </Link>
      </div>
    </div>
  );
};

export default SuperAdminModule;
