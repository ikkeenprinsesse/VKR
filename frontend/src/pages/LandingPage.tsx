import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

/* ── Lottie animation URLs from LottieFiles CDN ─────────────────────────── */
const LOTTIE = {
  hero:          "https://lottie.host/a5b42f1a-e97a-42a3-8b63-d17c8ff3e7e1/TfQY8j2dxB.lottie",
  calendar:      "https://lottie.host/7fea39d6-1a0c-44bc-a982-7b63c5c76e15/QL6DqkXxu9.lottie",
  homework:      "https://lottie.host/28f4f8c5-b7c7-4d4c-bc8e-5f3c63f8f9d2/homework.lottie",
  chat:          "https://lottie.host/5c21b72e-ad04-4e8c-a04d-7c2a88b3be93/chat.lottie",
  analytics:     "https://lottie.host/9a1d63e5-7b2c-4f8a-a3d1-2e5c9b7f4e8d/analytics.lottie",
  trophy:        "https://lottie.host/b3f2e8a1-6d4c-4b9e-8c2f-1a7d5e3b9c4f/trophy.lottie",
  celebration:   "https://lottie.host/e4c7a2f5-8b3d-4e6c-a9f1-3d8b5c2e7a4f/celebration.lottie",
};

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
    emoji: "🏆",
    color: "bg-orange-50 border-orange-200",
    iconBg: "bg-orange-100",
    label: "Геймификация",
    desc: "Ученики зарабатывают XP, поддерживают стрики и открывают достижения.",
    badge: "bg-orange-500",
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

