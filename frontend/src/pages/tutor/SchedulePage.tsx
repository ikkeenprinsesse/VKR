import { useState } from "react";
import { TUTOR_NAV } from "@/config/nav";
import {
  ChevronLeft, ChevronRight, Plus, Calendar,
  LayoutGrid, List, Clock, Trash2, RefreshCw, Lock, Download, Loader2 as Spin } from "lucide-react";
import { downloadFile } from "@/lib/download";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getMySchedule, updateLesson } from "@/api/lessons";
import { getMyStudents } from "@/api/users";
import Sidebar from "@/components/Sidebar";
import ErrorBanner from "@/components/ErrorBanner";
import WeekView from "@/components/calendar/WeekView";
import MonthView from "@/components/calendar/MonthView";
import CreateLessonModal from "@/components/CreateLessonModal";
import LessonDetailModal from "@/components/LessonDetailModal";
import LessonCard from "@/components/LessonCard";

import { Skeleton } from "@/components/ui/skeleton";
import { startOfWeek, weekDays, lessonsForDay, MONTHS } from "@/lib/date";
import type { Lesson } from "@/api/lessons";
import { getMySlots, deleteSlot, slotLabel } from "@/api/slots";
import type { Slot } from "@/api/slots";
import CreateSlotModal from "@/components/CreateSlotModal";
import { cn } from "@/lib/utils";

type ViewMode = "week" | "month" | "list";
type StatusFilter = "all" | Lesson["status"];


const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "Все" },
  { value: "planned",   label: "Запланировано" },
  { value: "confirmed", label: "Подтверждено" },
  { value: "completed", label: "Завершено" },
  { value: "cancelled", label: "Отменено" },
];

