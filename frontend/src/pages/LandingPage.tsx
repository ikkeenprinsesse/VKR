import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* ── Feature cards data ──────────────────────────────────────────────────── */
const FEATURES = [
  {
    emoji: "📅",
    color: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-100",
    label: "Расписание",
    desc: "Планируй занятия, отправляй напоминания — никаких пересечений и путаницы.",
    badge: "bg-blue-500",
  },
  {
    emoji: "📝",
    color: "bg-green-50 border-green-200",
    iconBg: "bg-green-100",
    label: "Домашние задания",
    desc: "Задания с дедлайнами и автоматической проверкой тестов и числовых задач.",
    badge: "bg-green-500",
  },
  {
    emoji: "💬",
    color: "bg-violet-50 border-violet-200",
    iconBg: "bg-violet-100",
    label: "Чат с учениками",
    desc: "Общайся прямо на платформе — без WhatsApp и посторонних мессенджеров.",
    badge: "bg-violet-500",
  },
  {
    emoji: "💰",
    color: "bg-yellow-50 border-yellow-200",
    iconBg: "bg-yellow-100",
    label: "Оплаты и аналитика",
    desc: "Отслеживай доходы, смотри статистику по месяцам — финансы под контролем.",
    badge: "bg-yellow-500",
  },
  {
    emoji: "🔗",
    color: "bg-pink-50 border-pink-200",
    iconBg: "bg-pink-100",
    label: "Приглашения",
    desc: "Подключай учеников по уникальной ссылке — быстро и без лишних шагов.",
    badge: "bg-pink-500",
  },
];

const STEPS = [
  { num: "1", emoji: "✍️", title: "Зарегистрируйся", desc: "Создай аккаунт репетитора за 2 минуты — бесплатно" },
  { num: "2", emoji: "📨", title: "Пригласи учеников", desc: "Отправь персональную ссылку-приглашение" },
  { num: "3", emoji: "🚀", title: "Работай эффективно", desc: "Занятия, ДЗ, оплаты — всё в одном месте" },
];


/* ── Animation-on-scroll hook ────────────────────────────────────────────── */
function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(32px)";
    el.style.transition = `opacity 0.5s ease-out ${delay}ms, transform 0.5s ease-out ${delay}ms`;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return ref;
}


