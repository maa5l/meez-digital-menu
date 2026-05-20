import { Riyal } from "@/components/Brand";
import { localizeProduct, type MenuLang } from "@/lib/product-i18n";
import type { Product } from "@/types/domain";
import { Ban, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type Lang = MenuLang;

const labels = {
  ar: {
    name: "الاسم",
    price: "السعر",
    calories: "السعرات",
    allergens: "مسببات الحساسية",
    description: "الوصف",
    crop: "المحصول",
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
    noImage: "Product image",
    img: "Img",
  },
} as const;

function cropSummary(product: Product): string | null {
  const c = product.cropInfo;
  if (!c?.beanName?.trim()) return null;
  return [c.beanName, c.country, c.process].filter(Boolean).join(" · ");
}

const InfoRow = ({
  label,
  value,
  bold,
  clamp,
  align,
  rtl,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  clamp?: boolean;
  align: "right" | "left";
  rtl?: boolean;
}) => (
  <div className={`space-y-0.5 ${align === "right" ? "text-right" : "text-left"}`}>
    <div className="font-bold opacity-55 text-[9px] md:text-[10px] leading-none">{label}</div>
    <div
      dir={rtl ? "rtl" : undefined}
      className={`text-[#1a1a1a] leading-snug ${bold ? "font-black text-xs md:text-sm" : "font-semibold text-[10px] md:text-xs"} ${
        clamp ? "line-clamp-3 opacity-85" : ""
      } ${align === "right" ? "text-right" : "text-left"}`}
    >
      {value}
    </div>
  </div>
);

export const ProductCardFooter = ({
  product,
  lang,
  cardBg,
  compact,
}: {
  product: Product;
  lang: Lang;
  cardBg: string;
  compact?: boolean;
}) => {
  const t = labels[lang];
  const cropLine = cropSummary(product);
  const localized = localizeProduct(product, lang);
  const isEn = lang === "en";
  const primaryAlign = isEn ? "left" : "right";
  const secondaryAlign = isEn ? "right" : "left";

  return (
    <div
      className={compact ? "px-2.5 pb-2.5 pt-1" : "px-3 md:px-4 pb-3 md:pb-4 pt-1.5"}
      style={{ background: cardBg, color: "#1a1a1a" }}
      dir={isEn ? "ltr" : "rtl"}
    >
      <div className={`grid grid-cols-2 gap-x-3 ${compact ? "gap-y-1.5" : "gap-y-2.5"}`}>
        <div className="space-y-2">
          <InfoRow align={primaryAlign} label={t.name} value={localized.name} bold rtl={!isEn} />
          <InfoRow align={primaryAlign} label={t.calories} value={String(product.calories)} />
        </div>
        <div className="space-y-2">
          <InfoRow
            align={secondaryAlign}
            label={t.price}
            value={
              <span className="inline-flex items-center gap-0.5">
                {product.price} <Riyal className="w-2.5 h-2.5 md:w-3 md:h-3" />
              </span>
            }
            bold
          />
          <InfoRow align={secondaryAlign} label={t.allergens} value={localized.allergens?.trim() || "—"} />
        </div>
        {!compact && localized.description?.trim() && (
          <div className="col-span-2 w-full pt-2 mt-0.5 border-t border-black/10">
            <InfoRow align={primaryAlign} rtl={!isEn} label={t.description} value={localized.description} clamp />
          </div>
        )}
      </div>
      {cropLine && !compact && (
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
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-[1.5rem] md:rounded-[1.75rem] overflow-hidden text-start transition-shadow hover:shadow-lg group w-full flex flex-col border-2 border-black/[0.07]"
    style={{ background: cardBg }}
  >
    <div className="m-2.5 md:m-3 mb-0 shrink-0">
      <div className="aspect-[4/5] bg-white rounded-[1.1rem] md:rounded-[1.15rem] overflow-hidden flex items-center justify-center">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-[88%] h-[88%] object-contain group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <span className="text-xs font-bold text-muted-foreground/40 px-2 text-center">
            {labels[lang].noImage}
          </span>
        )}
      </div>
    </div>
    <ProductCardFooter product={product} lang={lang} cardBg={cardBg} />
  </button>
);

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

  const textBlock = (
    <div className="flex min-h-[72px] min-w-0 flex-1 flex-col justify-between py-0.5">
      <h3 className="line-clamp-2 font-black text-sm leading-tight text-[#1a1a1a]">{localized.name}</h3>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="inline-flex items-center gap-0.5 font-black text-sm text-[#1a1a1a]">
          {product.price} <Riyal className="h-3.5 w-3.5" />
        </span>
        <span className="inline-flex items-center gap-1 font-bold text-sm text-[#1a1a1a]/85">
          {localized.allergens?.trim() ? <Ban className="h-3.5 w-3.5 shrink-0 opacity-45" /> : null}
          <Flame className="h-3.5 w-3.5 shrink-0 text-orange-500" />
          {product.calories}
        </span>
      </div>
    </div>
  );

  const imageBlock = (
    <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
      {product.image ? (
        <img src={product.image} alt={localized.name} className="h-[88%] w-[88%] object-contain" />
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
    className="flex w-full gap-3 rounded-2xl p-3 text-start transition-all"
    style={{
      background: cardBg,
      boxShadow: active ? `inset 0 0 0 2px ${accentColor}` : undefined,
    }}
  >
    {isEn ? (
      <>
        {textBlock}
        {imageBlock}
      </>
    ) : (
      <>
        {imageBlock}
        {textBlock}
      </>
    )}
  </button>
  );
};

export const ProductDetailCard = ({
  product,
  lang,
  cardBg,
  accentColor,
  className,
}: {
  product: Product;
  lang: Lang;
  cardBg: string;
  accentColor: string;
  className?: string;
}) => {
  const localized = localizeProduct(product, lang);

  return (
    <div
      dir={lang === "en" ? "ltr" : "rtl"}
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl ${className ?? ""}`}
      style={{ background: cardBg }}
    >
      <div className="flex min-h-0 flex-1 flex-col p-3 pb-0">
        <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-2xl bg-white">
          {product.image ? (
            <img
              src={product.image}
              alt={localized.name}
              className="max-h-[92%] max-w-[92%] object-contain"
            />
          ) : (
            <span className="text-sm font-bold text-muted-foreground/50">{labels[lang].noImage}</span>
          )}
        </div>
      </div>
      <ProductCardFooter product={product} lang={lang} cardBg={cardBg} />
    </div>
  );
};
