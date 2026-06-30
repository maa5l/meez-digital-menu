import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ThemeEditorNav, ThemeEditorNavMobile } from "@/components/dashboard/theme/ThemeEditorNav";
import {
  AdvancedCollapsible,
  ColorPickerField,
  ImageUploadField,
  TemplateOptionCard,
  ToggleChip,
} from "@/components/dashboard/theme/ThemeFields";
import { ThemePreviewFrame, ThemePreviewOrientationToggle, type PreviewOrientation } from "@/components/dashboard/theme/ThemePreviewFrame";
import { ThemeCard, ThemeFieldGroup, ThemeSectionPanel } from "@/components/dashboard/theme/ThemeSectionPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import {
  getCropsHeaderCustomization,
  getProductsHeaderCustomization,
} from "@/lib/menu-header-settings";
import {
  HEADER_IMAGE_SPEC,
  formatHeaderImageDisplayLabel,
  formatHeaderImageSpecLabel,
} from "@/lib/header-image-spec";
import { useThemeEditor } from "@/pages/dashboard/theme/useThemeEditor";
import { THEME_SECTIONS, type ThemeSectionId } from "@/pages/dashboard/theme/theme-sections";
import {
  Coffee,
  ExternalLink,
  GalleryHorizontal,
  ListChecks,
  Loader2,
  Minus,
  Palette,
  RotateCcw,
  Save,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import { useMemo, useState } from "react";

const Theme = () => {
  const editor = useThemeEditor();
  const [section, setSection] = useState<ThemeSectionId>("overview");
  const [previewOrientation, setPreviewOrientation] = useState<PreviewOrientation>("landscape");

  const productsHeader = getProductsHeaderCustomization(editor.settings);
  const cropsHeader = getCropsHeaderCustomization(editor.settings);

  const productsPreviewUrl = "/menu?preview=1";
  const cropsPreviewUrl = "/menu?type=crops&preview=1";

  const sectionMeta = THEME_SECTIONS.find((s) => s.id === section)!;

  const showSidePreview = section !== "preview";

  return (
    <SubscriptionGuard requireEdit>
      <DashboardLayout
        title="تخصيص المنيو"
        subtitle="صمّم مظهر منيو المنتجات والمحاصيل"
        hideSubscriptionBanner={false}
      >
        {/* شريط علوي ثابت */}
        <div className="sticky top-0 z-30 -mx-6 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-6 py-3 backdrop-blur-md md:-mx-10 md:px-10 md:py-4">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-black text-primary md:text-xl">{sectionMeta.label}</p>
            <p className="truncate text-xs text-muted-foreground">{sectionMeta.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 touch-manipulation" asChild>
              <a href={productsPreviewUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                معاينة
              </a>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 touch-manipulation" onClick={editor.reset}>
              <RotateCcw className="h-3.5 w-3.5" />
              إعادة الافتراضي
            </Button>
            <Button
              variant="hero"
              size="sm"
              className="gap-1.5 touch-manipulation"
              onClick={() => void editor.onSave()}
              disabled={!editor.dirty || editor.saving}
            >
              {editor.saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جاري الحفظ…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  حفظ
                </>
              )}
            </Button>
          </div>
        </div>

        {/* تنقّل أفقي — آيباد */}
        <ThemeEditorNavMobile active={section} onSelect={setSection} className="mb-4 md:hidden" />

        <div className="flex min-h-0 flex-col gap-5 lg:flex-row lg:items-start">
          {/* شريط جانبي — سطح مكتب / آيباد أفقي */}
          <ThemeEditorNav active={section} onSelect={setSection} className="hidden md:flex" />

          <div className="min-w-0 flex-1 space-y-5">
            <ThemeSectionContent
              section={section}
              editor={editor}
              productsHeader={productsHeader}
              cropsHeader={cropsHeader}
              productsPreviewUrl={productsPreviewUrl}
              cropsPreviewUrl={cropsPreviewUrl}
              previewOrientation={previewOrientation}
              onPreviewOrientationChange={setPreviewOrientation}
            />
          </div>

          {showSidePreview && (
            <div className="hidden w-full shrink-0 xl:block xl:w-auto">
              <div className="sticky top-[5.5rem] flex justify-center">
                <ThemePreviewFrame
                  activeSection={section}
                  productsPreviewUrl={productsPreviewUrl}
                  cropsPreviewUrl={cropsPreviewUrl}
                  orientation={previewOrientation}
                  onOrientationChange={setPreviewOrientation}
                />
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </SubscriptionGuard>
  );
};

type Editor = ReturnType<typeof useThemeEditor>;

function ThemeSectionContent({
  section,
  editor,
  productsHeader,
  cropsHeader,
  productsPreviewUrl,
  cropsPreviewUrl,
  previewOrientation,
  onPreviewOrientationChange,
}: {
  section: ThemeSectionId;
  editor: Editor;
  productsHeader: ReturnType<typeof getProductsHeaderCustomization>;
  cropsHeader: ReturnType<typeof getCropsHeaderCustomization>;
  productsPreviewUrl: string;
  cropsPreviewUrl: string;
  previewOrientation: PreviewOrientation;
  onPreviewOrientationChange: (o: PreviewOrientation) => void;
}) {
  const { settings, update, products, crops, productsColors, cropsColors } = editor;

  switch (section) {
    case "overview":
      return (
        <ThemeSectionPanel title="نظرة عامة" description="ملخص سريع لإعدادات المنيو الحالية">
          <div className="grid gap-4 sm:grid-cols-2">
            <OverviewStat
              icon={<UtensilsCrossed className="h-5 w-5" />}
              label="منيو المنتجات"
              value={settings.productTemplate === "featured" ? "بطاقات" : "تفاصيل"}
              swatch={productsColors.accentColor}
            />
            <OverviewStat
              icon={<Coffee className="h-5 w-5" />}
              label="منيو المحاصيل"
              value={settings.cropsTemplate === "molo" ? "بطاقات بالعرض" : "قائمة + تفاصيل"}
              swatch={cropsColors.accentColor}
            />
          </div>
          <ThemeCard>
            <p className="text-sm text-muted-foreground leading-relaxed">
              اختر قسماً من القائمة الجانبية لتعديل إعداد واحد فقط. التغييرات تظهر في المعاينة مباشرة قبل الحفظ.
            </p>
          </ThemeCard>
        </ThemeSectionPanel>
      );

    case "products-template":
      return (
        <ThemeSectionPanel title="قالب المنتجات" description="اختر طريقة عرض قائمة المنتجات على الشاشة">
          <div className="grid gap-4 sm:grid-cols-2">
            <TemplateOptionCard
              active={settings.productTemplate === "featured"}
              icon={<Star className="h-7 w-7" />}
              title="مميّز + بطاقات"
              description="شبكة بطاقات بصور كبيرة"
              onClick={() => update({ ...settings, productTemplate: "featured" })}
            />
            <TemplateOptionCard
              active={settings.productTemplate === "detail"}
              icon={<ListChecks className="h-7 w-7" />}
              title="مميّز + تفاصيل"
              description="قائمة جانبية وبطاقة تفاصيل"
              onClick={() => update({ ...settings, productTemplate: "detail" })}
            />
          </div>
        </ThemeSectionPanel>
      );

    case "products-header":
      return (
        <HeaderSection
          title="هيدر المنتجات"
          description="البانر، الشعار، والعنوان الظاهر أعلى منيو المنتجات"
          header={productsHeader}
          textColorFallback={productsColors.textColor}
          titlePlaceholder="مثال: مشروب الصيف"
          onPatch={editor.patchProductsHeader}
          onLogoUpload={editor.onUploadProductsImage("logoImage")}
          onHeaderImageUpload={editor.onUploadProductsImage("headerImage")}
        />
      );

    case "products-colors":
      return (
        <ColorsSection
          title="ألوان المنتجات"
          description="الألوان الأساسية لمنيو المنتجات"
          palette={productsColors}
          onChange={editor.patchProductsColors}
        />
      );

    case "products-cards":
      return (
        <CardsSection
          title="بطاقات وخلفية المنتجات"
          description="لون بطاقات المنتجات وصورة خلفية الشاشة"
          palette={productsColors}
          onPaletteChange={editor.patchProductsColors}
          onBgUpload={editor.onUploadPaletteBg("products")}
        />
      );

    case "products-featured":
      return (
        <FeaturedSection
          title="منتج مميّز"
          description="اختر منتجاً لإبرازه في المنيو (اختياري)"
          options={products.map((p) => ({ value: p.id, label: p.name }))}
          value={settings.featuredProductId || ""}
          onChange={(v) => update({ ...settings, featuredProductId: v || undefined })}
        />
      );

    case "crops-template":
      return (
        <ThemeSectionPanel title="قالب المحاصيل" description="شكل عرض كتالوج القهوة">
          <div className="grid gap-4 sm:grid-cols-2">
            <TemplateOptionCard
              active={settings.cropsTemplate === "molo"}
              icon={<GalleryHorizontal className="h-7 w-7" />}
              title="بطاقات بالعرض"
              description="كاروسيل أفقي بطاقات محاصيل"
              onClick={() => update({ ...settings, cropsTemplate: "molo" })}
            />
            <TemplateOptionCard
              active={settings.cropsTemplate === "pureshelf"}
              icon={<Minus className="h-7 w-7" />}
              title="قائمة + تفاصيل"
              description="قائمة جانبية وبطاقة تفاصيل"
              onClick={() => update({ ...settings, cropsTemplate: "pureshelf" })}
            />
          </div>
        </ThemeSectionPanel>
      );

    case "crops-header":
      return (
        <HeaderSection
          title="هيدر المحاصيل"
          description="بانر وشعار منيو محاصيل البن"
          header={cropsHeader}
          textColorFallback={cropsColors.textColor}
          titlePlaceholder="مثال: محصول إثيوبيا"
          onPatch={editor.patchCropsHeader}
          onLogoUpload={editor.onUploadCropsImage("logoImage")}
          onHeaderImageUpload={editor.onUploadCropsImage("headerImage")}
        />
      );

    case "crops-colors":
      return (
        <ColorsSection
          title="ألوان المحاصيل"
          description="الألوان الأساسية لمنيو المحاصيل"
          palette={cropsColors}
          onChange={editor.patchCropsColors}
        />
      );

    case "crops-cards":
      return (
        <CardsSection
          title="بطاقات المحاصيل"
          description="لون البطاقات وخلفية شاشة المحاصيل"
          palette={cropsColors}
          onPaletteChange={editor.patchCropsColors}
          onBgUpload={editor.onUploadPaletteBg("crops")}
        />
      );

    case "crops-featured":
      return (
        <FeaturedSection
          title="محصول الشهر"
          description="المحصول المميّز في منيو البن"
          options={crops.map((c) => ({ value: c.id, label: c.beanName }))}
          value={settings.featuredCropId || ""}
          onChange={(v) => update({ ...settings, featuredCropId: v || undefined })}
        />
      );

    case "preview":
      return (
        <ThemeSectionPanel title="معاينة حية" description="شاهد التغييرات فوراً دون حفظ">
          <div className="mb-6 flex justify-center">
            <ThemePreviewOrientationToggle
              orientation={previewOrientation}
              onChange={onPreviewOrientationChange}
            />
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <ThemePreviewFrame
              activeSection="products-template"
              productsPreviewUrl={productsPreviewUrl}
              cropsPreviewUrl={cropsPreviewUrl}
              orientation={previewOrientation}
              onOrientationChange={onPreviewOrientationChange}
              showOrientationToggle={false}
            />
            <ThemePreviewFrame
              activeSection="crops-template"
              productsPreviewUrl={productsPreviewUrl}
              cropsPreviewUrl={cropsPreviewUrl}
              orientation={previewOrientation}
              onOrientationChange={onPreviewOrientationChange}
              showOrientationToggle={false}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={productsPreviewUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                فتح منيو المنتجات
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={cropsPreviewUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                فتح منيو المحاصيل
              </a>
            </Button>
          </div>
        </ThemeSectionPanel>
      );

    default:
      return null;
  }
}

function OverviewStat({
  icon,
  label,
  value,
  swatch,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  swatch?: string;
}) {
  return (
    <ThemeCard className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-display font-bold text-primary">{value}</div>
      </div>
      {swatch && <span className="h-9 w-9 shrink-0 rounded-lg border border-border" style={{ background: swatch }} />}
    </ThemeCard>
  );
}

function HeaderSection({
  title,
  description,
  header,
  textColorFallback,
  titlePlaceholder,
  onPatch,
  onLogoUpload,
  onHeaderImageUpload,
}: {
  title: string;
  description: string;
  header: ReturnType<typeof getProductsHeaderCustomization>;
  textColorFallback: string;
  titlePlaceholder: string;
  onPatch: (patch: Partial<typeof header>) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHeaderImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const headerSpecs = useMemo(
    () => [
      { label: "المقاس الموصى به", value: formatHeaderImageSpecLabel() },
      { label: "عرض الآيباد", value: formatHeaderImageDisplayLabel() },
      { label: "الحد الأدنى", value: `${HEADER_IMAGE_SPEC.minWidth}×${HEADER_IMAGE_SPEC.minHeight}` },
      { label: "الحد الأقصى", value: `${HEADER_IMAGE_SPEC.maxWidth}×${HEADER_IMAGE_SPEC.maxHeight}` },
      { label: "نسبة العرض", value: `${HEADER_IMAGE_SPEC.targetAspect}:1` },
    ],
    [],
  );

  return (
    <ThemeSectionPanel title={title} description={description}>
      <ThemeCard>
        <ImageUploadField
          label="بانر الهيدر"
          description="يُعاد قياس الصورة تلقائياً للمقاس الرسمي"
          previewUrl={header.headerImage}
          specs={headerSpecs}
          onUpload={onHeaderImageUpload}
          onClear={header.headerImage ? () => onPatch({ headerImage: undefined }) : undefined}
        />
      </ThemeCard>

      <ThemeCard>
        <ImageUploadField
          label="شعار المنيو"
          description="اختياري — يظهر بجانب إفصاح السعرات"
          previewUrl={header.logoImage}
          aspectClass="aspect-[2/1] max-h-24 object-contain bg-muted/30"
          onUpload={onLogoUpload}
          onClear={header.logoImage ? () => onPatch({ logoImage: undefined }) : undefined}
        />
      </ThemeCard>

      <ThemeCard>
        <ThemeFieldGroup
          label="عنوان الهيدر"
          hint={header.headerImage ? "معطّل — البانر يحتوي نصاً جاهزاً" : "يظهر عند عدم وجود بانر"}
        >
          <Input
            value={header.featuredTitle || ""}
            onChange={(e) => onPatch({ featuredTitle: e.target.value || undefined })}
            placeholder={titlePlaceholder}
            disabled={Boolean(header.headerImage)}
            className="h-10"
          />
        </ThemeFieldGroup>
      </ThemeCard>

      <ThemeCard>
        <p className="mb-3 text-sm font-bold text-primary">خيارات العرض</p>
        <div className="flex flex-wrap gap-2">
          <ToggleChip
            label="إخفاء الهيدر"
            checked={header.hideHeader === true}
            onChange={(v) => onPatch({ hideHeader: v })}
          />
          <ToggleChip
            label="إخفاء عند التمرير"
            checked={header.autoHideHeaderOnScroll !== false}
            disabled={header.hideHeader === true}
            onChange={(v) => onPatch({ autoHideHeaderOnScroll: v })}
          />
          <ToggleChip
            label="زر اللغة"
            checked={header.showLanguageToggle !== false}
            onChange={(v) => onPatch({ showLanguageToggle: v })}
          />
        </div>
      </ThemeCard>

      <AdvancedCollapsible title="إعدادات متقدمة — إفصاح السعرات">
        <ColorPickerField
          label="لون نص إفصاح السعرات"
          value={header.calorieTextColor || textColorFallback}
          onChange={(v) => onPatch({ calorieTextColor: v })}
        />
        {header.calorieTextColor && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onPatch({ calorieTextColor: undefined })}>
            إعادة اللون الافتراضي
          </Button>
        )}
      </AdvancedCollapsible>
    </ThemeSectionPanel>
  );
}

function ColorsSection({
  title,
  description,
  palette,
  onChange,
}: {
  title: string;
  description: string;
  palette: { bgColor: string; textColor: string; accentColor: string };
  onChange: (patch: Partial<typeof palette>) => void;
}) {
  return (
    <ThemeSectionPanel title={title} description={description}>
      <ThemeCard>
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-primary">
          <Palette className="h-4 w-4" />
          ألوان الثيم
        </div>
        <div
          className="mb-5 h-16 rounded-xl border border-border"
          style={{
            background: `linear-gradient(90deg, ${palette.bgColor} 33%, ${palette.accentColor} 33% 66%, ${palette.textColor} 66%)`,
          }}
          aria-hidden
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <ColorPickerField label="الخلفية" value={palette.bgColor} onChange={(v) => onChange({ bgColor: v })} />
          <ColorPickerField label="النص" value={palette.textColor} onChange={(v) => onChange({ textColor: v })} />
          <ColorPickerField label="مميّز" value={palette.accentColor} onChange={(v) => onChange({ accentColor: v })} />
        </div>
      </ThemeCard>
    </ThemeSectionPanel>
  );
}

function CardsSection({
  title,
  description,
  palette,
  onPaletteChange,
  onBgUpload,
}: {
  title: string;
  description: string;
  palette: { cardColor?: string; bgImage?: string };
  onPaletteChange: (patch: Partial<typeof palette>) => void;
  onBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <ThemeSectionPanel title={title} description={description}>
      <ThemeCard>
        <ColorPickerField
          label="لون البطاقات"
          value={palette.cardColor || "#ededed"}
          onChange={(v) => onPaletteChange({ cardColor: v })}
        />
      </ThemeCard>
      <ThemeCard>
        <ImageUploadField
          label="صورة خلفية المنيو"
          description="اختياري — تغطي خلفية الشاشة بالكامل"
          previewUrl={palette.bgImage}
          aspectClass="aspect-video"
          onUpload={onBgUpload}
          onClear={palette.bgImage ? () => onPaletteChange({ bgImage: undefined }) : undefined}
        />
      </ThemeCard>
    </ThemeSectionPanel>
  );
}

function FeaturedSection({
  title,
  description,
  options,
  value,
  onChange,
}: {
  title: string;
  description: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ThemeSectionPanel title={title} description={description}>
      <ThemeCard>
        <ThemeFieldGroup label="الاختيار" hint="اتركه فارغاً لعدم إبراز عنصر">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm touch-manipulation"
          >
            <option value="">— لا يوجد —</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </ThemeFieldGroup>
      </ThemeCard>
    </ThemeSectionPanel>
  );
}

export default Theme;
