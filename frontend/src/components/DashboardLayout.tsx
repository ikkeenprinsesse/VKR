import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  items: NavItem[];
}

export default function DashboardLayout({ children, items }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar items={items} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
