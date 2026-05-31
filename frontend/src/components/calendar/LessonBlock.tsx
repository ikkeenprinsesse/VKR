import { Video } from "lucide-react";
import type { Lesson } from "@/api/lessons";
import { formatTime } from "@/lib/date";
import { cn } from "@/lib/utils";

const statusColors: Record<Lesson["status"], string> = {
  planned:   "bg-violet-100 border-violet-300 text-violet-900",
  confirmed: "bg-green-100  border-green-300  text-green-900",
  completed: "bg-gray-100   border-gray-300   text-gray-500",
  cancelled: "bg-red-50     border-red-200    text-red-400 line-through",
  no_show:   "bg-amber-50   border-amber-200  text-amber-700",
};

interface Props {
  lesson: Lesson;
  style?: React.CSSProperties;
  compact?: boolean;
  participantName?: string;
  onClick?: () => void;
}

export default function LessonBlock({ lesson, style, compact, participantName, onClick }: Props) {
  const colors = statusColors[lesson.status];

  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        "absolute left-1 right-1 rounded-lg border px-2 py-1 overflow-hidden transition-all",
        colors,
        onClick && "cursor-pointer hover:brightness-95 hover:shadow-sm"
      )}
    >
      <p className="text-xs font-semibold leading-tight truncate">
        {lesson.topic ?? "Занятие"}
      </p>
      {!compact && (
        <>
          <p className="text-xs opacity-70 leading-tight mt-0.5">
            {formatTime(lesson.date)} · {lesson.duration} мин
          </p>
          {participantName && (
            <p className="text-xs opacity-60 truncate">{participantName}</p>
          )}
          {lesson.meeting_link && (
            <a
              href={lesson.meeting_link}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-0.5 text-xs opacity-70 hover:opacity-100 mt-0.5 w-fit"
            >
              <Video className="w-3 h-3" /> Встреча
            </a>
          )}
        </>
      )}
    </div>
  );
}
