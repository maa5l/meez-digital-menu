import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/services/auth/auth.service";
import { ROUTES } from "@/config/app";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { adminRoleLabel } from "@/services/admin/admin.service";

const navItems = [
  { to: ROUTES.admin, label: "نظرة عامة", icon: LayoutDashboard, end: true },
  { to: ROUTES.adminCustomers, label: "العملاء", icon: Users },
];

export function AdminLayout({
  children,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  const { profile } = useAdminProfile();

  return (
    <div className="min-h-screen bg-secondary/40 flex" dir="rtl">
      <aside className="hidden lg:flex w-72 bg-card border-l border-border flex-col fixed inset-y-0 right-0">
        <div className="flex items-center gap-2 p-6 border-b border-border">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <div className="font-display font-bold">إدارة ميز</div>
            {profile && (
              <div className="text-xs text-muted-foreground">{adminRoleLabel(profile.role)}</div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Button variant="outline" className="w-full" asChild>
            <Link to={ROUTES.dashboard}>لوحة العميل</Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => void signOut().then(() => navigate(ROUTES.auth))}
          >
            <LogOut className="w-4 h-4 ml-2" />
            خروج
          </Button>
        </div>
      </aside>

      <main className="flex-1 lg:mr-72">
        <header className="bg-card border-b border-border px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-2xl">{title}</h1>
            {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
          </div>
          {action}
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
