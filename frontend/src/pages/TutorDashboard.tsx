import { useState, useEffect, useRef } from "react";
import { TUTOR_NAV } from "@/config/nav";
import { Calendar, BookOpen, BarChart3,
  Users, Plus, Copy, Check, ChevronRight, Zap } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAsync } from "@/hooks/useAsync";
import { getMySchedule } from "@/api/lessons";
import { getAssignedHomework } from "@/api/homework";
import { getPaymentAnalytics } from "@/api/payments";
import { getMyStudents, createInvitation } from "@/api/users";
import DashboardLayout from "@/components/DashboardLayout";
import CreateLessonModal from "@/components/CreateLessonModal";
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

export default function TutorDashboard() {
  useCurrentUser();
  const { user } = useAuthStore();

  const lessons   = useAsync(getMySchedule);
  const homeworks = useAsync(getAssignedHomework);
  const analytics = useAsync(getPaymentAnalytics);
  const students  = useAsync(getMyStudents);

  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [inviteLink,   setInviteLink]   = useState<string | null>(null);
  const [copied,       setCopied]       = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  const now = new Date();

  const todayLessons = (lessons.data ?? []).filter((l) => {
    const d = new Date(l.date);
    return d.toDateString() === now.toDateString() && l.status !== "cancelled";
  });

  const upcomingLessons = (lessons.data ?? [])
    .filter((l) => new Date(l.date) >= now && l.status !== "cancelled")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  const monthIncome = (analytics.data ?? []).reduce((sum, item) => {
    const [y, m] = item.period.split("-").map(Number);
    if (y === now.getFullYear() && m === now.getMonth() + 1) return sum + item.total;
    return sum;
  }, 0);

  const totalStudents = students.data?.length ?? 0;
  const pendingHw = (homeworks.data ?? []).filter((hw) => hw.status === "submitted").length;
  const weekLoad = Math.min(100, Math.round((todayLessons.length / 5) * 100));

  async function handleCreateInvite() {
    setInviteLoading(true);
    try {
      const inv = await createInvitation();
      setInviteLink(inv.invite_link);
    } finally { setInviteLoading(false); }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const statCards = [
    { label: "Занятий сегодня", value: lessons.loading   ? null : todayLessons.length,   icon: Calendar,  color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Учеников",        value: students.loading  ? null : totalStudents,           icon: Users,     color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "Ждут проверки",   value: homeworks.loading ? null : pendingHw,               icon: BookOpen,  color: "text-amber-600",  bg: "bg-amber-50" },
    { label: "Доход за месяц",  value: analytics.loading ? null : `${monthIncome.toLocaleString("ru-RU")} ₽`, icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const pageError = lessons.error || homeworks.error || analytics.error || students.error;

  return (
    <DashboardLayout items={TUTOR_NAV}>

      {pageError && (
        <ErrorBanner
          error={pageError}
          onRetry={() => { lessons.refetch(); homeworks.refetch(); analytics.refetch(); students.refetch(); }}
          className="mb-4"
        />
      )}

      {/* Header */}
      <AnimatedCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
              {now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              Здравствуй, {user?.name?.split(" ")[0]}
            </h1>
          </div>
          <button
            onClick={() => setShowCreateLesson(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Новое занятие
          </button>
        </div>
      </AnimatedCard>

      {/* Stats */}
      <AnimatedCard delay={60}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", s.bg)}>
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
              {s.value === null
                ? <Skeleton className="h-6 w-12 mb-1" />
                : <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              }
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </AnimatedCard>

      {/* Workload bar */}
      <AnimatedCard delay={100}>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-700 text-sm">Загрузка сегодня</span>
            <span className="text-sm font-semibold text-violet-600">{todayLessons.length} из 5 занятий</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${weekLoad}%`, background: "linear-gradient(90deg, #7c3aed, #a855f7)" }}
            />
          </div>
        </div>
      </AnimatedCard>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left — 2 cols */}
        <div className="lg:col-span-2 space-y-5">

          {/* Upcoming lessons */}
          <AnimatedCard delay={150}>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-violet-500" />
                  Ближайшие занятия
                </h2>
                <Link to="/dashboard/tutor/schedule" className="text-sm font-semibold text-violet-600 flex items-center gap-1 hover:underline">
                  Все <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="p-4 space-y-2">
                {lessons.loading && <><Skeleton className="h-14 rounded-xl" /><Skeleton className="h-14 rounded-xl" /></>}
                {!lessons.loading && upcomingLessons.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-400 mb-2">Нет занятий</p>
                    <button onClick={() => setShowCreateLesson(true)} className="text-sm font-semibold text-violet-600 hover:underline">
                      Запланировать →
                    </button>
                  </div>
                )}
                {upcomingLessons.map((l) => {
                  const date = new Date(l.date);
                  const isToday = date.toDateString() === now.toDateString();
                  const student = students.data?.find((s) => s.id === l.student_id);
                  return (
                    <div key={l.id} className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                      isToday ? "bg-violet-50 border-violet-200" : "bg-gray-50 border-gray-100 hover:border-violet-200"
                    )}>
                      <div className={cn(
                        "w-10 h-10 rounded-xl border flex flex-col items-center justify-center shrink-0",
                        isToday ? "bg-violet-100 border-violet-300" : "bg-white border-gray-200"
                      )}>
                        <span className={cn("text-xs font-bold leading-none", isToday ? "text-violet-700" : "text-gray-500")}>
                          {date.toLocaleDateString("ru-RU", { day: "numeric" })}
                        </span>
                        <span className={cn("text-[10px]", isToday ? "text-violet-400" : "text-gray-300")}>
                          {date.toLocaleDateString("ru-RU", { month: "short" })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{l.topic || "Занятие"}</p>
                        <p className="text-xs text-gray-400">
                          {student?.name ?? "Ученик"} · {date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} · {l.duration} мин
                        </p>
                      </div>
                      {isToday && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-violet-600 text-white shrink-0">
                          Сегодня
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </AnimatedCard>

          {/* Homework to check */}
          <AnimatedCard delay={220}>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-500" />
                  На проверке
                  {pendingHw > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{pendingHw}</span>
                  )}
                </h2>
                <Link to="/dashboard/tutor/homework" className="text-sm font-semibold text-violet-600 flex items-center gap-1 hover:underline">
                  Все <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="p-4 space-y-2">
                {homeworks.loading && <Skeleton className="h-14 rounded-xl" />}
                {!homeworks.loading && pendingHw === 0 && (
                  <div className="text-center py-6">
                    <Check className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-400">Всё проверено!</p>
                  </div>
                )}
                {(homeworks.data ?? [])
                  .filter((hw) => hw.status === "submitted")
                  .slice(0, 3)
                  .map((hw) => (
                    <div key={hw.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{hw.description}</p>
                        <p className="text-xs text-gray-400">
                          До {new Date(hw.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <Link to="/dashboard/tutor/homework" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 shrink-0">
                        Проверить
                      </Link>
                    </div>
                  ))
                }
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Students */}
          <AnimatedCard delay={280}>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Ученики
                </h3>
                <Link to="/dashboard/tutor/students" className="text-xs font-semibold text-violet-600 hover:underline">Все →</Link>
              </div>
              {students.loading && <Skeleton className="h-12 rounded-xl" />}
              <div className="space-y-1">
                {(students.data ?? []).slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
                      {s.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{s.name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.email}</p>
                    </div>
                  </div>
                ))}
                {totalStudents === 0 && !students.loading && (
                  <p className="text-xs text-gray-400 text-center py-2">Пока нет учеников</p>
                )}
              </div>
            </div>
          </AnimatedCard>

          {/* Invite */}
          <AnimatedCard delay={340}>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-violet-500" />
                Пригласить ученика
              </h3>
              {inviteLink ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Ссылка действует 72 часа:</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={inviteLink}
                      className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium text-gray-700 truncate"
                    />
                    <button
                      onClick={handleCopy}
                      className="shrink-0 p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      {copied
                        ? <Check className="w-4 h-4 text-emerald-600" />
                        : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                  <button onClick={() => setInviteLink(null)} className="text-xs text-gray-400 hover:text-gray-600">
                    Создать новую
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCreateInvite}
                  disabled={inviteLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Создать ссылку
                </button>
              )}
            </div>
          </AnimatedCard>

          {/* Stats summary */}
          <AnimatedCard delay={400}>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-violet-500" />
                Статистика
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Всего занятий",     value: (lessons.data ?? []).length },
                  { label: "Заданий создано",   value: (homeworks.data ?? []).length },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500">{s.label}</span>
                    <span className="font-bold text-gray-900 text-sm">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedCard>
        </div>
      </div>

      {showCreateLesson && (
        <CreateLessonModal
          students={students.data ?? []}
          onClose={() => setShowCreateLesson(false)}
          onCreated={() => { setShowCreateLesson(false); lessons.refetch(); }}
        />
      )}
    </DashboardLayout>
  );
}
