import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutGrid, Columns2 } from "lucide-react";
import { useEffect, useState } from "react";

const Settings = () => {
  const [layout, setLayout] = useState<"grid" | "split">("grid");

  useEffect(() => {
    const saved = localStorage.getItem("qaemah-template") as "grid" | "split" | null;
    if (saved) setLayout(saved);
  }, []);

  const choose = (k: "grid" | "split") => {
    setLayout(k);
    localStorage.setItem("qaemah-template", k);
  };

  return (
    <DashboardLayout title="الإعدادات" subtitle="خصص منشأتك وطريقة عرض المنيو">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-3xl border border-border p-6">
          <h3 className="font-display font-bold text-xl text-primary mb-4">معلومات المنشأة</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم المنشأة</Label>
              <Input defaultValue="مقهى الواحة" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" defaultValue="owner@waha.cafe" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>رقم الجوال</Label>
              <Input dir="ltr" defaultValue="+966 50 000 0000" className="h-12 rounded-xl text-right" />
            </div>
            <Button variant="hero">حفظ التغييرات</Button>
          </div>
        </div>

        <div className="bg-card rounded-3xl border border-border p-6">
          <h3 className="font-display font-bold text-xl text-primary mb-2">نوع عرض المنيو</h3>
          <p className="text-sm text-muted-foreground mb-4">سيُطبّق على كل الشاشات المرتبطة</p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => choose("grid")}
              className={`p-5 rounded-2xl border-2 transition-all text-right ${
                layout === "grid" ? "border-accent bg-accent/5 shadow-gold" : "border-border hover:border-accent/40"
              }`}
            >
              <LayoutGrid className={`w-7 h-7 mb-3 ${layout === "grid" ? "text-accent" : "text-muted-foreground"}`} />
              <div className="font-display font-bold text-primary">القالب ١ — البطاقات</div>
              <div className="text-xs text-muted-foreground mt-1">شبكة بطاقات نظيفة بصور كبيرة</div>
            </button>
            <button
              onClick={() => choose("split")}
              className={`p-5 rounded-2xl border-2 transition-all text-right ${
                layout === "split" ? "border-accent bg-accent/5 shadow-gold" : "border-border hover:border-accent/40"
              }`}
            >
              <Columns2 className={`w-7 h-7 mb-3 ${layout === "split" ? "text-accent" : "text-muted-foreground"}`} />
              <div className="font-display font-bold text-primary">القالب ٢ — التفاصيل</div>
              <div className="text-xs text-muted-foreground mt-1">بانر مشروب الموسم + قائمة وتفاصيل</div>
            </button>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-secondary text-sm">
            <div className="font-bold text-primary mb-1">المعاينة</div>
            <p className="text-muted-foreground text-xs">افتح <a href="/menu" className="text-accent font-semibold hover:underline">/menu</a> لرؤية المنيو على الجهاز.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;