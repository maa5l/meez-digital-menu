import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useVenueData } from "@/hooks/useVenueData";
import { useUserProfile } from "@/hooks/useUserProfile";
import { FolderTree, UtensilsCrossed, MonitorSmartphone, TrendingUp, ArrowUpRight } from "lucide-react";
import { Riyal } from "@/components/Brand";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Overview = () => {
  const [venue] = useVenueData();
  const { profile } = useUserProfile();
  const { categories, products, devices, subscription } = venue;
  const displayName =
    profile?.venueName?.trim() || venue.menuSettings.featuredTitle?.trim() || "منشأتك";

  const stats = [
    { label: "التصنيفات", value: categories.length, icon: FolderTree, color: "bg-blue-500/10 text-blue-600" },
    { label: "المنتجات", value: products.length, icon: UtensilsCrossed, color: "bg-accent/15 text-accent" },
    {
      label: "الشاشات النشطة",
      value: devices.filter((d) => d.status === "active").length,
      icon: MonitorSmartphone,
      color: "bg-green-500/10 text-green-600",
    },
  ];

  return (
    <DashboardLayout
      title="نظرة عامة"
      subtitle={`مرحبًا بك في ${displayName} — إليك ما يجري في منشأتك`}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-6 border border-border hover:shadow-soft transition-all">
            <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center mb-4`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-3xl font-display font-black text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-hero rounded-3xl p-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-primary-foreground/70 text-sm mb-1">حالة الاشتراك</div>
                <div className="font-display font-black text-2xl">{subscription.plan}</div>
              </div>
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-bold border border-green-500/30">
                {subscription.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-primary-foreground/60 text-xs mb-1">الشاشات</div>
                <div className="font-display font-black text-xl">
                  {devices.length} / {subscription.maxScreens}
                </div>
              </div>
              <div>
                <div className="text-primary-foreground/60 text-xs mb-1">السعر / شاشة</div>
                <div className="font-display font-black text-xl">
                  {subscription.pricePerScreen} <Riyal />
                </div>
              </div>
              <div>
                <div className="text-primary-foreground/60 text-xs mb-1">التجربة</div>
                <div className="font-display font-black text-xl">{subscription.daysLeft} يوم</div>
              </div>
            </div>

            <Link to="/dashboard/subscription">
              <Button variant="hero" size="lg">
                إدارة الاشتراك
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border">
          <h3 className="font-display font-bold text-lg text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            إجراءات سريعة
          </h3>
          <div className="space-y-2">
            <Link to="/dashboard/products" className="block p-3 rounded-xl hover:bg-secondary transition-colors font-semibold text-primary">
              + أضف منتج جديد
            </Link>
            <Link to="/dashboard/categories" className="block p-3 rounded-xl hover:bg-secondary transition-colors font-semibold text-primary">
              + أنشئ تصنيف
            </Link>
            <Link to="/dashboard/link-device" className="block p-3 rounded-xl hover:bg-secondary transition-colors font-semibold text-primary">
              + كود تحقق لشاشة جديدة
            </Link>
            <Link to="/menu?preview=1" className="block p-3 rounded-xl hover:bg-secondary transition-colors font-semibold text-accent">
              ↗ عاين المنيو
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Overview;
