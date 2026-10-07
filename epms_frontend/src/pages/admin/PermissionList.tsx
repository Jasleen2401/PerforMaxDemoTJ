import { useState } from "react";
import {
  useGetPermissionsQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation
} from "../../features/org/permissionApi";
import { Can } from "../../components/Can";

const inputStyle: React.CSSProperties = { background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', textTransform: 'uppercase' };

const PermissionList = () => {
  const { data: permissions, isLoading, error } = useGetPermissionsQuery();
  const [createPermission] = useCreatePermissionMutation();
  const [updatePermission] = useUpdatePermissionMutation();
  const [deletePermission] = useDeletePermissionMutation();

  const [newPermissionName, setNewPermissionName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const isSubmitDisabled = !newPermissionName.trim();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPermissionName.trim()) return;
    try {
      await createPermission({ permissionName: newPermissionName.toUpperCase() }).unwrap();
      setNewPermissionName("");
    } catch (err) { console.error("Failed to create permission", err); }
  };

  const handleUpdate = async (id: number) => {
    try {
      await updatePermission({ id, body: { permissionName: editName.toUpperCase() } }).unwrap();
      setEditingId(null);
    } catch (err) { console.error("Failed to update permission", err); }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this permission?")) {
      try { await deletePermission(id).unwrap(); }
      catch (err) {
        console.error("Failed to delete permission", err);
        alert("Cannot delete permission. It might be assigned to roles/levels.");
      }
    }
  };

  if (isLoading) return <div style={{ padding: '48px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading permissions...</div>;
  if (error) return <div style={{ padding: '48px', textAlign: 'center', fontSize: 13, color: '#791F1F' }}>Error loading permissions.</div>;

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Permission Management</h1>
        <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>Define granular system permissions that can be assigned to roles and levels.</p>
      </div>

      {/* Create */}
      <Can permission="PERMISSION_MANAGE">
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
          <h2 style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Create New Permission</h2>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input type="text" placeholder="e.g. MANAGE_USERS" value={newPermissionName}
              onChange={e => setNewPermissionName(e.target.value)}
              style={{ ...inputStyle, flex: '1 1 200px' }} />
            <button type="submit"
              disabled={isSubmitDisabled}
              style={{
                padding: '7px 18px',
                fontSize: 13,
                fontWeight: 500,
                background: isSubmitDisabled ? '#E5E7EB' : '#111827',
                color: isSubmitDisabled ? '#9CA3AF' : '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap'
              }}
              className="transition-opacity"
            >
              Add Permission
            </button>
          </form>
        </div>
      </Can>

      {/* Table */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #E4E6EC', background: '#F5F6F8' }}>
              <th style={{ padding: '9px 16px', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', width: 60 }}>ID</th>
              <th style={{ padding: '9px 16px', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>Permission Name</th>
              <th style={{ padding: '9px 16px', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {permissions?.map((perm, idx) => (
              <tr key={perm.permissionId} style={{ borderBottom: idx < (permissions.length - 1) ? '0.5px solid #F0F2F6' : 'none' }}
                className="hover:bg-[#FAFBFF] transition-colors">
                <td style={{ padding: '10px 16px', fontSize: 12, color: '#9EA3B0', fontFamily: 'monospace' }}>{perm.permissionId}</td>
                <td style={{ padding: '10px 16px' }}>
                  {editingId === perm.permissionId ? (
                    <input type="text" autoFocus
                      style={{ ...inputStyle, textTransform: 'uppercase', width: 'auto', minWidth: 200 }}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => handleUpdate(perm.permissionId)}
                      onKeyDown={e => e.key === "Enter" && handleUpdate(perm.permissionId)} />
                  ) : (
                    <span style={{ background: '#EEF3FD', color: '#0C447C', border: '0.5px solid #B5D4F4', fontSize: 12, fontWeight: 500, padding: '3px 8px', borderRadius: 6 }}>
                      {perm.permissionName}
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <Can permission="PERMISSION_MANAGE">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button onClick={() => { setEditingId(perm.permissionId); setEditName(perm.permissionName); }}
                        style={{ fontSize: 12, color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                        className="hover:underline">Edit</button>
                      <button onClick={() => handleDelete(perm.permissionId)}
                        style={{ fontSize: 12, color: '#791F1F', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                        className="hover:underline">Delete</button>
                    </div>
                  </Can>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PermissionList;
