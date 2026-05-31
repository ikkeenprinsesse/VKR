import { useState, useEffect } from "react";
import {
  MessageSquare, Calendar, BookOpen,
  Search, GraduationCap,
} from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getMySchedule } from "@/api/lessons";
import api from "@/api/client";
import type { UserOut } from "@/api/auth";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: Calendar,      label: "Обзор",          href: "/dashboard/student" },
  { icon: Calendar,      label: "Расписание",      href: "/dashboard/student/schedule" },
  { icon: BookOpen,      label: "Мои задания",     href: "/dashboard/student/homework" },
  { icon: MessageSquare, label: "Чат",             href: "/dashboard/student/chat" },
];

export default function StudentChatPage() {
  useCurrentUser();

  const lessons = useAsync(getMySchedule);
  const [tutors, setTutors]       = useState<UserOut[]>([]);
  const [selected, setSelected]   = useState<UserOut | null>(null);
  const [search, setSearch]       = useState("");
  const [loadingTutors, setLoadingTutors] = useState(false);

  // Получаем уникальных репетиторов из занятий
  useEffect(() => {
    if (!lessons.data) return;
    const tutorIds = [...new Set(lessons.data.map((l) => l.tutor_id))];
    if (tutorIds.length === 0) return;

    setLoadingTutors(true);
    Promise.all(
      tutorIds.map((id) => api.get<UserOut>(`/users/${id}`).then((r) => r.data).catch(() => null))
    ).then((results) => {
      setTutors(results.filter(Boolean) as UserOut[]);
    }).finally(() => setLoadingTutors(false));
  }, [lessons.data]);

  const filtered = tutors.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = lessons.loading || loadingTutors;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={NAV} />

      <main className="flex-1 flex overflow-hidden bg-white">
        {/* Contacts sidebar */}
        <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col">
          <div className="px-4 py-5 border-b border-gray-100">
            <h1 className="text-lg font-bold text-gray-900 mb-3">Чат</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Поиск…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {isLoading && (
              <div className="px-4 space-y-2">
                <Skeleton className="h-14" /><Skeleton className="h-14" />
              </div>
            )}

            {!isLoading && tutors.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-400">
                <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Нет репетиторов</p>
                <p className="text-xs mt-1">Попросите репетитора добавить вас через ссылку-приглашение</p>
              </div>
            )}

            {filtered.map((tutor) => (
              <button
                key={tutor.id}
                onClick={() => setSelected(tutor)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50",
                  selected?.id === tutor.id && "bg-violet-50 border-r-2 border-primary"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                  {tutor.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    selected?.id === tutor.id ? "text-primary" : "text-gray-900"
                  )}>
                    {tutor.name}
                  </p>
                  <p className="text-xs text-gray-400">Репетитор</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ChatWindow key={selected.id} contact={selected} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <MessageSquare className="w-9 h-9 opacity-40" />
              </div>
              <p className="text-base font-medium text-gray-500">Выберите репетитора</p>
              <p className="text-sm mt-1">чтобы начать переписку</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
