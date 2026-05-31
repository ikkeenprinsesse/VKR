import {
  Calendar, BookOpen, MessageSquare,
  CheckCircle2, Clock,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAsync } from "@/hooks/useAsync";
import { getMySchedule } from "@/api/lessons";
import { getAssignedHomework } from "@/api/homework";
import Sidebar from "@/components/Sidebar";
import LessonCard from "@/components/LessonCard";
import HomeworkCard from "@/components/HomeworkCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const NAV = [
  { icon: Calendar,      label: "Обзор",          href: "/dashboard/student" },
  { icon: Calendar,      label: "Расписание",      href: "/dashboard/student/schedule" },
  { icon: BookOpen,      label: "Мои задания",     href: "/dashboard/student/homework" },
  { icon: MessageSquare, label: "Чат с репетитором", href: "/dashboard/student/chat" },
];

export default function StudentDashboard() {
  useCurrentUser();
  const { user } = useAuthStore();

  const lessons   = useAsync(getMySchedule);
  const homeworks = useAsync(getAssignedHomework);

  const now = new Date();

  const upcomingLessons = (lessons.data ?? [])
    .filter((l) => new Date(l.date) >= now && l.status !== "cancelled")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const weekLessons = (lessons.data ?? []).filter((l) => {
    const d = new Date(l.date);
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);
    return d >= now && d <= weekEnd;
  });

  const pendingHomework = (homeworks.data ?? []).filter((hw) => {
    const deadline = new Date(hw.deadline);
    return deadline >= now;
  });

  const overdueHomework = (homeworks.data ?? []).filter((hw) => {
    return new Date(hw.deadline) < now;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={NAV} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-100 px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            Привет, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-gray-500">
            {now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        <div className="p-8 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            {[
              {
                label: "Занятий на этой неделе",
                value: lessons.loading ? null : weekLessons.length,
                icon: Calendar,
                color: "text-violet-600",
                bg: "bg-violet-50",
              },
              {
                label: "Активных заданий",
                value: homeworks.loading ? null : pendingHomework.length,
                icon: BookOpen,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "Просроченных",
                value: homeworks.loading ? null : overdueHomework.length,
                icon: Clock,
                color: overdueHomework.length > 0 ? "text-red-500" : "text-green-600",
                bg: overdueHomework.length > 0 ? "bg-red-50" : "bg-green-50",
              },
            ].map((s) => (
              <Card key={s.label} className="border-0 shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                    <s.icon className={`w-6 h-6 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-0.5">{s.label}</p>
                    {s.value === null ? (
                      <Skeleton className="h-7 w-10" />
                    ) : (
                      <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-5 gap-6">
            {/* Lessons — 3 cols */}
            <div className="col-span-3">
              <Card className="border-0 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ближайшие занятия</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lessons.loading && (
                    <>
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                    </>
                  )}
                  {!lessons.loading && upcomingLessons.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                      <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Нет запланированных занятий</p>
                      <p className="text-xs mt-1">Обратитесь к репетитору</p>
                    </div>
                  )}
                  {upcomingLessons.map((l) => (
                    <LessonCard key={l.id} lesson={l} />
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Homework — 2 cols */}
            <div className="col-span-2">
              <Card className="border-0 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Домашние задания</CardTitle>
                    {pendingHomework.length > 0 && (
                      <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
                        {pendingHomework.length}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {homeworks.loading && (
                    <>
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                    </>
                  )}
                  {!homeworks.loading && homeworks.data?.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Заданий нет — отдыхаем!</p>
                    </div>
                  )}

                  {/* Просроченные вверху */}
                  {overdueHomework.map((hw) => (
                    <HomeworkCard key={hw.id} hw={hw} answeredStatus="overdue" />
                  ))}

                  {/* Активные */}
                  {pendingHomework.map((hw) => (
                    <HomeworkCard key={hw.id} hw={hw} />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
