import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { type LucideIcon, LogOut, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import NotificationBell from "@/components/NotificationBell";

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
  const location = useLocation();
  const [collapsed, setCollapsed]       = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);

  const isTutor = user?.role === "tutor";
  const profileHref = isTutor ? "/dashboard/tutor/profile" : "/dashboard/student/profile";

  // Закрываем мобильное меню при навигации
  useEffect(() => {
    const timer = setTimeout(() => setMobileOpen(false), 0);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Блокируем скролл body при открытом меню на мобильном
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  const sidebarContent = (mobile = false) => (
    <aside className={cn(
      "h-full bg-white flex flex-col transition-all duration-300",
      "border-r-2 border-gray-100",
      !mobile && (collapsed ? "w-[72px]" : "w-64"),
      mobile && "w-72",
    )}>
      {/* Logo */}
      <div className={cn(
        "h-[70px] flex items-center px-4 border-b-2 border-gray-100 shrink-0",
        !mobile && collapsed ? "justify-center" : "gap-3"
      )}>
        <img src="/site-logo.png" alt="TutorSpace" className="w-9 h-9 object-contain shrink-0" />
        {(mobile || !collapsed) && (
          <span className="text-xl text-gray-900 tracking-tight" style={{ fontFamily: "'Finger Paint', cursive" }}>
            TutorSpace
          </span>
        )}
        {mobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-1.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Collapse toggle — только на десктопе */}
      {!mobile && (
        <button
          onClick={() => setCollapsed(v => !v)}
          className="absolute -right-4 top-20 w-8 h-8 bg-white border-2 border-gray-200 rounded-full hidden lg:flex items-center justify-center shadow-sm hover:shadow-md transition z-20"
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4 text-gray-400" />
            : <ChevronLeft  className="w-4 h-4 text-gray-400" />}
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href.split("/").length === 3}
            title={!mobile && collapsed ? item.label : undefined}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-colors",
              isActive
                ? "bg-violet-50 text-violet-700"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
              !mobile && collapsed && "justify-center px-3"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-violet-600" : "text-gray-400")} />
                {(mobile || !collapsed) && (
                  <span className={isActive ? "text-violet-700" : ""}>{item.label}</span>
                )}
                {(mobile || !collapsed) && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-600" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t-2 border-gray-100 shrink-0">
        <NotificationBell collapsed={!mobile && collapsed} />
        <div className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-xl",
          !mobile && collapsed && "justify-center"
        )}>
          <NavLink to={profileHref} title={!mobile && collapsed ? "Профиль" : undefined} className="shrink-0">
            {user?.photo ? (
              <img src={user.photo} alt={user.name}
                className="w-9 h-9 rounded-xl object-cover border-2 border-violet-200 hover:opacity-80 transition-opacity" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-black text-sm hover:bg-violet-200 transition-colors">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </NavLink>
          {(mobile || !collapsed) && (
            <>
              <NavLink to={profileHref} className="flex-1 min-w-0 hover:opacity-70 transition-opacity">
                <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-400">{isTutor ? "Репетитор" : "Ученик"}</p>
              </NavLink>
              <button onClick={handleLogout}
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                title="Выйти">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Мобильная кнопка-гамбургер ─────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-10 h-10 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* ── Мобильный drawer ────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Затемнение */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="relative h-full shadow-2xl">
            {sidebarContent(true)}
          </div>
        </div>
      )}

      {/* ── Десктопный sidebar ──────────────────────────────────────────── */}
      <div className="hidden lg:block h-screen sticky top-0 shrink-0 relative">
        {sidebarContent(false)}
      </div>
    </>
  );
}
