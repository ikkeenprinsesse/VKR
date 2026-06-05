import { useState } from "react";
import { X, Loader2, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitAnswer } from "@/api/homework";
import type { Homework, Answer, HWFile } from "@/api/homework";
import { FileList, FileUploader } from "@/components/FileAttachments";
import { cn } from "@/lib/utils";

interface Props {
  hw: Homework;
  existingAnswer?: Answer | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function SubmitAnswerModal({ hw, existingAnswer, onClose, onSubmitted }: Props) {
  const [content,  setContent]  = useState(existingAnswer?.content ?? "");
  const [files,    setFiles]    = useState<HWFile[]>((existingAnswer?.files as HWFile[]) ?? []);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const deadline     = new Date(hw.deadline);
  const isOverdue    = deadline < new Date();
  const alreadyGraded = existingAnswer?.status === "graded";
  const hoursLeft    = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 3600000));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !files.length) {
      setError("Добавьте текстовый ответ или прикрепите файл");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await submitAnswer(hw.id, content.trim() || " ", files);
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка при отправке");
    } finally {
      setLoading(false);
    }
  }

  const hwFiles = (hw.files as HWFile[] | null) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Домашнее задание</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
                isOverdue
                  ? "bg-red-50 text-red-600"
                  : hoursLeft < 24
                  ? "bg-amber-50 text-amber-600"
                  : "bg-violet-50 text-violet-600"
              )}>
                <Clock className="w-3 h-3" />
                {isOverdue
                  ? "Просрочено"
                  : hoursLeft < 24
                  ? `${hoursLeft} ч до дедлайна`
                  : deadline.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="text-xs text-gray-400">Макс. {hw.max_score} б</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Task description */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Задание</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{hw.description}</p>
            </div>
            {hwFiles.length > 0 && (
              <FileList files={hwFiles} label="Материалы от преподавателя" />
            )}
          </div>

          {/* Graded state */}
          {alreadyGraded && (
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-800">
                    Оценка: {existingAnswer.score}/{hw.max_score} баллов
                  </p>
                  {existingAnswer.comment && (
                    <p className="text-sm text-emerald-700 mt-1 whitespace-pre-wrap">{existingAnswer.comment}</p>
                  )}
                  <p className="text-xs text-emerald-500 mt-1">
                    Проверено {existingAnswer.graded_at
                      ? new Date(existingAnswer.graded_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                      : ""}
                  </p>
                </div>
              </div>

              {/* Student's submitted answer */}
              {(existingAnswer.content?.trim() || (existingAnswer.files as HWFile[])?.length > 0) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ваш ответ</p>
                  {existingAnswer.content?.trim() && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                      {existingAnswer.content}
                    </p>
                  )}
                  {(existingAnswer.files as HWFile[])?.length > 0 && (
                    <FileList files={existingAnswer.files as HWFile[]} label="Прикреплённые файлы" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Answer form */}
          {!alreadyGraded && (
            <form id="answer-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {isOverdue && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Дедлайн истёк. Ответ будет отмечен как просроченный.
                  </p>
                </div>
              )}

              {existingAnswer?.status === "submitted" && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    Ответ уже отправлен и ожидает проверки. Вы можете обновить его.
                  </p>
                </div>
              )}

              {hw.auto_check_type !== "none" && (
                <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-700">
                  {hw.auto_check_type === "test"
                    ? 'Тест: введите ответы в формате JSON {"q1":"a","q2":"b"}'
                    : hw.auto_check_type === "numerical"
                    ? "Введите число в качестве ответа"
                    : "Введите текстовый ответ"}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Текстовый ответ
                  <span className="text-gray-400 font-normal ml-1">(необязательно, если прикрепляете файл)</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Введите ответ здесь..."
                  rows={5}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Прикрепить файлы</label>
                <FileUploader
                  files={files}
                  onChange={setFiles}
                  label="Добавить файл или фото"
                  maxFiles={5}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            {alreadyGraded ? "Закрыть" : "Отмена"}
          </Button>
          {!alreadyGraded && (
            <Button
              type="submit"
              form="answer-form"
              className="flex-1"
              disabled={loading || (!content.trim() && !files.length)}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {existingAnswer ? "Обновить ответ" : "Отправить ответ"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
