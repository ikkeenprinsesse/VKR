import { useState } from "react";
import { Loader2, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/useAsync";
import { getAllAnswers, gradeAnswer } from "@/api/homework";
import type { Homework, Answer, HWFile } from "@/api/homework";
import type { UserOut } from "@/api/auth";
import { FileList } from "@/components/FileAttachments";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  draft:     { label: "Черновик",    color: "bg-gray-100 text-gray-600",    icon: Clock },
  submitted: { label: "На проверке", color: "bg-blue-50 text-blue-700",     icon: Clock },
  graded:    { label: "Проверено",   color: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  overdue:   { label: "Просрочено",  color: "bg-red-50 text-red-600",       icon: AlertCircle },
};

function GradeForm({ answer, maxScore, onGraded }: { answer: Answer; maxScore: number; onGraded: () => void }) {
  const [score,   setScore]   = useState(answer.score?.toString() ?? "");
  const [comment, setComment] = useState(answer.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [editing, setEditing] = useState(answer.status !== "graded");

  async function handleGrade(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await gradeAnswer(answer.id, { score: Number(score), comment: comment || undefined });
      setEditing(false);
      onGraded();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (!editing && answer.status === "graded") {
    return (
      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-emerald-800">
            Оценка: {answer.score}/{maxScore} б
          </p>
          {answer.comment && (
            <p className="text-xs text-emerald-700 mt-0.5 whitespace-pre-wrap">{answer.comment}</p>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-emerald-600 hover:underline shrink-0"
        >
          Изменить
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleGrade} className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
      <p className="text-xs font-semibold text-gray-600">Выставить оценку</p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder={`0–${maxScore}`}
          min="0"
          max={maxScore}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          required
          className="h-9 text-sm w-28"
        />
        <span className="text-sm text-gray-400 shrink-0">/ {maxScore} б</span>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Комментарий для ученика (необязательно)"
        rows={2}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        {editing && answer.status === "graded" && (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
            Отмена
          </Button>
        )}
        <Button type="submit" size="sm" className="flex-1" disabled={loading || !score}>
          {loading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          {answer.status === "graded" ? "Обновить" : "Сохранить оценку"}
        </Button>
      </div>
    </form>
  );
}

interface Props {
  hw: Homework;
  students: UserOut[];
  onClose: () => void;
}

export default function AnswersPanel({ hw, students, onClose }: Props) {
  const answers  = useAsync(() => getAllAnswers(hw.id), [hw.id]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const deadline   = new Date(hw.deadline);
  const isOverdue  = deadline < new Date();
  const hwFiles    = (hw.files as HWFile[] | null) ?? [];

  const submitted = (answers.data ?? []).filter((a) => a.status === "submitted").length;
  const graded    = (answers.data ?? []).filter((a) => a.status === "graded").length;
  const total     = answers.data?.length ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 mb-1 line-clamp-2">{hw.description}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className={cn(
                "px-2 py-0.5 rounded-full font-semibold",
                isOverdue ? "bg-red-50 text-red-600" : "bg-violet-50 text-violet-600"
              )}>
                {isOverdue ? "Просрочено" : `До ${deadline.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
              </span>
              <span className="text-gray-400">Макс. {hw.max_score} б</span>
              {hw.auto_check_type !== "none" && (
                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                  Автопроверка: {hw.auto_check_type}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Homework files */}
        {hwFiles.length > 0 && (
          <div className="mt-3">
            <FileList files={hwFiles} label="Материалы к заданию" />
          </div>
        )}

        {/* Stats */}
        {!answers.loading && total > 0 && (
          <div className="flex gap-3 mt-3">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{total}</p>
              <p className="text-xs text-gray-400">всего</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{submitted}</p>
              <p className="text-xs text-gray-400">на проверке</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{graded}</p>
              <p className="text-xs text-gray-400">проверено</p>
            </div>
          </div>
        )}
      </div>

      {/* Answers */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {answers.loading && (
          <>
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </>
        )}

        {!answers.loading && total === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Clock className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">Ответов пока нет</p>
          </div>
        )}

        {(answers.data ?? []).map((answer) => {
          const student = students.find((s) => s.id === answer.student_id);
          const cfg = STATUS_CONFIG[answer.status] ?? STATUS_CONFIG.submitted;
          const StatusIcon = cfg.icon;
          const isExpanded = expanded === answer.id;
          const answerFiles = (answer.files as HWFile[] | null) ?? [];

          return (
            <div key={answer.id} className={cn(
              "border rounded-2xl overflow-hidden transition-all",
              isExpanded ? "border-violet-200 shadow-sm" : "border-gray-200"
            )}>
              {/* Row */}
              <button
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : answer.id)}
              >
                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
                  {student?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{student?.name ?? "Ученик"}</p>
                  <p className="text-xs text-gray-400">
                    {answer.submitted_at
                      ? `Сдано ${new Date(answer.submitted_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                      : "Не сдано"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {answer.status === "graded" && answer.score != null && (
                    <span className="text-sm font-bold text-emerald-700">
                      {answer.score}/{hw.max_score}
                    </span>
                  )}
                  <span className={cn("flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full", cfg.color)}>
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Expanded */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  {/* Text answer */}
                  {answer.content?.trim() ? (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Ответ</p>
                      <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer.content}</p>
                      </div>
                    </div>
                  ) : answerFiles.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Ответ не заполнен</p>
                  ) : null}

                  {/* Files */}
                  {answerFiles.length > 0 && (
                    <FileList files={answerFiles} label="Прикреплённые файлы" />
                  )}

                  {/* Grade form (if submitted or graded) */}
                  {(answer.status === "submitted" || answer.status === "overdue" || answer.status === "graded") && (
                    answer.content?.trim() || answerFiles.length > 0
                      ? <GradeForm answer={answer} maxScore={hw.max_score} onGraded={answers.refetch} />
                      : null
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
