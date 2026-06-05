import { useState } from "react";
import { TUTOR_NAV } from "@/config/nav";
import {
  TrendingUp, BarChart3, Plus, Loader2,
  CheckCircle2, Clock, RefreshCw, ChevronDown } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getMyIncome, recordPayment, getPaymentAnalytics } from "@/api/payments";
import type { Payment } from "@/api/payments";
import { getMySchedule } from "@/api/lessons";
import { getMyStudents } from "@/api/users";
import Sidebar from "@/components/Sidebar";
import PaymentLinkButton from "@/components/PaymentLinkButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MONTHS } from "@/lib/date";


const STATUS_ICON: Record<Payment["status"], typeof CheckCircle2> = {
  paid:     CheckCircle2,
  pending:  Clock,
  refunded: RefreshCw };
const STATUS_LABEL: Record<Payment["status"], string> = {
  paid: "Оплачено", pending: "Ожидает", refunded: "Возврат" };
const STATUS_VARIANT: Record<Payment["status"], "success" | "warning" | "danger"> = {
  paid: "success", pending: "warning", refunded: "danger" };

// ── Record payment modal ───────────────────────────────────────────────────────
function RecordModal({
  lessons, students, onClose, onSaved }: {
  lessons: ReturnType<typeof useAsync<ReturnType<typeof getMySchedule> extends Promise<infer T> ? T : never>>["data"];
  students: ReturnType<typeof useAsync<ReturnType<typeof getMyStudents> extends Promise<infer T> ? T : never>>["data"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const lessonList = lessons ?? [];
  const studentList = students ?? [];

  const [lessonId, setLessonId] = useState<string>(lessonList[0]?.id.toString() ?? "");
  const [amount, setAmount]     = useState("");
  const [method, setMethod]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  function lessonLabel(l: (typeof lessonList)[0]) {
    const s = studentList.find((st) => st.id === l.student_id);
    const d = new Date(l.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    return `${d} · ${s?.name ?? "Ученик"} · ${l.topic ?? "Занятие"}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await recordPayment({ lesson_id: Number(lessonId), amount: Number(amount), payment_method: method || undefined });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка записи");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-5">Записать оплату</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Занятие</Label>
            {lessonList.length === 0 ? (
              <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-3">Нет занятий</p>
            ) : (
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {lessonList.map((l) => (
                  <option key={l.id} value={l.id}>{lessonLabel(l)}</option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-amount">Сумма (₽)</Label>
              <Input id="p-amount" type="number" min="0" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="1500" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-method">Способ оплаты</Label>
              <Input id="p-method" value={method} onChange={(e) => setMethod(e.target.value)}
                placeholder="Перевод, наличные…" />
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
            <Button type="submit" className="flex-1" disabled={loading || lessonList.length === 0}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Сохранить
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  useCurrentUser();

  const payments  = useAsync(getMyIncome);
  const analytics = useAsync(getPaymentAnalytics);
  const lessons   = useAsync(getMySchedule);
  const students  = useAsync(getMyStudents);

  const [showRecord, setShowRecord]       = useState(false);
  const [filterStudent, setFilterStudent] = useState<number | "all">("all");
  const [expanded, setExpanded]           = useState<number | null>(null);

  const allPayments = payments.data ?? [];
  const now = new Date();

  // ── Derived stats ────────────────────────────────────────────────────────────
  const paid = allPayments.filter((p) => p.status === "paid");

  const thisMonth = paid.filter((p) => {
    const d = new Date(p.payment_date ?? p.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const totalIncome   = paid.reduce((s, p) => s + p.amount, 0);
  const monthIncome   = thisMonth.reduce((s, p) => s + p.amount, 0);
  const avgPerLesson  = paid.length > 0 ? totalIncome / paid.length : 0;

  // ── Filtered list ────────────────────────────────────────────────────────────
  function getStudentId(payment: Payment) {
    const lesson = (lessons.data ?? []).find((l) => l.id === payment.lesson_id);
    return lesson?.student_id ?? null;
  }

  const filtered = filterStudent === "all"
    ? allPayments
    : allPayments.filter((p) => getStudentId(p) === filterStudent);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // ── Analytics chart ──────────────────────────────────────────────────────────
  const chart = analytics.data?.slice(-6) ?? [];
  const chartMax = Math.max(...chart.map((c) => c.total), 1);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={TUTOR_NAV} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Финансы</h1>
          <button
            onClick={() => setShowRecord(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Записать оплату
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-5">
            {[
              { label: "За этот месяц", value: `${monthIncome.toLocaleString("ru-RU")} ₽`, sub: `${thisMonth.length} оплат`, color: "text-green-600", bg: "bg-green-50", icon: TrendingUp },
              { label: "Всего получено", value: `${totalIncome.toLocaleString("ru-RU")} ₽`, sub: `${paid.length} оплаченных занятий`, color: "text-violet-600", bg: "bg-violet-50", icon: CheckCircle2 },
              { label: "Среднее за занятие", value: `${Math.round(avgPerLesson).toLocaleString("ru-RU")} ₽`, sub: "на основе всех оплат", color: "text-blue-600", bg: "bg-blue-50", icon: BarChart3 },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                  <s.icon className={cn("w-6 h-6", s.color)} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-0.5">{s.label}</p>
                  {payments.loading
                    ? <Skeleton className="h-7 w-24" />
                    : <p className={cn("text-2xl font-extrabold", s.color)}>{s.value}</p>
                  }
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chart + list */}
          <div className="grid grid-cols-5 gap-5">
            {/* Bar chart */}
            <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Доход по месяцам</h3>
              {analytics.loading
                ? <Skeleton className="h-40" />
                : chart.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-10">Нет данных</p>
                  : (
                    <div className="flex items-end gap-2 h-40">
                      {chart.map((item) => {
                        const [, month] = item.period.split("-");
                        const pct = Math.round((item.total / chartMax) * 100);
                        const isCurrentMonth =
                          item.period === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                        return (
                          <div key={item.period} className="flex-1 flex flex-col items-center gap-1 group">
                            <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {item.total.toLocaleString("ru-RU")} ₽
                            </span>
                            <div className="w-full flex flex-col justify-end" style={{ height: "100px" }}>
                              <div
                                className={cn(
                                  "w-full rounded-t-lg transition-all",
                                  isCurrentMonth ? "bg-primary" : "bg-violet-200 group-hover:bg-violet-300"
                                )}
                                style={{ height: `${Math.max(pct, 4)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">
                              {MONTHS[Number(month) - 1].slice(0, 3)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )
              }
            </div>

            {/* Payment list */}
            <div className="col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
              {/* List header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <h3 className="font-semibold text-gray-900 flex-1">История оплат</h3>
                {/* Filter by student */}
                <div className="relative">
                  <select
                    value={filterStudent}
                    onChange={(e) => setFilterStudent(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="appearance-none h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">Все ученики</option>
                    {(students.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Unpaid completed lessons */}
              {(() => {
                const paidLessonIds = new Set(allPayments.map((p) => p.lesson_id));
                const unpaid = (lessons.data ?? []).filter(
                  (l) => l.status === "completed" && !paidLessonIds.has(l.id)
                );
                if (unpaid.length === 0) return null;
                return (
                  <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
                    <p className="text-xs font-semibold text-amber-700 mb-2">
                      Завершённые занятия без оплаты ({unpaid.length})
                    </p>
                    <div className="space-y-1.5">
                      {unpaid.slice(0, 3).map((l) => {
                        const student = (students.data ?? []).find((s) => s.id === l.student_id);
                        return (
                          <div key={l.id} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 flex-1 truncate">
                              {new Date(l.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                              {" · "}{student?.name ?? "Ученик"}
                              {l.topic ? ` · ${l.topic}` : ""}
                            </span>
                            <PaymentLinkButton
                              lesson={l}
                              defaultPrice={undefined}
                              compact
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Items */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {payments.loading && (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" />
                  </div>
                )}
                {!payments.loading && sorted.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <TrendingUp className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm">Оплат пока нет</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowRecord(true)}>
                      Записать первую
                    </Button>
                  </div>
                )}
                {sorted.map((p) => {
                  const lesson  = (lessons.data ?? []).find((l) => l.id === p.lesson_id);
                  const student = (students.data ?? []).find((s) => s.id === lesson?.student_id);
                  const Icon    = STATUS_ICON[p.status];
                  const isOpen  = expanded === p.id;
                  const d       = new Date(p.payment_date ?? p.created_at);

                  return (
                    <div key={p.id} className="px-6">
                      <button
                        className="w-full flex items-center gap-3 py-4 text-left"
                        onClick={() => setExpanded(isOpen ? null : p.id)}
                      >
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          p.status === "paid" ? "bg-green-50" : p.status === "refunded" ? "bg-red-50" : "bg-amber-50"
                        )}>
                          <Icon className={cn("w-4 h-4",
                            p.status === "paid" ? "text-green-600" : p.status === "refunded" ? "text-red-500" : "text-amber-600"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {lesson?.topic ?? "Занятие"} {student ? `· ${student.name}` : ""}
                          </p>
                          <p className="text-xs text-gray-400">
                            {d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                            {p.payment_method ? ` · ${p.payment_method}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                          <span className={cn("font-bold text-sm",
                            p.status === "paid" ? "text-green-600" : "text-gray-500"
                          )}>
                            {p.status === "refunded" ? "−" : "+"}{p.amount.toLocaleString("ru-RU")} ₽
                          </span>
                        </div>
                      </button>
                      {isOpen && lesson && (
                        <div className="pb-3 text-xs text-gray-500 space-y-1 pl-12">
                          <p>Занятие: {new Date(lesson.date).toLocaleString("ru-RU", {
                            weekday: "short", day: "numeric", month: "long",
                            hour: "2-digit", minute: "2-digit" })}</p>
                          <p>Длительность: {lesson.duration} мин</p>
                          {lesson.topic && <p>Тема: {lesson.topic}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {showRecord && (
        <RecordModal
          lessons={lessons.data}
          students={students.data}
          onClose={() => setShowRecord(false)}
          onSaved={() => { payments.refetch(); analytics.refetch(); }}
        />
      )}
    </div>
  );
}
