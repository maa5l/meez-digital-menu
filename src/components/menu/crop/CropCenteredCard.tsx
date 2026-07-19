import { useImageAutoRetry } from "@/hooks/useImageAutoRetry";
import { Sparkles } from "lucide-react";
import { buildCropProfile } from "@/lib/crop-profile";
import { cropFieldLabels } from "@/lib/crop-i18n";
import { resolveCropSurface } from "@/lib/crop-surface";
import type { Crop } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

type Props = {
  crop: Crop;
  lang: MenuLang;
  accentColor: string;
  fallbackTextColor: string;
  featured?: boolean;
  className?: string;
  scrollable?: boolean;
  /** carousel = بطاقة عرض أفقي | popup = نافذة منبثقة */
  variant?: "default" | "carousel" | "feature" | "popup";
  onClick?: () => void;
  style?: CSSProperties;
};

function CenteredField({
  label,
  value,
  lang,
  fg,
  compact,
}: {
  label: string;
  value: string;
  lang: MenuLang;
  fg: string;
  compact?: boolean;
}) {
  if (!value || value === "—") return null;
  return (
    <div className="shrink-0 text-center">
      <div
        className={cn("font-bold opacity-65", compact ? "text-[10px] md:text-xs" : "text-xs md:text-sm")}
        style={{ color: fg }}
      >
        {label}
      </div>
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        className={cn(
          "mt-0.5 font-display font-black leading-snug",
          compact ? "text-base md:text-lg" : "text-lg md:text-xl lg:text-2xl",
        )}
        style={{ color: fg }}
      >
        {value}
      </div>
    </div>
  );
}

/** بطاقة محصول — صورة خلفية كاملة + بيانات في الوسط بدون صناديق */
const CropCenteredCard = ({
  crop,
  lang,
  accentColor,
  fallbackTextColor,
  featured,
  className,
  scrollable = false,
  variant = "default",
  onClick,
  style,
}: Props) => {
  const isCarousel = variant === "carousel";
  const isPopup = variant === "popup";
  const isFeature = variant === "feature" || (scrollable && !isPopup);
  const isCompact = isCarousel || isPopup;
  const L = cropFieldLabels[lang];
  const profile = buildCropProfile(crop, lang);
  const surface = resolveCropSurface(crop, {
    textColor: fallbackTextColor,
    cardColor: `${fallbackTextColor}15`,
  });
  const imageUrl = crop.image?.trim();
  const { displaySrc, failed: imageFailed, handleError, reloadKey } = useImageAutoRetry(imageUrl);

  const showImage = Boolean(displaySrc) && !imageFailed;
  const fg = showImage ? "#ffffff" : surface.foreground;
  const pinFeaturedBadge = Boolean(featured && (isCarousel || isPopup));

  const content = (
    <div
      className={cn(
        "relative z-10 flex h-full w-full min-h-0 flex-col items-center justify-center text-center",
        isCompact
          ? "gap-2 overflow-hidden px-4 py-4 md:gap-2.5 md:px-5 md:py-5"
          : "gap-5 px-6 py-8 md:gap-6 md:px-8 md:py-10",
        isFeature && !isCompact && "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
      )}
    >
      <div
        className={cn(
          "flex w-full min-h-0 flex-col items-center justify-center",
          isCompact ? "max-w-[94%] gap-2 md:gap-2.5" : "max-w-xs gap-4 sm:max-w-sm sm:gap-5",
        )}
      >
        {featured && !pinFeaturedBadge && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm",
              isCompact && "px-2.5 py-0.5 text-[10px]",
            )}
            style={{ background: accentColor }}
          >
            <Sparkles className={cn("h-3.5 w-3.5", isCompact && "h-3 w-3")} />
            {L.featured}
          </span>
        )}

        <h2
          dir={lang === "ar" ? "rtl" : "ltr"}
          className={cn(
            "shrink-0 font-display font-black leading-tight",
            isCompact
              ? "text-lg md:text-xl ipad-lg:text-2xl"
              : "text-2xl md:text-3xl lg:text-4xl",
          )}
          style={{ color: fg }}
        >
          {profile.localized.beanName}
        </h2>

        <div
          className={cn(
            "flex w-full min-h-0 flex-col items-center justify-center",
            isCompact ? "gap-1.5 md:gap-2" : "gap-4 sm:gap-5",
          )}
        >
          <CenteredField label={L.country} value={profile.localized.country} lang={lang} fg={fg} compact={isCompact} />
          <CenteredField label={L.process} value={profile.localized.process} lang={lang} fg={fg} compact={isCompact} />
          <CenteredField label={L.variety} value={profile.localized.variety} lang={lang} fg={fg} compact={isCompact} />
          <CenteredField label={L.altitude} value={profile.localized.altitude} lang={lang} fg={fg} compact={isCompact} />
        </div>

        {profile.localized.notes && (
          <p
            dir={lang === "ar" ? "rtl" : "ltr"}
            className={cn(
              "shrink-0 font-bold leading-relaxed opacity-90",
              isCompact
                ? "line-clamp-2 max-w-full text-xs md:text-sm"
                : "max-w-sm text-base md:text-lg lg:text-xl",
            )}
            style={{ color: fg }}
          >
            {profile.localized.notes}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[1.75rem]",
        isCarousel && "h-full min-h-0 max-h-full",
        isPopup && scrollable && "overflow-y-auto overscroll-y-contain",
        onClick && "cursor-pointer touch-manipulation transition-transform active:scale-[0.99]",
        className,
      )}
      style={{
        background: showImage ? undefined : surface.background,
        color: fg,
        ...style,
        boxShadow: featured
          ? `inset 0 0 0 2px ${accentColor}, 0 8px 28px rgba(0,0,0,0.14)`
          : "0 8px 28px rgba(0,0,0,0.12)",
      }}
      aria-label={profile.localized.beanName}
    >
      {showImage && (
        <>
          <img
            key={reloadKey}
            src={displaySrc}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            decoding="async"
            onError={handleError}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/55" />
        </>
      )}

      {pinFeaturedBadge && (
        <span
          className={cn(
            "absolute top-3 z-20 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-md ring-1 ring-white/25 backdrop-blur-[2px] start-3 md:px-3 md:py-1 md:text-xs",
          )}
          style={{ background: accentColor }}
        >
          <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5" aria-hidden />
          {L.featured}
        </span>
      )}

      {isCarousel && onClick && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/60 via-black/30 to-transparent px-3 pb-3 pt-10">
          <span className="block text-center text-[10px] font-bold text-white/95 md:text-xs">
            {L.tapForDetails}
          </span>
        </div>
      )}

      {isFeature && !isCompact ? (
        <div className="relative flex min-h-0 flex-1 flex-col">{content}</div>
      ) : (
        content
      )}
    </article>
  );
};

export default CropCenteredCard;
