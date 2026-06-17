import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError("Произошла ошибка. Попробуйте позже.");
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

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <span className="text-2xl">✉️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Письмо отправлено</h1>
            <p className="text-gray-500 text-sm">
              Если адрес <span className="font-medium text-gray-700">{email}</span> зарегистрирован,
              вы получите письмо со ссылкой для сброса пароля.
            </p>
            <Link to="/login" className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
              <ArrowLeft className="w-4 h-4" /> Вернуться к входу
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Сброс пароля</h1>
            <p className="text-gray-500 mb-8 text-sm">
              Введите email — мы отправим ссылку для восстановления доступа.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Отправить ссылку
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              <Link to="/login" className="inline-flex items-center gap-1 text-primary hover:underline">
                <ArrowLeft className="w-4 h-4" /> Вернуться к входу
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
