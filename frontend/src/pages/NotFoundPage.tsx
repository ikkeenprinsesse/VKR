import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

export default function NotFoundPage() {
  const { token, user } = useAuthStore();

  const homeHref = token && user
    ? user.role === "tutor" ? "/dashboard/tutor" : "/dashboard/student"
    : "/";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5 text-center">
      <img src="/mascot.png" alt="TutorSpace" className="w-32 h-32 object-contain mb-6 opacity-80" />

      <p className="text-8xl font-black text-violet-200 leading-none mb-2">404</p>
      <h1 className="text-2xl font-black text-gray-900 mb-2">Страница не найдена</h1>
      <p className="text-gray-400 font-semibold mb-8 max-w-xs">
        Такой страницы не существует или она была перемещена.
      </p>

      <Link
        to={homeHref}
        className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-sm"
      >
        На главную
      </Link>
    </div>
  );
}
