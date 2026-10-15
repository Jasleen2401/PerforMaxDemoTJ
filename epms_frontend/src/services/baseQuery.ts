import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import type { RootState } from "../app/store";

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.startsWith("http")) {
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }
  // Auto-connect when running live on Render
  if (typeof window !== "undefined" && window.location.hostname.includes("onrender.com")) {
    return "https://performax-backend.onrender.com/api";
  }
  return envUrl || "/api";
};

export const baseQuery = fetchBaseQuery({
    baseUrl: getApiBaseUrl(),
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.accessToken;
        // 2. Add the skip-warning header for ngrok
        headers.set("ngrok-skip-browser-warning", "true");
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
        return headers;
    }
})