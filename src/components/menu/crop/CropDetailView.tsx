import CropBrewingCard from "@/components/menu/crop/CropBrewingCard";
import CropFlavorChips from "@/components/menu/crop/CropFlavorChips";
import CropHeroImage from "@/components/menu/crop/CropHeroImage";
import CropInfoCard from "@/components/menu/crop/CropInfoCard";
import { buildCropProfile } from "@/lib/crop-profile";
import { cropFieldLabels } from "@/lib/crop-i18n";
import type { Crop } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

type Props = {
  crop: Crop;
  lang: MenuLang;
  accentColor: string;
  featured?: boolean;
  variant?: "full" | "embedded" | "compact";
  className?: string;
  onHeroClick?: () => void;
};

function SectionTitle({
  title,
  lang,
  className,
}: {
  title: string;
  lang: MenuLang;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "font-bold uppercase tracking-wider text-[#1a1a1a]/40",
        "text-[10px] md:text-[11px]",
        lang === "ar" ? "text-right" : "text-left",
        className,
      )}
    >
      {title}
    </h3>
  );
}

function InfoGrid({
  fields,
  lang,
  accentColor,
  compact,
}: {
  fields: ReturnType<typeof buildCropProfile>["originFields"];
  lang: MenuLang;
  accentColor: string;
  compact?: boolean;
}) {
  if (fields.length === 0) return null;
  return (
    <div
      className={cn(
        "grid gap-2.5",
        compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-2 lg:grid-cols-3",
        compact ? "md:gap-2" : "md:gap-3",
      )}
    >
      {fields.map((f) => (
        <CropInfoCard
          key={f.key}
          icon={f.icon}
          label={f.label}
          value={f.value}
          lang={lang}
          compact={compact}
          accentColor={accentColor}
        />
      ))}
    </div>
  );
}

/** عرض تفاصيل المحصول الكامل — كتالوج قهوة متخصصة */
const CropDetailView = ({
  crop,
  lang,
  accentColor,
  featured,
  variant = "full",
  className,
  onHeroClick,
}: Props) => {
  const L = cropFieldLabels[lang];
  const profile = buildCropProfile(crop, lang);
  const isCompact = variant === "compact";
  const isEmbedded = variant === "embedded";
  const imageUrl = crop.image?.trim();

  return (
    <div
      className={cn("flex flex-col", isCompact ? "gap-4" : "gap-5 md:gap-6", className)}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className={cn("space-y-3", isEmbedded && "md:space-y-4", !isCompact && "ipad-lg:grid ipad-lg:grid-cols-2 ipad-lg:gap-6 ipad-lg:space-y-0")}>
        <div
          className={cn(onHeroClick && "cursor-pointer touch-manipulation")}
          onClick={onHeroClick}
          onKeyDown={
            onHeroClick
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onHeroClick();
                  }
                }
              : undefined
          }
          role={onHeroClick ? "button" : undefined}
          tabIndex={onHeroClick ? 0 : undefined}
        >
          <CropHeroImage
            imageUrl={imageUrl}
            alt={profile.localized.beanName}
            lang={lang}
            rounded={isCompact ? "xl" : "2xl"}
            overlay={isCompact}
            className={!isCompact && !isEmbedded ? "max-h-[min(38dvh,340px)] w-full" : undefined}
          />
        </div>

        <div className={cn("space-y-2", lang === "ar" ? "text-right" : "text-left", !isCompact && "ipad-lg:flex ipad-lg:flex-col ipad-lg:justify-center")}>
          {featured && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white"
              style={{ background: accentColor }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {L.featured}
            </span>
          )}
          <h2
            className={cn(
              "font-display font-black leading-tight text-[#1a1a1a]",
              isCompact ? "text-xl md:text-2xl" : "text-2xl md:text-3xl lg:text-4xl",
            )}
          >
            {profile.localized.beanName}
          </h2>
          {!isCompact && profile.originFields.length > 0 && (
            <p className="text-sm font-semibold text-[#1a1a1a]/55 md:text-base">
              {[profile.localized.country, profile.localized.region, profile.localized.process]
                .filter((v) => v && v !== "—")
                .join(" · ")}
            </p>
          )}
        </div>
      </div>

      {profile.originFields.length > 0 && (
        <section className="space-y-2.5 md:space-y-3">
          <SectionTitle title={L.origin} lang={lang} />
          <InfoGrid
            fields={profile.originFields}
            lang={lang}
            accentColor={accentColor}
            compact={isCompact}
          />
        </section>
      )}

      {profile.specFields.length > 0 && (
        <section className="space-y-2.5 md:space-y-3">
          <SectionTitle title={L.specifications} lang={lang} />
          <InfoGrid
            fields={profile.specFields}
            lang={lang}
            accentColor={accentColor}
            compact={isCompact}
          />
        </section>
      )}

      {profile.sensoryFields.length > 0 && (
        <section className="space-y-2.5 md:space-y-3">
          <SectionTitle title={L.sensory} lang={lang} />
          <InfoGrid
            fields={profile.sensoryFields}
            lang={lang}
            accentColor={accentColor}
            compact={isCompact}
          />
        </section>
      )}

      {profile.flavorNotes.length > 0 && (
        <CropFlavorChips
          notes={profile.flavorNotes}
          lang={lang}
          accentColor={accentColor}
        />
      )}

      <CropBrewingCard brewing={crop.brewing} lang={lang} accentColor={accentColor} />

      {profile.description && (
        <section className="space-y-2 border-t border-black/[0.06] pt-4 md:pt-5">
          <SectionTitle title={L.description} lang={lang} />
          <p
            className={cn(
              "text-sm leading-relaxed text-[#1a1a1a]/80 md:text-base md:leading-relaxed",
              lang === "ar" ? "text-right" : "text-left",
            )}
          >
            {profile.description}
          </p>
        </section>
      )}
    </div>
  );
};

export default CropDetailView;
