import { useState } from "react";
import { X, Loader2, Trash2, Video, User, Clock, Calendar as CalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { updateLesson, deleteLesson } from "@/api/lessons";
import type { Lesson } from "@/api/lessons";
import type { UserOut } from "@/api/auth";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: Lesson["status"]; label: string }[] = [
  { value: "planned",   label: "Запланировано" },
  { value: "confirmed", label: "Подтверждено" },
  { value: "completed", label: "Завершено" },
  { value: "cancelled", label: "Отменено" },
  { value: "no_show",   label: "Не явился" },
];

const statusBadge: Record<Lesson["status"], "default" | "success" | "warning" | "danger" | "outline" | "secondary"> = {
  planned:   "default",
  confirmed: "success",
  completed: "outline",
  cancelled: "danger",
  no_show:   "warning",
};

interface Props {
  lesson: Lesson;
  participants?: UserOut[];
  isTutor: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function LessonDetailModal({
  lesson, participants, isTutor, onClose, onUpdated, onDeleted,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<Lesson["status"]>(lesson.status);
  const [date, setDate] = useState(
    new Date(lesson.date).toISOString().slice(0, 16)
  );
  const [duration, setDuration] = useState(String(lesson.duration));
  const [topic, setTopic] = useState(lesson.topic ?? "");
  const [meetingLink, setMeetingLink] = useState(lesson.meeting_link ?? "");
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const participant = participants?.find(
    (p) => p.id === (isTutor ? lesson.student_id : lesson.tutor_id)
  );

  async function handleSave() {
    setError(null);
    setLoading(true);
    try {
      await updateLesson(lesson.id, {
        status,
        date: new Date(date).toISOString(),
        duration: Number(duration),
        topic: topic || undefined,
        meeting_link: meetingLink || undefined,
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteLesson(lesson.id);
      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка удаления");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editing ? "Редактировать занятие" : (lesson.topic ?? "Занятие")}
            </h2>
            {!editing && (
              <Badge variant={statusBadge[lesson.status]} className="mt-1.5">
                {STATUS_OPTIONS.find((s) => s.value === lesson.status)?.label}
              </Badge>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-4 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View mode */}
        {!editing && (
          <div className="px-6 pb-6 space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <CalIcon className="w-4 h-4 text-gray-400 shrink-0" />
              {new Date(lesson.date).toLocaleString("ru-RU", {
                weekday: "long", day: "numeric", month: "long",
                hour: "2-digit", minute: "2-digit",
              })}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              {lesson.duration} минут
            </div>
            {participant && (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                {participant.name}
                <span className="text-gray-400">{participant.email}</span>
              </div>
            )}
            {lesson.meeting_link && (
              <div className="flex items-center gap-3 text-sm">
                <Video className="w-4 h-4 text-gray-400 shrink-0" />
                <a
                  href={lesson.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline truncate"
                >
                  Ссылка на встречу
                </a>
              </div>
            )}

            {isTutor && (
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setEditing(true)}>
                  Редактировать
                </Button>
                {!deleteConfirm ? (
                  <Button
                    variant="ghost"
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Удалить?"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Edit mode */}
        {editing && (
          <form
            onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            className="px-6 pb-6 space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Статус</Label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                      status === opt.value
                        ? "bg-primary text-white border-primary"
                        : "border-gray-200 text-gray-600 hover:border-primary/50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-date">Дата и время</Label>
              <Input
                id="edit-date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-dur">Длительность (мин)</Label>
              <Input
                id="edit-dur"
                type="number"
                min="15"
                max="300"
                step="15"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-topic">Тема</Label>
              <Input
                id="edit-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Тема занятия"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-link">Ссылка на встречу</Label>
              <Input
                id="edit-link"
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                Отмена
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Сохранить
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
