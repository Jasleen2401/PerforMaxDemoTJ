export interface NotificationResponse {
  id: number;
  title: string;
  message: string;
  type: string;
  referenceType: string;
  referenceId: number;
  actionUrl: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationState {
  notifications: NotificationResponse[];
  unreadCount: number;
}
