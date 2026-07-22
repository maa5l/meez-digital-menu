import { Riyal } from "@/components/Brand";
import AllergenIcons from "@/components/menu/AllergenIcons";
import { localizeProduct, type MenuLang } from "@/lib/product-i18n";
import { hasProductBadge, productBadgeColor, productBadgeLabel } from "@/lib/product-badge";
import {
  PRODUCT_CARD_ASPECT,
  PRODUCT_CARD_FOOTER_HEIGHT,
  PRODUCT_CARD_PAD_BOTTOM,
  PRODUCT_CARD_PAD_TOP,
  PRODUCT_CARD_PAD_X,
  PRODUCT_IMAGE_ASPECT,
} from "@/lib/product-card-spec";
import { cropDisplayLine } from "@/lib/crop-info";
import { menuChromeMotion } from "@/lib/menu-header";
import { getProductCardImage, getProductLandscapeImage } from "@/lib/product-spec";
import type { Product } from "@/types/domain";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import MenuProductImage from "@/components/menu/MenuProductImage";
import ProductCornerBadge from "@/components/menu/ProductCornerBadge";

type Lang = MenuLang;

const labels = {
  ar: {
    name: "الاسم",
    price: "السعر",
    calories: "السعرات",
    allergens: "مسببات الحساسية",
    description: "الوصف",
    crop: "المحصول",
    cropBean: "اسم المحصول",
    cropCountry: "البلد",
    cropProcess: "المعالجة",
    cropVariety: "السلالة",
    cropAltitude: "الارتفاع",
    cropNotes: "الإيحاءات",
    noImage: "صورة المنتج",
    img: "صورة",
  },
  en: {
    name: "Name",
    price: "Price",
    calories: "Calories",
    allergens: "Allergens",
    description: "Description",
    crop: "Crop",
    cropBean: "Bean",
    cropCountry: "Country",
    cropProcess: "Process",
    cropVariety: "Variety",
    cropAltitude: "Altitude",
    cropNotes: "Notes",
    noImage: "Product image",
    img: "Img",
  },
} as const;

function cropSummary(product: Product): string | null {
  return cropDisplayLine(product.cropInfo);
}

const cropModalFields = [
  ["beanName", "cropBean"],
  ["country", "cropCountry"],
  ["process", "cropProcess"],
  ["variety", "cropVariety"],
  ["altitude", "cropAltitude"],
  ["notes", "cropNotes"],
] as const;

/** شعار الريال يسار الرقم — لجميع اللغات */
function PriceWithRiyal({
  price,
  className,
  riyalClassName = "shrink-0 opacity-90",
}: {
  price: number | string;
  className?: string;
  riyalClassName?: string;
}) {
  return (
    <span dir="ltr" className={cn("inline-flex max-w-full items-center gap-0.5", className)}>
      <Riyal className={riyalClassName} />
      <span className="truncate">{price}</span>
    </span>
  );
}

