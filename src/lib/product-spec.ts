/** صورة بطل عمودية */
export const PRODUCT_HERO_ASPECT_PORTRAIT = "3 / 4" as const;

/** صورة بطل عرضية */
export const PRODUCT_HERO_ASPECT_LANDSCAPE = "16 / 9" as const;

type ProductImageFields = {
  image?: string | null;
  imageLandscape?: string | null;
  imagePortrait?: string | null;
};

/** صورة عرضية — الحقل المنفصل أو الصورة القديمة للتوافق */
export function getProductLandscapeImage(product: ProductImageFields): string | undefined {
  const dedicated = product.imageLandscape?.trim();
  if (dedicated) return dedicated;
  return product.image?.trim() || undefined;
}

/** صورة عمودية */
export function getProductPortraitImage(product: ProductImageFields): string | undefined {
  return product.imagePortrait?.trim() || undefined;
}

/** خلفية البطاقة / المنيو: عرضية أولاً ثم عمودية */
export function getProductCardImage(product: ProductImageFields): string | undefined {
  return getProductLandscapeImage(product) || getProductPortraitImage(product);
}

export function productHasRequiredImages(product: ProductImageFields): boolean {
  return Boolean(getProductLandscapeImage(product)?.trim() && getProductPortraitImage(product)?.trim());
}