const TESTIMONIALS = [
  {
    avatar: "А",
    name: "Анна К.",
    role: "Репетитор по математике",
    text: "Теперь трачу время на уроки, а не на таблицы с оплатами. Ученики сами видят своё расписание!",
    color: "bg-violet-500",
  },
  {
    avatar: "М",
    name: "Михаил Р.",
    role: "Репетитор по английскому",
    text: "Чат и домашние задания в одном месте — больше не теряются сообщения в WhatsApp.",
    color: "bg-blue-500",
  },
  {
    avatar: "С",
    name: "Светлана Д.",
    role: "Репетитор по физике",
    text: "Геймификация работает! Ученики сами напоминают мне о заданиях, чтобы не потерять стрик.",
    color: "bg-green-500",
  },
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

/* ── Animated counter ─────────────────────────────────────────────────────── */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        let start = 0;
        const step = Math.ceil(to / 60);
        const id = setInterval(() => {
          start += step;
          if (start >= to) { setVal(to); clearInterval(id); } else setVal(start);
        }, 16);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ── Lottie with fallback emoji ───────────────────────────────────────────── */
function LottieOrEmoji({ src, fallback, className = "w-32 h-32" }: { src: string; fallback: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={`flex items-center justify-center text-6xl ${className}`}>{fallback}</span>;
  return (
    <div className={className}>
      <DotLottieReact
        src={src}
        loop
        autoplay
        dotLottieRefCallback={(dl) => {
          if (!dl) return;
          dl.addEventListener("loadError", () => setFailed(true));
        }}
      />
    </div>
  );
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
            <a href="#reviews" className="hover:text-violet-600 transition-colors">Отзывы</a>
          </div>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <button className="duo-btn-outline text-xs px-4 py-2.5">Войти</button>
            </Link>
            <Link to="/register">
              <button className="duo-btn-green text-xs px-4 py-2.5">Начать бесплатно</button>
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
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="flex-1">
                <button className="duo-btn-outline text-xs w-full py-2.5">Войти</button>
              </Link>
              <Link to="/register" className="flex-1">
                <button className="duo-btn-green text-xs w-full py-2.5">Регистрация</button>
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
                  <button className="duo-btn-green text-sm px-8 py-4 rounded-2xl">
                    🚀 Попробовать бесплатно
                  </button>
                </Link>
                <a href="#features">
                  <button className="duo-btn-outline text-sm px-8 py-4 rounded-2xl">
                    Узнать больше
                  </button>
                </a>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {["А","М","С","Д","Е"].map((c,i) => (
                    <div key={i} className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-extrabold"
                      style={{ background: ["#7c3aed","#2563eb","#059669","#d97706","#db2777"][i] }}>
                      {c}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 mb-0.5">
                    {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-400 text-sm">★</span>)}
                  </div>
                  <p className="text-xs font-bold text-gray-500">Уже <strong className="text-gray-900">200+</strong> репетиторов на платформе</p>
                </div>
              </div>
            </div>

            {/* Lottie hero illustration */}
            <div className="lg:w-1/2 flex justify-center">
              <div className="relative duo-bounce">
                <LottieOrEmoji
                  src={LOTTIE.hero}
                  fallback="🎓"
                  className="w-72 h-72 md:w-96 md:h-96"
                />
                {/* Floating achievement cards */}
                <div className="absolute -left-8 top-12 duo-card px-3 py-2 flex items-center gap-2 text-sm font-extrabold text-orange-600 bg-orange-50 border-orange-200">
                  <span className="text-lg flame-pulse">🔥</span> 7 дней стрик!
                </div>
                <div className="absolute -right-6 top-1/3 duo-card px-3 py-2 flex items-center gap-2 text-sm font-extrabold text-violet-700 bg-violet-50 border-violet-200">
                  <span className="text-lg">⭐</span> +20 XP
                </div>
                <div className="absolute -left-4 bottom-16 duo-card px-3 py-2 flex items-center gap-2 text-sm font-extrabold text-green-700 bg-green-50 border-green-200">
                  <span className="text-lg">✅</span> ДЗ сдано!
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="bg-violet-600 py-10 border-y-2 border-violet-700">
        <div className="max-w-4xl mx-auto px-5">
          <div className="grid grid-cols-3 gap-6 text-center text-white">
            {[
              { to: 200, suffix: "+", label: "репетиторов" },
              { to: 0, suffix: "₽", label: "комиссии с оплат" },
              { to: 100, suffix: "%", label: "цифровой документооборот" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-4xl font-black mb-1">
                  <CountUp to={s.to} suffix={s.suffix} />
                </p>
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

      {/* ── Gamification showcase ─────────────────────────────────────────── */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left: text */}
            <RevealBlock className="lg:w-1/2">
              <p className="text-sm font-extrabold uppercase tracking-widest text-green-500 mb-3">Геймификация</p>
              <h2 className="text-4xl font-black text-gray-900 mb-5">
                Учиться весело — <br />
                <span className="text-violet-600">как в игре</span>
              </h2>
              <p className="text-gray-500 text-lg font-semibold mb-8 leading-relaxed">
                Ученики зарабатывают XP за каждое выполненное задание, поддерживают стрики и открывают достижения. Это мотивирует учиться каждый день.
              </p>
              <div className="space-y-3">
                {[
                  { emoji: "🔥", color: "bg-orange-50 border-orange-200 text-orange-700", text: "Стрики — учись каждый день и не теряй огонь" },
                  { emoji: "⭐", color: "bg-violet-50 border-violet-200 text-violet-700", text: "XP за задания — растёт уровень и открываются бейджи" },
                  { emoji: "🏅", color: "bg-yellow-50 border-yellow-200 text-yellow-700", text: "Достижения — коллекционируй награды за успехи" },
                ].map((item) => (
                  <div key={item.text} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 ${item.color} font-bold text-sm`}>
                    <span className="text-2xl">{item.emoji}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </RevealBlock>

            {/* Right: mock dashboard card */}
            <RevealBlock className="lg:w-1/2" delay={200}>
              <div className="duo-card p-6 max-w-sm mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-600 border-b-2 border-violet-700 flex items-center justify-center text-white text-lg font-black">М</div>
                    <div>
                      <p className="font-black text-gray-900">Максим</p>
                      <p className="text-xs font-bold text-gray-400">Уровень 5 · Ученик</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1,2,3].map(i => <span key={i} className="duo-heart">❤️</span>)}
                    <span className="duo-heart-empty">🤍</span>
                    <span className="duo-heart-empty">🤍</span>
                  </div>
                </div>

                {/* Streak + XP */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-3 text-center">
                    <span className="text-3xl flame-pulse block mb-1">🔥</span>
                    <p className="font-black text-2xl text-orange-600 leading-none">14</p>
                    <p className="text-xs font-bold text-orange-400 mt-0.5">дней стрик</p>
                  </div>
                  <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-3 text-center">
                    <span className="text-3xl block mb-1">⭐</span>
                    <p className="font-black text-2xl text-violet-600 leading-none">420</p>
                    <p className="text-xs font-bold text-violet-400 mt-0.5">очков XP</p>
                  </div>
                </div>

                {/* XP Progress */}
                <div className="mb-5">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-extrabold text-gray-500">До уровня 6</span>
                    <span className="text-xs font-extrabold text-violet-600">420 / 500 XP</span>
                  </div>
                  <div className="duo-progress">
                    <div className="duo-progress-fill" style={{ width: "84%" }} />
                  </div>
                </div>

                {/* Achievements */}
                <div>
                  <p className="text-sm font-extrabold text-gray-700 mb-2">🏅 Достижения</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { e: "🔥", l: "Стрик 7д", done: true },
                      { e: "📚", l: "5 заданий", done: true },
                      { e: "⭐", l: "100 XP", done: true },
                      { e: "💎", l: "Стрик 30", done: false },
                    ].map(a => (
                      <div key={a.l} className={`rounded-xl border-2 p-2 text-center ${a.done ? "bg-violet-50 border-violet-200" : "bg-gray-50 border-gray-200 opacity-40"}`}>
                        <span className="text-xl block">{a.e}</span>
                        <span className="text-xs font-bold text-gray-500 leading-tight">{a.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealBlock>
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

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section id="reviews" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <RevealBlock className="text-center mb-16">
            <p className="text-sm font-extrabold uppercase tracking-widest text-green-500 mb-3">Отзывы</p>
            <h2 className="text-4xl font-black text-gray-900">Репетиторы говорят</h2>
          </RevealBlock>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <RevealBlock key={t.name} delay={i * 100}>
                <div className="duo-card p-6 h-full flex flex-col">
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-400 text-lg">★</span>)}
                  </div>
                  <p className="text-gray-700 font-semibold leading-relaxed mb-5 flex-1">
                    «{t.text}»
                  </p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${t.color} border-b-2 border-opacity-50 flex items-center justify-center text-white font-black text-sm`}
                      style={{ borderColor: "rgba(0,0,0,0.2)" }}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-xs font-bold text-gray-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              </RevealBlock>
            ))}
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
              <button className="duo-btn-yellow text-base px-10 py-4 rounded-2xl w-full sm:w-auto">
                🚀 Создать аккаунт
              </button>
            </Link>
            <Link to="/login">
              <button className="duo-btn-outline text-base px-10 py-4 rounded-2xl w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
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
            <a href="#reviews" className="hover:text-gray-700">Отзывы</a>
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
