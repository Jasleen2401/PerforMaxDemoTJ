import { useGetRolesQuery, useCreateRoleMutation, useDeleteRoleMutation } from "../../features/org/roleApi";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Can } from "../../components/Can";

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  ADMIN:    { bg: "#FCEBEB", text: "#791F1F" },
  HR:       { bg: "#EEF3FD", text: "#0C447C" },
  MANAGER:  { bg: "#EAF3DE", text: "#27500A" },
  EMPLOYEE: { bg: "#F1EFE8", text: "#444441" },
};

const RoleList = () => {
  const { data: roles, isLoading, error } = useGetRolesQuery();
  const [createRole] = useCreateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();
  const [newRoleName, setNewRoleName] = useState("");
  const isSubmitDisabled = !newRoleName.trim();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      await createRole({ roleName: newRoleName.toUpperCase() as any }).unwrap();
      setNewRoleName("");
    } catch (err) {
      console.error("Failed to create role", err);
    }
  };

  if (isLoading) return <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>Loading roles…</div>;
  if (error) return <div className="py-16 text-center" style={{ color: "#791F1F", fontSize: 13 }}>Error loading roles.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>Roles</h1>
        <p style={{ fontSize: 13, color: "#9EA3B0", marginTop: 2 }}>Manage system roles assigned to employees.</p>
      </div>

      {/* Create form */}
      <Can permission="ROLE_MANAGE">
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 12 }}>Add role</p>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <select
              style={{ background: "#F5F6F8", border: "0.5px solid #E0E2E8", borderRadius: 8, padding: "7px 12px", fontSize: 13, color: "#111827", fontFamily: "inherit", outline: "none", flex: 1 }}
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
            >
              <option value="">Select role type</option>
              <option value="ADMIN">ADMIN</option>
              <option value="HR">HR</option>
              <option value="MANAGER">MANAGER</option>
              <option value="EMPLOYEE">EMPLOYEE</option>
            </select>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex items-center justify-center gap-2 transition-colors sm:w-auto"
              style={{
                background: isSubmitDisabled ? "#D1D5DB" : "#1A56DB",
                color: isSubmitDisabled ? "#6B7280" : "#FFFFFF",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: isSubmitDisabled ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitDisabled) e.currentTarget.style.background = "#1648C0";
              }}
              onMouseLeave={(e) => {
                if (!isSubmitDisabled) e.currentTarget.style.background = "#1A56DB";
              }}
            >
              <Plus size={14} aria-hidden="true" /> Add
            </button>
          </form>
        </div>
      </Can>

      {/* Table */}
      <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, overflow: "hidden" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 360 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid #E4E6EC" }}>
                <th style={{ padding: "10px 18px", fontSize: 11, fontWeight: 500, color: "#9EA3B0", textTransform: "uppercase", letterSpacing: "0.5px" }}>ID</th>
                <th style={{ padding: "10px 18px", fontSize: 11, fontWeight: 500, color: "#9EA3B0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Role</th>
                <th style={{ padding: "10px 18px", fontSize: 11, fontWeight: 500, color: "#9EA3B0", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles?.map((role, idx) => {
                const colors = ROLE_COLORS[role.roleName] ?? { bg: "#F1EFE8", text: "#444441" };
                return (
                  <tr key={role.roleId} style={{ borderBottom: idx < roles.length - 1 ? "0.5px solid #F0F2F6" : "none" }}
                    className="hover:bg-[#FAFBFF] transition-colors">
                    <td style={{ padding: "11px 18px", fontSize: 12, color: "#9EA3B0" }}>{role.roleId}</td>
                    <td style={{ padding: "11px 18px" }}>
                      <span style={{ background: colors.bg, color: colors.text, fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 20 }}>
                        {role.roleName}
                      </span>
                    </td>
                    <td style={{ padding: "11px 18px", textAlign: "right" }}>
                      <Can permission="ROLE_MANAGE">
                        <button
                          onClick={() => deleteRole(role.roleId)}
                          className="inline-flex items-center gap-1 transition-colors"
                          style={{ fontSize: 12, color: "#791F1F", background: "#FCEBEB", border: "0.5px solid #F5C2C2", borderRadius: 6, padding: "3px 8px" }}
                        >
                          <Trash2 size={12} aria-hidden="true" /> Delete
                        </button>
                      </Can>
                    </td>
                  </tr>
                );
              })}
              {roles?.length === 0 && (
                <tr><td colSpan={3} style={{ padding: "24px 18px", textAlign: "center", fontSize: 13, color: "#9EA3B0" }}>No roles yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RoleList;
