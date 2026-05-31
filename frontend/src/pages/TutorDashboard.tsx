import { useState } from "react";
import {
  Calendar, BookOpen, MessageSquare, BarChart3,
  Users, Plus, TrendingUp, Copy, Check,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAsync } from "@/hooks/useAsync";
import { getMySchedule, updateLesson } from "@/api/lessons";
import { getAssignedHomework } from "@/api/homework";
import { getPaymentAnalytics } from "@/api/payments";
import { getMyStudents, createInvitation } from "@/api/users";
import Sidebar from "@/components/Sidebar";
import LessonCard from "@/components/LessonCard";
import HomeworkCard from "@/components/HomeworkCard";
import CreateLessonModal from "@/components/CreateLessonModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lesson } from "@/api/lessons";

const NAV = [
  { icon: BarChart3,     label: "Обзор",     href: "/dashboard/tutor" },
  { icon: Calendar,      label: "Расписание", href: "/dashboard/tutor/schedule" },
  { icon: BookOpen,      label: "Задания",    href: "/dashboard/tutor/homework" },
  { icon: Users,         label: "Ученики",    href: "/dashboard/tutor/students" },
  { icon: MessageSquare, label: "Чат",        href: "/dashboard/tutor/chat" },
  { icon: TrendingUp,    label: "Финансы",    href: "/dashboard/tutor/payments" },
];

export default function TutorDashboard() {
  useCurrentUser();
  const { user } = useAuthStore();

  const lessons    = useAsync(getMySchedule);
  const homeworks  = useAsync(getAssignedHomework);
  const analytics  = useAsync(getPaymentAnalytics);
  const students   = useAsync(getMyStudents);

  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied]         = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  const now = new Date();

  const upcomingLessons = (lessons.data ?? [])
    .filter((l) => new Date(l.date) >= now && l.status !== "cancelled")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const todayLessons = (lessons.data ?? []).filter((l) => {
    const d = new Date(l.date);
    return d.toDateString() === now.toDateString();
  });

  const monthIncome = (analytics.data ?? []).reduce((sum, item) => {
    const [y, m] = item.period.split("-").map(Number);
    if (y === now.getFullYear() && m === now.getMonth() + 1) return sum + item.total;
    return sum;
  }, 0);

  const recentHomeworks = (homeworks.data ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleStatusChange(id: number, status: Lesson["status"]) {
    await updateLesson(id, { status });
    lessons.refetch();
  }

  async function handleCreateInvite() {
    setInviteLoading(true);
    try {
      const inv = await createInvitation();
      setInviteLink(inv.invite_link);
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={NAV} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-100 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Привет, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-gray-500">
              {now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <Button onClick={() => setShowCreateLesson(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Новое занятие
          </Button>
        </div>

        <div className="p-8 space-y-8">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-6">
            {[
              {
                label: "Занятий сегодня",
                value: lessons.loading ? null : todayLessons.length,
                icon: Calendar,
                color: "text-violet-600",
                bg: "bg-violet-50",
              },
              {
                label: "Учеников",
                value: students.loading ? null : (students.data?.length ?? 0),
                icon: Users,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "Доход за месяц",
                value: analytics.loading
                  ? null
                  : `${monthIncome.toLocaleString("ru-RU")} ₽`,
                icon: TrendingUp,
                color: "text-green-600",
                bg: "bg-green-50",
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
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-5 gap-6">
            {/* Upcoming lessons — 3 cols */}
            <div className="col-span-3">
              <Card className="border-0 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Ближайшие занятия</CardTitle>
                    <button className="text-sm text-primary hover:underline">Все →</button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lessons.loading && (
                    <>
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                    </>
                  )}
                  {!lessons.loading && upcomingLessons.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                      <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Нет запланированных занятий</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setShowCreateLesson(true)}
                      >
                        Создать первое
                      </Button>
                    </div>
                  )}
                  {upcomingLessons.map((l) => (
                    <LessonCard
                      key={l.id}
                      lesson={l}
                      studentName={
                        students.data?.find((s) => s.id === l.student_id)?.name
                      }
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right column — 2 cols */}
            <div className="col-span-2 space-y-6">
              {/* Invite block */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Пригласить ученика
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {inviteLink ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">Ссылка действует 7 дней:</p>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={inviteLink}
                          className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 truncate"
                        />
                        <button
                          onClick={handleCopy}
                          className="shrink-0 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => setInviteLink(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Создать новую
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleCreateInvite}
                      disabled={inviteLoading}
                    >
                      <Plus className="w-4 h-4" />
                      Создать ссылку-приглашение
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Recent homework */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Последние задания</CardTitle>
                    <button className="text-sm text-primary hover:underline">Все →</button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {homeworks.loading && (
                    <>
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                    </>
                  )}
                  {!homeworks.loading && recentHomeworks.length === 0 && (
                    <div className="text-center py-6 text-gray-400">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Нет заданий</p>
                    </div>
                  )}
                  {recentHomeworks.map((hw) => (
                    <HomeworkCard key={hw.id} hw={hw} />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Analytics mini */}
          {!analytics.loading && (analytics.data?.length ?? 0) > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Доход по месяцам
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3 h-24">
                  {analytics.data!.slice(-6).map((item) => {
                    const max = Math.max(...(analytics.data ?? []).map((i) => i.total), 1);
                    const pct = Math.round((item.total / max) * 100);
                    const [, month] = item.period.split("-");
                    return (
                      <div key={item.period} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">
                          {item.total.toLocaleString("ru-RU")} ₽
                        </span>
                        <div
                          className="w-full bg-primary/80 rounded-t-lg transition-all"
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        />
                        <span className="text-xs text-gray-400">
                          {new Date(2024, Number(month) - 1).toLocaleString("ru-RU", { month: "short" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {showCreateLesson && (
        <CreateLessonModal
          students={students.data ?? []}
          onClose={() => setShowCreateLesson(false)}
          onCreated={() => lessons.refetch()}
        />
      )}
    </div>
  );
}
