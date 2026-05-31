import type { Lesson } from "@/api/lessons";
import type { UserOut } from "@/api/auth";
import { monthGrid, lessonsForDay, isSameDay, DAYS_SHORT } from "@/lib/date";
import { cn } from "@/lib/utils";

const statusDot: Record<Lesson["status"], string> = {
  planned:   "bg-violet-400",
  confirmed: "bg-green-400",
  completed: "bg-gray-300",
  cancelled: "bg-red-300",
  no_show:   "bg-amber-400",
};

interface Props {
  month: Date;
  lessons: Lesson[];
  participants?: UserOut[];
  selectedDay?: Date | null;
  onDayClick?: (day: Date) => void;
  onLessonClick?: (lesson: Lesson) => void;
}

export default function MonthView({
  month, lessons, selectedDay, onDayClick, onLessonClick,
}: Props) {
  const cells = monthGrid(month);
  const today = new Date();

  return (
    <div className="flex flex-col flex-1 border border-gray-200 rounded-2xl bg-white overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7" style={{ gridAutoRows: "minmax(100px, 1fr)" }}>
        {cells.map((day, i) => {
          if (!day) {
            return <div key={i} className="border-t border-r border-gray-100 bg-gray-50/50" />;
          }

          const dayLessons = lessonsForDay(lessons, day);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const isPast = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());

          return (
            <div
              key={i}
              onClick={() => onDayClick?.(day)}
              className={cn(
                "border-t border-r border-gray-100 p-1.5 transition-colors",
                onDayClick && "cursor-pointer hover:bg-violet-50/50",
                isSelected && "bg-violet-50",
                isPast && !isToday && "bg-gray-50/50"
              )}
            >
              {/* Date number */}
              <div className="flex justify-end mb-1">
                <span
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium",
                    isToday && "bg-primary text-white",
                    !isToday && isSelected && "bg-violet-100 text-primary font-bold",
                    !isToday && !isSelected && isPast && "text-gray-400",
                    !isToday && !isSelected && !isPast && "text-gray-700"
                  )}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Lessons */}
              <div className="space-y-0.5">
                {dayLessons.slice(0, 3).map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={(e) => { e.stopPropagation(); onLessonClick?.(lesson); }}
                    className={cn(
                      "w-full text-left rounded px-1.5 py-0.5 text-xs font-medium flex items-center gap-1 truncate transition-opacity hover:opacity-80",
                      lesson.status === "cancelled" ? "opacity-50" : ""
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot[lesson.status])} />
                    <span className="truncate text-gray-700">
                      {new Date(lesson.date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      {lesson.topic ? ` ${lesson.topic}` : " Занятие"}
                    </span>
                  </button>
                ))}
                {dayLessons.length > 3 && (
                  <p className="text-xs text-gray-400 pl-1.5">+{dayLessons.length - 3} ещё</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
