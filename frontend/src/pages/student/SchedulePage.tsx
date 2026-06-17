import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Calendar,
  LayoutGrid, List, Clock, Video, CalendarPlus, RefreshCw, Loader2, Download } from "lucide-react";
import { downloadFile } from "@/lib/download";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getMySchedule } from "@/api/lessons";
import api from "@/api/client";
import type { UserOut } from "@/api/auth";
import { STUDENT_NAV } from "@/config/nav";
import Sidebar from "@/components/Sidebar";
import ErrorBanner from "@/components/ErrorBanner";
import WeekView from "@/components/calendar/WeekView";
import MonthView from "@/components/calendar/MonthView";
import LessonCard from "@/components/LessonCard";
import LessonDetailModal from "@/components/LessonDetailModal";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfWeek, weekDays, lessonsForDay, MONTHS } from "@/lib/date";
import type { Lesson } from "@/api/lessons";
import { getAvailableSlots, bookSlot, slotLabel } from "@/api/slots";
import type { Slot } from "@/api/slots";
import { cn } from "@/lib/utils";

type ViewMode = "week" | "month" | "list";


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
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [exportingIcs, setExportingIcs] = useState(false);

  async function handleExportIcs() {
    setExportingIcs(true);
    try {
      await downloadFile("/calendar/export", "tutorspace_schedule.ics");
    } finally {
      setExportingIcs(false);
    }
  }
  const availableSlots = useAsync(getAvailableSlots);

  async function handleBook(slot: Slot) {
    setBookingId(slot.id);
    setBookError(null);
    try {
      await bookSlot(slot.id);
      lessons.refetch();
      availableSlots.refetch();
    } catch (e: any) {
      setBookError(e?.response?.data?.detail ?? "Ошибка записи");
    } finally {
      setBookingId(null);
    }
  }

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

  // Ближайшее занятие
  const now = new Date();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekCount = all.filter((l) => {
    const d = new Date(l.date);
    return d >= now && d < weekEnd && l.status !== "cancelled";
  }).length;

  const nextLesson = all
    .filter((l) => new Date(l.date) >= now && l.status !== "cancelled")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;

  const nextLessonMs = nextLesson ? new Date(nextLesson.date).getTime() - now.getTime() : null;
  const nextLessonLabel = (() => {
    if (!nextLessonMs) return null;
    const min = Math.floor(nextLessonMs / 60000);
    if (min < 60) return `через ${min} мин`;
    const h = Math.floor(min / 60);
    if (h < 24) return `через ${h} ч`;
    const d = Math.floor(h / 24);
    return `через ${d} дн`;
  })();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={STUDENT_NAV} />

      <main className="flex-1 flex flex-col overflow-hidden pt-16 lg:pt-0">
        {lessons.error && (
          <ErrorBanner
            error={lessons.error}
            onRetry={() => { lessons.refetch(); availableSlots.refetch(); }}
            className="m-4"
          />
        )}
        {/* Toolbar */}
        <div className="shrink-0 bg-white border-b border-gray-100 px-3 md:px-6 py-3 flex items-center gap-2 flex-wrap">
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

          <button
            onClick={handleExportIcs}
            disabled={exportingIcs}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Экспорт в календарь (.ics)"
          >
            {exportingIcs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            .ics
          </button>

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

        {/* Баннер ближайшего занятия */}
        {nextLesson && nextLessonLabel && (
          <div
            className="shrink-0 mx-4 mt-4 bg-violet-600 rounded-2xl px-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-violet-700 transition-colors"
            onClick={() => setSelected(nextLesson)}
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">
                {nextLesson.topic ?? "Занятие"} — {nextLessonLabel}
              </p>
              <p className="text-violet-200 text-xs">
                {new Date(nextLesson.date).toLocaleString("ru-RU", {
                  weekday: "short", day: "numeric", month: "short",
                  hour: "2-digit", minute: "2-digit",
                })} · {nextLesson.duration} мин
              </p>
            </div>
            {nextLesson.meeting_link && (
              <a
                href={nextLesson.meeting_link}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-white text-xs font-bold transition-colors"
              >
                <Video className="w-3.5 h-3.5" /> Войти
              </a>
            )}
          </div>
        )}

        {/* Доступные слоты для записи */}
        {availableSlots.data && availableSlots.data.length > 0 && (
          <div className="shrink-0 mx-4 mt-3 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CalendarPlus className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-bold text-gray-800">Доступные слоты для записи</span>
            </div>
            {bookError && (
              <div className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-2">{bookError}</div>
            )}
            <div className="flex flex-wrap gap-2">
              {availableSlots.data.map((slot: Slot) => (
                <div
                  key={slot.id}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 hover:border-violet-300 hover:bg-violet-50 transition-colors group"
                >
                  <div className="text-violet-500">
                    {slot.is_recurring ? <RefreshCw className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{slotLabel(slot)}</p>
                    <p className="text-[10px] text-gray-400">{slot.duration} мин</p>
                  </div>
                  <button
                    onClick={() => handleBook(slot)}
                    disabled={bookingId === slot.id}
                    className="ml-2 flex items-center gap-1 px-2.5 py-1 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60"
                  >
                    {bookingId === slot.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : "Записаться"
                    }
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
                          weekday: "long", day: "numeric", month: "long" })}
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
