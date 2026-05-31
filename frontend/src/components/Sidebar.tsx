import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { type LucideIcon } from "lucide-react";
import { GraduationCap, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import TutorSettingsModal from "@/components/TutorSettingsModal";

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

interface SidebarProps {
  items: NavItem[];
}

export default function Sidebar({ items }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  function handleLogout() {
    logout();
    navigate("/");
  }

  const isTutor = user?.role === "tutor";

  return (
    <>
      <aside className="w-64 bg-white border-r flex flex-col shrink-0">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">TutorSpace</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.label}
              to={item.href}
              end={item.href.split("/").length === 3} // exact match for root dashboard
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-violet-50 text-primary"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t space-y-1">
          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-gray-400">{isTutor ? "Репетитор" : "Ученик"}</p>
                {isTutor && user?.yoomoney_wallet && (
                  <span className="text-xs text-green-600 font-medium">· ЮMoney ✓</span>
                )}
              </div>
            </div>
          </div>

          {/* Settings (tutor only) */}
          {isTutor && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-gray-500 hover:text-primary hover:bg-violet-50"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-4 h-4" /> Настройки оплаты
            </Button>
          )}

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-gray-500 hover:text-red-500 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" /> Выйти
          </Button>
        </div>
      </aside>

      {showSettings && isTutor && (
        <TutorSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
