import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLesson } from "@/api/lessons";
import type { UserOut } from "@/api/auth";

interface Props {
  students: UserOut[];
  initialDate?: Date;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateLessonModal({ students, initialDate, onClose, onCreated }: Props) {
  const [studentId, setStudentId] = useState<string>(students[0]?.id.toString() ?? "");
  const [date, setDate] = useState(
    initialDate ? initialDate.toISOString().slice(0, 16) : ""
  );
  const [duration, setDuration] = useState("60");
  const [topic, setTopic] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createLesson({
        student_id: Number(studentId),
        date: new Date(date).toISOString(),
        duration: Number(duration),
        topic: topic || undefined,
        meeting_link: meetingLink || undefined,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка при создании занятия");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Новое занятие</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ученик</Label>
            {students.length === 0 ? (
              <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-xl">
                У вас пока нет учеников. Пригласите их через раздел «Ученики».
              </p>
            ) : (
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Дата и время</Label>
            <Input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="duration">Длительность (минут)</Label>
            <Input
              id="duration"
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
            <Label htmlFor="topic">Тема (необязательно)</Label>
            <Input
              id="topic"
              placeholder="Например: Квадратные уравнения"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link">Ссылка на встречу (необязательно)</Label>
            <Input
              id="link"
              type="url"
              placeholder="https://meet.google.com/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || students.length === 0}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
