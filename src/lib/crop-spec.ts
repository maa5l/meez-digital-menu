/** نسبة عرض صورة المحصول في الكتالوج — عرضية */
export const CROP_HERO_ASPECT = "4 / 3" as const;

/** صورة بطل عمودية (تفاصيل) */
export const CROP_HERO_ASPECT_PORTRAIT = "3 / 4" as const;

/** صورة بطل عرضية (تفاصيل) */
export const CROP_HERO_ASPECT_LANDSCAPE = "16 / 9" as const;

export const CROP_CARD_IMAGE_ASPECT = "5 / 4" as const;

export type CropImageOrientation = "portrait" | "landscape";

export function resolveCropHeroAspect(
  orientation?: CropImageOrientation | null,
): string {
  return orientation === "portrait"
    ? CROP_HERO_ASPECT_PORTRAIT
    : CROP_HERO_ASPECT_LANDSCAPE;
}

type CropImageFields = {
  image?: string | null;
  imageLandscape?: string | null;
  imagePortrait?: string | null;
};

/** صورة عرضية — الحقل المنفصل أو الصورة القديمة للتوافق */
export function getCropLandscapeImage(crop: CropImageFields): string | undefined {
  const dedicated = crop.imageLandscape?.trim();
  if (dedicated) return dedicated;
  return crop.image?.trim() || undefined;
}

/** صورة عمودية — حقل منفصل فقط */
export function getCropPortraitImage(crop: CropImageFields): string | undefined {
  return crop.imagePortrait?.trim() || undefined;
}

/** خلفية البطاقة: عرضية أولاً ثم عمودية ثم القديمة */
export function getCropCardBackgroundImage(crop: CropImageFields): string | undefined {
  return getCropLandscapeImage(crop) || getCropPortraitImage(crop);
}

export function cropHasAnyImage(crop: CropImageFields): boolean {
  return Boolean(getCropLandscapeImage(crop) || getCropPortraitImage(crop));
}
