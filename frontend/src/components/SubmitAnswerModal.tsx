import { useState } from "react";
import { X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { submitAnswer } from "@/api/homework";
import type { Homework, Answer } from "@/api/homework";

interface Props {
  hw: Homework;
  existingAnswer?: Answer | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function SubmitAnswerModal({ hw, existingAnswer, onClose, onSubmitted }: Props) {
  const [content, setContent] = useState(existingAnswer?.content ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const deadline = new Date(hw.deadline);
  const isOverdue = deadline < new Date();
  const alreadyGraded = existingAnswer?.status === "graded";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await submitAnswer(hw.id, content);
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка при отправке");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Домашнее задание</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>
                Дедлайн:{" "}
                {deadline.toLocaleString("ru-RU", {
                  day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                })}
              </span>
              {isOverdue && <Badge variant="danger">Просрочено</Badge>}
              {!isOverdue && (
                <Badge variant="default">
                  {Math.ceil((deadline.getTime() - Date.now()) / 3600000)} ч осталось
                </Badge>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task description */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Задание</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{hw.description}</p>
          <p className="text-xs text-gray-400 mt-2">Макс. баллов: {hw.max_score}</p>
        </div>

        {/* Already graded — show result */}
        {alreadyGraded && (
          <div className="px-6 py-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800">
                  Оценка: {existingAnswer.score}/{hw.max_score} баллов
                </p>
                {existingAnswer.comment && (
                  <p className="text-sm text-green-700 mt-1">{existingAnswer.comment}</p>
                )}
              </div>
            </div>
            {existingAnswer.content && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Ваш ответ</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{existingAnswer.content}</p>
              </div>
            )}
          </div>
        )}

        {/* Answer form */}
        {!alreadyGraded && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {isOverdue && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Дедлайн истёк. Ответ будет отмечен как просроченный, но вы всё равно можете его отправить.
                  </p>
                </div>
              )}

              {hw.auto_check_type === "test" && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                  Задание с автопроверкой (тест). Введите ответы в формате JSON: {`{"q1":"a","q2":"b"}`}
                </div>
              )}
              {hw.auto_check_type === "numerical" && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                  Задание с автопроверкой. Введите число.
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Ваш ответ</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Введите ответ здесь..."
                  required
                  rows={7}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
                />
              </div>

              {existingAnswer?.status === "submitted" && (
                <p className="text-xs text-gray-400">
                  Ответ уже отправлен. Вы можете обновить его до проверки.
                </p>
              )}

              {error && (
                <div className="text-sm text-destructive bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 pt-3 border-t border-gray-100 flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || !content.trim()}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {existingAnswer ? "Обновить ответ" : "Отправить"}
              </Button>
            </div>
          </form>
        )}

        {alreadyGraded && (
          <div className="px-6 pb-6 pt-3 border-t border-gray-100">
            <Button variant="outline" className="w-full" onClick={onClose}>Закрыть</Button>
          </div>
        )}
      </div>
    </div>
  );
}
