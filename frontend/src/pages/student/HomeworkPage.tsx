import { useState } from "react";
import { BookOpen, CheckCircle2, Clock, AlertCircle, Send, FileText } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getAssignedHomework, getMyAnswers } from "@/api/homework";
import type { Homework, Answer, HWFile } from "@/api/homework";
import { STUDENT_NAV } from "@/config/nav";
import Sidebar from "@/components/Sidebar";
import SubmitAnswerModal from "@/components/SubmitAnswerModal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tab = "pending" | "submitted" | "graded" | "overdue";

const TABS: { key: Tab; label: string; icon: typeof Clock }[] = [
  { key: "pending",   label: "Нужно сдать",  icon: Clock },
  { key: "submitted", label: "На проверке",  icon: Send },
  { key: "graded",    label: "Проверено",    icon: CheckCircle2 },
  { key: "overdue",   label: "Просрочено",   icon: AlertCircle },
];

const TAB_COLORS: Record<Tab, string> = {
  pending:   "bg-violet-50 text-violet-600",
  submitted: "bg-blue-50 text-blue-600",
  graded:    "bg-emerald-50 text-emerald-600",
  overdue:   "bg-red-50 text-red-500",
};

function statusLabel(answer: Answer | undefined, hw: Homework): Tab {
  if (!answer) {
    return new Date(hw.deadline) < new Date() ? "overdue" : "pending";
  }
  if (answer.status === "graded") return "graded";
  if (answer.status === "submitted") return "submitted";
  if (answer.status === "overdue")   return "overdue";
  return "pending";
}

function remainingTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Просрочено";
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours} ч`;
  return `${Math.floor(hours / 24)} дн`;
}

export default function StudentHomeworkPage() {
  useCurrentUser();

  const homeworks = useAsync(getAssignedHomework);
  const myAnswers = useAsync(getMyAnswers);

  const [tab,        setTab]       = useState<Tab>("pending");
  const [selectedHw, setSelected]  = useState<Homework | null>(null);

  const all     = homeworks.data ?? [];
  const answers = myAnswers.data ?? [];

  function getAnswer(hw: Homework): Answer | undefined {
    return answers.find((a) => a.homework_id === hw.id);
  }

  const byTab: Record<Tab, Homework[]> = {
    pending:   all.filter((hw) => statusLabel(getAnswer(hw), hw) === "pending"),
    submitted: all.filter((hw) => statusLabel(getAnswer(hw), hw) === "submitted"),
    graded:    all.filter((hw) => statusLabel(getAnswer(hw), hw) === "graded"),
    overdue:   all.filter((hw) => statusLabel(getAnswer(hw), hw) === "overdue"),
  };

  const filtered = byTab[tab];
  const loading  = homeworks.loading || myAnswers.loading;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={STUDENT_NAV} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Домашние задания</h1>

          <div className="grid grid-cols-4 gap-3">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all",
                  tab === key
                    ? "border-violet-500 bg-white shadow-sm"
                    : "border-transparent bg-white hover:border-gray-200"
                )}
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", TAB_COLORS[key])}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {loading ? "—" : byTab[key].length}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="space-y-3 max-w-3xl">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              {tab === "graded"
                ? <CheckCircle2 className="w-14 h-14 mb-4 opacity-20" />
                : <BookOpen className="w-14 h-14 mb-4 opacity-20" />
              }
              <p className="text-base font-semibold text-gray-500">
                {tab === "pending"   && "Нет заданий для сдачи"}
                {tab === "submitted" && "Нет заданий на проверке"}
                {tab === "graded"    && "Ещё нет проверенных заданий"}
                {tab === "overdue"   && "Нет просроченных заданий 🎉"}
              </p>
            </div>
          )}

          <div className="space-y-3 max-w-3xl">
            {filtered.map((hw) => {
              const answer   = getAnswer(hw);
              const hwStatus = statusLabel(answer, hw);
              const isOverdue = hwStatus === "overdue";
              const isGraded  = hwStatus === "graded";
              const hwFiles   = (hw.files as HWFile[] | null) ?? [];

              return (
                <div
                  key={hw.id}
                  onClick={() => setSelected(hw)}
                  className={cn(
                    "bg-white rounded-2xl border p-5 transition-all hover:shadow-sm cursor-pointer",
                    isOverdue  ? "border-red-200"    : "",
                    isGraded   ? "border-emerald-200" : "",
                    !isOverdue && !isGraded && "border-gray-200"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      isGraded  ? "bg-emerald-50" :
                      isOverdue ? "bg-red-50"      :
                      hwStatus === "submitted" ? "bg-blue-50" : "bg-violet-50"
                    )}>
                      {isGraded
                        ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        : isOverdue
                        ? <AlertCircle className="w-6 h-6 text-red-500" />
                        : hwStatus === "submitted"
                        ? <Send className="w-6 h-6 text-blue-500" />
                        : <BookOpen className="w-6 h-6 text-violet-600" />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 mb-1.5 line-clamp-2 leading-snug">
                        {hw.description}
                      </p>

                      {/* Files hint */}
                      {hwFiles.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-violet-600 mb-1.5">
                          <FileText className="w-3 h-3" />
                          {hwFiles.length} файл{hwFiles.length > 1 ? "а" : ""} от преподавателя
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status badge */}
                        <span className={cn(
                          "text-xs font-semibold px-2.5 py-1 rounded-full",
                          TAB_COLORS[hwStatus]
                        )}>
                          {isGraded    ? `Оценка: ${answer?.score ?? "—"}/${hw.max_score} б` :
                           isOverdue   ? "Просрочено" :
                           hwStatus === "submitted" ? "На проверке" :
                           `${remainingTime(hw.deadline)} до дедлайна`}
                        </span>

                        <span className="text-xs text-gray-400">Макс. {hw.max_score} б</span>

                        {hw.auto_check_type !== "none" && (
                          <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-semibold">
                            Автопроверка
                          </span>
                        )}
                      </div>

                      {/* Grade comment */}
                      {isGraded && answer?.comment && (
                        <p className="text-xs text-emerald-700 mt-1.5 italic">
                          Комментарий: {answer.comment}
                        </p>
                      )}

                      <p className="text-xs text-gray-400 mt-1">
                        Дедлайн: {new Date(hw.deadline).toLocaleString("ru-RU", {
                          weekday: "short", day: "numeric", month: "long",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* CTA */}
                    <div className={cn(
                      "shrink-0 flex items-center justify-center w-9 h-9 rounded-xl",
                      isGraded ? "bg-emerald-50" : isOverdue ? "bg-red-50" : "bg-violet-50"
                    )}>
                      {isGraded
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <Send className={cn("w-4 h-4", isOverdue ? "text-red-400" : "text-violet-500")} />
                      }
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
          existingAnswer={getAnswer(selectedHw) ?? null}
          onClose={() => setSelected(null)}
          onSubmitted={() => { homeworks.refetch(); myAnswers.refetch(); }}
        />
      )}
    </div>
  );
}
