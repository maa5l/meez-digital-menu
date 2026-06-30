import { useEffect, useState, type CSSProperties } from "react";
import { Sparkles } from "lucide-react";
import { buildCropProfile } from "@/lib/crop-profile";
import { cropFieldLabels } from "@/lib/crop-i18n";
import { resolveCropSurface } from "@/lib/crop-surface";
import type { Crop } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";

type Props = {
  crop: Crop;
  lang: MenuLang;
  accentColor: string;
  fallbackTextColor: string;
  featured?: boolean;
  className?: string;
  scrollable?: boolean;
  /** carousel = بطاقة عرض أفقي بملء الارتفاع */
  variant?: "default" | "carousel" | "feature";
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
  const isFeature = variant === "feature" || scrollable;
  const L = cropFieldLabels[lang];
  const profile = buildCropProfile(crop, lang);
  const surface = resolveCropSurface(crop, {
    textColor: fallbackTextColor,
    cardColor: `${fallbackTextColor}15`,
  });
  const imageUrl = crop.image?.trim();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [crop.id, imageUrl]);

  const showImage = Boolean(imageUrl) && !imageFailed;
  const fg = showImage ? "#ffffff" : surface.foreground;

  const content = (
    <div
      className={cn(
        "relative z-10 flex w-full flex-col items-center justify-center text-center",
        isCarousel
          ? "h-full min-h-0 gap-2.5 overflow-hidden px-4 py-5 md:gap-3 md:px-5 md:py-6"
          : "gap-5 px-6 py-8 md:gap-6 md:px-8 md:py-10",
        isFeature && !isCarousel && "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
      )}
    >
      {featured && (
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm",
            isCarousel && "px-2.5 py-0.5 text-[10px]",
          )}
          style={{ background: accentColor }}
        >
          <Sparkles className={cn("h-3.5 w-3.5", isCarousel && "h-3 w-3")} />
          {L.featured}
        </span>
      )}

      <h2
        dir={lang === "ar" ? "rtl" : "ltr"}
        className={cn(
          "shrink-0 font-display font-black leading-tight",
          isCarousel ? "text-xl md:text-2xl ipad-lg:text-[1.65rem]" : "text-2xl md:text-3xl lg:text-4xl",
        )}
        style={{ color: fg }}
      >
        {profile.localized.beanName}
      </h2>

      <div
        className={cn(
          "flex w-full min-h-0 flex-col items-center",
          isCarousel ? "max-w-[92%] flex-1 gap-2.5 md:gap-3" : "max-w-xs gap-4 sm:max-w-sm sm:gap-5",
        )}
      >
        <CenteredField label={L.country} value={profile.localized.country} lang={lang} fg={fg} compact={isCarousel} />
        <CenteredField label={L.process} value={profile.localized.process} lang={lang} fg={fg} compact={isCarousel} />
        <CenteredField label={L.variety} value={profile.localized.variety} lang={lang} fg={fg} compact={isCarousel} />
        <CenteredField label={L.altitude} value={profile.localized.altitude} lang={lang} fg={fg} compact={isCarousel} />
      </div>

      {profile.localized.notes && (
        <p
          dir={lang === "ar" ? "rtl" : "ltr"}
          className={cn(
            "shrink-0 font-bold leading-relaxed opacity-90",
            isCarousel
              ? "line-clamp-2 max-w-[92%] text-sm md:text-base"
              : "max-w-sm text-base md:text-lg lg:text-xl",
          )}
          style={{ color: fg }}
        >
          {profile.localized.notes}
        </p>
      )}
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
        isCarousel && "h-full min-h-0",
        onClick && "cursor-pointer touch-manipulation transition-transform active:scale-[0.99]",
        featured && "ring-2 ring-offset-2",
        className,
      )}
      style={{
        background: showImage ? undefined : surface.background,
        color: fg,
        ...style,
        ...(featured
          ? { boxShadow: `0 0 0 2px ${accentColor}`, borderColor: accentColor }
          : {}),
      }}
      aria-label={profile.localized.beanName}
    >
      {showImage && (
        <>
          <img
            src={imageUrl}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/55" />
        </>
      )}

      {isFeature && !isCarousel ? (
        <div className="relative flex min-h-0 flex-1 flex-col">{content}</div>
      ) : (
        content
      )}
    </article>
  );
};

export default CropCenteredCard;
