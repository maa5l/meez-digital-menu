/**
 * مقاس بانر الهيدر الرسمي — مُحسَّن لعرض الآيباد أفقي.
 * العرض المنطقي ~1024px بارتفاع هيدر ~240px (object-cover، نسبة 3:1).
 */
export const HEADER_IMAGE_SPEC = {
  recommendedWidth: 2048,
  recommendedHeight: 682,
  minWidth: 1024,
  minHeight: 341,
  maxWidth: 4096,
  maxHeight: 1366,
  targetAspect: 3,
  jpegQuality: 0.92,
  /** أبعاد العرض على شاشة الآيباد (للمرجع في لوحة التحكم) */
  displayWidth: 1024,
  displayHeight: 240,
} as const;

export function formatHeaderImageSpecLabel(): string {
  const { recommendedWidth, recommendedHeight, targetAspect } = HEADER_IMAGE_SPEC;
  return `${recommendedWidth}×${recommendedHeight} بكسل (نسبة ${targetAspect}:1)`;
}

export function formatHeaderImageDisplayLabel(): string {
  const { displayWidth, displayHeight } = HEADER_IMAGE_SPEC;
  return `${displayWidth}×${displayHeight} بكسل على الآيباد أفقي`;
}
