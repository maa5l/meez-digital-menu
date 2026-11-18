export type TextSide = "left" | "right";

/**
 * محاذاة الكتلة حسب حروف النص: العربي يمين، والإنجليزي يسار.
 * الأرقام والرموز تتبع الجهة الاحتياطية (عادةً لغة الواجهة).
 */
export function textBlockSide(value: string, fallback: TextSide): TextSide {
  for (const ch of value) {
    if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(ch)) return "right";
    if (/[A-Za-z]/.test(ch)) return "left";
  }
  return fallback;
}
