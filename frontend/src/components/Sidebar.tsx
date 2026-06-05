import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { type LucideIcon, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

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
  const [collapsed, setCollapsed] = useState(false);

  const isTutor = user?.role === "tutor";
  const profileHref = isTutor ? "/dashboard/tutor/profile" : "/dashboard/student/profile";

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <>
      <aside className={cn(
        "h-screen bg-white flex flex-col sticky top-0 shrink-0 transition-all duration-300",
        "border-r-2 border-gray-100",
        collapsed ? "w-[72px]" : "w-64"
      )}>

        {/* Logo */}
        <div className={cn(
          "h-[70px] flex items-center px-4 border-b-2 border-gray-100",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <img src="/site-logo.png" alt="TutorSpace" className="w-9 h-9 object-contain shrink-0" />
          {!collapsed && (
            <span className="text-xl text-gray-900 tracking-tight" style={{ fontFamily: "'Finger Paint', cursive" }}>TutorSpace</span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="absolute -right-4 top-20 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition z-20"
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4 text-gray-400" />
            : <ChevronLeft  className="w-4 h-4 text-gray-400" />}
        </button>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href.split("/").length === 3}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-colors",
                isActive
                  ? "bg-violet-50 text-violet-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
                collapsed && "justify-center px-3"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn(
                    "w-5 h-5 shrink-0",
                    isActive ? "text-violet-600" : "text-gray-400"
                  )} />
                  {!collapsed && (
                    <span className={isActive ? "text-violet-700" : ""}>{item.label}</span>
                  )}
                  {!collapsed && isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-600" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: avatar → profile link */}
        <div className="p-3 border-t-2 border-gray-100">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl",
            collapsed && "justify-center"
          )}>
            <NavLink
              to={profileHref}
              title={collapsed ? "Профиль" : undefined}
              className="shrink-0"
            >
              {user?.photo ? (
                <img
                  src={user.photo}
                  alt={user.name}
                  className="w-9 h-9 rounded-xl object-cover border-2 border-violet-200 hover:opacity-80 transition-opacity"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-black text-sm hover:bg-violet-200 transition-colors">
                  {user?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </NavLink>
            {!collapsed && (
              <>
                <NavLink to={profileHref} className="flex-1 min-w-0 hover:opacity-70 transition-opacity">
                  <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400">{isTutor ? "Репетитор" : "Ученик"}</p>
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  title="Выйти"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
