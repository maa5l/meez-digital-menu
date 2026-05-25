import { cropFieldLabels, localizeCrop } from "@/lib/crop-i18n";
import type { Crop } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";

type Lang = MenuLang;

/** عنوان المحصول — لغة واحدة، وسط، خط كبير */
export const CropTitle = ({
  crop,
  lang,
  className,
}: {
  crop: Crop;
  lang: Lang;
  className?: string;
}) => {
  const localized = localizeCrop(crop, lang);
  return (
    <div className={cn("text-center", className)}>
      <h2
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="font-display text-3xl font-black leading-tight md:text-4xl lg:text-5xl"
      >
        {localized.beanName}
      </h2>
    </div>
  );
};

/** حقل واحد — تسمية + قيمة بالوسط */
export const CropField = ({
  label,
  value,
  lang,
  size = "card",
}: {
  label: string;
  value: string;
  lang: Lang;
  size?: "card" | "modal";
}) => (
  <div className="text-center">
    <div
      className={cn(
        "font-bold opacity-70",
        size === "modal" ? "text-sm md:text-base" : "text-sm md:text-lg",
      )}
    >
      {label}
    </div>
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={cn(
        "mt-1.5 font-display font-black leading-snug",
        size === "modal" ? "text-xl md:text-2xl" : "text-xl md:text-2xl lg:text-3xl",
      )}
    >
      {value || "—"}
    </div>
  </div>
);

/** شبكة حقول المحصول */
export const CropFieldsGrid = ({
  crop,
  lang,
  size = "card",
  className,
}: {
  crop: Crop;
  lang: Lang;
  size?: "card" | "modal";
  className?: string;
}) => {
  const L = cropFieldLabels[lang];
  const localized = localizeCrop(crop, lang);

  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-3xl grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-10",
        className,
      )}
    >
      <CropField size={size} lang={lang} label={L.country} value={localized.country} />
      <CropField size={size} lang={lang} label={L.process} value={localized.process} />
      <CropField size={size} lang={lang} label={L.variety} value={localized.variety} />
      <CropField size={size} lang={lang} label={L.altitude} value={localized.altitude} />
    </div>
  );
};

/** ملاحظات — لغة واحدة، وسط */
export const CropNotes = ({
  crop,
  lang,
  borderColor,
  className,
}: {
  crop: Crop;
  lang: Lang;
  borderColor?: string;
  className?: string;
}) => {
  const localized = localizeCrop(crop, lang);
  if (!localized.notes) return null;

  return (
    <div
      className={cn("mt-8 border-t pt-6 text-center", className)}
      style={borderColor ? { borderColor: `${borderColor}25` } : undefined}
    >
      <div className="text-sm font-bold opacity-70 md:text-base">{cropFieldLabels[lang].notes}</div>
      <p
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="mt-2 text-lg font-bold leading-relaxed md:text-xl lg:text-2xl"
      >
        {localized.notes}
      </p>
    </div>
  );
};

/** عنصر القائمة الجانبية */
export const CropListItemLabel = ({ crop, lang }: { crop: Crop; lang: Lang }) => {
  const localized = localizeCrop(crop, lang);
  return (
    <div className="text-center">
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="font-display text-sm font-black leading-tight md:text-base lg:text-lg"
      >
        {localized.beanName}
      </div>
    </div>
  );
};
