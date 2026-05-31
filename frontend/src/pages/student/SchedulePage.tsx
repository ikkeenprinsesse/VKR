import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Calendar,
  LayoutGrid, List, BookOpen, MessageSquare,
} from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getMySchedule } from "@/api/lessons";
import api from "@/api/client";
import type { UserOut } from "@/api/auth";
import Sidebar from "@/components/Sidebar";
import WeekView from "@/components/calendar/WeekView";
import MonthView from "@/components/calendar/MonthView";
import LessonCard from "@/components/LessonCard";
import LessonDetailModal from "@/components/LessonDetailModal";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfWeek, weekDays, lessonsForDay, MONTHS } from "@/lib/date";
import type { Lesson } from "@/api/lessons";
import { cn } from "@/lib/utils";

type ViewMode = "week" | "month" | "list";

const NAV = [
  { icon: Calendar,      label: "Обзор",          href: "/dashboard/student" },
  { icon: Calendar,      label: "Расписание",      href: "/dashboard/student/schedule" },
  { icon: BookOpen,      label: "Мои задания",     href: "/dashboard/student/homework" },
  { icon: MessageSquare, label: "Чат",             href: "/dashboard/student/chat" },
];

export default function StudentSchedulePage() {
  useCurrentUser();

  const lessons = useAsync(getMySchedule);

  // Загружаем репетитора чтобы знать есть ли кошелёк ЮMoney
  const tutorData = useAsync<UserOut | null>(async () => {
    const all = await getMySchedule();
    const tutorId = all[0]?.tutor_id;
    if (!tutorId) return null;
    return api.get<UserOut>(`/users/${tutorId}`).then((r) => r.data).catch(() => null);
  });

  const [view, setView]         = useState<ViewMode>("week");
  const [curDate, setCurDate]   = useState(new Date());
  const [selected, setSelected] = useState<Lesson | null>(null);

  function navigate(dir: -1 | 1) {
    setCurDate((d) => {
      const next = new Date(d);
      if (view === "week")  next.setDate(d.getDate() + 7 * dir);
      else next.setMonth(d.getMonth() + dir);
      return next;
    });
  }

  const weekStart = startOfWeek(curDate);
  const all = lessons.data ?? [];

  const listDays = (() => {
    if (view !== "list") return [];
    const start = new Date(curDate.getFullYear(), curDate.getMonth(), 1);
    const end   = new Date(curDate.getFullYear(), curDate.getMonth() + 1, 0);
    const days: Date[] = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (lessonsForDay(all, new Date(d)).length > 0) days.push(new Date(d));
    }
    return days;
  })();

  const title = (() => {
    if (view === "week") {
      const days = weekDays(weekStart);
      const first = days[0], last = days[6];
      if (first.getMonth() === last.getMonth())
        return `${first.getDate()}–${last.getDate()} ${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
      return `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`;
    }
    return `${MONTHS[curDate.getMonth()]} ${curDate.getFullYear()}`;
  })();

  // Count upcoming lessons this week
  const now = new Date();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekCount = all.filter((l) => {
    const d = new Date(l.date);
    return d >= now && d < weekEnd && l.status !== "cancelled";
  }).length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={NAV} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-base font-semibold text-gray-900 min-w-[220px] text-center">
              {title}
            </span>
            <button
              onClick={() => navigate(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setCurDate(new Date())}
              className="text-sm text-primary border border-primary/30 rounded-lg px-3 py-1 hover:bg-violet-50 transition-colors ml-1"
            >
              Сегодня
            </button>
          </div>

          {weekCount > 0 && view === "week" && (
            <div className="text-sm text-gray-500">
              <span className="text-primary font-semibold">{weekCount}</span>{" "}
              {weekCount === 1 ? "занятие" : weekCount < 5 ? "занятия" : "занятий"} на этой неделе
            </div>
          )}

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
            {(["week", "month", "list"] as ViewMode[]).map((v) => {
              const icons = { week: Calendar, month: LayoutGrid, list: List };
              const labels = { week: "Неделя", month: "Месяц", list: "Список" };
              const Icon = icons[v];
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {labels[v]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar body */}
        <div className="flex-1 overflow-hidden p-4">
          {lessons.loading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <>
              {view === "week" && (
                <WeekView
                  weekStart={weekStart}
                  lessons={all}
                  onLessonClick={setSelected}
                />
              )}
              {view === "month" && (
                <MonthView
                  month={curDate}
                  lessons={all}
                  onLessonClick={setSelected}
                />
              )}
              {view === "list" && (
                <div className="h-full overflow-y-auto space-y-6 pr-1">
                  {listDays.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                      <Calendar className="w-12 h-12 mb-3 opacity-30" />
                      <p>Нет занятий в этом месяце</p>
                    </div>
                  )}
                  {listDays.map((day) => (
                    <div key={day.toISOString()}>
                      <h3 className="text-sm font-semibold text-gray-500 mb-2 sticky top-0 bg-gray-50 py-1">
                        {day.toLocaleDateString("ru-RU", {
                          weekday: "long", day: "numeric", month: "long",
                        })}
                      </h3>
                      <div className="space-y-2">
                        {lessonsForDay(all, day).map((l) => (
                          <LessonCard
                            key={l.id}
                            lesson={l}
                            showPayment
                            tutorHasWallet={!!tutorData.data?.yoomoney_wallet}
                            defaultPrice={tutorData.data?.default_lesson_price}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {selected && (
        <LessonDetailModal
          lesson={selected}
          isTutor={false}
          onClose={() => setSelected(null)}
          onUpdated={() => lessons.refetch()}
          onDeleted={() => lessons.refetch()}
        />
      )}
    </div>
  );
}
