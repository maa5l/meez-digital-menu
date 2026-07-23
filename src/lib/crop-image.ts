import { processImageFile } from "./canvas-image";

/** صورة محصول عرضية — خلفية البطاقة (تُضغط تلقائياً) */
export const CROP_LANDSCAPE_IMAGE_SPEC = {
  recommendedWidth: 1600,
  recommendedHeight: 1200,
  minWidth: 400,
  minHeight: 300,
  jpegQuality: 0.85,
} as const;

/** صورة محصول عمودية — تفاصيل (تُضغط تلقائياً) */
export const CROP_PORTRAIT_IMAGE_SPEC = {
  recommendedWidth: 900,
  recommendedHeight: 1200,
  minWidth: 300,
  minHeight: 400,
  jpegQuality: 0.85,
} as const;

export async function processCropLandscapeImageFile(file: File): Promise<string> {
  return processImageFile(file, {
    ...CROP_LANDSCAPE_IMAGE_SPEC,
    fillColor: "#1a1a1a",
  });
}

export async function processCropPortraitImageFile(file: File): Promise<string> {
  return processImageFile(file, {
    ...CROP_PORTRAIT_IMAGE_SPEC,
    fillColor: "#1a1a1a",
  });
}
