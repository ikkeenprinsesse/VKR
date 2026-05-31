import { useState } from "react";
import {
  BookOpen, Calendar, MessageSquare,
  CheckCircle2, Clock, AlertCircle, Send,
} from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getAssignedHomework } from "@/api/homework";
import type { Homework } from "@/api/homework";
import Sidebar from "@/components/Sidebar";
import SubmitAnswerModal from "@/components/SubmitAnswerModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: Calendar,      label: "Обзор",          href: "/dashboard/student" },
  { icon: Calendar,      label: "Расписание",      href: "/dashboard/student/schedule" },
  { icon: BookOpen,      label: "Мои задания",     href: "/dashboard/student/homework" },
  { icon: MessageSquare, label: "Чат",             href: "/dashboard/student/chat" },
];

type Tab = "pending" | "submitted" | "graded" | "overdue";

const TABS: { key: Tab; label: string; icon: typeof Clock }[] = [
  { key: "pending",   label: "Нужно сдать",  icon: Clock },
  { key: "submitted", label: "На проверке",  icon: Send },
  { key: "graded",    label: "Проверено",    icon: CheckCircle2 },
  { key: "overdue",   label: "Просрочено",   icon: AlertCircle },
];

export default function StudentHomeworkPage() {
  useCurrentUser();

  const homeworks = useAsync(getAssignedHomework);

  const [tab, setTab]           = useState<Tab>("pending");
  const [selectedHw, setSelected] = useState<Homework | null>(null);

  const all = homeworks.data ?? [];

  // Простая классификация по дедлайну (без истории ответов для MVP)
  const byTab: Record<Tab, Homework[]> = {
    pending:   all.filter((hw) => new Date(hw.deadline) >= new Date()),
    submitted: [],
    graded:    [],
    overdue:   all.filter((hw) => new Date(hw.deadline) < new Date()),
  };

  const filtered = byTab[tab];

  const counts: Record<Tab, number> = {
    pending:   byTab.pending.length,
    submitted: byTab.submitted.length,
    graded:    byTab.graded.length,
    overdue:   byTab.overdue.length,
  };

  function remainingTime(iso: string): string {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return "Просрочено";
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours} ч`;
    return `${Math.floor(hours / 24)} дн`;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={NAV} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Домашние задания</h1>

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {TABS.map(({ key, label, icon: Icon }) => {
              const count = counts[key];
              const colors: Record<Tab, string> = {
                pending:   "bg-violet-50 text-primary",
                submitted: "bg-blue-50 text-blue-600",
                graded:    "bg-green-50 text-green-600",
                overdue:   "bg-red-50 text-red-500",
              };
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all",
                    tab === key
                      ? "border-primary shadow-sm bg-white"
                      : "border-transparent bg-white hover:border-gray-200"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", colors[key])}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-xl font-bold text-gray-900">{homeworks.loading ? "—" : count}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6">
          {homeworks.loading && (
            <div className="space-y-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          )}

          {!homeworks.loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              {tab === "graded"
                ? <CheckCircle2 className="w-14 h-14 mb-4 opacity-20" />
                : <BookOpen className="w-14 h-14 mb-4 opacity-20" />
              }
              <p className="text-base font-medium text-gray-500">
                {tab === "pending"   && "Нет заданий для сдачи — отдыхай!"}
                {tab === "submitted" && "Нет заданий на проверке"}
                {tab === "graded"    && "Ещё нет проверенных заданий"}
                {tab === "overdue"   && "Нет просроченных заданий 🎉"}
              </p>
            </div>
          )}

          <div className="grid gap-4 max-w-3xl">
            {filtered.map((hw) => {
              const isOverdue = new Date(hw.deadline) < new Date();
              const remaining = remainingTime(hw.deadline);
              const urgent = !isOverdue && new Date(hw.deadline).getTime() - Date.now() < 24 * 3600000;

              return (
                <div
                  key={hw.id}
                  className={cn(
                    "bg-white rounded-2xl border p-5 transition-all hover:shadow-sm cursor-pointer",
                    isOverdue   && "border-red-200",
                    urgent      && !isOverdue && "border-amber-200",
                    !isOverdue  && !urgent && "border-gray-200"
                  )}
                  onClick={() => setSelected(hw)}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      isOverdue ? "bg-red-100" : urgent ? "bg-amber-100" : "bg-violet-100"
                    )}>
                      <BookOpen className={cn(
                        "w-6 h-6",
                        isOverdue ? "text-red-500" : urgent ? "text-amber-600" : "text-primary"
                      )} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 mb-1.5 line-clamp-3 leading-snug">
                        {hw.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Deadline badge */}
                        <Badge
                          variant={isOverdue ? "danger" : urgent ? "warning" : "default"}
                          className="flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          {isOverdue ? "Просрочено" : `${remaining} до дедлайна`}
                        </Badge>

                        {/* Max score */}
                        <span className="text-xs text-gray-400">Макс. {hw.max_score} б</span>

                        {/* Auto-check hint */}
                        {hw.auto_check_type !== "none" && (
                          <Badge variant="secondary">Автопроверка</Badge>
                        )}
                      </div>

                      {/* Deadline full */}
                      <p className="text-xs text-gray-400 mt-1.5">
                        Дедлайн:{" "}
                        {new Date(hw.deadline).toLocaleString("ru-RU", {
                          weekday: "short", day: "numeric", month: "long",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* CTA arrow */}
                    <div className={cn(
                      "shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition-colors",
                      isOverdue ? "bg-red-50 text-red-400" : "bg-violet-50 text-primary"
                    )}>
                      <Send className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {selectedHw && (
        <SubmitAnswerModal
          hw={selectedHw}
          existingAnswer={null}
          onClose={() => setSelected(null)}
          onSubmitted={() => homeworks.refetch()}
        />
      )}
    </div>
  );
}
