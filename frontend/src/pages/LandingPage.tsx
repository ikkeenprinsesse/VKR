import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Calendar,
  MessageSquare,
  Star,
  ArrowRight,
  GraduationCap,
  BarChart3,
  Clock,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Расписание занятий",
    desc: "Планируй занятия, получай напоминания — больше никаких пересечений и путаницы в записях.",
  },
  {
    icon: BookOpen,
    title: "Домашние задания",
    desc: "Создавай задания, устанавливай дедлайны. Система автоматически проверяет тесты и числовые задачи.",
  },
  {
    icon: MessageSquare,
    title: "Чат с учениками",
    desc: "Общайся с учениками прямо на платформе — все в одном месте, без сторонних мессенджеров.",
  },
  {
    icon: BarChart3,
    title: "Аналитика дохода",
    desc: "Отслеживай оплаты, смотри статистику по месяцам и ученикам — финансы под контролем.",
  },
  {
    icon: GraduationCap,
    title: "Форум и обсуждения",
    desc: "Обсуждай задания с учениками в тематических треде — удобнее, чем переписка в чате.",
  },
  {
    icon: Clock,
    title: "Система приглашений",
    desc: "Подключай новых учеников по уникальной ссылке — быстро и без лишних шагов.",
  },
];

const stats = [
  { value: "100%", label: "цифровой документооборот" },
  { value: "0 руб", label: "комиссии с оплат" },
  { value: "∞", label: "учеников в системе" },
];

const steps = [
  { num: "01", title: "Зарегистрируйся", desc: "Создай аккаунт репетитора за 2 минуты" },
  { num: "02", title: "Пригласи учеников", desc: "Отправь персональную ссылку-приглашение" },
  { num: "03", title: "Работай эффективно", desc: "Занятия, ДЗ, оплаты — всё в одном месте" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">TutorSpace</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-primary transition-colors">Возможности</a>
            <a href="#how" className="hover:text-primary transition-colors">Как это работает</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Войти</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Начать бесплатно</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* gradient blobs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-violet-100 blur-[120px] opacity-60 -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-blue-100 blur-[100px] opacity-50 translate-y-1/4 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-violet-50 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Star className="w-4 h-4 fill-primary" />
              Платформа для частных репетиторов
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              Ведите уроки,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500">
                а не таблицы
              </span>
            </h1>
            <p className="text-xl text-gray-500 mb-10 max-w-xl leading-relaxed">
              TutorSpace автоматизирует всю рутину: расписание, домашние задания, оплаты и общение с учениками — в одном удобном месте.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register">
                <Button size="lg" className="gap-2 rounded-2xl h-14 px-8 text-base">
                  Попробовать бесплатно
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="rounded-2xl h-14 px-8 text-base">
                  Узнать больше
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-6xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-3 gap-6 max-w-xl">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-extrabold text-gray-900">{s.value}</div>
                <div className="text-sm text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Всё что нужно репетитору
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Никаких Excel-таблиц, WhatsApp-групп и разбросанных заметок. Только нужные инструменты.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="border-0 shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                    <f.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Как это работает</h2>
            <p className="text-gray-500 text-lg">Три шага до первого занятия на платформе</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.num} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gray-200 -translate-x-1/2 z-0" />
                )}
                <div className="relative z-10">
                  <div className="text-5xl font-extrabold text-violet-100 mb-4">{s.num}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-violet-600 to-blue-500">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">
            Готов попробовать?
          </h2>
          <p className="text-violet-100 text-lg mb-10 max-w-md mx-auto">
            Зарегистрируйся прямо сейчас — это бесплатно и займёт меньше минуты.
          </p>
          <Link to="/register">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 rounded-2xl h-14 px-10 text-base font-bold gap-2"
            >
              Создать аккаунт <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-700">TutorSpace</span>
          </div>
          <p className="text-sm text-gray-400">© 2026 TutorSpace. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}
