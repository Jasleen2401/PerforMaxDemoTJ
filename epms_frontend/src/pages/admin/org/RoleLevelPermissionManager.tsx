import { useState } from "react";
import { useGetRolesQuery } from "../../../features/org/roleApi";
import { useGetJobLevelsQuery } from "../../../features/org/jobLevelApi";
import {
  useGetPermissionsQuery,
  useGetAssignedPermissionsQuery,
  useTogglePermissionMutation
} from "../../../features/org/permissionApi";
import { getLevelsForRole } from "../../../utils/roleLevel";

const inputStyle: React.CSSProperties = { background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 };

const RoleLevelPermissionManager = () => {
  const { data: roles } = useGetRolesQuery();
  const { data: levels } = useGetJobLevelsQuery();
  const { data: allPermissions } = useGetPermissionsQuery();

  const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
  const [selectedLevelId, setSelectedLevelId] = useState<number>(0);

  const { data: assignments, isLoading: loadingAssignments } = useGetAssignedPermissionsQuery(
    { roleId: selectedRoleId, levelId: selectedLevelId },
    { skip: selectedRoleId === 0 || selectedLevelId === 0 }
  );

  const [togglePermission] = useTogglePermissionMutation();

  const getRelevantLevelsForRole = (roleName: string | undefined) => {
    if (!roleName || !levels) return [];
    return getLevelsForRole(roleName, levels);
  };

  const selectedRoleName = roles?.find(r => r.roleId === selectedRoleId)?.roleName;
  const filteredLevels = getRelevantLevelsForRole(selectedRoleName);

  const handleRoleChange = (roleId: number) => {
    setSelectedRoleId(roleId);
    setSelectedLevelId(0);
  };

  const handleTogglePermission = async (permissionId: number) => {
    if (selectedRoleId === 0 || selectedLevelId === 0) return;
    try {
      await togglePermission({ roleId: selectedRoleId, levelId: selectedLevelId, permissionId }).unwrap();
    } catch (err) {
      console.error("Failed to toggle permission", err);
    }
  };

  const hasSelection = selectedRoleId > 0 && selectedLevelId > 0;

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Assign Permissions</h1>
        <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>Select a role and its valid seniority levels to manage access.</p>
      </div>

      {/* Selectors */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>1. Select Target Role</label>
            <select style={inputStyle} value={selectedRoleId} onChange={e => handleRoleChange(Number(e.target.value))}>
              <option value={0}>Choose a Role...</option>
              {roles?.map(role => <option key={role.roleId} value={role.roleId}>{role.roleName}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>2. Select Valid Job Level</label>
            <select
              style={{ ...inputStyle, opacity: selectedRoleId === 0 ? 0.5 : 1, cursor: selectedRoleId === 0 ? 'not-allowed' : 'pointer' }}
              value={selectedLevelId}
              disabled={selectedRoleId === 0}
              onChange={e => setSelectedLevelId(Number(e.target.value))}>
              <option value={0}>{selectedRoleId === 0 ? "Select a Role first" : "Choose a Level..."}</option>
              {filteredLevels.map(level => (
                <option key={level.levelId} value={level.levelId}>{level.levelName} ({level.levelCode})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Permission Matrix */}
      {hasSelection ? (
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #E4E6EC', background: '#F5F6F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Permission Matrix</h2>
              <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>Toggle permissions to update access instantly.</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ background: '#1A56DB', color: '#FFFFFF', fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase' }}>
                {roles?.find(r => r.roleId === selectedRoleId)?.roleName}
              </span>
              <span style={{ background: '#111827', color: '#FFFFFF', fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase' }}>
                {levels?.find(l => l.levelId === selectedLevelId)?.levelName}
              </span>
            </div>
          </div>

          <div style={{ padding: '16px 18px' }}>
            {loadingAssignments ? (
              <div style={{ padding: '32px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Syncing assignments...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allPermissions?.map(perm => {
                  const isActive = assignments?.some(a => a.permissionId === perm.permissionId);
                  return (
                    <button
                      key={perm.permissionId}
                      onClick={() => handleTogglePermission(perm.permissionId)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                        background: isActive ? '#EEF3FD' : '#F5F6F8',
                        border: `0.5px solid ${isActive ? '#B5D4F4' : '#E4E6EC'}`,
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: isActive ? '#0C447C' : '#5A6070', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        {perm.permissionName}
                      </span>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        background: isActive ? '#1A56DB' : '#E4E6EC',
                        color: isActive ? '#FFFFFF' : '#9EA3B0',
                      }}>
                        {isActive ? (
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ border: '2px dashed #E4E6EC', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, background: '#F5F6F8', border: '0.5px solid #E4E6EC', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="20" height="20" fill="none" stroke="#9EA3B0" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 6 }}>Selection Required</h3>
          <p style={{ fontSize: 13, color: '#9EA3B0' }}>Choose a role and level above to manage their specific permissions.</p>
        </div>
      )}
    </div>
  );
};

export default RoleLevelPermissionManager;
