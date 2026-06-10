import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TUTOR_NAV } from "@/config/nav";
import { CheckCircle2, Crown, Zap, Building2, Loader2, CalendarDays, AlertCircle } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getMySubscription, getCheckoutUrl } from "@/api/subscriptions";
import type { PlanType } from "@/api/subscriptions";
import Sidebar from "@/components/Sidebar";
import ErrorBanner from "@/components/ErrorBanner";
import { cn } from "@/lib/utils";

const PLAN_LABELS: Record<PlanType, string> = {
  free:        "Бесплатный",
  pro_monthly: "PRO (месяц)",
  pro_annual:  "PRO (год)",
};

function StatusBadge({ plan, isActive, daysLeft }: { plan: PlanType; isActive: boolean; daysLeft: number | null }) {
  if (plan === "free") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
        Бесплатный тариф
      </span>
    );
  }
  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
        <AlertCircle className="w-4 h-4" /> Подписка истекла
      </span>
    );
  }
  const urgent = daysLeft !== null && daysLeft <= 7;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full",
      urgent ? "text-amber-700 bg-amber-50" : "text-emerald-700 bg-emerald-50"
    )}>
      <Crown className="w-4 h-4" />
      PRO — {daysLeft !== null ? `${daysLeft} дн. осталось` : "активна"}
    </span>
  );
}

interface PlanCardProps {
  title: string;
  price: string;
  period: string;
  badge?: string;
  badgeColor?: string;
  features: string[];
  missing?: string[];
  cta: string;
  ctaVariant?: "primary" | "outline" | "muted";
  savings?: string;
  onCta: () => void;
  loading?: boolean;
  current?: boolean;
}

function PlanCard({ title, price, period, badge, badgeColor, features, missing, cta, ctaVariant = "primary", savings, onCta, loading, current }: PlanCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-2xl border-2 p-6 flex flex-col relative overflow-hidden",
      current ? "border-violet-500 shadow-lg" : "border-gray-200"
    )}>
      {badge && (
        <div className={cn("absolute top-4 right-4 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full", badgeColor ?? "bg-violet-600 text-white")}>
          {badge}
        </div>
      )}
      {current && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-violet-600 rounded-t-xl" />
      )}

      <h3 className="text-base font-extrabold text-gray-900 mb-1">{title}</h3>
      <div className="flex items-end gap-1 mb-0.5">
        <span className="text-4xl font-black text-gray-900">{price}</span>
      </div>
      <p className="text-sm text-gray-400 font-semibold mb-1">{period}</p>
      {savings && (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 mb-4 w-fit">
          🎉 {savings}
        </span>
      )}

      <ul className="space-y-2.5 flex-1 mt-4 mb-6">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-700 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
        {missing?.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-300 font-semibold">
            <span className="w-4 h-4 shrink-0 flex items-center justify-center text-gray-300 text-xs mt-0.5">✗</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onCta}
        disabled={loading || current}
        className={cn(
          "w-full py-2.5 rounded-xl text-sm font-extrabold transition-colors flex items-center justify-center gap-2 disabled:opacity-60",
          current
            ? "bg-violet-50 text-violet-600 border border-violet-200 cursor-default"
            : ctaVariant === "primary"
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : ctaVariant === "outline"
                ? "border-2 border-violet-600 text-violet-600 hover:bg-violet-50"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        )}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {current ? "Текущий тариф" : cta}
      </button>
    </div>
  );
}

