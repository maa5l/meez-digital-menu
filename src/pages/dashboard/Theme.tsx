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

        {/* تنقّل أفقي — جوال وآيباد */}
        <ThemeEditorNavMobile active={section} onSelect={setSection} className="sticky top-[4.75rem] z-20 -mx-4 mb-4 bg-background/95 px-4 py-2 backdrop-blur-sm lg:hidden sm:-mx-6 sm:px-6 md:-mx-10 md:px-10" />

        <div className="flex min-h-0 flex-col gap-5 lg:flex-row lg:items-start">
          {/* شريط جانبي — سطح مكتب / آيباد أفقي كبير */}
          <ThemeEditorNav active={section} onSelect={setSection} className="hidden lg:flex" />

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
            <div className="hidden w-full shrink-0 lg:block lg:w-auto">
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
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <OverviewStat
              icon={<UtensilsCrossed className="h-5 w-5" />}
              label="منيو المنتجات"
              value={settings.productTemplate === "featured" ? "مميّز + بطاقات" : "مميّز + تفاصيل"}
              swatch={productsColors.accentColor}
            />
            <OverviewStat
              icon={<Coffee className="h-5 w-5" />}
              label="منيو المحاصيل"
              value={settings.cropsTemplate === "molo" ? "بطاقات بالعرض" : "قائمة + تفاصيل"}
              swatch={cropsColors.accentColor}
            />
          </div>
          <ThemeCard className="border-dashed bg-secondary/30">
            <p className="text-sm leading-relaxed text-muted-foreground">
              اختر قسماً من الشريط أعلاه لتعديل إعداد واحد. التغييرات تظهر في المعاينة مباشرة قبل الحفظ.
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
    <ThemeCard className="flex h-full flex-col gap-4" padding="compact">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          {icon}
        </div>
        {swatch && (
          <span
            className="h-8 w-8 shrink-0 rounded-full border-2 border-border/70 shadow-sm"
            style={{ background: swatch }}
            title="لون الثيم"
            aria-hidden
          />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="font-display text-base font-bold leading-snug text-primary sm:text-lg">{value}</p>
      </div>
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
      { label: "الرفع", value: formatHeaderImageDisplayLabel() },
      { label: "الحد الأقصى للملف", value: `${HEADER_IMAGE_SPEC.maxWidth}×${HEADER_IMAGE_SPEC.maxHeight} بكسل` },
    ],
    [],
  );

  return (
    <ThemeSectionPanel title={title} description={description}>
      <ThemeCard>
        <ImageUploadField
          label="بانر الهيدر"
          description="يُقبل أي مقاس — تُحفظ نسبة الصورة كما هي"
          previewUrl={header.headerImage}
          specs={headerSpecs}
          onUpload={onHeaderImageUpload}
          onClear={
            header.headerImage
              ? () => onPatch({ headerImage: undefined, headerImageAspectRatio: undefined })
              : undefined
          }
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
  const fields = [
    {
      key: "bgColor" as const,
      label: "الخلفية",
      hint: "لون خلفية شاشة المنيو",
      value: palette.bgColor,
    },
    {
      key: "textColor" as const,
      label: "النص",
      hint: "العناوين والنصوص الأساسية",
      value: palette.textColor,
    },
    {
      key: "accentColor" as const,
      label: "مميّز",
      hint: "التمييز والعناصر النشطة",
      value: palette.accentColor,
    },
  ];

  return (
    <ThemeSectionPanel title={title} description={description}>
      <ThemeCard>
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-primary">
          <Palette className="h-4 w-4" />
          ألوان الثيم
        </div>

        <div
          className="mb-5 overflow-hidden rounded-2xl border border-border/80"
          style={{ background: palette.bgColor, color: palette.textColor }}
          aria-hidden
        >
          <div className="border-b border-black/10 px-4 py-3">
            <p className="text-[11px] font-semibold opacity-60">معاينة سريعة</p>
            <p className="font-display text-lg font-black">منيو المنتجات</p>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span
              className="rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm"
              style={{ background: palette.accentColor }}
            >
              مميّز
            </span>
            <span className="text-sm font-bold opacity-80">12 ر.س</span>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {fields.map((field) => (
            <ColorPickerField
              key={field.key}
              label={field.label}
              hint={field.hint}
              value={field.value}
              onChange={(v) => onChange({ [field.key]: v })}
            />
          ))}
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
