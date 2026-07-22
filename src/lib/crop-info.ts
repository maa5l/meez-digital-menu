import type { Crop, CropInfo } from "@/types/domain";

export function cropToCropInfo(crop: Crop): CropInfo {
  return {
    beanName: crop.beanName,
    country: crop.country,
    process: crop.process,
    variety: crop.variety,
    altitude: crop.altitude,
    notes: crop.notes,
  };
}

export function cropSelectLabel(crop: Crop): string {
  const parts = [crop.beanName.trim(), crop.country.trim()].filter(Boolean);
  return parts.join(" · ") || "محصول بدون اسم";
}

/** سطر عرض المحصول — دائماً بالعربية حتى في وضع الإنجليزية */
export function cropDisplayLine(info: CropInfo | undefined | null): string | null {
  if (!info?.beanName?.trim()) return null;
  return [info.beanName, info.country, info.process].filter(Boolean).join(" · ");
}
