import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/api/auth";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    if (!token) {
      setError("Ссылка недействительна");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch {
      setError("Ссылка недействительна или истекла. Запросите новую.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <img src="/logo.png" alt="TutorSpace" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-bold text-lg text-gray-900">TutorSpace</span>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <span className="text-2xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Пароль изменён</h1>
            <p className="text-gray-500 text-sm">Перенаправляем на страницу входа…</p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Новый пароль</h1>
            <p className="text-gray-500 mb-8 text-sm">Придумайте новый пароль для вашего аккаунта.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="password">Новый пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    placeholder="Минимум 8 символов"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">Подтвердите пароль</Label>
                <Input
                  id="confirm"
                  type={showPwd ? "text" : "password"}
                  placeholder="Повторите пароль"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Сохранить пароль
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              <Link to="/forgot-password" className="text-primary hover:underline">
                Запросить новую ссылку
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