export default function TutorSchedulePage() {
  useCurrentUser();

  const lessons  = useAsync(getMySchedule);
  const students = useAsync(getMyStudents);

  const [view, setView]           = useState<ViewMode>("week");
  const [curDate, setCurDate]     = useState(new Date());
  const [statusFilter, setStatus] = useState<StatusFilter>("all");
  const [showCreate, setShowCreate]         = useState(false);
  const [createSlotDate, setCreateSlotDate] = useState<Date | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showSlotModal, setShowSlotModal]   = useState(false);
  const [exportingIcs, setExportingIcs]     = useState(false);

  async function handleExportIcs() {
    setExportingIcs(true);
    try {
      await downloadFile("/calendar/export", "tutorspace_schedule.ics");
    } finally {
      setExportingIcs(false);
    }
  }
  const slots = useAsync(getMySlots);

  // ── Navigation ─────────────────────────────────────────────────────────────
  function navigate(dir: -1 | 1) {
    setCurDate((d) => {
      const next = new Date(d);
      if (view === "week")  next.setDate(d.getDate() + 7 * dir);
      if (view === "month") next.setMonth(d.getMonth() + dir);
      if (view === "list")  next.setMonth(d.getMonth() + dir);
      return next;
    });
  }

  const weekStart = startOfWeek(curDate);

  // ── Filtered lessons ───────────────────────────────────────────────────────
  const filtered = (lessons.data ?? []).filter(
    (l) => statusFilter === "all" || l.status === statusFilter
  );

  // For list view: group by date
  const listDays = (() => {
    if (view !== "list") return [];
    const start = new Date(curDate.getFullYear(), curDate.getMonth(), 1);
    const end   = new Date(curDate.getFullYear(), curDate.getMonth() + 1, 0);
    const days: Date[] = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (lessonsForDay(filtered, new Date(d)).length > 0) days.push(new Date(d));
    }
    return days;
  })();

  // ── Title ──────────────────────────────────────────────────────────────────
  const title = (() => {
    if (view === "week") {
      const days = weekDays(weekStart);
      const first = days[0];
      const last  = days[6];
      if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()}–${last.getDate()} ${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
      }
      return `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`;
    }
    return `${MONTHS[curDate.getMonth()]} ${curDate.getFullYear()}`;
  })();

  function handleSlotClick(date: Date) {
    setCreateSlotDate(date);
    setShowCreate(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={TUTOR_NAV} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {(lessons.error || students.error) && (
          <ErrorBanner
            error={lessons.error || students.error || ""}
            onRetry={() => { lessons.refetch(); students.refetch(); }}
            className="m-4"
          />
        )}
        {/* Верхняя строка: навигация по датам + кнопка — всегда видна */}
        <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-base font-semibold text-gray-900 min-w-[180px] text-center">
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
              className="text-sm text-primary border border-primary/30 rounded-lg px-3 py-1 hover:bg-violet-50 transition-colors"
            >
              Сегодня
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0">
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

            <button
              onClick={handleExportIcs}
              disabled={exportingIcs}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Экспорт в календарь (.ics)"
            >
              {exportingIcs ? <Spin className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              .ics
            </button>
            <button
              onClick={() => setShowSlotModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-violet-300 text-violet-700 text-sm font-bold rounded-xl hover:bg-violet-50 transition-colors"
            >
              <Clock className="w-4 h-4" />
              Слоты
              {slots.data && slots.data.length > 0 && (
                <span className="bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {slots.data.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setCreateSlotDate(null); setShowCreate(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Занятие
            </button>
          </div>
        </div>

        {/* Вторая строка: фильтры по статусу */}
        <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-1.5 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                "shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors",
                statusFilter === f.value
                  ? "bg-primary text-white border-primary"
                  : "border-gray-200 text-gray-500 hover:border-primary/50"
              )}
            >
              {f.label}
            </button>
          ))}
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
                  lessons={filtered}
                  participants={students.data ?? []}
                  isTutor
                  onLessonClick={setSelectedLesson}
                  onSlotClick={handleSlotClick}
                  onStatusChange={(updated) => {
                    lessons.refetch();
                    if (selectedLesson?.id === updated.id) setSelectedLesson(updated);
                  }}
                />
              )}
              {view === "month" && (
                <MonthView
                  month={curDate}
                  lessons={filtered}
                  participants={students.data ?? []}
                  onLessonClick={setSelectedLesson}
                  onDayClick={handleSlotClick}
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
                        {lessonsForDay(filtered, day).map((l) => (
                          <LessonCard
                            key={l.id}
                            lesson={l}
                            studentName={students.data?.find((s) => s.id === l.student_id)?.name}
                            onStatusChange={async (id, status) => {
                              await updateLesson(id, { status });
                              lessons.refetch();
                            }}
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

      {/* Панель доступных слотов */}
      {slots.data && slots.data.length > 0 && (
        <div className="shrink-0 bg-white border-t border-gray-100 px-6 py-3">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-bold text-gray-700">Слоты для записи</span>
            <button
              onClick={() => setShowSlotModal(true)}
              className="ml-auto text-xs text-violet-600 font-semibold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Добавить
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {slots.data.map((slot: Slot) => (
              <div
                key={slot.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-xl text-xs font-semibold text-violet-700 group"
              >
                {slot.is_recurring ? <RefreshCw className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                {slotLabel(slot)}
                <span className="text-violet-400">· {slot.duration} мин</span>
                {slot.reserved_for_student_id && (
                  <Lock className="w-3 h-3 text-violet-400" />
                )}
                <button
                  onClick={async () => { await deleteSlot(slot.id); slots.refetch(); }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all ml-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateLessonModal
          students={students.data ?? []}
          initialDate={createSlotDate ?? undefined}
          onClose={() => { setShowCreate(false); setCreateSlotDate(null); }}
          onCreated={() => lessons.refetch()}
        />
      )}

      {showSlotModal && (
        <CreateSlotModal
          students={students.data ?? []}
          onClose={() => setShowSlotModal(false)}
          onCreated={() => { setShowSlotModal(false); slots.refetch(); }}
        />
      )}

      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          participants={students.data ?? []}
          isTutor
          onClose={() => setSelectedLesson(null)}
          onUpdated={() => lessons.refetch()}
          onDeleted={() => lessons.refetch()}
        />
      )}
    </div>
  );
}
