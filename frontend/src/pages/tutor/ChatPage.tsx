import { useState } from "react";
import {
  MessageSquare, Calendar, BookOpen, Users,
  BarChart3, TrendingUp, Search,
} from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getMyStudents } from "@/api/users";
import type { UserOut } from "@/api/auth";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: BarChart3,     label: "Обзор",     href: "/dashboard/tutor" },
  { icon: Calendar,      label: "Расписание", href: "/dashboard/tutor/schedule" },
  { icon: BookOpen,      label: "Задания",    href: "/dashboard/tutor/homework" },
  { icon: Users,         label: "Ученики",    href: "/dashboard/tutor/students" },
  { icon: MessageSquare, label: "Чат",        href: "/dashboard/tutor/chat" },
  { icon: TrendingUp,    label: "Финансы",    href: "/dashboard/tutor/payments" },
];

export default function TutorChatPage() {
  useCurrentUser();

  const students = useAsync(getMyStudents);
  const [selected, setSelected] = useState<UserOut | null>(null);
  const [search, setSearch]     = useState("");

  const filtered = (students.data ?? []).filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={NAV} />

      <main className="flex-1 flex overflow-hidden bg-white">
        {/* Contacts sidebar */}
        <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col">
          {/* Header */}
          <div className="px-4 py-5 border-b border-gray-100">
            <h1 className="text-lg font-bold text-gray-900 mb-3">Чат</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Поиск учеников…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Contacts list */}
          <div className="flex-1 overflow-y-auto py-2">
            {students.loading && (
              <div className="px-4 space-y-2">
                <Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" />
              </div>
            )}

            {!students.loading && (students.data ?? []).length === 0 && (
              <div className="px-4 py-8 text-center text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Нет учеников</p>
              </div>
            )}

            {filtered.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelected(student)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50",
                  selected?.id === student.id && "bg-violet-50 border-r-2 border-primary"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                  {student.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    selected?.id === student.id ? "text-primary" : "text-gray-900"
                  )}>
                    {student.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{student.email}</p>
                </div>
              </button>
            ))}

            {!students.loading && filtered.length === 0 && (students.data ?? []).length > 0 && (
              <p className="text-center text-sm text-gray-400 py-6">Ничего не найдено</p>
            )}
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
              <p className="text-base font-medium text-gray-500">Выберите ученика</p>
              <p className="text-sm mt-1">чтобы начать переписку</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
