import type { Notification } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function fetchNotifications(userId: string, unreadOnly = false, limit = 50) {
  
  const url = new URL(`${API_BASE}/notifications`);
  url.searchParams.set("userId", userId);
  url.searchParams.set("unreadOnly", String(unreadOnly));
  url.searchParams.set("limit", String(limit));
  
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch notifications");
  const data = await res.json();
  return data.notifications as Notification[];
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const url = new URL(`${API_BASE}/notifications/${notificationId}/read`);
  url.searchParams.set("userId", userId);

  const res = await fetch(url.toString(), { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to mark notification read");
  return res.json();
}

