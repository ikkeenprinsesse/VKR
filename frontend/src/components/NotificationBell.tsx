import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { getMyNotifications, getUnreadCount, markAllRead, markOneRead } from "@/api/notifications";
import type { AppNotification } from "@/api/notifications";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

interface Props {
  collapsed?: boolean;
}

export default function NotificationBell({ collapsed }: Props) {
  const navigate = useNavigate();
  const [open, setOpen]           = useState(false);
  const [notifications, setNotifs] = useState<AppNotification[]>([]);
  const [unread, setUnread]        = useState(0);
  const [loading, setLoading]      = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Счётчик непрочитанных — опрашиваем каждые 30 сек
  useEffect(() => {
    let cancelled = false;
    async function fetchCount() {
      try {
        const n = await getUnreadCount();
        if (!cancelled) setUnread(n);
      } catch {}
    }
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Закрытие по клику вне
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    try {
      const data = await getMyNotifications();
      setNotifs(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAll() {
    await markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  }

  async function handleClick(n: AppNotification) {
    if (!n.is_read) {
      await markOneRead(n.id);
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      setUnread(prev => Math.max(0, prev - 1));
    }
    setOpen(false);
    if (n.url) navigate(n.url);
  }

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={handleOpen}
        title="Уведомления"
        className={cn(
          "relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-colors",
          "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
          open && "bg-gray-50 text-gray-800"
        )}
      >
        <div className="relative shrink-0">
          <Bell className="w-5 h-5 text-gray-400" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-0.5 leading-none">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
        {!collapsed && <span>Уведомления</span>}
      </button>

      {open && (
        <div className={cn(
          "absolute z-50 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden",
          "w-80",
          collapsed ? "left-14 bottom-0" : "left-0 bottom-full mb-2"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-bold text-gray-900 text-sm">Уведомления</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Прочитать все
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm font-semibold">Нет уведомлений</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors",
                    !n.is_read && "bg-violet-50 hover:bg-violet-100"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0 mt-1.5" />
                    )}
                    <div className={cn("flex-1 min-w-0", n.is_read && "pl-4")}>
                      <p className={cn("text-sm leading-snug truncate", n.is_read ? "text-gray-600 font-semibold" : "text-gray-900 font-bold")}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
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
