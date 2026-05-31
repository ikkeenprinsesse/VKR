import { useState } from "react";
import { Loader2, CheckCircle2, Clock, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/useAsync";
import { getAllAnswers, gradeAnswer } from "@/api/homework";
import type { Homework, Answer } from "@/api/homework";
import type { UserOut } from "@/api/auth";
import { cn } from "@/lib/utils";

const answerStatusConfig: Record<Answer["status"], {
  label: string;
  variant: "default" | "success" | "warning" | "danger" | "outline" | "secondary";
  icon: typeof CheckCircle2;
}> = {
  draft:     { label: "Черновик",     variant: "secondary", icon: Clock },
  submitted: { label: "На проверке",  variant: "default",   icon: Clock },
  graded:    { label: "Проверено",    variant: "success",   icon: CheckCircle2 },
  overdue:   { label: "Просрочено",   variant: "danger",    icon: AlertCircle },
};

interface GradeFormProps {
  answer: Answer;
  maxScore: number;
  onGraded: () => void;
}

function GradeForm({ answer, maxScore, onGraded }: GradeFormProps) {
  const [score, setScore]     = useState(answer.score?.toString() ?? "");
  const [comment, setComment] = useState(answer.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleGrade(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await gradeAnswer(answer.id, { score: Number(score), comment: comment || undefined });
      onGraded();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (answer.status === "graded") {
    return (
      <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-100">
        <p className="text-sm font-medium text-green-700">
          Оценка: {answer.score}/{maxScore} б
        </p>
        {answer.comment && (
          <p className="text-sm text-green-600 mt-1">{answer.comment}</p>
        )}
        <button
          onClick={() => {}}
          className="text-xs text-green-600 underline mt-1 hover:no-underline"
        >
          Изменить оценку
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleGrade} className="mt-3 space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
      <p className="text-xs font-medium text-gray-500 mb-2">Выставить оценку</p>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="number"
            placeholder={`0–${maxScore}`}
            min="0"
            max={maxScore}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
            className="h-9 text-sm"
          />
        </div>
        <span className="text-sm text-gray-400 self-center shrink-0">/ {maxScore} б</span>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Комментарий (необязательно)"
        rows={2}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" className="w-full" disabled={loading || !score}>
        {loading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
        Сохранить оценку
      </Button>
    </form>
  );
}

interface Props {
  hw: Homework;
  students: UserOut[];
  onClose: () => void;
}

export default function AnswersPanel({ hw, students, onClose }: Props) {
  const answers = useAsync(() => getAllAnswers(hw.id), [hw.id]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const deadline = new Date(hw.deadline);
  const isOverdue = deadline < new Date();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
              {hw.description}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>Дедлайн: {deadline.toLocaleString("ru-RU", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })}</span>
              {isOverdue && <Badge variant="danger">Просрочено</Badge>}
              <span>Макс. {hw.max_score} б</span>
              {hw.auto_check_type !== "none" && (
                <Badge variant="default">Автопроверка: {hw.auto_check_type}</Badge>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            ✕
          </button>
        </div>
      </div>

      {/* Answers list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {answers.loading && (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        )}

        {!answers.loading && (answers.data?.length ?? 0) === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Clock className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Ответов пока нет</p>
          </div>
        )}

        <div className="space-y-3">
          {(answers.data ?? []).map((answer) => {
            const student = students.find((s) => s.id === answer.student_id);
            const cfg = answerStatusConfig[answer.status];
            const StatusIcon = cfg.icon;
            const isExpanded = expanded === answer.id;

            return (
              <div
                key={answer.id}
                className={cn(
                  "border rounded-xl transition-all",
                  isExpanded ? "border-primary/30 bg-violet-50/30" : "border-gray-200 bg-white"
                )}
              >
                {/* Answer header */}
                <button
                  className="w-full flex items-center gap-3 p-4 text-left"
                  onClick={() => setExpanded(isExpanded ? null : answer.id)}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {student?.name?.[0]?.toUpperCase() ?? <User className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{student?.name ?? "Ученик"}</p>
                    <p className="text-xs text-gray-400">
                      {answer.submitted_at
                        ? `Сдано: ${new Date(answer.submitted_at).toLocaleString("ru-RU", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}`
                        : "Ещё не сдано"
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {answer.status === "graded" && answer.score != null && (
                      <span className="text-sm font-bold text-green-600">
                        {answer.score}/{hw.max_score}
                      </span>
                    )}
                    <Badge variant={cfg.variant} className="flex items-center gap-1">
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    {answer.content ? (
                      <div className="p-3 bg-white border border-gray-100 rounded-xl">
                        <p className="text-xs font-medium text-gray-400 mb-1">Ответ ученика</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer.content}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Ответ не заполнен</p>
                    )}

                    {(answer.status === "submitted" || answer.status === "overdue" || answer.status === "graded") && answer.content && (
                      <GradeForm
                        answer={answer}
                        maxScore={hw.max_score}
                        onGraded={answers.refetch}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
