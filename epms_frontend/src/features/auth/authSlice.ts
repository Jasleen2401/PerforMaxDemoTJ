import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AdminBackup, AuthResponse, AuthState } from "./authTypes";
import type { EmployeeResponse } from "../employee/employeeTypes";

const getStoredToken = (key: string) => {
  const token = localStorage.getItem(key);
  if (token === "undefined" || token === "null" || !token) return null;
  return token;
};

const accessToken = getStoredToken("accessToken");
const refreshToken = getStoredToken("refreshToken");

let parsedUser = null;
try {
  const storedUser = localStorage.getItem("user");
  if (storedUser && storedUser !== "null" && storedUser !== "undefined") {
    parsedUser = JSON.parse(storedUser);
  }
} catch {
  parsedUser = null;
  try { localStorage.removeItem("user"); } catch {}
}

const storedAdminBackup = sessionStorage.getItem("admin_auth_backup");
const parsedAdminBackup: AdminBackup | null = storedAdminBackup && storedAdminBackup !== "null"
  ? JSON.parse(storedAdminBackup)
  : null;

const initialState: AuthState = {
  user: parsedUser,
  accessToken,
  refreshToken,
  isAuthenticated: !!accessToken,
  passwordChangeRequired: false,
  isImpersonating: !!parsedAdminBackup,
  originalAdmin: parsedAdminBackup,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<AuthResponse>) => {
      if (!action.payload) return;
      state.accessToken = action.payload.accessToken || null;
      state.refreshToken = action.payload.refreshToken || null;
      state.isAuthenticated = Boolean(action.payload.accessToken);
      state.isImpersonating = false;
      state.originalAdmin = null;
      sessionStorage.removeItem("admin_auth_backup");

      const pcr = Boolean(
        action.payload.password_change_required ||
        action.payload.user?.password_change_required ||
        action.payload.data?.password_change_required
      );
      state.passwordChangeRequired = pcr;

      if (action.payload.user) {
        state.user = action.payload.user;
        localStorage.setItem("user", JSON.stringify(action.payload.user));
      }

      if (action.payload.accessToken) {
        localStorage.setItem("accessToken", action.payload.accessToken);
      }
      if (action.payload.refreshToken) {
        localStorage.setItem("refreshToken", action.payload.refreshToken);
      }
    },
    setTokens: (state, action: PayloadAction<AuthResponse>) => {
      if (!action.payload) return;
      state.accessToken = action.payload.accessToken || null;
      state.refreshToken = action.payload.refreshToken || null;

      if (action.payload.accessToken) {
        localStorage.setItem("accessToken", action.payload.accessToken);
      }
      if (action.payload.refreshToken) {
        localStorage.setItem("refreshToken", action.payload.refreshToken);
      }
    },
    setUser: (state, action: PayloadAction<EmployeeResponse>) => {
      state.user = action.payload;
      if (action.payload?.password_change_required !== undefined) {
        state.passwordChangeRequired = Boolean(action.payload.password_change_required);
      }
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    passwordChangeCompleted: (state) => {
      state.passwordChangeRequired = false;
      if (state.user) {
        state.user.password_change_required = false;
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },
    startImpersonation: (state, action: PayloadAction<AuthResponse>) => {
      if (!sessionStorage.getItem("admin_auth_backup")) {
        const backup: AdminBackup = {
          accessToken: state.accessToken || "",
          refreshToken: state.refreshToken || "",
          user: state.user,
        };
        sessionStorage.setItem("admin_auth_backup", JSON.stringify(backup));
        state.originalAdmin = backup;
      }
      state.isImpersonating = true;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;

      if (action.payload.user) {
        state.user = action.payload.user;
        localStorage.setItem("user", JSON.stringify(action.payload.user));
      }

      localStorage.setItem("accessToken", action.payload.accessToken);
      localStorage.setItem("refreshToken", action.payload.refreshToken);
    },
    stopImpersonation: (state) => {
      const backupRaw = sessionStorage.getItem("admin_auth_backup");
      if (backupRaw) {
        try {
          const backup: AdminBackup = JSON.parse(backupRaw);
          state.accessToken = backup.accessToken;
          state.refreshToken = backup.refreshToken;
          state.user = backup.user;
          state.isAuthenticated = !!backup.accessToken;
          localStorage.setItem("accessToken", backup.accessToken);
          localStorage.setItem("refreshToken", backup.refreshToken);
          if (backup.user) {
            localStorage.setItem("user", JSON.stringify(backup.user));
          } else {
            localStorage.removeItem("user");
          }
        } catch (e) {
          console.error("Failed to restore admin auth backup:", e);
        }
        sessionStorage.removeItem("admin_auth_backup");
      }
      state.isImpersonating = false;
      state.originalAdmin = null;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.passwordChangeRequired = false;
      state.isImpersonating = false;
      state.originalAdmin = null;

      sessionStorage.removeItem("admin_auth_backup");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    },
  },
});

export const {
  loginSuccess,
  logout,
  setTokens,
  setUser,
  passwordChangeCompleted,
  startImpersonation,
  stopImpersonation,
} = authSlice.actions;

export default authSlice.reducer;
