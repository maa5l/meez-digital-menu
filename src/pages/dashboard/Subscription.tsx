import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { subscription } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Calendar, Receipt } from "lucide-react";

const invoices = [
  { id: "INV-001", date: "15 أبريل 2026", amount: 135, status: "مدفوعة" },
  { id: "INV-002", date: "15 مارس 2026", amount: 90, status: "مدفوعة" },
  { id: "INV-003", date: "15 فبراير 2026", amount: 90, status: "مدفوعة" },
];

const Subscription = () => {
  const total = subscription.screens * subscription.pricePerScreen;

  return (
    <DashboardLayout title="الاشتراك" subtitle="إدارة باقتك وفواتيرك">
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-gradient-hero rounded-3xl p-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative">
            <div className="text-primary-foreground/70 text-sm mb-1">باقتك الحالية</div>
            <h2 className="font-display font-black text-3xl mb-6">{subscription.plan}</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8">
              <div>
                <div className="text-primary-foreground/60 text-xs mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> الإجمالي الشهري</div>
                <div className="font-display font-black text-3xl text-gradient-gold">{total} <span className="text-base text-primary-foreground/60">ر.س</span></div>
              </div>
              <div>
                <div className="text-primary-foreground/60 text-xs mb-1">الشاشات</div>
                <div className="font-display font-black text-3xl">{subscription.screens}</div>
              </div>
              <div>
                <div className="text-primary-foreground/60 text-xs mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> التجديد القادم</div>
                <div className="font-display font-bold text-lg">{subscription.renewsOn}</div>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button variant="hero">رفع الباقة</Button>
              <Button variant="heroOutline" className="text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10">إدارة بطاقة الدفع</Button>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border">
          <h3 className="font-display font-bold text-lg text-primary mb-4">ما تحصل عليه</h3>
          <ul className="space-y-3">
            {["منتجات وتصنيفات لا محدودة", "تحديث فوري على كل الشاشات", "نوعا عرض (Split / Grid)", "دعم فني عربي", "تحديثات مستمرة"].map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-accent" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-card rounded-3xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-2">
          <Receipt className="w-5 h-5 text-accent" />
          <h3 className="font-display font-bold text-lg text-primary">الفواتير السابقة</h3>
        </div>
        <div className="divide-y divide-border">
          {invoices.map((inv) => (
            <div key={inv.id} className="p-4 px-6 flex items-center justify-between hover:bg-secondary/40 transition-colors">
              <div>
                <div className="font-display font-bold text-primary">{inv.id}</div>
                <div className="text-xs text-muted-foreground">{inv.date}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-display font-black text-primary">{inv.amount} ر.س</span>
                <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-700 text-xs font-bold">{inv.status}</span>
                <Button variant="ghost" size="sm">تنزيل</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Subscription;