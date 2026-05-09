import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Riyal } from "@/components/Brand";

const perks = [
  "عدد غير محدود من المنتجات والتصنيفات",
  "نوعا عرض: Split View و Grid Cards",
  "تحديث فوري لجميع الأجهزة",
  "إدارة كاملة للأجهزة والشاشات",
  "تحديثات مستمرة ومميزات جديدة",
  "دعم فني باللغة العربية",
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 md:py-32 bg-background">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-accent font-bold mb-3 tracking-wide">الأسعار</span>
          <h2 className="font-display font-black text-4xl md:text-5xl text-primary mb-4">
            تسعير بسيط وعادل
          </h2>
          <p className="text-lg text-muted-foreground">
            ادفع فقط مقابل عدد الشاشات التي تستخدمها — بدون رسوم خفية.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="relative rounded-[2rem] overflow-hidden bg-gradient-hero p-1 shadow-warm">
            <div className="absolute inset-0 bg-gradient-gold opacity-20 animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
            <div className="relative bg-gradient-hero rounded-[1.85rem] p-10 md:p-14 text-primary-foreground">
              <div className="flex items-start justify-between flex-wrap gap-6 mb-8">
                <div>
                  <div className="inline-block bg-accent/20 border border-accent/40 text-accent rounded-full px-4 py-1 text-sm font-bold mb-4">
                    الباقة الأساسية
                  </div>
                  <h3 className="font-display font-black text-3xl mb-2">شاشة واحدة</h3>
                  <p className="text-primary-foreground/70">مثالية لكل فرع — أضف شاشات حسب حاجتك</p>
                </div>
                <div className="text-left">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display font-black text-6xl text-gradient-gold">٤٥</span>
                    <span className="text-primary-foreground/80 text-lg inline-flex items-center"><Riyal /></span>
                  </div>
                  <div className="text-sm text-primary-foreground/60">شهريًا / للشاشة</div>
                </div>
              </div>

              <div className="h-px bg-primary-foreground/10 my-8" />

              <ul className="grid sm:grid-cols-2 gap-4 mb-10">
                {perks.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </span>
                    <span className="text-primary-foreground/90">{p}</span>
                  </li>
                ))}
              </ul>

              <Link to="/auth">
                <Button variant="hero" size="xl" className="w-full">
                  ابدأ تجربتك المجانية ١٤ يوم
                </Button>
              </Link>
              <p className="text-center text-sm text-primary-foreground/60 mt-4">
                بدون بطاقة ائتمان · ألغِ متى تشاء
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;