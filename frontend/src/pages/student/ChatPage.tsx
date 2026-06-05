import { useState, useEffect } from "react";
import { MessageSquare, Search, GraduationCap} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getMyTutors } from "@/api/users";
import { getUnreadCounts } from "@/api/chat";
import type { UserOut } from "@/api/auth";
import { STUDENT_NAV } from "@/config/nav";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";


export default function StudentChatPage() {
  useCurrentUser();

  const [tutors,   setTutors]   = useState<UserOut[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<UserOut | null>(null);
  const [search,   setSearch]   = useState("");
  const [unread,   setUnread]   = useState<Record<string, number>>({});

  // Загружаем репетиторов через связь, а не через занятия
  useEffect(() => {
    setLoading(true);
    getMyTutors()
      .then((data) => {
        setTutors(data);
        // Автовыбор первого если один репетитор
        if (data.length === 1) setSelected(data[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Счётчик непрочитанных
  useEffect(() => {
    getUnreadCounts().then(setUnread);
    const id = setInterval(() => getUnreadCounts().then(setUnread), 15_000);
    return () => clearInterval(id);
  }, []);

  function openChat(tutor: UserOut) {
    setSelected(tutor);
    setUnread((prev) => ({ ...prev, [tutor.id]: 0 }));
  }

  const filtered = tutors.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={STUDENT_NAV} />

      <main className="flex-1 flex overflow-hidden" style={{ height: "100vh" }}>
        {/* Contacts */}
        <div className="w-72 shrink-0 bg-white border-r border-gray-100 flex flex-col">
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
            {loading && (
              <div className="px-4 pt-3 space-y-2">
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </div>
            )}

            {!loading && tutors.length === 0 && (
              <div className="px-4 py-10 text-center">
                <GraduationCap className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-500 font-medium">Нет репетиторов</p>
                <p className="text-xs text-gray-400 mt-1">Попросите репетитора пригласить вас по ссылке</p>
              </div>
            )}

            {filtered.map((tutor) => {
              const count = unread[String(tutor.id)] ?? 0;
              const isActive = selected?.id === tutor.id;
              return (
                <button
                  key={tutor.id}
                  onClick={() => openChat(tutor)}
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
                      {tutor.name[0].toUpperCase()}
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
                      {tutor.name}
                    </p>
                    <p className="text-xs text-gray-400">Репетитор</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ChatWindow key={selected.id} contact={selected} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50">
              <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7 text-violet-300" />
              </div>
              <p className="font-semibold text-gray-500">Выберите репетитора</p>
              <p className="text-sm text-gray-400 mt-1">чтобы начать переписку</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
