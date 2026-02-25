import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { fetchNotifications, markNotificationRead } from "../api/notifications";
import type { Notification } from "../types";

export function NotificationsBell({ userId }: { userId: string | null }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  async function load() {
    if (!userId) return;
    setLoading(true);
    try {
      const notifs = await fetchNotifications(userId, false, 50);
      setItems(notifs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!open) return;
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  async function onOpen() {
    setOpen((v) => !v);
    if (!open) await load();
  }

  async function onMarkRead(n: Notification) {
    if (!userId || n.read) return;

    setItems((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
    );

    try {
      await markNotificationRead(userId, n.id);
    } catch {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: false } : x))
      );
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={onOpen}
        className="relative p-2 rounded-lg hover:bg-gray-100"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold">Notifications</div>
            {loading && <div className="text-xs text-gray-500">Loading...</div>}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notifications.</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onMarkRead(n)}
                  className={`w-full text-left p-4 border-b last:border-b-0 hover:bg-gray-50 ${
                    n.read ? "bg-white" : "bg-purple-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 h-2 w-2 rounded-full ${
                        n.read ? "bg-transparent" : "bg-purple-600"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {n.payload?.otherUserName
                          ? `${n.payload.otherUserName} wants to trade`
                          : "New match"}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {n.payload?.mutualItemTitle && n.payload?.itemTitle
                          ? `${n.payload.mutualItemTitle} ↔ ${n.payload.itemTitle}`
                          : "Open to view details"}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}