const InfoRow = ({
  label,
  value,
  bold,
  clamp,
  align,
  valueAlign,
  rtl,
  size = "card",
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  clamp?: boolean;
  align: "right" | "left";
  /** محاذاة القيمة — افتراضياً نفس `align` */
  valueAlign?: "right" | "left";
  rtl?: boolean;
  size?: "card" | "modal" | "modalCompact";
}) => {
  const valueSide = valueAlign ?? align;
  const labelCls =
    size === "modalCompact"
      ? "text-[10px]"
      : size === "modal"
        ? "text-xs"
        : "text-[9px] md:text-[10px]";
  return (
    <div className={`space-y-0.5 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className={cn("font-bold leading-none opacity-55", labelCls)}>{label}</div>
      <div
        dir={rtl ? "rtl" : undefined}
        className={cn(
          "menu-text text-[#1a1a1a] leading-snug",
          size === "modalCompact"
            ? bold
              ? "text-base font-black"
              : "text-sm font-semibold"
            : size === "modal"
              ? bold
                ? "text-xl font-black md:text-2xl"
                : "text-lg font-semibold md:text-xl"
              : bold
                ? "text-xs font-black md:text-sm"
                : "text-[10px] font-semibold md:text-xs",
          clamp && "line-clamp-3 opacity-85",
          valueSide === "right" ? "text-right flex flex-col items-end" : "text-left flex flex-col items-start",
        )}
      >
        {value}
      </div>
    </div>
  );
};

function ProductImageBadge({
  product,
  lang,
  size,
  placement,
}: {
  product: Product;
  lang: Lang;
  size?: "sm" | "md";
  placement?: "inset" | "corner";
}) {
  if (!hasProductBadge(product, lang)) return null;
  const text = productBadgeLabel(product, lang)!;
  const color = productBadgeColor(product)!;
  return <ProductCornerBadge text={text} color={color} size={size} placement={placement} />;
}

const compactLabels = {
  ar: { allergens: "حساسية" },
  en: { allergens: "Allergens" },
} as const;

/** تذييل مضغوط — مُحسَّن لقالب 280×370 */
function ProductCardFooterCompact({
  product,
  lang,
  cardBg,
}: {
  product: Product;
  lang: Lang;
  cardBg: string;
}) {
  const t = labels[lang];
  const tc = compactLabels[lang];
  const localized = localizeProduct(product, lang);
  const isEn = lang === "en";

  const labelCls = "menu-text text-[7px] font-bold leading-normal text-[#1a1a1a]/50";
  const nameValueCls =
    "menu-text block w-full truncate py-px text-[10px] font-bold leading-[1.5] text-[#1a1a1a]";
  const primaryCls =
    "menu-text text-[10px] font-black leading-[1.45] text-[#1a1a1a] truncate py-px";
  const secondaryCls = "menu-text text-[9px] font-bold leading-normal text-[#1a1a1a]";

  const cellCls = (side: "right" | "left") =>
    cn(
      "flex min-h-0 w-full flex-col justify-center gap-1",
      side === "right" ? "items-end text-right" : "items-start text-left",
    );

  const nameCell = (
    <>
      <div className={labelCls}>{t.name}</div>
      <div className={nameValueCls} dir={isEn ? "ltr" : "rtl"}>
        {localized.name}
      </div>
    </>
  );

  const priceCell = (side: "right" | "left") => (
    <>
      <div className={labelCls}>{t.price}</div>
      <div
        className={cn(
          primaryCls,
          side === "right" ? "flex justify-end" : "flex justify-start",
        )}
      >
        <PriceWithRiyal price={product.price} riyalClassName="h-2.5 w-2.5 shrink-0 opacity-90" />
      </div>
    </>
  );

  const caloriesCell = (
    <>
      <div className={labelCls}>{t.calories}</div>
      <div className={secondaryCls}>{product.calories}</div>
    </>
  );

  const allergensCell = (side: "right" | "left") => (
    <>
      <div className={cn(labelCls, "w-full truncate")}>{tc.allergens}</div>
      <div className={cn("flex h-4 w-full shrink-0 items-center", side === "right" ? "justify-end" : "justify-start")}>
        <AllergenIcons
          allergens={product.allergens}
          allergensEn={product.allergensEn}
          lang={lang}
          size="xs"
          className={cn("scale-[0.85]", side === "right" ? "origin-right" : "origin-left")}
          emptyPlaceholder={<span className={cn(secondaryCls, "opacity-40")}>—</span>}
        />
      </div>
    </>
  );

  return (
    <div
      className="flex w-full flex-none flex-col overflow-hidden rounded-b-[1.5rem] md:rounded-b-[1.75rem]"
      style={{ background: cardBg, height: PRODUCT_CARD_FOOTER_HEIGHT, maxHeight: PRODUCT_CARD_FOOTER_HEIGHT }}
    >
      <div
        className="grid h-full min-h-0 grid-cols-2 grid-rows-2 gap-x-2.5 gap-y-2"
        style={{
          paddingInline: PRODUCT_CARD_PAD_X,
          paddingTop: "3%",
          paddingBottom: PRODUCT_CARD_PAD_BOTTOM,
        }}
        dir="ltr"
      >
        {isEn ? (
          <>
            <div className={cellCls("left")}>{nameCell}</div>
            <div className={cellCls("right")}>{priceCell("right")}</div>
            <div className={cellCls("left")}>{caloriesCell}</div>
            <div className={cellCls("right")}>{allergensCell("right")}</div>
          </>
        ) : (
          <>
            <div className={cellCls("left")}>{priceCell("left")}</div>
            <div className={cellCls("right")}>{nameCell}</div>
            <div className={cellCls("left")}>{allergensCell("left")}</div>
            <div className={cellCls("right")}>{caloriesCell}</div>
          </>
        )}
      </div>
    </div>
  );
}

export const ProductCardFooter = ({
  product,
  lang,
  cardBg,
  compact,
  showDescription = false,
  layout = "default",
}: {
  product: Product;
  lang: Lang;
  cardBg: string;
  compact?: boolean;
  showDescription?: boolean;
  /** panel = بطاقة تفاصيل القائمة الجانبية */
  layout?: "default" | "panel";
}) => {
  if (compact) {
    return <ProductCardFooterCompact product={product} lang={lang} cardBg={cardBg} />;
  }

  const t = labels[lang];
  const cropLine = cropSummary(product);
  const localized = localizeProduct(product, lang);
  const isEn = lang === "en";

  if (layout === "panel") {
    const labelCls = "text-[9px] font-bold leading-none opacity-55 md:text-[10px]";
    const valueCls = "mt-0.5 text-xs font-black leading-snug text-[#1a1a1a] md:text-sm";
    const secondaryCls = "mt-0.5 text-[10px] font-semibold leading-snug text-[#1a1a1a] md:text-xs";

    const panelField = (
      label: string,
      value: React.ReactNode,
      align: "left" | "right",
      bold = false,
    ) => (
      <div className={cn("min-w-0 w-full", align === "left" ? "text-left" : "text-right")}>
        <div className={labelCls}>{label}</div>
        <div className={cn(bold ? valueCls : secondaryCls)} dir={isEn ? "ltr" : "rtl"}>
          {value}
        </div>
      </div>
    );

    return (
      <div className="px-3 pb-3 pt-2 md:px-4 md:pb-4" style={{ background: cardBg, color: "#1a1a1a" }}>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 md:gap-x-4" dir="ltr">
          {isEn ? (
            <>
              {panelField(t.name, localized.name, "left", true)}
              {panelField(
                t.price,
                <PriceWithRiyal price={product.price} riyalClassName="w-2.5 h-2.5 md:w-3 md:h-3" />,
                "right",
                true,
              )}
              {panelField(t.calories, String(product.calories), "left")}
              {panelField(
                t.allergens,
                <AllergenIcons
                  allergens={product.allergens}
                  allergensEn={product.allergensEn}
                  lang={lang}
                  className="justify-end"
                />,
                "right",
              )}
            </>
          ) : (
            <>
              {panelField(
                t.price,
                <PriceWithRiyal price={product.price} riyalClassName="w-2.5 h-2.5 md:w-3 md:h-3" />,
                "left",
                true,
              )}
              {panelField(t.name, localized.name, "right", true)}
              {panelField(
                t.allergens,
                <AllergenIcons
                  allergens={product.allergens}
                  allergensEn={product.allergensEn}
                  lang={lang}
                  className="justify-start"
                />,
                "left",
              )}
              {panelField(t.calories, String(product.calories), "right")}
            </>
          )}
        </div>
        {showDescription && localized.description?.trim() && (
          <div className="mt-2.5 border-t border-black/10 pt-2.5">
            {panelField(t.description, localized.description, isEn ? "left" : "right")}
          </div>
        )}
        {cropLine && (
          <p
            className={cn(
              "mt-2 border-t border-black/10 pt-2 text-[10px] font-semibold opacity-75 md:text-xs",
              isEn ? "text-left" : "text-right",
            )}
            dir={isEn ? "ltr" : "rtl"}
          >
            <span className="font-bold opacity-60">{t.crop}: </span>
            {cropLine}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 md:px-4 pb-3 md:pb-4 pt-1.5" style={{ background: cardBg, color: "#1a1a1a" }}>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5" dir="ltr">
        {isEn ? (
          <>
            <InfoRow align="left" label={t.name} value={localized.name} bold />
            <InfoRow
              align="right"
              label={t.price}
              value={
                <PriceWithRiyal price={product.price} riyalClassName="w-2.5 h-2.5 md:w-3 md:h-3" />
              }
              bold
            />
            <InfoRow align="left" label={t.calories} value={String(product.calories)} />
            <InfoRow
              align="right"
              valueAlign="right"
              label={t.allergens}
              value={
                <AllergenIcons
                  allergens={product.allergens}
                  allergensEn={product.allergensEn}
                  lang={lang}
                />
              }
            />
          </>
        ) : (
          <>
            <InfoRow
              align="left"
              label={t.price}
              value={
                <PriceWithRiyal price={product.price} riyalClassName="w-2.5 h-2.5 md:w-3 md:h-3" />
              }
              bold
            />
            <InfoRow align="right" label={t.name} value={localized.name} bold rtl />
            <InfoRow
              align="left"
              valueAlign="left"
              label={t.allergens}
              value={
                <AllergenIcons
                  allergens={product.allergens}
                  allergensEn={product.allergensEn}
                  lang={lang}
                />
              }
            />
            <InfoRow align="right" label={t.calories} value={String(product.calories)} />
          </>
        )}
        {showDescription && localized.description?.trim() && (
          <div className="col-span-2 w-full pt-2 mt-0.5 border-t border-black/10">
            <InfoRow
              align={isEn ? "left" : "right"}
              rtl={!isEn}
              label={t.description}
              value={localized.description}
              clamp
            />
          </div>
        )}
      </div>
      {cropLine && (
        <p
          className={cn(
            "mt-2 border-t border-black/10 pt-2 text-[10px] font-semibold opacity-75 md:text-xs",
            isEn ? "text-left" : "text-right",
          )}
          dir={isEn ? "ltr" : "rtl"}
        >
          <span className="font-bold opacity-60">{t.crop}: </span>
          {cropLine}
        </p>
      )}
    </div>
  );
};

/** تفاصيل المنتج في النافذة المنبثقة — متجاوبة مع حجم الشاشة */
export const ProductModalDetails = ({
  product,
  lang,
  dense = false,
}: {
  product: Product;
  lang: Lang;
  /** @deprecated يُتجاهل على الآيباد — يُستخدم للتوافق فقط */
  dense?: boolean;
}) => {
  const t = labels[lang];
  const localized = localizeProduct(product, lang);
  const isEn = lang === "en";

  const labelCls =
    "menu-text text-xs font-bold leading-normal text-[#1a1a1a]/55 md:text-sm";
  const nameCls =
    "menu-text font-display text-base font-black leading-tight text-[#1a1a1a] md:text-lg";
  const valueCls =
    "menu-text text-lg font-black leading-tight text-[#1a1a1a] md:text-xl";
  const secondaryCls =
    "menu-text text-base font-bold leading-normal text-[#1a1a1a] md:text-lg";
  const bodyCls =
    "menu-text text-base leading-relaxed text-[#1a1a1a]/85 md:text-[16px] md:leading-relaxed";
  const sectionMt = dense
    ? "mt-3.5 border-t border-black/10 pt-3.5 md:mt-4 md:pt-4"
    : "mt-4 border-t border-black/10 pt-4 md:mt-5 md:pt-5";
  const gridGap = "gap-x-5 gap-y-3.5 md:gap-x-6 md:gap-y-4";
  const allergenSize = "md" as const;
  const rowSize = "modal" as const;

  const cell = (side: "start" | "end") =>
    cn(
      "flex min-w-0 flex-col gap-1.5",
      side === "start" ? "items-start text-left" : "items-end text-right",
    );

  return (
    <div className="text-[#1a1a1a]" dir={isEn ? "ltr" : "rtl"}>
      <div className={cn("grid grid-cols-2", gridGap)} dir="ltr">
        {isEn ? (
          <>
            <div className={cell("start")}>
              <div className={labelCls}>{t.name}</div>
              <h2 className={nameCls}>{localized.name}</h2>
            </div>
            <div className={cell("end")}>
              <div className={labelCls}>{t.price}</div>
              <div className={valueCls}>
                <PriceWithRiyal
                  price={product.price}
                  riyalClassName="h-4 w-4 md:h-5 md:w-5"
                />
              </div>
            </div>
            <div className={cell("start")}>
              <div className={labelCls}>{t.calories}</div>
              <div className={secondaryCls}>{product.calories}</div>
            </div>
            <div className={cell("end")}>
              <div className={labelCls}>{t.allergens}</div>
              <AllergenIcons
                allergens={product.allergens}
                allergensEn={product.allergensEn}
                lang={lang}
                size={allergenSize}
                emptyPlaceholder={<span className={cn(secondaryCls, "opacity-40")}>—</span>}
              />
            </div>
          </>
        ) : (
          <>
            <div className={cell("start")}>
              <div className={labelCls}>{t.price}</div>
              <div className={valueCls}>
                <PriceWithRiyal
                  price={product.price}
                  riyalClassName="h-4 w-4 md:h-5 md:w-5"
                />
              </div>
            </div>
            <div className={cell("end")}>
              <div className={labelCls}>{t.name}</div>
              <h2 className={cn(nameCls, "text-right")} dir="rtl">
                {localized.name}
              </h2>
            </div>
            <div className={cell("start")}>
              <div className={labelCls}>{t.allergens}</div>
              <AllergenIcons
                allergens={product.allergens}
                allergensEn={product.allergensEn}
                lang={lang}
                size={allergenSize}
                emptyPlaceholder={<span className={cn(secondaryCls, "opacity-40")}>—</span>}
              />
            </div>
            <div className={cell("end")}>
              <div className={labelCls}>{t.calories}</div>
              <div className={secondaryCls}>{product.calories}</div>
            </div>
          </>
        )}
      </div>

      {localized.description?.trim() && (
        <div className={sectionMt}>
          <div className={cn("mb-1.5 font-bold opacity-50", labelCls, isEn ? "text-left" : "text-right")}>
            {t.description}
          </div>
          <p
            dir={isEn ? "ltr" : "rtl"}
            className={cn(bodyCls, isEn ? "text-left" : "text-right")}
          >
            {localized.description}
          </p>
        </div>
      )}

      {product.cropInfo && (
        <div
          className={cn(sectionMt, isEn ? "text-left" : "text-right")}
          dir={isEn ? "ltr" : "rtl"}
        >
          <div className={cn("mb-2.5 font-bold opacity-50", labelCls)}>{t.crop}</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:gap-x-8 md:gap-y-3.5">
            {cropModalFields.map(([key, labelKey]) => {
              const value = product.cropInfo![key]?.trim();
              if (!value) return null;
              return (
                <InfoRow
                  key={key}
                  size={rowSize}
                  align={isEn ? "left" : "right"}
                  label={t[labelKey]}
                  value={value}
                  rtl={!isEn}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const ProductGridCard = ({
  product,
  lang,
  cardBg,
  onClick,
}: {
  product: Product;
  lang: Lang;
  cardBg: string;
  onClick?: () => void;
}) => {
  const cardImage = getProductCardImage(product);
  const className = cn(
    "group relative flex w-full flex-col overflow-hidden rounded-[1.5rem] border-2 border-black/[0.07] text-start",
    menuChromeMotion,
    onClick && "transition-shadow hover:shadow-lg",
  );
  const style = { background: cardBg, aspectRatio: PRODUCT_CARD_ASPECT };
  const body = (
    <>
      <div
        className="relative flex-none w-full"
        style={{ paddingInline: PRODUCT_CARD_PAD_X, paddingTop: PRODUCT_CARD_PAD_TOP }}
      >
        <div
          className="relative w-full overflow-hidden rounded-[1.1rem] bg-white md:rounded-[1.15rem]"
          style={{ aspectRatio: PRODUCT_IMAGE_ASPECT }}
        >
          <ProductImageBadge product={product} lang={lang} placement="inset" />
          <div className="absolute inset-0 flex items-center justify-center">
            {cardImage ? (
              <MenuProductImage
                src={cardImage}
                alt={product.name}
                className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                placeholder={
                  <span className="px-2 text-center text-xs font-bold text-muted-foreground/40">
                    {labels[lang].noImage}
                  </span>
                }
              />
            ) : (
              <span className="px-2 text-center text-xs font-bold text-muted-foreground/40">
                {labels[lang].noImage}
              </span>
            )}
          </div>
        </div>
      </div>
      <ProductCardFooter product={product} lang={lang} cardBg={cardBg} compact />
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} style={style}>
        {body}
      </button>
    );
  }

  return (
    <article className={className} style={style}>
      {body}
    </article>
  );
};

export const ProductListCard = ({
  product,
  lang,
  cardBg,
  active,
  accentColor,
  onClick,
}: {
  product: Product;
  lang: Lang;
  cardBg: string;
  active?: boolean;
  accentColor: string;
  onClick?: () => void;
}) => {
  const localized = localizeProduct(product, lang);
  const isEn = lang === "en";
  const badgeLabel = productBadgeLabel(product, lang);
  const badgeColor = productBadgeColor(product);
  const thumbImage = getProductLandscapeImage(product) || getProductCardImage(product);

  const infoBlock = (
    <div className="flex min-h-[80px] min-w-0 flex-1 flex-col justify-center py-0.5">
      <div className="grid w-full grid-cols-2 grid-rows-2 gap-x-2 gap-y-2" dir="ltr">
        <h3 className="menu-text col-start-1 row-start-1 line-clamp-2 self-start text-left font-black text-sm leading-tight text-[#1a1a1a]">
          {localized.name}
        </h3>
        <div className="col-start-2 row-start-1 flex justify-end self-start">
          <PriceWithRiyal
            price={product.price}
            className="menu-text font-black text-sm text-[#1a1a1a]"
            riyalClassName="h-3.5 w-3.5"
          />
        </div>
        <div className="col-start-1 row-start-2 flex items-end justify-start self-end">
          <span className="menu-text inline-flex items-center gap-1 font-bold text-sm text-[#1a1a1a]/85">
            <Flame className="h-3.5 w-3.5 shrink-0 text-orange-500" />
            {product.calories}
          </span>
        </div>
        <div className="col-start-2 row-start-2 flex items-end justify-end self-end">
          <AllergenIcons
            allergens={product.allergens}
            allergensEn={product.allergensEn}
            lang={lang}
            className="justify-end"
            emptyPlaceholder={<span className="text-xs font-bold text-[#1a1a1a]/35">—</span>}
          />
        </div>
      </div>
    </div>
  );

  const imageBlock = (
    <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl">
      {thumbImage ? (
        <MenuProductImage
          src={thumbImage}
          alt={localized.name}
          className="absolute inset-0 h-full w-full object-cover object-center"
          placeholder={
            <span className="px-1 text-center text-[9px] font-bold text-muted-foreground/50">{labels[lang].img}</span>
          }
        />
      ) : (
        <span className="px-1 text-center text-[9px] font-bold text-muted-foreground/50">{labels[lang].img}</span>
      )}
    </div>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      dir={isEn ? "ltr" : "rtl"}
      className="relative flex w-full gap-3 overflow-visible rounded-2xl p-3 pt-4 text-start transition-all touch-manipulation"
      style={{
        background: cardBg,
        boxShadow: active ? `inset 0 0 0 2px ${accentColor}` : undefined,
      }}
    >
      {badgeLabel && badgeColor && (
        <ProductCornerBadge
          text={badgeLabel}
          color={badgeColor}
          size="sm"
          placement="corner"
          className="!start-2 !top-1 z-30 md:!start-2.5"
        />
      )}
      {isEn ? (
        <>
          {infoBlock}
          {imageBlock}
        </>
      ) : (
        <>
          {imageBlock}
          {infoBlock}
        </>
      )}
    </button>
  );
};

/** لوحة صورة المنتج فقط — التفاصيل عند الضغط */
export const ProductImagePanel = ({
  product,
  lang,
  cardBg,
  hint,
  onOpen,
  className,
}: {
  product: Product;
  lang: Lang;
  cardBg: string;
  hint: string;
  onOpen: () => void;
  className?: string;
}) => {
  const localized = localizeProduct(product, lang);
  const panelImage = getProductLandscapeImage(product) || getProductCardImage(product);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative mx-auto h-full min-h-0 w-full max-h-[min(52vh,420px)] overflow-hidden rounded-2xl touch-manipulation transition-transform active:scale-[0.995] md:max-h-full",
        className,
      )}
      style={{ background: cardBg }}
      aria-label={`${localized.name} — ${hint}`}
    >
      <ProductImageBadge product={product} lang={lang} size="md" placement="inset" />
      {panelImage ? (
        <MenuProductImage
          src={panelImage}
          alt={localized.name}
          className="absolute inset-0 h-full w-full object-cover object-center"
          placeholder={
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-muted-foreground/50">
              {labels[lang].noImage}
            </span>
          }
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-muted-foreground/50">
          {labels[lang].noImage}
        </span>
      )}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent px-4 pb-3 pt-10"
        aria-hidden
      >
        <span className="block text-center text-[10px] font-bold text-white/90 md:text-xs">{hint}</span>
      </div>
    </button>
  );
};

export const ProductDetailCard = ({
  product,
  lang,
  cardBg,
  accentColor,
  className,
  variant = "default",
}: {
  product: Product;
  lang: Lang;
  cardBg: string;
  accentColor: string;
  className?: string;
  /** panel = ملء لوحة التفاصيل في قالب القائمة (آيباد) */
  variant?: "default" | "panel";
}) => {
  const localized = localizeProduct(product, lang);
  const isPanel = variant === "panel";
  const heroImage = getProductLandscapeImage(product) || getProductCardImage(product);

  if (isPanel) {
    return (
      <div
        dir={lang === "en" ? "ltr" : "rtl"}
        className={cn(
          "relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl",
          className,
        )}
        style={{ background: cardBg }}
      >
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <ProductImageBadge product={product} lang={lang} size="md" placement="inset" />
          {heroImage ? (
            <MenuProductImage
              src={heroImage}
              alt={localized.name}
              className="absolute inset-0 h-full w-full object-cover object-center"
              placeholder={
                <span className="flex h-full min-h-[180px] items-center justify-center text-sm font-bold text-muted-foreground/50">
                  {labels[lang].noImage}
                </span>
              }
            />
          ) : (
            <span className="flex h-full min-h-[180px] items-center justify-center text-sm font-bold text-muted-foreground/50">
              {labels[lang].noImage}
            </span>
          )}
        </div>
        <div className="max-h-[min(42%,220px)] shrink-0 overflow-y-auto overscroll-y-contain border-t border-black/[0.06]">
          <ProductCardFooter product={product} lang={lang} cardBg={cardBg} showDescription layout="panel" />
        </div>
      </div>
    );
  }

  return (
    <div
      dir={lang === "en" ? "ltr" : "rtl"}
      className={`relative flex h-full min-h-0 flex-col overflow-visible rounded-2xl ${className ?? ""}`}
      style={{ background: cardBg }}
    >
      <div
        className="flex-none w-full"
        style={{ paddingInline: PRODUCT_CARD_PAD_X, paddingTop: PRODUCT_CARD_PAD_TOP }}
      >
        <div
          className="relative w-full overflow-hidden rounded-2xl bg-white"
          style={{ aspectRatio: PRODUCT_IMAGE_ASPECT }}
        >
          <ProductImageBadge product={product} lang={lang} size="md" placement="inset" />
          {heroImage ? (
            <MenuProductImage
              src={heroImage}
              alt={localized.name}
              className="absolute inset-0 h-full w-full object-cover object-center"
              placeholder={
                <span className="flex h-full items-center justify-center text-sm font-bold text-muted-foreground/50">
                  {labels[lang].noImage}
                </span>
              }
            />
          ) : (
            <span className="flex h-full items-center justify-center text-sm font-bold text-muted-foreground/50">
              {labels[lang].noImage}
            </span>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ProductCardFooter product={product} lang={lang} cardBg={cardBg} showDescription />
      </div>
    </div>
  );
};
