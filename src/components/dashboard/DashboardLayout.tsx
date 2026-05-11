import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FolderTree, UtensilsCrossed, MonitorSmartphone, CreditCard, LogOut, Settings, Coffee, Palette } from "lucide-react";
import { Logo } from "@/components/Brand";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard, end: true },
  { to: "/dashboard/categories", label: "التصنيفات", icon: FolderTree },
  { to: "/dashboard/products", label: "المنتجات", icon: UtensilsCrossed },
  { to: "/dashboard/crops", label: "محاصيل البن", icon: Coffee },
  { to: "/dashboard/theme", label: "الثيم", icon: Palette },
  { to: "/dashboard/devices", label: "الأجهزة", icon: MonitorSmartphone },
  { to: "/dashboard/subscription", label: "الاشتراك", icon: CreditCard },
  { to: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

const DashboardLayout = ({ children, title, subtitle, action }: { children: ReactNode; title: string; subtitle?: string; action?: ReactNode }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary/40 flex" dir="rtl">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 bg-card border-l border-border flex-col fixed inset-y-0 right-0">
        <Link to="/" className="flex items-center gap-2 p-6 border-b border-border">
          <Logo className="h-9 w-auto aspect-[1031/736] text-primary" />
        </Link>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-gold text-primary shadow-gold"
                    : "text-muted-foreground hover:bg-secondary hover:text-primary"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="bg-gradient-hero rounded-2xl p-4 text-primary-foreground mb-3">
            <div className="text-xs text-primary-foreground/70 mb-1">تنتهي التجربة خلال</div>
            <div className="font-display font-black text-2xl mb-2">21 يوم</div>
            <Button variant="hero" size="sm" className="w-full">رقّي الاشتراك</Button>
          </div>
          <button
            onClick={() => navigate("/auth")}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary hover:text-primary w-full font-semibold transition-all"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:mr-72 p-6 md:p-10">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-display font-black text-3xl md:text-4xl text-primary">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;