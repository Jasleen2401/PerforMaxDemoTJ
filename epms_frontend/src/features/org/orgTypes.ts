export interface DepartmentRequest {
  departmentCode: string;
  departmentName: string;
}

export interface DepartmentResponse {
  id: number | string;
  departmentCode: string;
  departmentName: string;
  isActive: boolean;
}

export interface RoleRequest {
  roleName: string; // Using string to match RoleType enum name
}

export interface RoleResponse {
  roleId: number;
  roleName: string;
}

export interface JobLevelRequest {
  levelCode: string;
  levelName: string;
  levelRank: number;
}

export interface JobLevelResponse {
  levelId: number;
  levelCode: string;
  levelName: string;
  levelRank: number;
}

export interface PositionRequest {
  positionCode: string;
  positionName: string;
  levelId: number;
}

export interface PositionResponse {
  positionId: number;
  positionCode: string;
  positionName: string;
  levelId: number;
  levelName: string;
}

export interface AssignDepartmentRequest {
  currentDepartmentId: number;
  parentDepartmentId?: number;
}

export interface AssignRoleRequest {
  roleId: number;
}

export interface EmployeeDepartmentResponse {
  id: number;
  employeeId: number;
  currentDepartmentId: number;
  currentDepartmentName: string;
  parentDepartmentId?: number;
  parentDepartmentName?: string;
  isCurrent: boolean;
  createdAt: string; // ISO string
}

export interface PermissionRequest {
  permissionName: string;
}

export interface PermissionResponse {
  permissionId: number;
  permissionName: string;
}

export interface AssignPermissionRequest {
  roleId: number;
  levelId: number;
  permissionId: number;
}

export interface RoleLevelPermissionResponse {
  id: number;
  roleId: number;
  roleName: string;
  levelId: number;
  levelName: string;
  permissionId: number;
  permissionName: string;
}

export interface TeamRequest {
  teamName: string;
  departmentId: number;
}

export interface TeamResponse {
  teamId: number | string;
  id?: number | string;
  teamName: string;
  departmentName: string;
  departmentId: number | string;
  managerName?: string | null;
  managerId?: number | string | null;
  memberCount?: number;
}

export interface TeamAssignmentRequest {
  employeeId: number | string;
  teamId: number | string;
  isPrimary: boolean;
}

export interface TeamMemberResponse {
  employeeId: number | string;
  staffName: string;
  employeeCode?: string;
  email?: string;
  positionName: string | null;
  isPrimary: boolean;
}

export interface RoleLevelMapping {
  roleId: number;
  levelId: number;
  permissionIds: number[];
}

export interface PermissionMatrixResponse {
  roles: RoleResponse[];
  levels: JobLevelResponse[];
  permissions: PermissionResponse[];
  matrix: RoleLevelMapping[];
}

export interface UpdatePermissionMatrixRequest {
  roleId: number;
  levelId: number;
  permissionIds: number[];
}


