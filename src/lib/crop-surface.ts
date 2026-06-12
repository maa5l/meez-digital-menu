import type { Crop } from "@/types/domain";

export type CropSurface = {
  background: string;
  foreground: string;
  hasImageBg: boolean;
  imageUrl?: string;
};

/** خلفية الكرت/المودال — نفس منطق قوالب المحاصيل */
export function resolveCropSurface(
  crop: Crop,
  fallback: { textColor: string; cardColor?: string },
): CropSurface {
  const foreground = crop.textColor?.trim() || fallback.textColor;
  let background = crop.cardColor?.trim() || fallback.cardColor || `${fallback.textColor}15`;

  if (crop.bgType === "gradient" && crop.gradientColors?.length) {
    background = `linear-gradient(135deg, ${crop.gradientColors.join(", ")})`;
  } else if (crop.bgType === "color" && crop.cardColor?.trim()) {
    background = crop.cardColor;
  }

  const imageUrl = crop.image?.trim();
  const hasImageBg = crop.bgType === "image" && Boolean(imageUrl);

  return {
    background,
    foreground,
    hasImageBg,
    imageUrl: hasImageBg ? imageUrl : undefined,
  };
}
