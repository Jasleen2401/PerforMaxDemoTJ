import type { EmployeeResponse } from "../employee/employeeTypes";

export interface AuthRequest{
    email:string;
    password:string;
}

export interface AuthResponse{
    accessToken: string;
    refreshToken: string;
    user?: EmployeeResponse | null;
}

export interface RefreshTokenRequest{
    refreshToken: string;
}

export interface AuthState{
    user: EmployeeResponse | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}