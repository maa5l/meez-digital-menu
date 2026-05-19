import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GalleryHorizontal, Minus, ExternalLink, Palette, Coffee, UtensilsCrossed, Sparkles, Upload, X, Star, ListChecks, LayoutTemplate } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useMenuSettings } from "@/hooks/useMenuSettings";
import { defaultMenuSettings, type MenuSettings } from "@/lib/mockData";
import { useVenueData } from "@/hooks/useVenueData";
import { toast } from "sonner";
import { processHeaderImageFile } from "@/lib/header-image";
import { HEADER_IMAGE_SPEC } from "@/lib/header-image-spec";

const Theme = () => {
  const [venue] = useVenueData();
  const [settings, update] = useMenuSettings();
  const { products, crops } = venue;
  const reset = () => { update(defaultMenuSettings); toast.success("تمت إعادة الثيم للوضع الافتراضي"); };

  const onUploadImage = (key: "bgImage" | "featuredImage" | "logoImage" | "headerImage") =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        if (key === "headerImage") {
          const loading = toast.loading("جاري معالجة الصورة…");
          try {
            const dataUrl = await processHeaderImageFile(file);
            update({ ...settings, headerImage: dataUrl });
            toast.success("تم رفع صورة الهيدر", { id: loading });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "تعذّر رفع الصورة", { id: loading });
            e.target.value = "";
            return;
          }
          e.target.value = "";
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          update({ ...settings, [key]: result });
          toast.success("تم رفع الصورة");
        };
        reader.onerror = () => toast.error("تعذّر قراءة الملف");
        reader.readAsDataURL(file);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "تعذّر رفع الصورة");
        e.target.value = "";
      }
    };

  return (
    <DashboardLayout
      title="الثيم"
      subtitle="إدارة كاملة لأنواع المنيو، القوالب والألوان"
      action={<Button variant="outline" onClick={reset}>إعادة الافتراضي</Button>}
    >
      {/* نظرة عامة سريعة */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Stat icon={<UtensilsCrossed className="w-5 h-5" />} label="منيو المنتجات" value={
          settings.productTemplate === "featured" ? "هيدر مميّز + بطاقات" :
          "هيدر مميّز + تفاصيل"
        } />
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
              active={settings.productTemplate === "featured"}
              icon={<Star className="w-7 h-7" />}
              title="مميّز + بطاقات"
              desc="هيدر منتج الشهر + شبكة بطاقات بصور كبيرة"
              onClick={() => update({ ...settings, productTemplate: "featured" })}
            />
            <TemplateCard
              active={settings.productTemplate === "detail"}
              icon={<ListChecks className="w-7 h-7" />}
              title="مميّز + تفاصيل"
              desc="بطاقة منتج كبيرة + قائمة جانبية"
              onClick={() => update({ ...settings, productTemplate: "detail" })}
            />
          </div>

          <HeaderCustomizeBlock
            settings={settings}
            update={update}
            onLogoUpload={onUploadImage("logoImage")}
            onHeaderImageUpload={onUploadImage("headerImage")}
          />

          <FeaturedBlock
            label="منتج مميّز في المنيو (اختياري)"
            options={products.map((p) => ({ value: p.id, label: p.name }))}
            value={settings.featuredProductId || ""}
            onChange={(v) => update({ ...settings, featuredProductId: v || undefined })}
          />

          <Palette3
            bg={settings.bgColor} text={settings.textColor} accent={settings.accentColor}
            onChange={(k, v) => update({ ...settings, [k]: v })}
          />
          <CardAndBg settings={settings} update={update} onBgUpload={onUploadImage("bgImage")} />
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

          {/* محصول الشهر */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-accent-foreground" /> محصول الشهر
            </div>
            <select
              value={settings.featuredCropId || ""}
              onChange={(e) => update({ ...settings, featuredCropId: e.target.value || undefined })}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
            >
              <option value="">— لا يوجد —</option>
              {crops.map((c) => <option key={c.id} value={c.id}>{c.beanName}</option>)}
            </select>
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

/* ---------- تخصيص الهيدر (مبسّط) ---------- */
const HeaderCustomizeBlock = ({
  settings,
  update,
  onLogoUpload,
  onHeaderImageUpload,
}: {
  settings: MenuSettings;
  update: (s: MenuSettings) => void;
  onLogoUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onHeaderImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="pt-4 border-t border-border space-y-3">
    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
      <LayoutTemplate className="w-3.5 h-3.5 text-accent-foreground" /> الهيدر
    </div>

    <UploadRow
      label="بانر الهيدر"
      hint={`JPG أو PNG — يُعاد القياس تلقائياً إلى ${HEADER_IMAGE_SPEC.recommendedWidth}×${HEADER_IMAGE_SPEC.recommendedHeight} بكسل (نسبة 6:1)`}
      preview={
        settings.headerImage ? (
          <img src={settings.headerImage} alt="" className="w-20 aspect-[6/1] rounded-lg object-contain border bg-muted" />
        ) : undefined
      }
      onUpload={onHeaderImageUpload}
      onClear={settings.headerImage ? () => update({ ...settings, headerImage: undefined }) : undefined}
    />
    <p className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
      <span className="font-bold text-foreground/80">ملاحظة:</span> صمّم البانر بعرض الشاشة (مثلاً آيباد أفقي). الحد الأدنى{" "}
      {HEADER_IMAGE_SPEC.minWidth}×{HEADER_IMAGE_SPEC.minHeight} بكسل. إن كان البانر يحتوي شعاراً أو نصاً جاهزاً، اترك «عنوان الهيدر»
      فارغاً — وإلا سيظهر العنوان فوق الصورة.
    </p>

    <UploadRow
      label="الشعار"
      hint="اختياري"
      preview={
        settings.logoImage ? (
          <img src={settings.logoImage} alt="" className="h-9 w-auto max-w-[72px] object-contain border rounded-lg p-0.5" />
        ) : undefined
      }
      onUpload={onLogoUpload}
      onClear={settings.logoImage ? () => update({ ...settings, logoImage: undefined }) : undefined}
    />

    <div>
      <Label className="text-xs">عنوان الهيدر (اختياري)</Label>
      <Input
        value={settings.featuredTitle || ""}
        onChange={(e) => update({ ...settings, featuredTitle: e.target.value || undefined })}
        placeholder="مثال: مشروب الصيف"
        className="mt-1 h-9 text-sm"
        disabled={Boolean(settings.headerImage)}
      />
      {settings.headerImage && (
        <p className="text-[10px] text-muted-foreground mt-1">معطّل — البانر يحتوي نصاً جاهزاً</p>
      )}
    </div>

    <div className="flex flex-wrap gap-2">
      <ToggleChip
        label="زر اللغة"
        checked={settings.showLanguageToggle !== false}
        onChange={(v) => update({ ...settings, showLanguageToggle: v })}
      />
    </div>
    <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
      <p className="text-xs font-bold text-primary">إفصاح السعرات (إلزامي)</p>
      <ColorField
        label="لون النص والأيقونات"
        value={settings.calorieTextColor || settings.textColor}
        onChange={(v) => update({ ...settings, calorieTextColor: v })}
      />
      {settings.calorieTextColor && (
        <button
          type="button"
          onClick={() => update({ ...settings, calorieTextColor: undefined })}
          className="text-[10px] font-bold text-muted-foreground hover:text-primary"
        >
          إعادة لون النص الافتراضي
        </button>
      )}
    </div>
  </div>
);

const UploadRow = ({
  label,
  hint,
  preview,
  onUpload,
  onClear,
}: {
  label: string;
  hint?: string;
  preview?: ReactNode;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
}) => (
  <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
    <div className="text-xs font-bold text-primary">{label}</div>
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    <div className="flex items-center gap-2">
      {preview ?? <span className="text-[10px] text-muted-foreground">—</span>}
      <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold bg-card hover:bg-card/80 rounded-lg py-2 border border-border">
        <Upload className="w-3.5 h-3.5" /> رفع
        <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </label>
      {onClear && (
        <button type="button" onClick={onClear} className="p-2 rounded-lg bg-destructive/10 text-destructive" aria-label="حذف">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
);

const ToggleChip = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`px-3 py-2 rounded-full text-xs font-bold border transition-colors ${
      checked ? "bg-accent text-accent-foreground border-accent" : "bg-card text-muted-foreground border-border"
    }`}
  >
    {label}
  </button>
);

const FeaturedBlock = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="pt-4 border-t border-border space-y-2">
    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
      <Sparkles className="w-3.5 h-3.5 text-accent-foreground" /> منتج مميّز
    </div>
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
      >
        <option value="">— لا يوجد —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  </div>
);

/* ---------- Card color + background image ---------- */
const CardAndBg = ({
  settings, update, onBgUpload,
}: {
  settings: MenuSettings;
  update: (s: MenuSettings) => void;
  onBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="pt-4 border-t border-border space-y-3">
    <div className="text-xs font-bold text-muted-foreground">الخلفية والبطاقات</div>
    <div className="grid grid-cols-2 gap-3">
      <ColorField label="لون البطاقات" value={settings.cardColor || "#ededed"} onChange={(v) => update({ ...settings, cardColor: v })} />
      <div>
        <Label className="text-xs">صورة خلفية المنيو</Label>
        <div className="mt-2 flex items-center gap-2">
          {settings.bgImage && <img src={settings.bgImage} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />}
          <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 text-xs font-bold bg-secondary hover:bg-secondary/80 rounded-xl py-2.5 transition-colors">
            <Upload className="w-4 h-4" /> {settings.bgImage ? "تغيير" : "رفع"}
            <input type="file" accept="image/*" className="hidden" onChange={onBgUpload} />
          </label>
          {settings.bgImage && (
            <button onClick={() => update({ ...settings, bgImage: undefined })} className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20" aria-label="حذف">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

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
