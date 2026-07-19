import { ReactNode, useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FolderTree, UtensilsCrossed, MonitorSmartphone, CreditCard, LogOut, Settings, Coffee, Palette, Tablet, Menu, X } from "lucide-react";
import { isIpadTrialMode } from "@/config/ipad-trial";
import { Logo } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { signOut } from "@/services/auth/auth.service";
import { ROUTES } from "@/config/app";
import { useSubscription, useSyncVenueSubscription } from "@/hooks/useSubscription";
import { SubscriptionBanner } from "@/components/subscription/SubscriptionBanner";

const navItems = [
  { to: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard, end: true },
  { to: "/dashboard/categories", label: "التصنيفات", icon: FolderTree },
  { to: "/dashboard/products", label: "المنتجات", icon: UtensilsCrossed },
  { to: "/dashboard/crops", label: "محاصيل البن", icon: Coffee },
  { to: "/dashboard/theme", label: "الثيم", icon: Palette },
  { to: "/dashboard/devices", label: "الأجهزة", icon: MonitorSmartphone },
  {
    to: "/dashboard/link-device",
    label: isIpadTrialMode ? "تطبيق الآيباد" : "كود التحقق",
    icon: Tablet,
  },
  { to: "/dashboard/subscription", label: "الاشتراك", icon: CreditCard },
  { to: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

function DashboardNavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav className={className}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
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
  );
}

const DashboardLayout = ({
  children,
  title,
  subtitle,
  action,
  hideSubscriptionBanner = false,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** إخفاء banner العام (صفحة الاشتراك تعرض تنبيهاتها الخاصة) */
  hideSubscriptionBanner?: boolean;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { access } = useSubscription();
  useSyncVenueSubscription();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const closeMobileNav = () => setMobileNavOpen(false);

  const handleSignOut = async () => {
    await signOut();
    navigate(ROUTES.auth);
  };

  return (
    <div className="min-h-screen bg-secondary/40 flex flex-col lg:flex-row" dir="rtl">
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-primary touch-manipulation"
          onClick={() => setMobileNavOpen(true)}
          aria-label="فتح القائمة"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-8 w-auto aspect-[1031/736] text-primary" />
        </Link>
        <div className="w-10" aria-hidden />
      </header>

      {mobileNavOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            aria-label="إغلاق القائمة"
            onClick={closeMobileNav}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[88vw] flex-col border-l border-border bg-card lg:hidden">
            <div className="flex items-center justify-between border-b border-border p-4">
              <Link to="/" className="flex items-center gap-2" onClick={closeMobileNav}>
                <Logo className="h-8 w-auto aspect-[1031/736] text-primary" />
              </Link>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary"
                onClick={closeMobileNav}
                aria-label="إغلاق القائمة"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <DashboardNavLinks
              className="flex-1 space-y-1 overflow-y-auto p-4"
              onNavigate={closeMobileNav}
            />

            <div className="border-t border-border p-4">
              <button
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-primary"
              >
                <LogOut className="w-5 h-5" />
                تسجيل الخروج
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 bg-card border-l border-border flex-col fixed inset-y-0 right-0">
        <Link to="/" className="flex items-center gap-2 p-6 border-b border-border">
          <Logo className="h-9 w-auto aspect-[1031/736] text-primary" />
        </Link>

        <DashboardNavLinks className="flex-1 p-4 space-y-1" />

        <div className="p-4 border-t border-border">
          <button
            onClick={() => void handleSignOut()}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary hover:text-primary w-full font-semibold transition-all"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:mr-72 p-4 sm:p-6 md:p-10">
        {!hideSubscriptionBanner && access.banner !== "trial" && (
          <SubscriptionBanner access={access} />
        )}
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