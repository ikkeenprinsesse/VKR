import api from "./client";

export interface AppNotification {
  id: number;
  title: string;
  body: string | null;
  url: string | null;
  is_read: boolean;
  created_at: string;
}

export async function getMyNotifications(): Promise<AppNotification[]> {
  const res = await api.get<AppNotification[]>("/notifications/my");
  return res.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await api.get<{ count: number }>("/notifications/unread-count");
  return res.data.count;
}

export async function markAllRead(): Promise<void> {
  await api.patch("/notifications/read-all");
}

export async function markOneRead(id: number): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}
