import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useCreateEmployeeMutation, useGetEmployeeByIdQuery, useUpdateEmployeeMutation, useGetEmployeesQuery, useUploadProfileImageMutation } from "../../features/employee/employeeapi";
import { useGetPositionsQuery } from "../../features/org/positionApi";
import { useGetRolesQuery } from "../../features/org/roleApi";
import { useGetActiveDepartmentsQuery } from "../../features/org/departmentApi";
import type { CreateEmployeeRequest, UpdateEmployeeRequest, Gender, MaritalStatus, EmployeeStatus } from "../../features/employee/employeeTypes";
import { CustomDateInput } from "../../components/common/CustomDateInput";

const inputStyle: React.CSSProperties = { background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 };
const sectionStyle: React.CSSProperties = { background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '18px 20px' };

const EmployeeForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: employeeData, isLoading: isLoadingEmployee } = useGetEmployeeByIdQuery(id as any, { skip: !isEdit });
  const { data: roles } = useGetRolesQuery();
  const { data: departments } = useGetActiveDepartmentsQuery();
  const { data: employeesData } = useGetEmployeesQuery({ page: 0, size: 1000 });
  const employees = employeesData?.content || [];

  const [createEmployee, { isLoading: isCreating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: isUpdating }] = useUpdateEmployeeMutation();
  const [uploadProfileImage, { isLoading: isUploading }] = useUploadProfileImageMutation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<Partial<CreateEmployeeRequest & UpdateEmployeeRequest>>({
    staffName: "", otherName: "", email: "", phoneNo: "",
    positionId: 0, roleId: 0, parentDepartmentId: 0, currentDepartmentId: 0,
    directManagerId: undefined, stateCode: undefined, township: "", nrcType: "(N)", number: "",
    gender: undefined, dateOfBirth: "", salary: undefined, currency: "MMK", profileImage: "",
    race: "", religion: "", birthPlace: "", contactAddress: "", permanentAddress: "",
    maritalStatus: undefined, spouseName: "", fatherName: "",
    dateOfAppointment: "", dateOfConfirmation: "", dateOfPromotion: "", status: undefined,
  });

  const availableManagers = useMemo(() => {
    return employees.filter(emp => {
      const isManager = emp.roles?.includes("MANAGER");
      const isSameDepartment = formData.currentDepartmentId
        ? emp.currentDepartmentId === formData.currentDepartmentId
        : true;
      return isManager && isSameDepartment;
    });
  }, [employees, formData.currentDepartmentId]);

  const [selectedPositionLevel, setSelectedPositionLevel] = useState("");
  const { data: positions } = useGetPositionsQuery();

  useEffect(() => {
    if (isEdit && employeeData) {
      setFormData(prev => ({ 
        ...prev, 
        ...employeeData, 
        nrcType: employeeData.nrcType || "(N)",
        positionId: employeeData.positionId || 0 
      }));
      setSelectedPositionLevel(employeeData.levelName);
    }
  }, [isEdit, employeeData, positions, departments]);

  const handlePositionChange = (posId: number) => {
    const pos = positions?.find(p => p.positionId === posId);
    if (pos) {
      setFormData(prev => ({ ...prev, positionId: posId }));
      setSelectedPositionLevel(pos.levelName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let targetId: string | number = id || "";
      const cleanedData = {
        ...formData,
        salary: (formData.salary as any) === "" ? undefined : formData.salary,
        stateCode: (formData.stateCode as any) === "" ? undefined : formData.stateCode,
      };

      if (cleanedData.stateCode !== undefined) {
        const sc = Number(cleanedData.stateCode);
        if (sc < 1 || sc > 14) {
          toast.warning("NRC State Code must be between 1 and 14.");
          return;
        }
      }

      if (isEdit) {
        await updateEmployee({ id: targetId, body: cleanedData as UpdateEmployeeRequest }).unwrap();
      } else {
        const response = await createEmployee(cleanedData as CreateEmployeeRequest).unwrap();
        targetId = response.id;
      }
      if (selectedFile) {
        await uploadProfileImage({ id: targetId, file: selectedFile }).unwrap();
      }
      toast.success(isEdit ? "Employee profile updated successfully!" : "Staff member registered successfully!");
      if (isEdit) {
        navigate(`/employees/${targetId}/profile`);
      } else {
        navigate("/employees");
      }
    } catch (err: any) {
      console.error("Failed to save employee", err);
      toast.error("Failed to save employee. Please check all required fields.");
    }
  };

  if (isEdit && isLoadingEmployee) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>
        Loading employee details...
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>
          {isEdit ? "Edit Staff Member" : "Register New Staff Member"}
        </h1>
        <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>
          {isEdit
            ? "Update the employee's comprehensive profile and organizational details."
            : "Fill in the required information to onboard a new employee to the system."}
        </p>
      </div>

      {!isEdit && (
        <div className="bg-indigo-50 border border-indigo-200/80 rounded-xl p-3.5 flex items-center gap-3 text-xs text-indigo-900 shadow-2xs">
          <span className="font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wider">Default Credential</span>
          <span>The employee will automatically receive default password <strong className="bg-white px-2 py-0.5 rounded border border-indigo-300 font-mono font-bold text-indigo-950">Dailoqa</strong> (first-time password change will be enforced).</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Basic Information */}
        <section style={sectionStyle}>
          <h2 style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg style={{ width: 16, height: 16, color: '#1A56DB', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Basic Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input type="text" required style={inputStyle}
                value={formData.staffName || ""} onChange={e => setFormData({ ...formData, staffName: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Other Name</label>
              <input type="text" style={inputStyle}
                value={formData.otherName || ""} onChange={e => setFormData({ ...formData, otherName: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Email Address *</label>
              <input type="email" required style={inputStyle}
                value={formData.email || ""} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Profile Image</label>
              <input type="file" accept="image/*" style={inputStyle}
                onChange={e => { if (e.target.files && e.target.files.length > 0) setSelectedFile(e.target.files[0]); }} />
            </div>
            <div>
              <label style={labelStyle}>Phone Number *</label>
              <input type="text" required style={inputStyle}
                value={formData.phoneNo || ""} onChange={e => setFormData({ ...formData, phoneNo: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Gender *</label>
              <select required style={inputStyle}
                value={formData.gender || ""} onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}>
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date of Birth *</label>
              <CustomDateInput required style={inputStyle}
                value={formData.dateOfBirth || ""} onChange={val => setFormData({ ...formData, dateOfBirth: val })} />
            </div>
          </div>
        </section>

        {/* Organizational Role */}
        <section style={sectionStyle}>
          <h2 style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg style={{ width: 16, height: 16, color: '#1A56DB', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Organizational Role
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label style={labelStyle}>Position *</label>
              <select required style={inputStyle}
                value={formData.positionId || ""} onChange={e => handlePositionChange(Number(e.target.value))}>
                <option value="">Select Position</option>
                {positions?.map(pos => <option key={pos.positionId} value={pos.positionId}>{pos.positionName}</option>)}
              </select>
              {selectedPositionLevel && (
                <p style={{ fontSize: 11, color: '#1A56DB', marginTop: 4 }}>Level: {selectedPositionLevel}</p>
              )}
            </div>

            {!isEdit && (
              <>
                <div>
                  <label style={labelStyle}>Current Department (ERP) *</label>
                  <select required style={inputStyle}
                    value={formData.currentDepartmentId || ""}
                    onChange={e => setFormData({ ...formData, currentDepartmentId: Number(e.target.value) })}>
                    <option value="">Select Current Dept</option>
                    {departments?.map(dept => <option key={dept.id} value={dept.id}>{dept.departmentName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Parent Department (Banking) *</label>
                  <select required style={inputStyle}
                    value={formData.parentDepartmentId || ""} onChange={e => setFormData({ ...formData, parentDepartmentId: Number(e.target.value) })}>
                    <option value="">Select Parent Dept</option>
                    {departments?.map(dept => <option key={dept.id} value={dept.id}>{dept.departmentName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Primary Role *</label>
                  <select required style={inputStyle}
                    value={formData.roleId || ""} onChange={e => setFormData({ ...formData, roleId: Number(e.target.value) })}>
                    <option value="">Select Role</option>
                    {roles?.map(role => <option key={role.roleId} value={role.roleId}>{role.roleName}</option>)}
                  </select>
                </div>
              </>
            )}

            <div>
              <label style={labelStyle}>Direct Manager</label>
              <select style={inputStyle}
                value={formData.directManagerId || ""}
                onChange={e => setFormData({ ...formData, directManagerId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">No Manager</option>
                {availableManagers?.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.staffName} ({emp.employeeCode})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Salary Base</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" placeholder="0.00" min="0" style={{ ...inputStyle, textAlign: 'right' }}
                  value={formData.salary === undefined || formData.salary === null || (formData.salary as any) === "" ? "" : formData.salary}
                  onKeyDown={e => {
                    if (e.key === '-') {
                      e.preventDefault();
                    }
                  }}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({ ...formData, salary: val === "" ? "" : Math.max(0, Number(val)) } as any);
                  }} />
                <select style={{ ...inputStyle, width: 80 }}
                  value={formData.currency || "MMK"} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                  <option value="MMK">MMK</option>
                  <option value="USD">USD</option>
                  <option value="SGD">SGD</option>
                </select>
              </div>
            </div>

            {isEdit && (
              <div>
                <label style={labelStyle}>Account Status</label>
                <select style={inputStyle}
                  value={formData.status || ""} onChange={e => setFormData({ ...formData, status: e.target.value as EmployeeStatus })}>
                  <option value="">Select Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>
            )}
          </div>
        </section>

        {/* NRC */}
        <section style={sectionStyle}>
          <h2 style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg style={{ width: 16, height: 16, color: '#1A56DB', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            Identification (NRC)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label style={labelStyle}>State Code</label>
              <input type="number" placeholder="1-14" min="1" max="14" style={{ ...inputStyle, textAlign: 'right' }}
                value={formData.stateCode === undefined || formData.stateCode === null || (formData.stateCode as any) === "" ? "" : formData.stateCode}
                onKeyDown={e => {
                  if (e.key === '-' || e.key === '.' || e.key === 'e') {
                    e.preventDefault();
                  }
                }}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "") {
                    setFormData({ ...formData, stateCode: "" } as any);
                  } else {
                    const num = parseInt(val);
                    if (!isNaN(num)) {
                      if (num < 1) {
                        setFormData({ ...formData, stateCode: 1 } as any);
                      } else if (num > 14) {
                        setFormData({ ...formData, stateCode: 14 } as any);
                      } else {
                        setFormData({ ...formData, stateCode: num } as any);
                      }
                    }
                  }
                }} />
            </div>
            <div>
              <label style={labelStyle}>Township *</label>
              <input type="text" required placeholder="MaGaWa" style={{ ...inputStyle, textTransform: 'uppercase' }}
                value={formData.township || ""} onChange={e => setFormData({ ...formData, township: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Type *</label>
              <select required style={inputStyle}
                value={formData.nrcType || "(N)"} onChange={e => setFormData({ ...formData, nrcType: e.target.value })}>
                <option value="(N)">(N)</option>
                <option value="(E)">(E)</option>
                <option value="(P)">(P)</option>
                <option value="(T)">(T)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Number *</label>
              <input type="text" required placeholder="123456" style={inputStyle}
                value={formData.number || ""} onChange={e => setFormData({ ...formData, number: e.target.value })} />
            </div>
          </div>
        </section>

        {/* Extended Details (edit only) */}
        {isEdit && (
          <section style={sectionStyle}>
            <h2 style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg style={{ width: 16, height: 16, color: '#1A56DB', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
              </svg>
              Extended Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Contact Address</label>
                <textarea rows={3} style={{ ...inputStyle, resize: 'none' }}
                  value={formData.contactAddress || ""} onChange={e => setFormData({ ...formData, contactAddress: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Permanent Address</label>
                <textarea rows={3} style={{ ...inputStyle, resize: 'none' }}
                  value={formData.permanentAddress || ""} onChange={e => setFormData({ ...formData, permanentAddress: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Marital Status</label>
                <select style={inputStyle}
                  value={formData.maritalStatus || ""} onChange={e => setFormData({ ...formData, maritalStatus: e.target.value as MaritalStatus })}>
                  <option value="">Select Status</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Spouse Name</label>
                <input type="text" style={inputStyle}
                  value={formData.spouseName || ""} onChange={e => setFormData({ ...formData, spouseName: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Father's Name</label>
                <input type="text" style={inputStyle}
                  value={formData.fatherName || ""} onChange={e => setFormData({ ...formData, fatherName: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Birth Place</label>
                <input type="text" style={inputStyle}
                  value={formData.birthPlace || ""} onChange={e => setFormData({ ...formData, birthPlace: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Race</label>
                <input type="text" style={inputStyle}
                  value={formData.race || ""} onChange={e => setFormData({ ...formData, race: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Religion</label>
                <input type="text" style={inputStyle}
                  value={formData.religion || ""} onChange={e => setFormData({ ...formData, religion: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Date of Appointment</label>
                <CustomDateInput style={inputStyle}
                  value={formData.dateOfAppointment || ""} onChange={val => setFormData({ ...formData, dateOfAppointment: val })} />
              </div>
              <div>
                <label style={labelStyle}>Date of Confirmation</label>
                <CustomDateInput style={inputStyle}
                  value={formData.dateOfConfirmation || ""} onChange={val => setFormData({ ...formData, dateOfConfirmation: val })} />
              </div>
            </div>
          </section>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
          <button type="button" onClick={() => navigate("/employees")}
            style={{ padding: '8px 18px', fontSize: 13, fontWeight: 500, color: '#5A6070', background: '#F5F6F8', border: '0.5px solid #E4E6EC', borderRadius: 8, cursor: 'pointer' }}
            className="hover:border-[#9EA3B0] transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isCreating || isUpdating || isUploading}
            style={{ padding: '8px 20px', fontSize: 13, fontWeight: 500, background: '#111827', color: '#FFFFFF', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: (isCreating || isUpdating || isUploading) ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            className="hover:opacity-90 transition-opacity">
            {(isCreating || isUpdating || isUploading) ? "Saving..." : (isEdit ? "Update Employee" : "Register Employee")}
            {!(isCreating || isUpdating || isUploading) && (
              <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
