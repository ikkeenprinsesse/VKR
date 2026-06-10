import { STUDENT_NAV } from "@/config/nav";
import { CreditCard, CheckCircle2, Clock, RefreshCw, Wallet, TrendingDown } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getMyExpenses } from "@/api/payments";
import type { Payment, PaymentStatus } from "@/api/payments";
import { getMySchedule } from "@/api/lessons";
import { getMyTutors } from "@/api/users";
import Sidebar from "@/components/Sidebar";
import PaymentLinkButton from "@/components/PaymentLinkButton";
import ErrorBanner from "@/components/ErrorBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MONTHS } from "@/lib/date";

const STATUS_CFG: Record<PaymentStatus, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  paid:     { label: "Оплачено",  icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  pending:  { label: "Ожидает",   icon: Clock,        color: "text-amber-600",   bg: "bg-amber-50"   },
  refunded: { label: "Возврат",   icon: RefreshCw,    color: "text-blue-600",    bg: "bg-blue-50"    },
};

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString("ru-RU")} ${currency === "RUB" ? "₽" : currency}`;
}

export default function StudentPaymentsPage() {
  useCurrentUser();

  const payments = useAsync(getMyExpenses);
  const lessons  = useAsync(getMySchedule);
  const tutors   = useAsync(getMyTutors);

  const allPayments = payments.data ?? [];
  const allLessons  = lessons.data ?? [];
  const allTutors   = tutors.data ?? [];

  // Занятия без оплаты (завершённые — ещё не оплаченные)
  const paidLessonIds = new Set(allPayments.map(p => p.lesson_id));
  const unpaidLessons = allLessons.filter(
    l => l.status === "completed" && !paidLessonIds.has(l.id)
  );

  // Суммарная статистика
  const totalPaid    = allPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = allPayments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  // Группировка по месяцам
  const byMonth: Record<string, Payment[]> = {};
  for (const p of allPayments) {
    const d = new Date(p.payment_date || p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(p);
  }
  const months = Object.keys(byMonth).sort().reverse();

  function monthLabel(key: string): string {
    const [y, m] = key.split("-");
    return `${MONTHS[parseInt(m) - 1]} ${y}`;
  }

  function lessonInfo(lessonId: number) {
    const lesson = allLessons.find(l => l.id === lessonId);
    if (!lesson) return { label: `Занятие #${lessonId}`, date: null };
    const d = new Date(lesson.date);
    return {
      label: lesson.topic ?? "Занятие",
      date: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
    };
  }

  function tutorForLesson(lessonId: number) {
    const lesson = allLessons.find(l => l.id === lessonId);
    if (!lesson) return null;
    return allTutors.find(t => t.id === lesson.tutor_id) ?? null;
  }

  const loading = payments.loading || lessons.loading;
  const error   = payments.error || lessons.error;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={STUDENT_NAV} />

      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 md:px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900">Мои платежи</h1>
          <p className="text-sm text-gray-400 mt-0.5">История оплат за занятия</p>
        </div>

        <div className="p-4 md:p-8 space-y-4 md:space-y-6">

          {error && (
            <ErrorBanner
              error={error}
              onRetry={() => { payments.refetch(); lessons.refetch(); }}
            />
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {loading ? (
              <>
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold mb-0.5">Всего оплачено</p>
                    <p className="text-xl font-black text-gray-900">{totalPaid.toLocaleString("ru-RU")} ₽</p>
                    <p className="text-xs text-gray-400">{allPayments.filter(p => p.status === "paid").length} платежей</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold mb-0.5">Ожидает оплаты</p>
                    <p className="text-xl font-black text-gray-900">{totalPending.toLocaleString("ru-RU")} ₽</p>
                    <p className="text-xs text-gray-400">{allPayments.filter(p => p.status === "pending").length} платежей</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Unpaid completed lessons */}
          {!loading && unpaidLessons.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-bold text-amber-800">
                  Завершённые занятия без оплаты — {unpaidLessons.length}
                </p>
              </div>
              <div className="space-y-2">
                {unpaidLessons.slice(0, 5).map(lesson => {
                  const tutor = allTutors.find(t => t.id === lesson.tutor_id);
                  return (
                    <div key={lesson.id} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {lesson.topic ?? "Занятие"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(lesson.date).toLocaleDateString("ru-RU", {
                            day: "numeric", month: "short", year: "numeric"
                          })}
                          {tutor && ` · ${tutor.name}`}
                        </p>
                      </div>
                      <PaymentLinkButton
                        lesson={lesson}
                        defaultPrice={tutor?.default_lesson_price}
                        tutorHasWallet={!!tutor?.yoomoney_wallet}
                        compact
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment history */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
          ) : allPayments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="font-bold text-gray-500">Платежей пока нет</p>
              <p className="text-sm text-gray-400 mt-1">
                Платежи появятся после оплаты занятий
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {months.map(month => (
                <div key={month}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                      {monthLabel(month)}
                    </h2>
                    <span className="text-sm font-bold text-gray-700">
                      {byMonth[month]
                        .filter(p => p.status === "paid")
                        .reduce((s, p) => s + p.amount, 0)
                        .toLocaleString("ru-RU")} ₽
                    </span>
                  </div>

                  <div className="space-y-2">
                    {byMonth[month].map(payment => {
                      const cfg = STATUS_CFG[payment.status];
                      const Icon = cfg.icon;
                      const info = lessonInfo(payment.lesson_id);
                      const tutor = tutorForLesson(payment.lesson_id);

                      return (
                        <div
                          key={payment.id}
                          className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 shadow-sm"
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                            <Icon className={cn("w-5 h-5", cfg.color)} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {info.label}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {info.date && `${info.date} · `}
                              {tutor ? tutor.name : "Репетитор"}
                              {payment.payment_method && ` · ${payment.payment_method}`}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="font-black text-gray-900 text-sm">
                              {formatAmount(payment.amount, payment.currency)}
                            </p>
                            <span className={cn("text-[11px] font-bold", cfg.color)}>
                              {cfg.label}
                            </span>
                          </div>

                          {payment.status === "pending" && (
                            <PaymentLinkButton
                              lesson={allLessons.find(l => l.id === payment.lesson_id)!}
                              defaultPrice={payment.amount}
                              tutorHasWallet={!!tutorForLesson(payment.lesson_id)?.yoomoney_wallet}
                              compact
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
