import { useState } from "react";
import { X, Loader2, RefreshCw, Calendar } from "lucide-react";
import { createSlot, WEEKDAYS_FULL } from "@/api/slots";
import type { UserOut } from "@/api/auth";
import { cn } from "@/lib/utils";

interface Props {
  students: UserOut[];
  onClose: () => void;
  onCreated: () => void;
}

const DURATIONS = [30, 45, 60, 90, 120];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07..20
const MINUTES = [0, 15, 30, 45];

export default function CreateSlotModal({ students, onClose, onCreated }: Props) {
  const [isRecurring,  setIsRecurring]  = useState(false);
  const [duration,     setDuration]     = useState(60);
  const [slotDate,     setSlotDate]     = useState("");
  const [weekday,      setWeekday]      = useState(0);
  const [hour,         setHour]         = useState(10);
  const [minute,       setMinute]       = useState(0);
  const [studentId,    setStudentId]    = useState<number | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const minDate = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createSlot({
        duration,
        is_recurring: isRecurring,
        slot_date: isRecurring ? undefined : new Date(slotDate).toISOString(),
        weekday: isRecurring ? weekday : undefined,
        slot_hour: isRecurring ? hour : undefined,
        slot_minute: isRecurring ? minute : undefined,
        reserved_for_student_id: studentId ?? undefined,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка при создании слота");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Добавить слот для записи</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Тип слота */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsRecurring(false)}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all",
                !isRecurring ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
              )}
            >
              <Calendar className="w-4 h-4" />
              Разовый
            </button>
            <button
              type="button"
              onClick={() => setIsRecurring(true)}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all",
                isRecurring ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
              )}
            >
              <RefreshCw className="w-4 h-4" />
              Регулярный
            </button>
          </div>

          {/* Время */}
          {isRecurring ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">День недели</label>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS_FULL.map((_day, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setWeekday(i)}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-bold transition-all",
                        weekday === i ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"][i]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Час</label>
                  <select
                    value={hour}
                    onChange={(e) => setHour(Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {HOURS.map(h => (
                      <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Минуты</label>
                  <select
                    value={minute}
                    onChange={(e) => setMinute(Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {MINUTES.map(m => (
                      <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Дата и время</label>
              <input
                type="datetime-local"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                min={minDate}
                required={!isRecurring}
                className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          )}

          {/* Длительность */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Длительность</label>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all",
                    duration === d ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}
                >
                  {d} мин
                </button>
              ))}
            </div>
          </div>

          {/* Закрепить за учеником */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
              Закрепить за учеником
              <span className="text-gray-400 font-normal ml-1">(необязательно)</span>
            </label>
            <select
              value={studentId ?? ""}
              onChange={(e) => setStudentId(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="">Доступен всем ученикам</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {studentId && (
              <p className="text-xs text-violet-600 mt-1.5">
                Только этот ученик увидит и сможет записаться на слот
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Создать слот
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
