import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register, login, getMe } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

type Role = "tutor" | "student";

const ROLE_CARDS = [
  {
    role: "tutor" as Role,
    emoji: "👨‍🏫",
    title: "Я репетитор",
    desc: "Управляю занятиями, заданиями и учениками",
    color: "border-violet-300 bg-violet-50",
    activeColor: "border-violet-600 bg-violet-100",
    badgeColor: "bg-violet-600",
  },
  {
    role: "student" as Role,
    emoji: "🎓",
    title: "Я ученик",
    desc: "Выполняю задания, зарабатываю XP и стрики",
    color: "border-green-300 bg-green-50",
    activeColor: "border-green-600 bg-green-100",
    badgeColor: "bg-green-500",
  },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("invite") ?? "";

  const { setToken, setUser } = useAuthStore();

  const [role,     setRole]     = useState<Role>("tutor");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [invite,   setInvite]   = useState(inviteCode);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        email, password, name, role,
        invite_code: role === "student" ? invite || undefined : undefined,
      });
      const tokenData = await login({ username: email, password });
      setToken(tokenData.access_token);
      const me = await getMe();
      setUser(me);
      navigate(me.role === "tutor" ? "/dashboard/tutor" : "/dashboard/student");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Ошибка при регистрации. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[480px] shrink-0 bg-violet-600 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-500/30" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-violet-700/50" />
        </div>

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-10">
            <img src="/site-logo.png" alt="TutorSpace" className="w-11 h-11 object-contain" />
            <span className="text-2xl text-white tracking-tight" style={{ fontFamily: "'Finger Paint', cursive" }}>TutorSpace</span>
          </div>

          {/* Mascot */}
          <div className="flex justify-center my-6">
            <img src="/mascot.png" alt="TutorSpace" className="w-40 h-40 object-contain duo-bounce" />
          </div>

          <h2 className="text-3xl font-black text-white mb-4">
            Добро пожаловать!
          </h2>
          <p className="text-violet-200 font-semibold leading-relaxed mb-8">
            Создай аккаунт и начни работать эффективно уже сегодня.
          </p>

          {/* Benefits */}
          <div className="space-y-3">
            {[
              { emoji: "✅", text: "Бесплатно навсегда" },
              { emoji: "🔒", text: "Безопасная платформа" },
              { emoji: "⚡", text: "Настройка за 2 минуты" },
              { emoji: "🎮", text: "Геймификация для учеников" },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
                <span className="text-xl">{emoji}</span>
                <span className="text-white font-bold text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src="/site-logo.png" alt="TutorSpace" className="w-16 h-16 object-contain mb-2" />
            <span className="text-2xl text-gray-900 tracking-tight" style={{ fontFamily: "'Finger Paint', cursive" }}>TutorSpace</span>
          </div>

          <h1 className="text-3xl font-black text-gray-900 mb-1">Создать аккаунт</h1>
          <p className="text-gray-500 font-semibold mb-6">Это займёт меньше минуты</p>

          {/* Role selector — Duolingo-style cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ROLE_CARDS.map((rc) => (
              <button
                key={rc.role}
                type="button"
                onClick={() => setRole(rc.role)}
                className={cn(
                  "duo-card p-4 text-left transition-all border-2 cursor-pointer",
                  role === rc.role ? rc.activeColor : rc.color
                )}
                style={role === rc.role ? { boxShadow: "0 4px 0 rgba(0,0,0,0.15)" } : {}}
              >
                <span className="text-3xl block mb-2">{rc.emoji}</span>
                <p className="font-extrabold text-gray-900 text-sm leading-tight">{rc.title}</p>
                <p className="text-[11px] font-semibold text-gray-500 mt-1 leading-tight">{rc.desc}</p>
                {role === rc.role && (
                  <div className={`w-4 h-4 ${rc.badgeColor} rounded-full flex items-center justify-center mt-2`}>
                    <span className="text-white text-[10px] font-black">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-extrabold text-gray-700">Имя</Label>
              <Input
                id="name"
                placeholder="Как вас зовут?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12 rounded-2xl border-2 border-gray-200 bg-white focus:border-violet-400 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-extrabold text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 rounded-2xl border-2 border-gray-200 bg-white focus:border-violet-400 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-extrabold text-gray-700">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="Минимум 8 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-12 pr-12 rounded-2xl border-2 border-gray-200 bg-white focus:border-violet-400 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {role === "student" && (
              <div className="space-y-1.5">
                <Label htmlFor="invite" className="text-sm font-extrabold text-gray-700">
                  Код приглашения
                </Label>
                <Input
                  id="invite"
                  placeholder="Вставьте код из ссылки"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  className="h-12 rounded-2xl border-2 border-gray-200 bg-white focus:border-green-400 font-semibold"
                />
                <p className="text-xs font-bold text-gray-400">
                  Попросите репетитора прислать ссылку-приглашение
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm font-bold text-red-600 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3">
                <span>⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 font-extrabold rounded-2xl px-6 py-4 border-b-4 text-white uppercase tracking-wide text-sm cursor-pointer mt-2",
                role === "student"
                  ? "bg-green-500 border-green-600 hover:bg-green-400"
                  : "bg-violet-600 border-violet-700 hover:bg-violet-500"
              )}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Создаём аккаунт..." : "Зарегистрироваться 🚀"}
            </button>
          </form>

          <p className="text-center text-sm font-semibold text-gray-500 mt-6">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="font-extrabold text-violet-600 hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
