import { useState } from "react";
import { Video, Check, X, PlayCircle, Loader2 } from "lucide-react";
import type { Lesson } from "@/api/lessons";
import { updateLesson } from "@/api/lessons";
import { formatTime } from "@/lib/date";
import { cn } from "@/lib/utils";

/* ── Цветовая схема по статусу ───────────────────────────────────────────── */
const STATUS_STYLE: Record<Lesson["status"], {
  bg: string; border: string; text: string; dot: string; label: string;
}> = {
  planned:   { bg: "bg-blue-50",    border: "border-blue-300",   text: "text-blue-900",   dot: "bg-blue-400",   label: "Запланировано" },
  confirmed: { bg: "bg-green-50",   border: "border-green-300",  text: "text-green-900",  dot: "bg-green-500",  label: "Подтверждено" },
  completed: { bg: "bg-gray-100",   border: "border-gray-300",   text: "text-gray-500",   dot: "bg-gray-400",   label: "Завершено" },
  cancelled: { bg: "bg-red-50",     border: "border-red-200",    text: "text-red-400",    dot: "bg-red-400",    label: "Отменено" },
  no_show:   { bg: "bg-amber-50",   border: "border-amber-300",  text: "text-amber-800",  dot: "bg-amber-400",  label: "Не явился" },
};

/* ── Быстрые действия по статусу ─────────────────────────────────────────── */
const QUICK_ACTIONS: Partial<Record<Lesson["status"], Array<{
  label: string;
  icon: typeof Check;
  next: Lesson["status"];
  className: string;
}>>> = {
  planned: [
    { label: "Подтвердить",  icon: Check,       next: "confirmed", className: "bg-green-500 hover:bg-green-600 text-white" },
    { label: "Отменить",     icon: X,           next: "cancelled", className: "bg-red-400 hover:bg-red-500 text-white" },
  ],
  confirmed: [
    { label: "Завершить",    icon: PlayCircle,  next: "completed", className: "bg-gray-500 hover:bg-gray-600 text-white" },
    { label: "Не явился",    icon: X,           next: "no_show",   className: "bg-amber-500 hover:bg-amber-600 text-white" },
    { label: "Отменить",     icon: X,           next: "cancelled", className: "bg-red-400 hover:bg-red-500 text-white" },
  ],
};

interface Props {
  lesson: Lesson;
  style?: React.CSSProperties;
  compact?: boolean;
  participantName?: string;
  isTutor?: boolean;
  onClick?: () => void;
  onStatusChange?: (lesson: Lesson) => void;
}

export default function LessonBlock({
  lesson, style, compact, participantName, isTutor, onClick, onStatusChange,
}: Props) {
  const [updating, setUpdating] = useState<Lesson["status"] | null>(null);
  const [hovered, setHovered] = useState(false);

  const s = STATUS_STYLE[lesson.status];
  const actions = isTutor ? (QUICK_ACTIONS[lesson.status] ?? []) : [];
  const showActions = hovered && actions.length > 0 && !compact;

  async function handleAction(e: React.MouseEvent, nextStatus: Lesson["status"]) {
    e.stopPropagation();
    setUpdating(nextStatus);
    try {
      const updated = await updateLesson(lesson.id, { status: nextStatus });
      onStatusChange?.(updated);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={style}
      className={cn(
        "absolute left-1 right-1 rounded-xl border overflow-hidden transition-all duration-150 group",
        s.bg, s.border,
        onClick && "cursor-pointer",
        lesson.status === "cancelled" && "opacity-50",
        hovered && onClick && "shadow-md -translate-y-px"
      )}
    >
      {/* Left accent bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", s.dot)} />

      <div className="pl-2.5 pr-1.5 py-1.5">
        {/* Topic */}
        <p className={cn(
          "text-xs font-bold leading-tight truncate",
          s.text,
          lesson.status === "cancelled" && "line-through"
        )}>
          {lesson.topic ?? "Занятие"}
        </p>

        {!compact && (
          <>
            <p className={cn("text-xs opacity-70 leading-tight mt-0.5", s.text)}>
              {formatTime(lesson.date)} · {lesson.duration} мин
            </p>
            {participantName && (
              <p className={cn("text-xs opacity-60 truncate mt-0.5", s.text)}>{participantName}</p>
            )}
            {lesson.meeting_link && (
              <a
                href={lesson.meeting_link}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn("flex items-center gap-0.5 text-xs opacity-70 hover:opacity-100 mt-0.5 w-fit", s.text)}
              >
                <Video className="w-3 h-3" /> Встреча
              </a>
            )}
          </>
        )}

        {/* Quick action buttons */}
        {showActions && (
          <div
            className="flex gap-1 mt-1.5 flex-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((action) => {
              const Icon = action.icon;
              const isLoading = updating === action.next;
              return (
                <button
                  key={action.next}
                  disabled={!!updating}
                  onClick={(e) => handleAction(e, action.next)}
                  className={cn(
                    "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors disabled:opacity-50",
                    action.className
                  )}
                >
                  {isLoading
                    ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    : <Icon className="w-2.5 h-2.5" />
                  }
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
