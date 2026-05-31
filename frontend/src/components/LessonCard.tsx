import { Clock, Video, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PaymentLinkButton from "@/components/PaymentLinkButton";
import type { Lesson } from "@/api/lessons";
import { cn } from "@/lib/utils";

const statusConfig: Record<Lesson["status"], {
  label: string;
  variant: "default" | "success" | "warning" | "danger" | "outline" | "secondary";
}> = {
  planned:   { label: "Запланировано", variant: "default" },
  confirmed: { label: "Подтверждено",  variant: "success" },
  completed: { label: "Завершено",     variant: "outline" },
  cancelled: { label: "Отменено",      variant: "danger" },
  no_show:   { label: "Не явился",     variant: "warning" },
};

interface LessonCardProps {
  lesson: Lesson;
  studentName?: string;
  tutorName?: string;
  onStatusChange?: (id: number, status: Lesson["status"]) => void;
  /** Показывать кнопку "Оплатить" (для ученика) */
  showPayment?: boolean;
  tutorHasWallet?: boolean;
  defaultPrice?: number | null;
}

export default function LessonCard({
  lesson, studentName, tutorName, onStatusChange,
  showPayment, tutorHasWallet, defaultPrice,
}: LessonCardProps) {
  const cfg = statusConfig[lesson.status];
  const isPast = new Date(lesson.date) < new Date();

  return (
    <div className={cn(
      "flex items-start gap-4 p-4 rounded-xl border transition-colors",
      isPast ? "bg-gray-50 border-gray-100" : "bg-white border-gray-200 hover:border-primary/30"
    )}>
      {/* Date block */}
      <div className="w-12 text-center shrink-0">
        <div className="text-2xl font-extrabold text-gray-900 leading-none">
          {new Date(lesson.date).getDate()}
        </div>
        <div className="text-xs text-gray-400 uppercase mt-0.5">
          {new Date(lesson.date).toLocaleString("ru-RU", { month: "short" })}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900 truncate">
            {lesson.topic ?? "Занятие без темы"}
          </span>
          <Badge variant={cfg.variant}>{cfg.label}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date(lesson.date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
            {" · "}{lesson.duration} мин
          </span>
          {(studentName || tutorName) && (
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {studentName ?? tutorName}
            </span>
          )}
          {lesson.meeting_link && (
            <a
              href={lesson.meeting_link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Video className="w-3.5 h-3.5" /> Ссылка
            </a>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Кнопка оплаты для ученика */}
        {showPayment && lesson.status === "completed" && (
          <PaymentLinkButton
            lesson={lesson}
            defaultPrice={defaultPrice}
            tutorHasWallet={tutorHasWallet}
            compact
          />
        )}

        {/* Смена статуса для репетитора */}
        {onStatusChange && lesson.status === "planned" && !isPast && (
          <button
            onClick={() => onStatusChange(lesson.id, "confirmed")}
            className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
          >
            Подтвердить
          </button>
        )}
        {onStatusChange && lesson.status !== "completed" && lesson.status !== "cancelled" && isPast && (
          <div className="flex gap-1">
            <button
              onClick={() => onStatusChange(lesson.id, "completed")}
              className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Завершено
            </button>
            <button
              onClick={() => onStatusChange(lesson.id, "no_show")}
              className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              Не явился
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
