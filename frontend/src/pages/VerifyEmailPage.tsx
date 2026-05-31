import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { verifyEmail } from "@/api/auth";
import { useAuthStore } from "@/store/auth";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { user, setUser } = useAuthStore();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }

    verifyEmail(token)
      .then(() => {
        setStatus("success");
        // обновляем флаг в сторе если пользователь авторизован
        if (user) setUser({ ...user, is_verified: true });
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo.png" alt="TutorSpace" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-bold text-lg text-gray-900">TutorSpace</span>
        </div>

        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="text-gray-500">Подтверждаем email…</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <span className="text-2xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Email подтверждён!</h1>
            <p className="text-gray-500 text-sm">Теперь ваш аккаунт полностью активен.</p>
            <Link
              to={user ? (user.role === "tutor" ? "/dashboard/tutor" : "/dashboard/student") : "/login"}
              className="inline-block mt-2 px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {user ? "Перейти в дашборд" : "Войти"}
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <span className="text-2xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Ссылка недействительна</h1>
            <p className="text-gray-500 text-sm">
              Ссылка устарела или уже была использована.
            </p>
            {user && (
              <button
                onClick={async () => {
                  const { sendVerification } = await import("@/api/auth");
                  await sendVerification();
                  alert("Новое письмо отправлено");
                }}
                className="text-sm text-primary hover:underline"
              >
                Отправить новое письмо
              </button>
            )}
            <div>
              <Link to="/login" className="text-sm text-gray-400 hover:underline">
                Вернуться к входу
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
