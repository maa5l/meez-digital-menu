import { processImageFilePreserveAspect } from "./canvas-image";

/** صورة محصول عرضية — ضغط مع الحفاظ على النسبة (لتقليل localStorage) */
export const CROP_LANDSCAPE_IMAGE_SPEC = {
  recommendedWidth: 1280,
  recommendedHeight: 960,
  minWidth: 400,
  minHeight: 300,
  maxLongEdge: 1280,
  jpegQuality: 0.78,
} as const;

/** صورة محصول عمودية — ضغط مع الحفاظ على النسبة */
export const CROP_PORTRAIT_IMAGE_SPEC = {
  recommendedWidth: 900,
  recommendedHeight: 1200,
  minWidth: 300,
  minHeight: 400,
  maxLongEdge: 1200,
  jpegQuality: 0.78,
} as const;

export async function processCropLandscapeImageFile(file: File): Promise<string> {
  const processed = await processImageFilePreserveAspect(file, CROP_LANDSCAPE_IMAGE_SPEC);
  return processed.dataUrl;
}

export async function processCropPortraitImageFile(file: File): Promise<string> {
  const processed = await processImageFilePreserveAspect(file, CROP_PORTRAIT_IMAGE_SPEC);
  return processed.dataUrl;
}
