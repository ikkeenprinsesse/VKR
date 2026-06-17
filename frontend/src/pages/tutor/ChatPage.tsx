import { useState, useEffect } from "react";
import { TUTOR_NAV } from "@/config/nav";
import { MessageSquare, Users, Search } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getMyStudents } from "@/api/users";
import { getUnreadCounts } from "@/api/chat";
import type { UserOut } from "@/api/auth";
import Sidebar from "@/components/Sidebar";
import ErrorBanner from "@/components/ErrorBanner";
import ChatWindow from "@/components/ChatWindow";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";


export default function TutorChatPage() {
  useCurrentUser();

  const students = useAsync(getMyStudents);
  const [selected,  setSelected]  = useState<UserOut | null>(null);
  const [search,    setSearch]    = useState("");
  const [unread,    setUnread]    = useState<Record<string, number>>({});

  // Загружаем непрочитанные и обновляем при открытии чата
  useEffect(() => {
    getUnreadCounts().then(setUnread);
    const id = setInterval(() => getUnreadCounts().then(setUnread), 15_000);
    return () => clearInterval(id);
  }, []);

  function openChat(student: UserOut) {
    setSelected(student);
    // сбросить счётчик локально, бэк сбросит при загрузке истории
    setUnread((prev) => ({ ...prev, [student.id]: 0 }));
  }

  const filtered = (students.data ?? []).filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={TUTOR_NAV} />

      <main className="flex-1 flex overflow-hidden pt-16 lg:pt-0" style={{ height: "calc(100vh - 0px)" }}>
        {students.error && (
          <ErrorBanner error={students.error} onRetry={students.refetch} className="absolute top-4 left-72 right-4 z-10" />
        )}
        {/* Contacts — скрываем на мобильном если открыт чат */}
        <div className={cn(
          "shrink-0 bg-white border-r border-gray-100 flex flex-col",
          selected ? "hidden md:flex md:w-72" : "w-full md:w-72"
        )}>
          <div className="px-4 py-4 border-b border-gray-100">
            <h1 className="text-base font-bold text-gray-900 mb-3">Сообщения</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Поиск…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {students.loading && (
              <div className="px-4 pt-3 space-y-2">
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </div>
            )}

            {!students.loading && filtered.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">Нет учеников</p>
              </div>
            )}

            {filtered.map((student) => {
              const count = unread[String(student.id)] ?? 0;
              const isActive = selected?.id === student.id;
              return (
                <button
                  key={student.id}
                  onClick={() => openChat(student)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    isActive
                      ? "bg-violet-50 border-r-2 border-violet-600"
                      : "hover:bg-gray-50 border-r-2 border-transparent"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                      isActive ? "bg-violet-200 text-violet-700" : "bg-violet-100 text-violet-600"
                    )}>
                      {student.name[0].toUpperCase()}
                    </div>
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm truncate",
                      isActive ? "font-bold text-violet-700" : count > 0 ? "font-bold text-gray-900" : "font-medium text-gray-700"
                    )}>
                      {student.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{student.email}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area — скрываем пустой экран на мобильном */}
        <div className={cn("flex-1 overflow-hidden", !selected && "hidden md:flex")}>
          {selected ? (
            <ChatWindow key={selected.id} contact={selected} onBack={() => setSelected(null)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50">
              <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7 text-violet-300" />
              </div>
              <p className="font-semibold text-gray-500">Выберите ученика</p>
              <p className="text-sm text-gray-400 mt-1">чтобы начать переписку</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
