import { useState } from "react";
import { TUTOR_NAV } from "@/config/nav";
import {
  BookOpen, Plus, Calendar,
  Users, Trash2,
  ChevronRight, Clock, AlertCircle } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getAssignedHomework, deleteHomework } from "@/api/homework";
import type { Homework } from "@/api/homework";
import { getMySchedule } from "@/api/lessons";
import { getMyStudents } from "@/api/users";
import Sidebar from "@/components/Sidebar";
import ErrorBanner from "@/components/ErrorBanner";
import CreateHomeworkModal from "@/components/CreateHomeworkModal";
import AnswersPanel from "@/components/AnswersPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";


type Tab = "active" | "overdue" | "all";

function hwStatus(hw: Homework): "overdue" | "active" {
  return new Date(hw.deadline) < new Date() ? "overdue" : "active";
}

export default function TutorHomeworkPage() {
  useCurrentUser();

  const homeworks = useAsync(getAssignedHomework);
  const lessons   = useAsync(getMySchedule);
  const students  = useAsync(getMyStudents);

  const [tab, setTab]                   = useState<Tab>("active");
  const [showCreate, setShowCreate]     = useState(false);
  const [selectedHw, setSelectedHw]     = useState<Homework | null>(null);
  const [deletingId, setDeletingId]     = useState<number | null>(null);

  const all = homeworks.data ?? [];
  const filtered = tab === "all"
    ? all
    : all.filter((hw) => hwStatus(hw) === tab);

  // Stats
  const activeCount  = all.filter((hw) => hwStatus(hw) === "active").length;
  const overdueCount = all.filter((hw) => hwStatus(hw) === "overdue").length;

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await deleteHomework(id);
      homeworks.refetch();
      if (selectedHw?.id === id) setSelectedHw(null);
    } finally {
      setDeletingId(null);
    }
  }

  function getStudentName(hw: Homework) {
    const lesson = (lessons.data ?? []).find((l) => l.id === hw.lesson_id);
    if (!lesson) return null;
    return (students.data ?? []).find((s) => s.id === lesson.student_id)?.name ?? null;
  }

  function getLessonInfo(hw: Homework) {
    const lesson = (lessons.data ?? []).find((l) => l.id === hw.lesson_id);
    if (!lesson) return "";
    return new Date(lesson.date).toLocaleDateString("ru-RU", {
      day: "numeric", month: "short" });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={TUTOR_NAV} />

      <main className="flex-1 flex flex-col overflow-hidden pt-16 lg:pt-0">
        {(homeworks.error || lessons.error) && (
          <ErrorBanner
            error={homeworks.error || lessons.error || ""}
            onRetry={() => { homeworks.refetch(); lessons.refetch(); }}
            className="m-4"
          />
        )}
        {/* Топ-шапка — всегда полная ширина, кнопка всегда видна */}
        <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-gray-900">Задания</h1>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-violet-600 font-semibold">
                <Clock className="w-4 h-4" />
                {homeworks.loading ? "—" : activeCount} активных
              </span>
              {overdueCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-500 font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  {overdueCount} просрочено
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Новое задание
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: homework list — на мобильном скрываем если выбрано ДЗ */}
          <div className={cn(
            "flex flex-col border-r border-gray-100 bg-white transition-all duration-200",
            selectedHw ? "hidden md:flex md:w-[400px] md:shrink-0" : "flex-1"
          )}>
          {/* Sub-header: tabs */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {([
                { key: "active",  label: "Активные" },
                { key: "overdue", label: "Просроченные" },
                { key: "all",     label: "Все" },
              ] as { key: Tab; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                    tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {homeworks.loading && (
              <>
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </>
            )}

            {!homeworks.loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">
                  {tab === "active" ? "Нет активных заданий" : tab === "overdue" ? "Нет просроченных" : "Нет заданий"}
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
                  Создать первое
                </Button>
              </div>
            )}

            {filtered.map((hw) => {
              const isOverdue = hwStatus(hw) === "overdue";
              const deadline = new Date(hw.deadline);
              const studentName = getStudentName(hw);
              const lessonDate = getLessonInfo(hw);
              const isSelected = selectedHw?.id === hw.id;

              return (
                <div
                  key={hw.id}
                  onClick={() => setSelectedHw(isSelected ? null : hw)}
                  className={cn(
                    "group relative p-4 rounded-xl border cursor-pointer transition-all",
                    isSelected
                      ? "border-primary/40 bg-violet-50"
                      : "border-gray-200 bg-white hover:border-gray-300",
                    isOverdue && !isSelected && "border-red-100 bg-red-50/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      isOverdue ? "bg-red-100" : "bg-violet-100"
                    )}>
                      {isOverdue
                        ? <AlertCircle className="w-5 h-5 text-red-500" />
                        : <BookOpen className="w-5 h-5 text-primary" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-1">
                        {hw.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {studentName && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {studentName}
                          </span>
                        )}
                        {lessonDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {lessonDate}
                          </span>
                        )}
                        <span className={cn("flex items-center gap-1", isOverdue ? "text-red-500 font-medium" : "")}>
                          <Clock className="w-3 h-3" />
                          {isOverdue ? "Просрочено" : deadline.toLocaleString("ru-RU", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-gray-400">{hw.max_score} б</span>
                      <ChevronRight className={cn(
                        "w-4 h-4 text-gray-400 transition-transform",
                        isSelected && "rotate-90 text-primary"
                      )} />
                    </div>
                  </div>

                  {/* Delete button (hover) */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(hw.id); }}
                    disabled={deletingId === hw.id}
                    className="absolute top-3 right-8 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

          {/* Right: answers panel — на мобильном занимает весь экран */}
          {selectedHw && (
            <div className="flex-1 bg-white overflow-hidden flex flex-col">
              <AnswersPanel
                hw={selectedHw}
                students={students.data ?? []}
                onClose={() => setSelectedHw(null)}
              />
            </div>
          )}
        </div>{/* end flex-1 flex overflow-hidden */}
      </main>

      {showCreate && (
        <CreateHomeworkModal
          lessons={(lessons.data ?? []).filter((l) => l.status !== "cancelled")}
          students={students.data ?? []}
          onClose={() => setShowCreate(false)}
          onCreated={() => homeworks.refetch()}
        />
      )}
    </div>
  );
}
