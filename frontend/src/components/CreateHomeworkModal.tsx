import { useState } from "react";
import { X, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createHomework } from "@/api/homework";
import type { AutoCheckType, HWFile } from "@/api/homework";
import type { Lesson } from "@/api/lessons";
import type { UserOut } from "@/api/auth";
import { FileUploader } from "@/components/FileAttachments";
import { cn } from "@/lib/utils";

interface Props {
  lessons: Lesson[];
  students: UserOut[];
  onClose: () => void;
  onCreated: () => void;
}

const CHECK_TYPES: { value: AutoCheckType; label: string; hint: string }[] = [
  { value: "none",      label: "Без автопроверки", hint: "Проверяете вручную" },
  { value: "numerical", label: "Число",             hint: "Ответ — число (погрешность ±0.01)" },
  { value: "text",      label: "Текст",             hint: "Сравнение без учёта регистра" },
  { value: "test",      label: "Тест",              hint: 'JSON: {"q1":"a","q2":"b"}' },
];

export default function CreateHomeworkModal({ lessons, students, onClose, onCreated }: Props) {
  const [lessonId,     setLessonId]     = useState<string>(lessons[0]?.id.toString() ?? "");
  const [description,  setDescription]  = useState("");
  const [deadline,     setDeadline]     = useState("");
  const [maxScore,     setMaxScore]     = useState("100");
  const [checkType,    setCheckType]    = useState<AutoCheckType>("none");
  const [correctAnswer, setCorrect]     = useState("");
  const [files,        setFiles]        = useState<HWFile[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const minDeadline = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

  function lessonLabel(l: Lesson) {
    const student = students.find((s) => s.id === l.student_id);
    const date = new Date(l.date).toLocaleString("ru-RU", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
    return `${date} · ${student?.name ?? "Ученик"} · ${l.topic ?? "Занятие"}`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createHomework({
        lesson_id: Number(lessonId),
        description,
        files: files.length ? files : undefined,
        deadline: new Date(deadline).toISOString(),
        auto_check_type: checkType,
        correct_answer: checkType !== "none" ? correctAnswer || undefined : undefined,
        max_score: Number(maxScore),
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка при создании задания");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-2xl flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 z-10">
          <h2 className="text-xl font-bold text-gray-900">Новое задание</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Lesson */}
          <div className="space-y-1.5">
            <Label>Занятие</Label>
            {lessons.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                Нет занятий. Сначала создайте занятие.
              </p>
            ) : (
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>{lessonLabel(l)}</option>
                ))}
              </select>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="hw-desc">Описание задания</Label>
            <textarea
              id="hw-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробно опишите что нужно сделать..."
              required
              rows={4}
              className="flex w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
            />
          </div>

          {/* File attachments */}
          <div className="space-y-1.5">
            <Label>Файлы к заданию</Label>
            <FileUploader
              files={files}
              onChange={setFiles}
              label="Прикрепить файл или фото"
              maxFiles={5}
            />
            <p className="text-xs text-gray-400">До 5 файлов: изображения, PDF, Word, Excel</p>
          </div>

          {/* Deadline + Max score */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="hw-deadline">Дедлайн</Label>
              <Input
                id="hw-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={minDeadline}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hw-score">Макс. баллов</Label>
              <Input
                id="hw-score"
                type="number"
                min="1"
                max="1000"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Auto-check type */}
          <div className="space-y-2">
            <Label>Автопроверка</Label>
            <div className="grid grid-cols-2 gap-2">
              {CHECK_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setCheckType(ct.value)}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                    checkType === ct.value
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  <span className="text-sm font-semibold">{ct.label}</span>
                  <span className="text-xs opacity-60 mt-0.5">{ct.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {checkType !== "none" && (
            <div className="space-y-1.5">
              <Label htmlFor="hw-answer">Правильный ответ</Label>
              {checkType === "test" && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 mb-1">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  Формат JSON: {`{"вопрос1": "ответ1", "вопрос2": "ответ2"}`}
                </div>
              )}
              <Input
                id="hw-answer"
                value={correctAnswer}
                onChange={(e) => setCorrect(e.target.value)}
                placeholder={
                  checkType === "numerical" ? "Например: 42.5"
                  : checkType === "text"    ? "Точный текст ответа"
                  : '{"q1":"a","q2":"b"}'
                }
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || lessons.length === 0}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Создать задание
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
