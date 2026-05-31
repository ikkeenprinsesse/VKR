import { useState } from "react";
import {
  Users, BookOpen, Calendar, MessageSquare,
  BarChart3, TrendingUp, Plus, Copy, Check,
  Mail, BookOpenCheck, Clock, ChevronRight,
  UserPlus, X, Loader2,
} from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getMyStudents, createInvitation } from "@/api/users";
import { getMySchedule } from "@/api/lessons";
import { getAssignedHomework } from "@/api/homework";
import { getMyIncome } from "@/api/payments";
import type { UserOut } from "@/api/auth";
import type { Lesson } from "@/api/lessons";
import type { Homework } from "@/api/homework";
import type { Payment } from "@/api/payments";
import Sidebar from "@/components/Sidebar";
import LessonCard from "@/components/LessonCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: BarChart3,     label: "Обзор",     href: "/dashboard/tutor" },
  { icon: Calendar,      label: "Расписание", href: "/dashboard/tutor/schedule" },
  { icon: BookOpen,      label: "Задания",    href: "/dashboard/tutor/homework" },
  { icon: Users,         label: "Ученики",    href: "/dashboard/tutor/students" },
  { icon: MessageSquare, label: "Чат",        href: "/dashboard/tutor/chat" },
  { icon: TrendingUp,    label: "Финансы",    href: "/dashboard/tutor/payments" },
];

// ── Invite block ───────────────────────────────────────────────────────────────
function InviteBlock() {
  const [link, setLink]       = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const inv = await createInvitation();
      setLink(inv.invite_link);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-5 bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-100 rounded-2xl">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-gray-900">Пригласить нового ученика</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Создайте персональную ссылку и отправьте её ученику. Действует 7 дней.
      </p>
      {link ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 text-xs bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 truncate focus:outline-none"
            />
            <button
              onClick={copy}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Скопировано" : "Копировать"}
            </button>
          </div>
          <button onClick={() => setLink(null)} className="text-xs text-gray-400 hover:text-gray-600">
            Создать новую ссылку
          </button>
        </div>
      ) : (
        <Button onClick={generate} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Создать ссылку-приглашение
        </Button>
      )}
    </div>
  );
}

// ── Student card (compact) ─────────────────────────────────────────────────────
interface StudentCardProps {
  student: UserOut;
  lessons: Lesson[];
  homeworks: Homework[];
  payments: Payment[];
  selected: boolean;
  onClick: () => void;
}

function StudentCard({ student, lessons, homeworks, payments, selected, onClick }: StudentCardProps) {
  const now = new Date();
  const upcoming = lessons.filter((l) => new Date(l.date) >= now && l.status !== "cancelled");
  const income = payments.reduce((s, p) => s + (p.status === "paid" ? p.amount : 0), 0);
  const pendingHw = homeworks.filter((hw) => new Date(hw.deadline) >= now);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
        selected
          ? "border-primary/40 bg-violet-50"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      )}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
        {student.name[0].toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{student.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {upcoming.length > 0 && (
            <span className="text-xs text-violet-600 font-medium">
              {upcoming.length} занят{upcoming.length === 1 ? "ие" : "ия"}
            </span>
          )}
          {pendingHw.length > 0 && (
            <span className="text-xs text-amber-600 font-medium">
              {pendingHw.length} ДЗ
            </span>
          )}
          {upcoming.length === 0 && pendingHw.length === 0 && (
            <span className="text-xs text-gray-400">Нет активного</span>
          )}
        </div>
      </div>

      {income > 0 && (
        <span className="text-sm font-semibold text-green-600 shrink-0">
          {income.toLocaleString("ru-RU")} ₽
        </span>
      )}

      <ChevronRight className={cn("w-4 h-4 text-gray-400 shrink-0 transition-transform", selected && "rotate-90 text-primary")} />
    </button>
  );
}

// ── Student detail panel ───────────────────────────────────────────────────────
interface DetailPanelProps {
  student: UserOut;
  allLessons: Lesson[];
  allHomeworks: Homework[];
  allPayments: Payment[];
  onClose: () => void;
}

