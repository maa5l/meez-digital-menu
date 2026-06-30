import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Coffee,
  Droplets,
  Flame,
  Globe,
  Leaf,
  MapPin,
  Mountain,
  Sparkles,
  Sprout,
  Thermometer,
  Timer,
  User,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import {
  cropFieldLabels,
  localizeBrewing,
  localizeCrop,
  parseFlavorNotes,
  type LocalizedCrop,
} from "@/lib/crop-i18n";
import type { Crop } from "@/types/domain";
import type { MenuLang } from "@/lib/product-i18n";

export type CropProfileField = {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
};

export type CropProfile = {
  localized: LocalizedCrop;
  originFields: CropProfileField[];
  specFields: CropProfileField[];
  sensoryFields: CropProfileField[];
  flavorNotes: string[];
  brewing: ReturnType<typeof localizeBrewing>;
  description: string;
};

function field(
  key: string,
  label: string,
  value: string,
  icon: LucideIcon,
): CropProfileField | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—") return null;
  return { key, label, value: trimmed, icon };
}

export function buildCropProfile(crop: Crop, lang: MenuLang): CropProfile {
  const L = cropFieldLabels[lang];
  const localized = localizeCrop(crop, lang);

  const originFields = [
    field("country", L.country, localized.country, Globe),
    field("region", L.region, localized.region, MapPin),
    field("farm", L.farm, localized.farm, Sprout),
    field("producer", L.producer, localized.producer, User),
  ].filter(Boolean) as CropProfileField[];

  const specFields = [
    field("variety", L.variety, localized.variety, Leaf),
    field("process", L.process, localized.process, Droplets),
    field("altitude", L.altitude, localized.altitude, Mountain),
    field("roastLevel", L.roastLevel, localized.roastLevel, Flame),
    field("roastDate", L.roastDate, localized.roastDate, Calendar),
  ].filter(Boolean) as CropProfileField[];

  const sensoryFields = [
    field("aroma", L.aroma, localized.aroma, Wind),
    field("acidity", L.acidity, localized.acidity, Zap),
    field("body", L.body, localized.body, Waves),
    field("sweetness", L.sweetness, localized.sweetness, Sparkles),
  ].filter(Boolean) as CropProfileField[];

  return {
    localized,
    originFields,
    specFields,
    sensoryFields,
    flavorNotes: parseFlavorNotes(localized.notes),
    brewing: localizeBrewing(crop.brewing, lang),
    description: localized.description,
  };
}

export function brewingDisplayFields(
  brewing: NonNullable<ReturnType<typeof localizeBrewing>>,
  lang: MenuLang,
): CropProfileField[] {
  const L = cropFieldLabels[lang];
  return [
    field("method", L.brewingMethod, brewing.method, Coffee),
    field("waterTemp", L.waterTemp, brewing.waterTemp, Thermometer),
    field("ratio", L.brewRatio, brewing.ratio, Droplets),
    field("grindSize", L.grindSize, brewing.grindSize, Leaf),
    field("brewTime", L.brewTime, brewing.brewTime, Timer),
  ].filter(Boolean) as CropProfileField[];
}
