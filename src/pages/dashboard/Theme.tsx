import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LayoutGrid, Columns2, GalleryHorizontal, Minus, ExternalLink, Palette, Coffee, UtensilsCrossed } from "lucide-react";
import { useMenuSettings } from "@/hooks/useMenuSettings";
import { defaultMenuSettings } from "@/lib/mockData";
import { toast } from "sonner";

const Theme = () => {
  const [settings, update] = useMenuSettings();
  const reset = () => { update(defaultMenuSettings); toast.success("تمت إعادة الثيم للوضع الافتراضي"); };

  return (
    <DashboardLayout
      title="الثيم"
      subtitle="إدارة كاملة لأنواع المنيو، القوالب والألوان"
      action={<Button variant="outline" onClick={reset}>إعادة الافتراضي</Button>}
    >
      {/* نظرة عامة سريعة */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Stat icon={<UtensilsCrossed className="w-5 h-5" />} label="منيو المنتجات" value={settings.productTemplate === "grid" ? "بطاقات" : "تفاصيل"} />
        <Stat icon={<Coffee className="w-5 h-5" />} label="منيو المحاصيل" value={settings.cropsTemplate === "molo" ? "بطاقات بالعرض" : "مينيمال"} />
        <Stat icon={<Palette className="w-5 h-5" />} label="اللون المميّز" value={settings.accentColor.toUpperCase()} swatch={settings.accentColor} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* === منيو المنتجات === */}
        <Section
          title="منيو المنتجات"
          desc="عرض الأطباق والمشروبات للضيوف"
          previewHref="/menu?preview=1"
          previewLabel="معاينة منيو المنتجات"
        >
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
          <Palette3
            bg={settings.bgColor} text={settings.textColor} accent={settings.accentColor}
            onChange={(k, v) => update({ ...settings, [k]: v })}
          />
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/60">
            <div>
              <div className="font-bold text-primary text-sm">شريط حرق السعرات</div>
              <div className="text-xs text-muted-foreground">يظهر أعلى المنيو</div>
            </div>
            <Switch checked={settings.showBurnBar} onCheckedChange={(v) => update({ ...settings, showBurnBar: v })} />
          </div>
        </Section>

        {/* === منيو المحاصيل === */}
        <Section
          title="منيو محاصيل البن"
          desc="شاشة مخصّصة للكاشير لمعرفة المحاصيل"
          previewHref={`/menu?type=crops&tpl=${settings.cropsTemplate}&preview=1`}
          previewLabel="معاينة منيو المحاصيل"
        >
          <div className="grid grid-cols-2 gap-3">
            <TemplateCard
              active={settings.cropsTemplate === "molo"}
              icon={<GalleryHorizontal className="w-7 h-7" />}
              title="بطاقات بالعرض"
              desc="كاروسيل بطاقات أفقية تتحرك للعرض"
              onClick={() => update({ ...settings, cropsTemplate: "molo" })}
            />
            <TemplateCard
              active={settings.cropsTemplate === "pureshelf"}
              icon={<Minus className="w-7 h-7" />}
              title="مينيمال"
              desc="قائمة جانبية وعرض نصي مينمال نظيف"
              onClick={() => update({ ...settings, cropsTemplate: "pureshelf" })}
            />
          </div>
          <Palette3
            bg={settings.bgColor} text={settings.textColor} accent={settings.accentColor}
            onChange={(k, v) => update({ ...settings, [k]: v })}
          />
        </Section>
      </div>
    </DashboardLayout>
  );
};

const Stat = ({ icon, label, value, swatch }: { icon: React.ReactNode; label: string; value: string; swatch?: string }) => (
  <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center">{icon}</div>
    <div className="flex-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display font-bold text-primary">{value}</div>
    </div>
    {swatch && <span className="w-8 h-8 rounded-lg border border-border" style={{ background: swatch }} />}
  </div>
);

const Section = ({ title, desc, previewHref, previewLabel, children }: { title: string; desc: string; previewHref: string; previewLabel: string; children: React.ReactNode }) => (
  <div className="bg-card rounded-3xl border border-border p-6 space-y-5">
    <div>
      <h3 className="font-display font-bold text-xl text-primary">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
    {children}
    <a href={previewHref} target="_blank" rel="noreferrer"
      className="flex items-center justify-center gap-2 text-sm font-bold text-accent-foreground bg-accent/30 hover:bg-accent/50 rounded-xl py-3 transition-colors">
      <ExternalLink className="w-4 h-4" /> {previewLabel}
    </a>
  </div>
);

const Palette3 = ({ bg, text, accent, onChange }: { bg: string; text: string; accent: string; onChange: (k: "bgColor" | "textColor" | "accentColor", v: string) => void }) => (
  <div className="pt-4 border-t border-border space-y-2">
    <div className="text-xs font-bold text-muted-foreground">ألوان المنيو</div>
    <div className="grid grid-cols-3 gap-3">
      <ColorField label="الخلفية" value={bg} onChange={(v) => onChange("bgColor", v)} />
      <ColorField label="النص" value={text} onChange={(v) => onChange("textColor", v)} />
      <ColorField label="مميّز" value={accent} onChange={(v) => onChange("accentColor", v)} />
    </div>
  </div>
);

const TemplateCard = ({ active, icon, title, desc, onClick }: { active: boolean; icon: React.ReactNode; title: string; desc: string; onClick: () => void }) => (
  <button onClick={onClick}
    className={`p-5 rounded-2xl border-2 transition-all text-right ${active ? "border-accent bg-accent/10 shadow-gold" : "border-border hover:border-accent/40"}`}>
    <div className={`mb-3 ${active ? "text-accent-foreground" : "text-muted-foreground"}`}>{icon}</div>
    <div className="font-display font-bold text-primary">{title}</div>
    <div className="text-xs text-muted-foreground mt-1">{desc}</div>
  </button>
);

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <div className="mt-2 flex items-center gap-2 border border-border rounded-xl p-1.5">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" aria-label={label} />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent font-mono text-xs text-foreground outline-none uppercase" />
    </div>
  </div>
);

export default Theme;