function DetailPanel({ student, allLessons, allHomeworks, allPayments, onClose }: DetailPanelProps) {
  const [detailTab, setDetailTab] = useState<"lessons" | "homework" | "payments">("lessons");

  const lessons  = allLessons.filter((l) => l.student_id === student.id);
  const payments = allPayments.filter((p) => lessons.some((l) => l.id === p.lesson_id));

  // homework: через lesson_id
  const lessonIds = new Set(lessons.map((l) => l.id));
  const homeworks = allHomeworks.filter((hw) => lessonIds.has(hw.lesson_id));

  const now = new Date();
  const upcoming  = lessons.filter((l) => new Date(l.date) >= now && l.status !== "cancelled");
  const completed = lessons.filter((l) => l.status === "completed");
  const income    = payments.reduce((s, p) => s + (p.status === "paid" ? p.amount : 0), 0);

  const recentLessons = [...lessons]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const DETAIL_TABS = [
    { key: "lessons"  as const, label: "Занятия",  count: lessons.length },
    { key: "homework" as const, label: "Задания",   count: homeworks.length },
    { key: "payments" as const, label: "Оплаты",    count: payments.length },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
              {student.name[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
              <a href={`mailto:${student.email}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mt-0.5">
                <Mail className="w-3.5 h-3.5" /> {student.email}
              </a>
              {student.level && (
                <Badge variant="secondary" className="mt-1">{student.level}</Badge>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Calendar, label: "Всего занятий", value: lessons.length, color: "text-violet-600", bg: "bg-violet-50" },
            { icon: BookOpenCheck, label: "Завершено", value: completed.length, color: "text-green-600", bg: "bg-green-50" },
            { icon: TrendingUp, label: "Доход", value: `${income.toLocaleString("ru-RU")} ₽`, color: "text-blue-600", bg: "bg-blue-50" },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-xl p-3 flex items-center gap-2", s.bg)}>
              <s.icon className={cn("w-4 h-4 shrink-0", s.color)} />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{s.label}</p>
                <p className={cn("font-bold text-sm", s.color)}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming notice */}
        {upcoming.length > 0 && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-violet-50 rounded-xl border border-violet-100">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm text-primary">
              Ближайшее занятие:{" "}
              <strong>
                {new Date(upcoming[0].date).toLocaleString("ru-RU", {
                  weekday: "short", day: "numeric", month: "short",
                  hour: "2-digit", minute: "2-digit",
                })}
              </strong>
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-6">
        {DETAIL_TABS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setDetailTab(key)}
            className={cn(
              "flex items-center gap-1.5 py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors",
              detailTab === key
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
            <span className={cn(
              "text-xs rounded-full px-1.5 py-0.5 font-semibold",
              detailTab === key ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Lessons tab */}
        {detailTab === "lessons" && (
          <div className="space-y-3">
            {recentLessons.length === 0 && (
              <EmptyState icon={Calendar} text="Занятий пока нет" />
            )}
            {recentLessons.map((l) => (
              <LessonCard key={l.id} lesson={l} />
            ))}
          </div>
        )}

        {/* Homework tab */}
        {detailTab === "homework" && (
          <div className="space-y-3">
            {homeworks.length === 0 && (
              <EmptyState icon={BookOpen} text="Заданий нет" />
            )}
            {[...homeworks]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((hw) => {
                const isOverdue = new Date(hw.deadline) < now;
                return (
                  <div key={hw.id} className={cn(
                    "p-4 rounded-xl border",
                    isOverdue ? "border-red-100 bg-red-50/30" : "border-gray-200 bg-white"
                  )}>
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{hw.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>Дедлайн: {new Date(hw.deadline).toLocaleString("ru-RU", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}</span>
                      <span>· {hw.max_score} б</span>
                      {isOverdue && <Badge variant="danger">Просрочено</Badge>}
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* Payments tab */}
        {detailTab === "payments" && (
          <div className="space-y-3">
            {payments.length === 0 && (
              <EmptyState icon={TrendingUp} text="Оплат нет" />
            )}
            {[...payments]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((p) => {
                const lesson = lessons.find((l) => l.id === p.lesson_id);
                return (
                  <div key={p.id} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {lesson?.topic ?? "Занятие"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {p.payment_date
                          ? new Date(p.payment_date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
                          : "Дата не указана"
                        }
                        {p.payment_method && ` · ${p.payment_method}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-green-600">
                        +{p.amount.toLocaleString("ru-RU")} {p.currency}
                      </p>
                      <Badge variant={p.status === "paid" ? "success" : p.status === "refunded" ? "danger" : "warning"}>
                        {p.status === "paid" ? "Оплачено" : p.status === "refunded" ? "Возврат" : "Ожидает"}
                      </Badge>
                    </div>
                  </div>
                );
              })
            }
            {payments.length > 0 && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Итого получено</span>
                <span className="text-lg font-bold text-green-600">
                  {income.toLocaleString("ru-RU")} ₽
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Calendar; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
      <Icon className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  useCurrentUser();

  const students  = useAsync(getMyStudents);
  const lessons   = useAsync(getMySchedule);
  const homeworks = useAsync(getAssignedHomework);
  const payments  = useAsync(getMyIncome);

  const [selected, setSelected] = useState<UserOut | null>(null);
  const [search, setSearch]     = useState("");

  const allStudents = students.data ?? [];
  const filtered = allStudents.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  function studentLessons(id: number) {
    return (lessons.data ?? []).filter((l) => l.student_id === id);
  }
  function studentHomeworks(id: number) {
    const ids = new Set(studentLessons(id).map((l) => l.id));
    return (homeworks.data ?? []).filter((hw) => ids.has(hw.lesson_id));
  }
  function studentPayments(id: number) {
    const ids = new Set(studentLessons(id).map((l) => l.id));
    return (payments.data ?? []).filter((p) => ids.has(p.lesson_id));
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={NAV} />

      <main className="flex-1 flex overflow-hidden">
        {/* Left: student list */}
        <div className={cn(
          "flex flex-col bg-white border-r border-gray-100 transition-all",
          selected ? "w-[380px] shrink-0" : "flex-1"
        )}>
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Ученики</h1>
                {!students.loading && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {allStudents.length === 0
                      ? "Пока нет учеников"
                      : `${allStudents.length} ${allStudents.length === 1 ? "ученик" : allStudents.length < 5 ? "ученика" : "учеников"}`
                    }
                  </p>
                )}
              </div>
            </div>

            {/* Search */}
            {allStudents.length > 0 && (
              <input
                type="search"
                placeholder="Поиск по имени или email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:bg-white transition-colors"
              />
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {students.loading && (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            )}

            {!students.loading && allStudents.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center px-4">
                <Users className="w-14 h-14 mb-4 opacity-20" />
                <p className="font-medium text-gray-600 mb-1">Нет учеников</p>
                <p className="text-sm">Создайте ссылку-приглашение и отправьте ученику</p>
              </div>
            )}

            {filtered.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                lessons={studentLessons(student.id)}
                homeworks={studentHomeworks(student.id)}
                payments={studentPayments(student.id)}
                selected={selected?.id === student.id}
                onClick={() => setSelected(selected?.id === student.id ? null : student)}
              />
            ))}

            {!students.loading && allStudents.length > 0 && filtered.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">Ничего не найдено</p>
            )}
          </div>

          {/* Invite block at bottom */}
          <div className="p-4 border-t border-gray-100">
            <InviteBlock />
          </div>
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div className="flex-1 overflow-hidden">
            <DetailPanel
              student={selected}
              allLessons={lessons.data ?? []}
              allHomeworks={homeworks.data ?? []}
              allPayments={payments.data ?? []}
              onClose={() => setSelected(null)}
            />
          </div>
        )}

        {/* Empty right state */}
        {!selected && allStudents.length > 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50/50">
            <div className="text-center">
              <Users className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Выберите ученика для просмотра деталей</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
