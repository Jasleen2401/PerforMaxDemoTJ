import { useGetAllEmployeesQuery } from "../../features/employee/employeeapi";
import { useGetDepartmentsQuery } from "../../features/org/departmentApi";
import { Link } from "react-router-dom";

const panelStyle = { background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' };

const HRDashboard = () => {
  const { data: employees } = useGetAllEmployeesQuery();
  const { data: departments } = useGetDepartmentsQuery();

  const stats = [
    { label: 'Total Employees', value: employees?.length || 0, accent: '#1A56DB' },
    { label: 'Departments',     value: departments?.length || 0, accent: '#1A56DB' },
    { label: 'Active Talent',   value: employees?.filter(e => e.id).length || 0, accent: '#27500A' },
    { label: 'System Alerts',   value: 0, accent: '#633806' },
  ];

  const quickActions = [
    { label: 'Add New Staff',   desc: 'Register new employee' },
    { label: 'Assign Roles',    desc: 'Update permissions' },
    { label: 'View Reports',    desc: 'Export personnel data' },
    { label: 'Policy Updates',  desc: 'Manage documents' },
  ];

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>HR Management</h1>
        <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>Orchestrate organizational growth and performance intelligence.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} style={panelStyle}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.accent, marginTop: 6 }}>{s.value}</div>
            <div style={{ marginTop: 10, height: 2, width: 32, background: s.accent, borderRadius: 2 }} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Talent Changes */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>Recent Talent Changes</h2>
            <button style={{ fontSize: 11, color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              className="hover:underline">
              See Directory
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {employees?.slice(0, 5).map(emp => (
              <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#F5F6F8', border: '0.5px solid #E4E6EC', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EEF3FD', border: '0.5px solid #B5D4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#1A56DB', flexShrink: 0 }}>
                    {emp.staffName.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{emp.staffName}</div>
                    <div style={{ fontSize: 11, color: '#9EA3B0', marginTop: 1 }}>{emp.positionName}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: '#9EA3B0', background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 6, padding: '2px 8px', fontWeight: 500 }}>
                  {emp.employeeCode}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={panelStyle}>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 14 }}>HR Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map(a => (
              <button key={a.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 14px', background: '#F5F6F8', border: '0.5px solid #E4E6EC', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}
                className="hover:border-[#1A56DB] hover:bg-[#EEF3FD] transition-colors">
                <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{a.label}</span>
                <span style={{ fontSize: 11, color: '#9EA3B0', marginTop: 2 }}>{a.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Appraisal Orchestration */}
      <div style={panelStyle}>
        <h2 style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 14 }}>Appraisal Orchestration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div style={{ padding: '14px', border: '0.5px solid #E4E6EC', borderRadius: 10, background: '#F5F6F8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}
            className="hover:border-[#1A56DB] transition-colors">
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 4 }}>Form Frameworks</h3>
              <p style={{ fontSize: 12, color: '#9EA3B0', lineHeight: 1.5 }}>Design specialized appraisal schemas and metric weights.</p>
            </div>
            <Link to="/appraisal-forms" style={{ fontSize: 12, color: '#1A56DB', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              className="hover:underline">
              Configure Systems →
            </Link>
          </div>

          <div style={{ padding: '14px', border: '0.5px solid #E4E6EC', borderRadius: 10, background: '#F5F6F8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}
            className="hover:border-[#1A56DB] transition-colors">
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 4 }}>Active Cycles</h3>
              <p style={{ fontSize: 12, color: '#9EA3B0', lineHeight: 1.5 }}>Monitor ongoing performance evaluations and check-ins.</p>
            </div>
            <Link to="/appraisal-management" style={{ fontSize: 12, color: '#1A56DB', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              className="hover:underline">
              Monitor Live →
            </Link>
          </div>

          <div style={{ padding: '14px', border: '0.5px solid #E4E6EC', borderRadius: 10, background: '#F5F6F8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 4 }}>Analytical Insights</h3>
              <p style={{ fontSize: 12, color: '#9EA3B0', lineHeight: 1.5 }}>Synthesize finalized performance results into actionable data.</p>
            </div>
            <span style={{ fontSize: 12, color: '#9EA3B0', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'not-allowed' }} title="Feature coming soon">
              Generate Reports (Coming Soon)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
