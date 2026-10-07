import { useGetPermissionMatrixQuery, useTogglePermissionMutation } from "../../../features/org/permissionApi";
import { useState } from "react";
import { getLevelsForRole } from "../../../utils/roleLevel";

const PermissionMatrixView = () => {
  const { data: matrixData, isLoading, error } = useGetPermissionMatrixQuery();
  const [togglePermission] = useTogglePermissionMutation();
  const [updating, setUpdating] = useState<string | null>(null);

  if (isLoading) return <div style={{ padding: '48px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading Matrix...</div>;
  if (error) return <div style={{ padding: '48px', textAlign: 'center', fontSize: 13, color: '#791F1F' }}>Error loading permission matrix.</div>;
  if (!matrixData) return null;

  const { roles, levels, permissions, matrix } = matrixData;

  const getRelevantLevelsForRole = (roleName: string) =>
    getLevelsForRole(roleName, levels);

  const handleToggle = async (roleId: number, levelId: number, permissionId: number) => {
    const key = `${roleId}-${levelId}-${permissionId}`;
    setUpdating(key);
    try {
      await togglePermission({ roleId, levelId, permissionId }).unwrap();
    } catch (err) {
      console.error("Failed to toggle permission", err);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Access Control Matrix</h1>
          <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>Configuring permissions based on Role-Level seniority mapping.</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EAF3DE', border: '0.5px solid #B8DCA0', borderRadius: 8, padding: '4px 10px' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grid Status:</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#27500A' }}>Synced</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead>
              <tr style={{ background: '#111827' }}>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 500, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', position: 'sticky', left: 0, background: '#111827', zIndex: 20, borderRight: '0.5px solid #374151', minWidth: 200 }}>
                  Permission Name
                </th>
                {roles.map(role => {
                  const relevantLevels = getRelevantLevelsForRole(role.roleName);
                  if (relevantLevels.length === 0) return null;
                  return (
                    <th key={role.roleId} colSpan={relevantLevels.length}
                      style={{ padding: '12px 8px', fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'center', borderRight: '0.5px solid #374151', background: '#1E2433' }}>
                      {role.roleName} Role Group
                    </th>
                  );
                })}
              </tr>
              <tr style={{ background: '#F5F6F8', borderBottom: '0.5px solid #E4E6EC' }}>
                <th style={{ padding: '8px 16px', position: 'sticky', left: 0, background: '#F5F6F8', zIndex: 20, borderRight: '0.5px solid #E4E6EC' }} />
                {roles.map(role => {
                  const relevantLevels = getRelevantLevelsForRole(role.roleName);
                  return relevantLevels.map(level => (
                    <th key={`${role.roleId}-${level.levelId}`}
                      style={{ padding: '8px 6px', textAlign: 'center', minWidth: 90, borderRight: '0.5px solid #E4E6EC' }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#111827' }}>{level.levelCode}</div>
                      <div style={{ fontSize: 10, color: '#9EA3B0', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }} title={level.levelName}>{level.levelName}</div>
                    </th>
                  ));
                })}
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm, idx) => (
                <tr key={perm.permissionId}
                  style={{ borderBottom: idx < permissions.length - 1 ? '0.5px solid #F0F2F6' : 'none' }}
                  className="hover:bg-[#FAFBFF] transition-colors group">
                  <td style={{ padding: '10px 16px', position: 'sticky', left: 0, background: '#FFFFFF', zIndex: 10, borderRight: '0.5px solid #E4E6EC' }}
                    className="group-hover:bg-[#FAFBFF]">
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{perm.permissionName}</div>
                    <div style={{ fontSize: 10, color: '#9EA3B0', marginTop: 1, fontFamily: 'monospace' }}>ID: {perm.permissionId}</div>
                  </td>
                  {roles.map(role => {
                    const relevantLevels = getRelevantLevelsForRole(role.roleName);
                    return relevantLevels.map(level => {
                      const isAssigned = matrix.find(m => m.roleId === role.roleId && m.levelId === level.levelId)
                        ?.permissionIds.includes(perm.permissionId);
                      const isUpdating = updating === `${role.roleId}-${level.levelId}-${perm.permissionId}`;
                      return (
                        <td key={`${role.roleId}-${level.levelId}-${perm.permissionId}`}
                          style={{ padding: '8px 6px', textAlign: 'center', borderRight: '0.5px solid #E4E6EC' }}>
                          <button
                            disabled={isUpdating}
                            onClick={() => handleToggle(role.roleId, level.levelId, perm.permissionId)}
                            style={{
                              width: 28, height: 28, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                              background: isAssigned ? '#1A56DB' : '#F5F6F8',
                              color: isAssigned ? '#FFFFFF' : '#9EA3B0',
                              opacity: isUpdating ? 0.5 : 1,
                            }}>
                            {isAssigned ? (
                              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D1D5DB' }} />
                            )}
                          </button>
                        </td>
                      );
                    });
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info panel */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#EEF3FD', border: '0.5px solid #B5D4F4', borderRadius: 8, padding: '14px 16px' }}>
        <div style={{ width: 32, height: 32, background: '#FFFFFF', border: '0.5px solid #B5D4F4', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" fill="none" stroke="#0C447C" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 500, color: '#0C447C', marginBottom: 3 }}>Logical Filtering Active</h4>
          <p style={{ fontSize: 12, color: '#0C447C', opacity: 0.8, lineHeight: 1.5 }}>
            The matrix columns are filtered to only show levels relevant to each role group (e.g. Admin L1-3, HR L4/7). This prevents invalid assignments and keeps the interface clean.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PermissionMatrixView;
