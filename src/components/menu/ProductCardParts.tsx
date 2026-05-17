import { Riyal } from "@/components/Brand";
import type { Product } from "@/types/domain";

type Lang = "ar" | "en";

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

  return (
    <div
      className={compact ? "px-2.5 pb-2.5 pt-1" : "px-3 md:px-4 pb-3 md:pb-4 pt-1.5"}
      style={{ background: cardBg, color: "#1a1a1a" }}
    >
      <div className={`grid grid-cols-2 gap-x-3 ${compact ? "gap-y-1.5" : "gap-y-2.5"}`}>
        <div className="space-y-2">
          <InfoRow align="right" label={t.name} value={product.name} bold />
          <InfoRow align="right" label={t.calories} value={String(product.calories)} />
        </div>
        <div className="space-y-2">
          <InfoRow
            align="left"
            label={t.price}
            value={
              <span className="inline-flex items-center gap-0.5">
                {product.price} <Riyal className="w-2.5 h-2.5 md:w-3 md:h-3" />
              </span>
            }
            bold
          />
          <InfoRow align="left" label={t.allergens} value={product.allergens?.trim() || "—"} />
        </div>
        {!compact && product.description?.trim() && (
          <div className="col-span-2 w-full pt-2 mt-0.5 border-t border-black/10">
            <InfoRow align="right" rtl label={t.description} value={product.description} clamp />
          </div>
        )}
      </div>
      {cropLine && !compact && (
        <p className="text-[10px] md:text-xs opacity-75 font-semibold mt-2 pt-2 border-t border-black/10 text-right" dir="rtl">
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
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full rounded-[1.25rem] md:rounded-[1.5rem] overflow-hidden text-start transition-all border-2 border-black/[0.07]"
    style={{
      background: cardBg,
      boxShadow: active ? `0 0 0 2px ${accentColor}` : undefined,
    }}
  >
    <div className="flex flex-row-reverse gap-0">
      <div className="w-[72px] md:w-[80px] shrink-0 m-2 self-stretch min-h-[76px]">
        <div className="h-full bg-white rounded-xl overflow-hidden flex items-center justify-center">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-[88%] h-[88%] object-contain"
            />
          ) : (
            <span className="text-[9px] text-muted-foreground/50 font-bold text-center px-1">
              {labels[lang].img}
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <ProductCardFooter product={product} lang={lang} cardBg={cardBg} compact />
      </div>
    </div>
  </button>
);

export const ProductDetailCard = ({
  product,
  lang,
  cardBg,
}: {
  product: Product;
  lang: Lang;
  cardBg: string;
}) => (
  <div
    className="rounded-[1.5rem] md:rounded-[2rem] overflow-hidden h-full flex flex-col border-2 border-black/[0.07]"
    style={{ background: cardBg }}
  >
    <div className="flex-1 m-3 md:m-4 mb-0 min-h-[200px] md:min-h-[280px]">
      <div className="h-full bg-white rounded-[1.25rem] overflow-hidden flex items-center justify-center">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="max-h-[85%] max-w-[85%] object-contain"
          />
        ) : (
          <span className="text-sm font-bold text-muted-foreground/50">{labels[lang].noImage}</span>
        )}
      </div>
    </div>
    <ProductCardFooter product={product} lang={lang} cardBg={cardBg} />
  </div>
);
