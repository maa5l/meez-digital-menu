/**
 * بانر الهيدر — أي مقاس مرفوع مقبول؛ القيم أدناه للتوصية والضغط فقط.
 */
export const HEADER_IMAGE_SPEC = {
  recommendedWidth: 2048,
  recommendedHeight: 682,
  /** حدود مرنة — لا تُرفض إلا الأبعاد الشاذة جداً */
  minWidth: 1,
  minHeight: 1,
  maxWidth: 8192,
  maxHeight: 8192,
  /** أطول ضلع بعد الضغط (لتقليل حجم التخزين) */
  maxOutputLongEdge: 2048,
  targetAspect: 3,
  jpegQuality: 0.92,
  /** مرجع عرض الآيباد أفقي (~3:1) — ارتفاع مقاس فعلياً */
  displayWidth: 1024,
  displayHeight: 345,
} as const;

export function formatHeaderImageSpecLabel(): string {
  const { recommendedWidth, recommendedHeight, targetAspect } = HEADER_IMAGE_SPEC;
  return `${recommendedWidth}×${recommendedHeight} بكسل (موصى — نسبة ${targetAspect}:1)`;
}

export function formatHeaderImageDisplayLabel(): string {
  return "أي مقاس — يُعرض بحسب نسبة الصورة (object-cover)";
}