export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white border-b-2 border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/site-logo.png" alt="TutorSpace" className="w-10 h-10 object-contain" />
            <span className="text-xl text-gray-900 tracking-tight" style={{ fontFamily: "'Finger Paint', cursive" }}>TutorSpace</span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-500">
            <a href="#features" className="hover:text-violet-600 transition-colors">Возможности</a>
            <a href="#how" className="hover:text-violet-600 transition-colors">Как работает</a>
            <a href="#pricing" className="hover:text-violet-600 transition-colors">Тарифы</a>
          </div>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <button className="duo-btn-outline text-xs px-4 py-2.5">Войти</button>
            </Link>
            <Link to="/register">
              <button className="duo-btn text-xs px-4 py-2.5">Начать бесплатно</button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100"
            onClick={() => setMenuOpen(v => !v)}
          >
            <div className="w-5 h-0.5 bg-current mb-1.5 transition-all" />
            <div className="w-5 h-0.5 bg-current mb-1.5 transition-all" />
            <div className="w-5 h-0.5 bg-current transition-all" />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t-2 border-gray-100 px-5 py-4 space-y-3 bg-white">
            <a href="#features" className="block font-bold text-gray-600 hover:text-violet-600 py-1">Возможности</a>
            <a href="#how" className="block font-bold text-gray-600 hover:text-violet-600 py-1">Как работает</a>
            <a href="#pricing" className="block font-bold text-gray-600 hover:text-violet-600 py-1">Тарифы</a>
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="flex-1">
                <button className="duo-btn-outline text-xs w-full py-2.5">Войти</button>
              </Link>
              <Link to="/register" className="flex-1">
                <button className="duo-btn text-xs w-full py-2.5">Регистрация</button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-blue-50 pt-16 pb-24">
        {/* Background circles */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-violet-100 blur-[100px] opacity-50 -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-100 blur-[80px] opacity-40 translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-5 relative">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Text */}
            <div className="lg:w-1/2 duo-fade-up">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 rounded-full px-4 py-2 text-sm font-extrabold mb-6 border-2 border-violet-200">
                <span className="flame-pulse">🔥</span>
                Платформа для частных репетиторов
              </div>

              <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight mb-6">
                Ведите уроки,{" "}
                <span className="relative inline-block">
                  <span
                    className="text-transparent bg-clip-text"
                    style={{ backgroundImage: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
                  >
                    а не таблицы
                  </span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                    <path d="M2 8 Q75 2 150 6 Q225 10 298 4" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5"/>
                  </svg>
                </span>
              </h1>

              <p className="text-xl text-gray-500 leading-relaxed mb-8 max-w-lg">
                TutorSpace автоматизирует расписание, домашние задания, оплаты и общение — всё в одном месте.
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <Link to="/register">
                  <button className="duo-btn text-sm px-8 py-4 rounded-2xl">
                    🚀 Попробовать бесплатно
                  </button>
                </Link>
                <a href="#features">
                  <button className="duo-btn-outline text-sm px-8 py-4 rounded-2xl">
                    Узнать больше
                  </button>
                </a>
              </div>

              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 rounded-full px-4 py-2 text-sm font-semibold">
                Бесплатно для репетиторов — без комиссий
              </div>
            </div>

            {/* App preview mockup */}
            <div className="lg:w-1/2 flex justify-center">
              <div className="w-full max-w-md space-y-3">
                {/* Карточка занятия */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 flex items-center gap-4 duo-fade-up" style={{ animationDelay: "100ms" }}>
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-violet-600 leading-none">Сег</span>
                    <span className="text-lg font-black text-violet-700 leading-none">14</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">Занятие по математике</p>
                    <p className="text-xs text-gray-400">18:00 · 60 мин · Анна Ученица</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 shrink-0">Сегодня</span>
                </div>

                {/* Карточка задания */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 flex items-center gap-4 duo-fade-up" style={{ animationDelay: "200ms" }}>
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <span className="text-2xl">📝</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">Задание сдано на проверку</p>
                    <p className="text-xs text-gray-400">Алгебра · Тема: уравнения</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 shrink-0">На проверке</span>
                </div>

                {/* Карточка оплаты */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 flex items-center gap-4 duo-fade-up" style={{ animationDelay: "300ms" }}>
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">Оплата получена</p>
                    <p className="text-xs text-gray-400">Занятие 14 мая · 2 500 ₽</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 shrink-0">Оплачено</span>
                </div>

                {/* Чат-превью */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 duo-fade-up" style={{ animationDelay: "400ms" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-violet-200 flex items-center justify-center text-violet-700 font-bold text-sm">А</div>
                    <div>
                      <p className="text-xs font-bold text-gray-700">Анна Ученица</p>
                      <p className="text-[10px] text-gray-400">только что</p>
                    </div>
                  </div>
                  <div className="bg-violet-50 rounded-xl px-3 py-2 text-xs text-violet-800 font-medium w-fit">
                    Прикрепила решение задачи ✅
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="bg-violet-600 py-10 border-y-2 border-violet-700">
        <div className="max-w-4xl mx-auto px-5">
          <div className="grid grid-cols-2 gap-6 text-center text-white max-w-xl mx-auto">
            {[
              { value: "0 ₽",  label: "комиссии с оплат" },
              { value: "100%", label: "цифровой документооборот" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-4xl font-black mb-1">{s.value}</p>
                <p className="text-violet-200 text-sm font-bold uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-5">
          <RevealBlock className="text-center mb-16">
            <p className="text-sm font-extrabold uppercase tracking-widest text-violet-500 mb-3">Инструменты</p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">Всё, что нужно репетитору</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto font-semibold">
              Никаких Excel-таблиц, WhatsApp-групп и разбросанных записей.
            </p>
          </RevealBlock>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <RevealBlock key={f.label} delay={i * 80}>
                <div className={`duo-card p-6 border-2 ${f.color} group cursor-default`}>
                  <div className={`w-14 h-14 rounded-2xl ${f.iconBg} border-2 border-white flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                    {f.emoji}
                  </div>
                  <h3 className="font-black text-gray-900 text-lg mb-2">{f.label}</h3>
                  <p className="text-sm font-semibold text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </RevealBlock>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how" className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-5">
          <RevealBlock className="text-center mb-16">
            <p className="text-sm font-extrabold uppercase tracking-widest text-violet-500 mb-3">Простой старт</p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">Три шага до первого занятия</h2>
          </RevealBlock>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-violet-200" />

            {STEPS.map((s, i) => (
              <RevealBlock key={s.num} delay={i * 120}>
                <div className="duo-card p-6 text-center relative">
                  <div className="w-16 h-16 rounded-full bg-violet-600 border-b-4 border-violet-700 flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-md">
                    {s.num}
                  </div>
                  <div className="text-4xl mb-3">{s.emoji}</div>
                  <h3 className="font-black text-xl text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm font-semibold text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </RevealBlock>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <RevealBlock className="text-center mb-16">
            <p className="text-sm font-extrabold uppercase tracking-widest text-violet-500 mb-3">Тарифы</p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">Прозрачные цены</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto font-semibold">
              Начните бесплатно — переходите на PRO когда готовы.
            </p>
          </RevealBlock>

          <div className="grid md:grid-cols-3 gap-6">

            {/* Free */}
            <RevealBlock delay={0}>
              <div className="duo-card p-7 border-2 border-gray-200 h-full flex flex-col">
                <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Бесплатно</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-5xl font-black text-gray-900">0 ₽</span>
                </div>
                <p className="text-sm text-gray-400 font-semibold mb-6">навсегда</p>
                <ul className="space-y-3 flex-1 mb-8">
                  {[
                    "До 3 учеников",
                    "Расписание и ДЗ",
                    "Чат и файлы",
                    "Базовые уведомления",
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600 font-semibold">
                      <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 text-xs">✓</span>
                      {f}
                    </li>
                  ))}
                  {[
                    "Финансовая аналитика",
                    "Экспорт отчётов",
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300 font-semibold">
                      <span className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 shrink-0 text-xs">✗</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <button className="duo-btn-outline w-full py-3 text-sm font-extrabold">
                    Начать бесплатно
                  </button>
                </Link>
              </div>
            </RevealBlock>

            {/* PRO monthly — highlighted */}
            <RevealBlock delay={100}>
              <div className="duo-card p-7 border-2 border-violet-500 h-full flex flex-col relative overflow-hidden shadow-lg">
                <div className="absolute top-4 right-4 bg-violet-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide">
                  Популярный
                </div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-violet-500 mb-3">PRO</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-5xl font-black text-gray-900">490 ₽</span>
                </div>
                <p className="text-sm text-gray-400 font-semibold mb-6">в месяц</p>
                <ul className="space-y-3 flex-1 mb-8">
                  {[
                    "Неограниченно учеников",
                    "Все модули платформы",
                    "Финансовая аналитика",
                    "Экспорт CSV и PDF",
                    "Экспорт расписания .ics",
                    "Форум репетиторов",
                    "Push-уведомления",
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700 font-semibold">
                      <span className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 shrink-0 text-xs">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <button className="duo-btn w-full py-3 text-sm font-extrabold">
                    Попробовать 14 дней бесплатно
                  </button>
                </Link>
              </div>
            </RevealBlock>

            {/* Annual / B2B */}
            <RevealBlock delay={200}>
              <div className="duo-card p-7 border-2 border-gray-200 h-full flex flex-col gap-6">

                {/* Annual */}
                <div className="flex-1">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-500 mb-3">PRO Годовой</p>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-4xl font-black text-gray-900">4 490 ₽</span>
                  </div>
                  <p className="text-sm text-gray-400 font-semibold mb-1">в год</p>
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-3 py-1 text-xs font-extrabold mb-4">
                    🎉 Экономия 2 месяца
                  </div>
                  <p className="text-sm text-gray-500 font-semibold">Всё из PRO — выгоднее при оплате за год.</p>
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-blue-500 mb-3">B2B Центр</p>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-3xl font-black text-gray-900">от 2 500 ₽</span>
                  </div>
                  <p className="text-sm text-gray-400 font-semibold mb-2">в месяц</p>
                  <p className="text-sm text-gray-500 font-semibold">До 10 преподавателей. Для репетиторских центров и школ.</p>
                </div>

                <a href="mailto:hello@tutorspace.ru">
                  <button className="duo-btn-outline w-full py-3 text-sm font-extrabold">
                    Связаться с нами
                  </button>
                </a>
              </div>
            </RevealBlock>

          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-violet-600 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-violet-500/40" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-violet-700/40" />
        </div>

        <RevealBlock className="max-w-2xl mx-auto px-5 text-center relative z-10">
          <img src="/mascot.png" alt="TutorSpace" className="w-24 h-24 object-contain duo-bounce mx-auto mb-4" />
          <h2 className="text-4xl font-black text-white mb-4">
            Готов начать?
          </h2>
          <p className="text-violet-200 text-lg font-semibold mb-10 max-w-md mx-auto leading-relaxed">
            Зарегистрируйся прямо сейчас — бесплатно, без карты, за 2 минуты.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <button className="text-base font-extrabold px-10 py-4 rounded-2xl w-full sm:w-auto bg-white text-violet-700 border-b-4 border-violet-200 hover:bg-violet-50 transition-colors uppercase tracking-wide">
                🚀 Создать аккаунт
              </button>
            </Link>
            <Link to="/login">
              <button className="text-base font-extrabold px-10 py-4 rounded-2xl w-full sm:w-auto bg-transparent text-white border-2 border-white/60 hover:bg-white/10 transition-colors uppercase tracking-wide">
                Войти
              </button>
            </Link>
          </div>
        </RevealBlock>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t-2 border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600 border-b-2 border-violet-700 flex items-center justify-center overflow-hidden">
              <img src="/mascot.png" alt="TutorSpace" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-black text-gray-700">TutorSpace</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-bold text-gray-400">
            <a href="#features" className="hover:text-gray-700">Возможности</a>
            <a href="#how" className="hover:text-gray-700">Как работает</a>
            <a href="#pricing" className="hover:text-gray-700">Тарифы</a>
          </div>
          <p className="text-sm font-bold text-gray-400">© 2026 TutorSpace</p>
        </div>
      </footer>
    </div>
  );
}

/* ── Helper: reveal on scroll ────────────────────────────────────────────── */
function RevealBlock({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useReveal(delay);
  return <div ref={ref} className={className}>{children}</div>;
}
