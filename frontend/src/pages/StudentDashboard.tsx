import { useEffect, useRef } from "react";
import { Calendar, BookOpen,
  ChevronRight, Clock, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAsync } from "@/hooks/useAsync";
import { getMySchedule } from "@/api/lessons";
import { getAssignedHomework } from "@/api/homework";
import { getMyProgress } from "@/api/progress";
import DashboardLayout from "@/components/DashboardLayout";
import { STUDENT_NAV } from "@/config/nav";
import ErrorBanner from "@/components/ErrorBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";


function AnimatedCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(16px)";
    el.style.transition = `opacity 350ms ease-out ${delay}ms, transform 350ms ease-out ${delay}ms`;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; obs.unobserve(el); }
      });
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return <div ref={ref}>{children}</div>;
}

function HomeworkItem({ hw }: { hw: any }) {
  const deadline = new Date(hw.deadline);
  const now = new Date();
  const isOverdue = deadline < now;
  const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / 36e5);
  const isUrgent = !isOverdue && hoursLeft < 24;

  const cfg = isOverdue
    ? { icon: AlertCircle,  color: "text-red-500",     bg: "bg-red-50 border-red-100",    label: "Просрочено" }
    : isUrgent
    ? { icon: Clock,        color: "text-amber-500",   bg: "bg-amber-50 border-amber-100", label: `${hoursLeft}ч осталось` }
    : hw.status === "graded"
    ? { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-100", label: "Оценено" }
    : { icon: BookOpen,     color: "text-violet-500",  bg: "bg-violet-50 border-violet-100",   label: "Активное" };

  return (
    <Link to="/dashboard/student/homework" className="block">
      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 hover:border-violet-200 hover:shadow-sm transition-all">
        <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", cfg.bg)}>
          <cfg.icon className={cn("w-5 h-5", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate text-sm">{hw.description}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isOverdue ? "Просрочено" : `До ${deadline.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`}
          </p>
        </div>
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg border", cfg.bg, cfg.color)}>
          {cfg.label}
        </span>
      </div>
    </Link>
  );
}

function LessonItem({ lesson }: { lesson: any }) {
  const date = new Date(lesson.date);
  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 hover:border-violet-200 transition-colors">
      <div className={cn(
        "w-10 h-10 rounded-xl border flex flex-col items-center justify-center shrink-0",
        isToday ? "bg-violet-50 border-violet-200" : "bg-gray-50 border-gray-200"
      )}>
        <span className={cn("text-xs font-bold leading-none", isToday ? "text-violet-600" : "text-gray-500")}>
          {date.toLocaleDateString("ru-RU", { day: "numeric" })}
        </span>
        <span className={cn("text-[10px]", isToday ? "text-violet-400" : "text-gray-300")}>
          {date.toLocaleDateString("ru-RU", { month: "short" })}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{lesson.topic || "Занятие"}</p>
        <p className="text-xs text-gray-400">
          {date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} · {lesson.duration} мин
        </p>
      </div>
      {isToday && (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-violet-600 text-white">
          Сегодня
        </span>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  useCurrentUser();
  const { user } = useAuthStore();

  const lessons   = useAsync(getMySchedule);
  const homeworks = useAsync(getAssignedHomework);
  const progress  = useAsync(() =>
    user?.id ? getMyProgress(user.id) : Promise.resolve(null)
  );

  const now = new Date();

  const upcomingLessons = (lessons.data ?? [])
    .filter((l) => new Date(l.date) >= now && l.status !== "cancelled")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  const weekLessons = (lessons.data ?? []).filter((l) => {
    const d = new Date(l.date);
    const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);
    return d >= now && d <= weekEnd;
  });

  const allHw     = homeworks.data ?? [];
  const pendingHw = allHw.filter((hw) => new Date(hw.deadline) >= now && hw.status !== "graded");
  const overdueHw = allHw.filter((hw) => new Date(hw.deadline) < now && hw.status !== "graded");
  const gradedHw  = allHw.filter((hw) => hw.status === "graded");

  const displayHw = [...overdueHw, ...pendingHw].slice(0, 5);

  const stats = [
    { label: "Заданий",       value: pendingHw.length,   icon: BookOpen,    color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Просрочено",    value: overdueHw.length,   icon: AlertCircle, color: overdueHw.length > 0 ? "text-red-500" : "text-gray-400", bg: overdueHw.length > 0 ? "bg-red-50" : "bg-gray-50" },
    { label: "Оценено",       value: gradedHw.length,    icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Занятий / нед.", value: weekLessons.length, icon: Calendar,    color: "text-blue-600",   bg: "bg-blue-50" },
  ];

  const pageError = lessons.error || homeworks.error;

  return (
    <DashboardLayout items={STUDENT_NAV}>

      {pageError && (
        <ErrorBanner
          error={pageError}
          onRetry={() => { lessons.refetch(); homeworks.refetch(); }}
          className="mb-4"
        />
      )}

      {/* Header */}
      <AnimatedCard>
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
            {now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            Привет, {user?.name?.split(" ")[0]}
          </h1>
        </div>
      </AnimatedCard>

      {/* Progress */}
      <AnimatedCard delay={60}>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <span className="font-bold text-gray-800 text-sm">Мой прогресс</span>
            {user?.level && (
              <span className="ml-auto text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                {user.level}
              </span>
            )}
          </div>
          {progress.loading ? (
            <Skeleton className="h-16 w-full" />
          ) : progress.data && progress.data.length > 0 ? (
            <div className="space-y-4">
              {progress.data.map((p) => (
                <div key={p.tutor_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">{p.tutor_name}</span>
                    <span className="text-sm font-black text-violet-600">{p.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${p.progress}%`, background: "linear-gradient(90deg, #7c3aed, #a855f7)" }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-0.5">
                    <div className="text-center">
                      <p className="text-sm font-black text-gray-900">{p.submitted_homework}/{p.total_homework}</p>
                      <p className="text-[10px] text-gray-400 font-semibold">ДЗ сдано</p>
                    </div>
                    <div className="text-center border-x border-gray-100">
                      <p className="text-sm font-black text-gray-900">{Math.round(p.avg_score_normalized * 100)}%</p>
                      <p className="text-[10px] text-gray-400 font-semibold">Ср. оценка</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-gray-900">{p.attended_lessons}/{p.total_lessons}</p>
                      <p className="text-[10px] text-gray-400 font-semibold">Посещаемость</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">
              Прогресс появится после первых занятий с репетитором
            </p>
          )}
        </div>
      </AnimatedCard>

      {/* Stats row */}
      <AnimatedCard delay={120}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {stats.map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", s.bg)}>
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
              {lessons.loading || homeworks.loading
                ? <Skeleton className="h-6 w-8 mb-1" />
                : <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              }
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </AnimatedCard>

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Homework — 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          <AnimatedCard delay={180}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">Задания</h2>
              <Link to="/dashboard/student/homework" className="text-sm font-semibold text-violet-600 hover:underline flex items-center gap-1">
                Все <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </AnimatedCard>

          {homeworks.loading && (
            <div className="space-y-2">
              <Skeleton className="h-[72px] rounded-2xl" />
              <Skeleton className="h-[72px] rounded-2xl" />
            </div>
          )}

          {!homeworks.loading && displayHw.length === 0 && (
            <AnimatedCard delay={220}>
              <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 mb-1">Всё сделано!</p>
                <p className="text-sm text-gray-400">Нет активных заданий. Так держать!</p>
              </div>
            </AnimatedCard>
          )}

          {displayHw.map((hw, i) => (
            <AnimatedCard key={hw.id} delay={220 + i * 50}>
              <HomeworkItem hw={hw} />
            </AnimatedCard>
          ))}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Upcoming lessons */}
          <AnimatedCard delay={380}>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm">Занятия</h3>
                <Link to="/dashboard/student/schedule" className="text-xs font-semibold text-violet-600 hover:underline">Все →</Link>
              </div>
              {lessons.loading && <Skeleton className="h-14 rounded-xl" />}
              {!lessons.loading && upcomingLessons.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Занятий нет</p>
              )}
              <div className="space-y-2">
                {upcomingLessons.slice(0, 2).map((l) => (
                  <LessonItem key={l.id} lesson={l} />
                ))}
              </div>
            </div>
          </AnimatedCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
