import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthResponse, AuthState } from "./authTypes";
import type { EmployeeResponse } from "../employee/employeeTypes";

const getStoredToken = (key: string) => {
  const token = localStorage.getItem(key);
  if (token === "undefined" || token === "null" || !token) return null;
  return token;
};

const accessToken = getStoredToken("accessToken");
const refreshToken = getStoredToken("refreshToken");

const storedUser = localStorage.getItem("user");
const parsedUser = storedUser && storedUser !== "null" && storedUser !== "undefined"
  ? JSON.parse(storedUser)
  : null;

const initialState: AuthState = {
  user: parsedUser,
  accessToken,
  refreshToken,
  isAuthenticated: !!accessToken,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<AuthResponse>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;

      if (action.payload.user) {
        state.user = action.payload.user;
        localStorage.setItem("user", JSON.stringify(action.payload.user));
      } else {
        state.user = null;
        localStorage.removeItem("user");
      }

      localStorage.setItem("accessToken", action.payload.accessToken);
      localStorage.setItem("refreshToken", action.payload.refreshToken);
    },
    setTokens: (state, action: PayloadAction<AuthResponse>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;

      localStorage.setItem("accessToken", action.payload.accessToken);
      localStorage.setItem("refreshToken", action.payload.refreshToken);
    },
    setUser: (state, action: PayloadAction<EmployeeResponse>) => {
      state.user = action.payload;
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;

      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    },
  },
});

export const { loginSuccess, logout, setTokens,setUser } = authSlice.actions;
export default authSlice.reducer;
