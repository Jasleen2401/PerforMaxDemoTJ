import { api } from "../../services/api";
import type { NotificationResponse } from "./notificationTypes";
import type { ApiResponse } from "../../services/ApiResponse";

export const notificationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMyNotifications: builder.query<NotificationResponse[], void>({
      query: () => "/notifications",
      transformResponse: (response: ApiResponse<NotificationResponse[]>) => response.data,
      providesTags: ["Profile"], // Re-fetch when profile changes or use a custom tag
    }),
    getUnreadCount: builder.query<number, void>({
      query: () => "/notifications/unread-count",
      transformResponse: (response: ApiResponse<number>) => response.data,
    }),
    markAsRead: builder.mutation<void, number>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
      }),
    }),
    markAllAsRead: builder.mutation<void, void>({
      query: () => ({
        url: "/notifications/read-all",
        method: "PATCH",
      }),
    }),
  }),
});

export const {
  useGetMyNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} = notificationApi;
