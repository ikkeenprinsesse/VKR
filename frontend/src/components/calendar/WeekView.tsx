import { useRef } from "react";
import type { Lesson } from "@/api/lessons";
import type { UserOut } from "@/api/auth";
import {
  weekDays, lessonsForDay, lessonGeometry,
  isSameDay, DAYS_SHORT,
} from "@/lib/date";
import LessonBlock from "./LessonBlock";
import { cn } from "@/lib/utils";

const HOUR_HEIGHT = 64; // px per hour
const START_HOUR = 7;
const END_HOUR = 22;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

interface Props {
  weekStart: Date;
  lessons: Lesson[];
  participants?: UserOut[];
  isTutor?: boolean;
  onLessonClick?: (lesson: Lesson) => void;
  onSlotClick?: (date: Date) => void;
  onStatusChange?: (lesson: Lesson) => void;
}

export default function WeekView({ weekStart, lessons, participants, isTutor, onLessonClick, onSlotClick, onStatusChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const days = weekDays(weekStart);
  const today = new Date();

  function handleSlotClick(day: Date, e: React.MouseEvent<HTMLDivElement>) {
    if (!onSlotClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMinutes = (y / HOUR_HEIGHT) * 60;
    const hours = START_HOUR + Math.floor(totalMinutes / 60);
    const minutes = Math.round((totalMinutes % 60) / 15) * 15;
    const d = new Date(day);
    d.setHours(hours, minutes, 0, 0);
    onSlotClick(d);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden border border-gray-200 rounded-2xl bg-white">
      {/* Header row — days */}
      <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
        {/* time gutter */}
        <div className="w-14 shrink-0" />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={i}
              className={cn(
                "flex-1 text-center py-3 text-sm border-l border-gray-100",
                isToday && "bg-violet-50"
              )}
            >
              <div className={cn("text-xs font-medium", isToday ? "text-primary" : "text-gray-400")}>
                {DAYS_SHORT[i]}
              </div>
              <div
                className={cn(
                  "mx-auto mt-1 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold",
                  isToday ? "bg-primary text-white" : "text-gray-700"
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ minHeight: `${HOURS.length * HOUR_HEIGHT}px` }}>
          {/* Time gutter */}
          <div className="w-14 shrink-0 relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute w-full text-right pr-2"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 8 }}
              >
                <span className="text-xs text-gray-400">{String(h).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, i) => {
            const dayLessons = lessonsForDay(lessons, day);
            const isToday = isSameDay(day, today);

            return (
              <div
                key={i}
                className={cn(
                  "flex-1 relative border-l border-gray-100",
                  isToday && "bg-violet-50/40",
                  onSlotClick && "cursor-pointer"
                )}
                style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
                onClick={(e) => handleSlotClick(day, e)}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-gray-100"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Current time indicator */}
                {isToday && (() => {
                  const now = new Date();
                  const pct = now.getHours() + now.getMinutes() / 60;
                  if (pct < START_HOUR || pct > END_HOUR) return null;
                  return (
                    <div
                      className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                      style={{ top: (pct - START_HOUR) * HOUR_HEIGHT }}
                    >
                      <div className="w-2 h-2 rounded-full bg-primary ml-0.5" />
                      <div className="flex-1 h-px bg-primary" />
                    </div>
                  );
                })()}

                {/* Lesson blocks */}
                {dayLessons.map((lesson) => {
                  const { top, height } = lessonGeometry(lesson, HOUR_HEIGHT, START_HOUR);
                  const name = participants?.find(
                    (p) => p.id === lesson.student_id || p.id === lesson.tutor_id
                  )?.name;
                  return (
                    <LessonBlock
                      key={lesson.id}
                      lesson={lesson}
                      participantName={name}
                      compact={height < 48}
                      isTutor={isTutor}
                      style={{ top, height, position: "absolute" }}
                      onClick={onLessonClick ? () => onLessonClick(lesson) : undefined}
                      onStatusChange={onStatusChange}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
