import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetEmployeeDepartmentHistoryQuery, useAssignDepartmentMutation } from "../../../features/org/employeeDepartmentApi";
import { useGetEmployeeByIdQuery } from "../../../features/employee/employeeapi";
import { useGetDepartmentsQuery } from "../../../features/org/departmentApi";

const inputStyle: React.CSSProperties = { background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 };

const EmployeeDepartmentHistory = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const employeeId = Number(id);

  const { data: employee } = useGetEmployeeByIdQuery(employeeId);
  const { data: history, isLoading } = useGetEmployeeDepartmentHistoryQuery(employeeId);
  const { data: departments } = useGetDepartmentsQuery();
  const [assignDepartment, { isLoading: isAssigning }] = useAssignDepartmentMutation();

  const [formData, setFormData] = useState({ currentDepartmentId: 0, parentDepartmentId: 0 });

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assignDepartment({ employeeId, currentDepartmentId: formData.currentDepartmentId, parentDepartmentId: formData.parentDepartmentId || undefined }).unwrap();
      setFormData({ currentDepartmentId: 0, parentDepartmentId: 0 });
      alert("Department assigned successfully!");
    } catch (error: any) {
      alert("Failed to assign department.");
    }
  };

  if (isLoading) return <div style={{ padding: '48px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading history...</div>;

  return (
    <div className="space-y-4 pb-8">
      <div>
        <button onClick={() => navigate("/employees")}
          style={{ fontSize: 12, color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
          className="hover:underline">
          ← Back to Employees
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Department History: {employee?.staffName}</h1>
        <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>Manage and view department assignments and transfers over time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Assignment Form */}
        <div className="lg:col-span-1">
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 14 }}>Assign Department</h2>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label style={labelStyle}>Current Department (ERP) *</label>
                <select required style={inputStyle}
                  value={formData.currentDepartmentId}
                  onChange={e => setFormData({ ...formData, currentDepartmentId: Number(e.target.value) })}>
                  <option value={0}>Select Current Dept</option>
                  {departments?.map(dept => <option key={dept.id} value={dept.id}>{dept.departmentName}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Parent Department (Banking)</label>
                <select style={inputStyle}
                  value={formData.parentDepartmentId}
                  onChange={e => setFormData({ ...formData, parentDepartmentId: Number(e.target.value) })}>
                  <option value={0}>Select Parent Dept</option>
                  {departments?.map(dept => <option key={dept.id} value={dept.id}>{dept.departmentName}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isAssigning || formData.currentDepartmentId === 0}
                style={{ width: '100%', padding: '8px', background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: (isAssigning || formData.currentDepartmentId === 0) ? 0.5 : 1, fontFamily: 'inherit' }}
                className="hover:opacity-90 transition-opacity">
                {isAssigning ? "Assigning..." : "Assign Department"}
              </button>
            </form>
          </div>
        </div>

        {/* History */}
        <div className="lg:col-span-2">
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 14 }}>Assignment History</h2>
            {history && history.length > 0 ? (
              <div className="space-y-3">
                {history.map(record => (
                  <div key={record.id} style={{
                    padding: '12px 14px', borderRadius: 8,
                    background: record.isCurrent ? '#EEF3FD' : '#F5F6F8',
                    border: `0.5px solid ${record.isCurrent ? '#B5D4F4' : '#E4E6EC'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h3 style={{ fontSize: 13, fontWeight: 500, color: record.isCurrent ? '#0C447C' : '#111827' }}>
                            {record.currentDepartmentName}
                          </h3>
                          {record.isCurrent && (
                            <span style={{ background: '#1A56DB', color: '#FFFFFF', fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 20 }}>Active</span>
                          )}
                        </div>
                        {record.parentDepartmentName && (
                          <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 3 }}>Parent: {record.parentDepartmentName}</p>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: '#9EA3B0', fontFamily: 'monospace' }}>
                        {new Date(record.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#9EA3B0', fontStyle: 'italic' }}>No department history found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDepartmentHistory;
