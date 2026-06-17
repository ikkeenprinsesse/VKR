import { LayoutDashboard, Calendar, BookOpen, MessageSquare, Users, BarChart3, UserCircle, MessagesSquare, CreditCard, Crown } from "lucide-react";

export const STUDENT_NAV = [
  { icon: LayoutDashboard, label: "Главная",    href: "/dashboard/student" },
  { icon: Calendar,        label: "Расписание", href: "/dashboard/student/schedule" },
  { icon: BookOpen,        label: "Задания",    href: "/dashboard/student/homework" },
  { icon: MessageSquare,   label: "Чат",        href: "/dashboard/student/chat" },
  { icon: CreditCard,      label: "Платежи",    href: "/dashboard/student/payments" },
  { icon: UserCircle,      label: "Профиль",    href: "/dashboard/student/profile" },
];

export const TUTOR_NAV = [
  { icon: LayoutDashboard, label: "Главная",    href: "/dashboard/tutor" },
  { icon: Calendar,        label: "Расписание", href: "/dashboard/tutor/schedule" },
  { icon: BookOpen,        label: "Задания",    href: "/dashboard/tutor/homework" },
  { icon: Users,           label: "Ученики",    href: "/dashboard/tutor/students" },
  { icon: MessageSquare,   label: "Чат",        href: "/dashboard/tutor/chat" },
  { icon: BarChart3,       label: "Финансы",    href: "/dashboard/tutor/payments" },
  { icon: MessagesSquare,  label: "Форум",       href: "/dashboard/tutor/forum" },
  { icon: Crown,           label: "Подписка",   href: "/dashboard/tutor/subscription" },
  { icon: UserCircle,      label: "Профиль",    href: "/dashboard/tutor/profile" },
];
