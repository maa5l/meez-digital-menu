import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LayoutGrid, Columns2, Bike, Sparkles, ExternalLink } from "lucide-react";
import { useMenuSettings } from "@/hooks/useMenuSettings";
import { defaultMenuSettings } from "@/lib/mockData";
import { toast } from "sonner";

const Settings = () => {
  const [settings, update] = useMenuSettings();

  const reset = () => {
    update(defaultMenuSettings);
    toast.success("تمت إعادة الإعدادات للوضع الافتراضي");
  };

  return (
    <DashboardLayout
      title="الإعدادات"
      subtitle="خصّص منشأتك وألوان وقوالب منيو الكاشير"
      action={
        <Button variant="outline" onClick={reset}>إعادة الافتراضي</Button>
      }
    >
      <div className="grid lg:grid-cols-2 gap-6">
        {/* === معلومات المنشأة === */}
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

        {/* === ألوان المنيو === */}
        <div className="bg-card rounded-3xl border border-border p-6">
          <h3 className="font-display font-bold text-xl text-primary mb-1">ألوان المنيو</h3>
          <p className="text-sm text-muted-foreground mb-5">تنطبق على كل شاشات الفرع فوراً</p>

          <div className="grid grid-cols-3 gap-4">
            <ColorField label="لون الخلفية" value={settings.bgColor} onChange={(v) => update({ ...settings, bgColor: v })} />
            <ColorField label="لون النص" value={settings.textColor} onChange={(v) => update({ ...settings, textColor: v })} />
            <ColorField label="اللون المميّز" value={settings.accentColor} onChange={(v) => update({ ...settings, accentColor: v })} />
          </div>

          <div className="mt-6 flex items-center justify-between p-4 rounded-2xl bg-secondary">
            <div>
              <div className="font-bold text-primary text-sm">شريط حرق السعرات</div>
              <div className="text-xs text-muted-foreground">يظهر في أعلى منيو المنتجات</div>
            </div>
            <Switch
              checked={settings.showBurnBar}
              onCheckedChange={(v) => update({ ...settings, showBurnBar: v })}
            />
          </div>

          {/* Mini preview */}
          <div
            className="mt-4 rounded-2xl p-4 border"
            style={{ background: settings.bgColor, color: settings.textColor, borderColor: `${settings.accentColor}80` }}
          >
            <div className="text-xs opacity-70 mb-2">معاينة سريعة</div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: settings.accentColor, color: "#1a1a1a" }}>
                تصنيف
              </span>
              <span className="text-sm font-bold">عنوان نموذجي</span>
            </div>
          </div>
        </div>

        {/* === قالب المنتجات === */}
        <div className="bg-card rounded-3xl border border-border p-6">
          <h3 className="font-display font-bold text-xl text-primary mb-1">قالب منيو المنتجات</h3>
          <p className="text-sm text-muted-foreground mb-4">اختر شكل عرض المنتجات على الجهاز</p>

          <div className="grid grid-cols-2 gap-3">
            <TemplateCard
              active={settings.productTemplate === "grid"}
              icon={<LayoutGrid className="w-7 h-7" />}
              title="البطاقات"
              desc="شبكة بطاقات نظيفة بصور كبيرة"
              onClick={() => update({ ...settings, productTemplate: "grid" })}
            />
            <TemplateCard
              active={settings.productTemplate === "split"}
              icon={<Columns2 className="w-7 h-7" />}
              title="التفاصيل"
              desc="بانر مشروب الموسم + قائمة وتفاصيل"
              onClick={() => update({ ...settings, productTemplate: "split" })}
            />
          </div>

          <a
            href="/menu"
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-accent-foreground bg-accent/30 hover:bg-accent/50 rounded-xl py-3 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            معاينة منيو المنتجات على الجهاز
          </a>
        </div>

        {/* === قالب المحاصيل === */}
        <div className="bg-card rounded-3xl border border-border p-6">
          <h3 className="font-display font-bold text-xl text-primary mb-1">قالب منيو محاصيل البن</h3>
          <p className="text-sm text-muted-foreground mb-4">شاشة مخصصة للكاشير لمعرفة محاصيل القهوة</p>

          <div className="grid grid-cols-2 gap-3">
            <TemplateCard
              active={settings.cropsTemplate === "molo"}
              icon={<Bike className="w-7 h-7" />}
              title="ميني‍مال — Molo"
              desc="نص ثنائي اللغة بفاصل عمودي وأيقونة دراجة"
              onClick={() => update({ ...settings, cropsTemplate: "molo" })}
            />
            <TemplateCard
              active={settings.cropsTemplate === "pureshelf"}
              icon={<Sparkles className="w-7 h-7" />}
              title="إيلوستريشن — Pure Shelf"
              desc="رسومات بحرية مرحة وصورة كيس البن"
              onClick={() => update({ ...settings, cropsTemplate: "pureshelf" })}
            />
          </div>

          <a
            href="/menu?type=crops"
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-accent-foreground bg-accent/30 hover:bg-accent/50 rounded-xl py-3 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            معاينة منيو المحاصيل على الجهاز
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
};

const TemplateCard = ({
  active, icon, title, desc, onClick,
}: { active: boolean; icon: React.ReactNode; title: string; desc: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`p-5 rounded-2xl border-2 transition-all text-right ${
      active ? "border-accent bg-accent/10 shadow-gold" : "border-border hover:border-accent/40"
    }`}
  >
    <div className={`mb-3 ${active ? "text-accent-foreground" : "text-muted-foreground"}`}>{icon}</div>
    <div className="font-display font-bold text-primary">{title}</div>
    <div className="text-xs text-muted-foreground mt-1">{desc}</div>
  </button>
);

const ColorField = ({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <div className="mt-2 flex items-center gap-2 border border-border rounded-xl p-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
        aria-label={label}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent font-mono text-xs text-foreground outline-none uppercase"
      />
    </div>
  </div>
);

export default Settings;