export default function SubscriptionPage() {
  useCurrentUser();
  const [searchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const sub = useAsync(getMySubscription);

  const successParam = searchParams.get("success");

  async function handleCheckout(plan: "pro_monthly" | "pro_annual") {
    setLoadingPlan(plan);
    setCheckoutError(null);
    try {
      const result = await getCheckoutUrl(plan);
      window.location.href = result.url;
    } catch (err: any) {
      setCheckoutError(err?.response?.data?.detail ?? "Ошибка создания платежа");
      setLoadingPlan(null);
    }
  }

  const currentPlan = sub.data?.plan ?? "free";
  const isPro = currentPlan !== "free" && sub.data?.is_active;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={TUTOR_NAV} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl pt-16 lg:pt-4">

        {/* Success banner */}
        {successParam && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 mb-6 text-emerald-700">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Оплата прошла успешно!</p>
              <p className="text-sm font-semibold opacity-80">Подписка PRO активирована. Приятной работы!</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 mb-1">Подписка</h1>
          <p className="text-gray-400 font-semibold text-sm">Управление тарифным планом</p>
        </div>

        {sub.error && <ErrorBanner error={sub.error} onRetry={sub.refetch} className="mb-6" />}
        {checkoutError && <ErrorBanner error={checkoutError} className="mb-6" />}

        {/* Current plan card */}
        {!sub.loading && sub.data && (
          <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5 mb-8 flex items-center gap-5 shadow-sm">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              isPro ? "bg-violet-100" : "bg-gray-100"
            )}>
              {isPro ? <Crown className="w-6 h-6 text-violet-600" /> : <Zap className="w-6 h-6 text-gray-400" />}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">{PLAN_LABELS[currentPlan]}</p>
              {sub.data.expires_at && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Действует до {new Date(sub.data.expires_at).toLocaleDateString("ru-RU", {
                    day: "numeric", month: "long", year: "numeric"
                  })}
                </p>
              )}
            </div>
            <StatusBadge plan={currentPlan} isActive={sub.data.is_active} daysLeft={sub.data.days_left} />
          </div>
        )}

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-5">

          <PlanCard
            title="Бесплатный"
            price="0 ₽"
            period="навсегда"
            features={["До 3 учеников", "Расписание и ДЗ", "Чат и файлы", "Push-уведомления"]}
            missing={["Финансовая аналитика", "Экспорт CSV / PDF", "Неограниченно учеников"]}
            cta="Текущий тариф"
            ctaVariant="muted"
            onCta={() => {}}
            current={currentPlan === "free"}
          />

          <PlanCard
            title="PRO Месяц"
            price="490 ₽"
            period="в месяц"
            badge="Популярный"
            features={[
              "Неограниченно учеников",
              "Все модули платформы",
              "Финансовая аналитика",
              "Экспорт CSV и PDF",
              "Приоритетная поддержка",
            ]}
            cta="Оплатить через ЮMoney"
            ctaVariant="primary"
            onCta={() => handleCheckout("pro_monthly")}
            loading={loadingPlan === "pro_monthly"}
            current={currentPlan === "pro_monthly" && !!isPro}
          />

          <PlanCard
            title="PRO Год"
            price="4 490 ₽"
            period="в год"
            savings="Экономия 2 месяца"
            features={[
              "Всё из PRO Месяц",
              "Выгоднее на 980 ₽",
              "Автопродление по запросу",
            ]}
            cta="Оплатить через ЮMoney"
            ctaVariant="outline"
            onCta={() => handleCheckout("pro_annual")}
            loading={loadingPlan === "pro_annual"}
            current={currentPlan === "pro_annual" && !!isPro}
          />
        </div>

        {/* B2B block */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl px-6 py-5 flex items-center gap-4">
          <Building2 className="w-8 h-8 text-blue-500 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-blue-900">B2B — для центров и школ</p>
            <p className="text-sm text-blue-600 font-semibold mt-0.5">
              От 2 500 ₽/мес. за команду до 10 преподавателей. Кастомные условия и выставление счёта.
            </p>
          </div>
          <a
            href="mailto:hello@tutorspace.ru"
            className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Написать нам
          </a>
        </div>

        {/* FAQ */}
        <div className="mt-8 space-y-4">
          <h2 className="text-base font-bold text-gray-700">Частые вопросы</h2>
          {[
            {
              q: "Как происходит оплата?",
              a: "Переход на ЮMoney — оплата картой или электронным кошельком. После подтверждения платежа подписка активируется автоматически.",
            },
            {
              q: "Что будет, когда подписка закончится?",
              a: "Аккаунт переходит на бесплатный план. Данные сохраняются — занятия, ДЗ, история. Если учеников больше 3, они остаются, но новых добавить нельзя.",
            },
            {
              q: "Можно продлить подписку до истечения срока?",
              a: "Да — дни добавятся к текущему сроку, не с нуля.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
              <p className="font-bold text-gray-900 text-sm mb-1">{q}</p>
              <p className="text-sm text-gray-500 font-semibold">{a}</p>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
