import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, getMe } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const LOTTIE_OWL = "https://lottie.host/f0dd5474-8fc3-4148-b77a-3a02b1ca9c31/owl-study.lottie";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [lottieOk, setLottieOk] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokenData = await login({ username: email, password });
      setTokens(tokenData.access_token, tokenData.refresh_token);
      const me = await getMe();
      setUser(me);
      navigate(me.role === "tutor" ? "/dashboard/tutor" : "/dashboard/student");
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[480px] shrink-0 bg-violet-600 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-500/30" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-violet-700/50" />
        </div>

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Brand */}
          <div className="mb-auto text-center">
            <span className="text-5xl text-white tracking-tight leading-tight" style={{ fontFamily: "'Finger Paint', cursive" }}>TutorSpace</span>
          </div>

          {/* Lottie / Owl illustration */}
          <div className="flex justify-center my-8">
            {lottieOk ? (
              <div className="w-48 h-48">
                <DotLottieReact
                  src={LOTTIE_OWL}
                  loop
                  autoplay
                  dotLottieRefCallback={(dl) => {
                    if (!dl) return;
                    dl.addEventListener("loadError", () => setLottieOk(false));
                  }}
                />
              </div>
            ) : (
              <img src="/mascot.png" alt="TutorSpace" className="w-36 h-36 object-contain duo-bounce" />
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Всё для работы<br />в одном месте
            </h2>
            <p className="text-violet-200 font-semibold text-base leading-relaxed mb-8">
              Расписание, задания, оплаты и общение с учениками — без таблиц и мессенджеров.
            </p>

            {/* Feature pills */}
            <div className="space-y-3">
              {[
                { emoji: "📅", text: "Расписание и запись на занятия" },
                { emoji: "📝", text: "Домашние задания с автопроверкой" },
                { emoji: "💬", text: "Чат и форум с репетитором" },
              ].map(({ emoji, text }) => (
                <div key={text} className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
                  <span className="text-xl">{emoji}</span>
                  <span className="text-white font-bold text-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="mt-8 bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10">
            <div className="flex gap-0.5 mb-2">
              {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-300 text-sm">★</span>)}
            </div>
            <p className="text-white text-sm leading-relaxed mb-3">
              «Теперь я трачу время на уроки, а не на таблицы с оплатами»
            </p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-violet-400 border-b border-violet-500 flex items-center justify-center text-white text-xs font-black">А</div>
              <span className="text-violet-200 text-xs font-bold">Анна · репетитор по математике</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src="/site-logo.png" alt="TutorSpace" className="w-16 h-16 object-contain mb-2" />
            <span className="text-4xl text-gray-900 tracking-tight" style={{ fontFamily: "'Finger Paint', cursive" }}>TutorSpace</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2">С возвращением!</h1>
            <p className="text-gray-500 font-semibold">Продолжи обучение с того места, где остановился</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-extrabold text-gray-700">Пароль</Label>
                <Link to="/forgot-password" className="text-xs font-extrabold text-violet-600 hover:text-violet-700 hover:underline">
                  Забыли пароль?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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

            {error && (
              <div className="flex items-center gap-2 text-sm font-bold text-red-600 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3">
                <span>⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="duo-btn w-full flex items-center justify-center gap-2 mt-2 py-4 text-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Входим..." : "Войти"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-0.5 bg-gray-200" />
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">или</span>
            <div className="flex-1 h-0.5 bg-gray-200" />
          </div>

          <Link to="/register">
            <button className="duo-btn-outline w-full flex items-center justify-center gap-2 py-4 text-sm">
              Создать новый аккаунт
            </button>
          </Link>

          <p className="text-center text-xs font-bold text-gray-400 mt-6">
            Вход только по приглашению от репетитора
          </p>
        </div>
      </div>
    </div>
  );
}
