import type { CSSProperties } from "react";
import type { MenuSettings } from "@/types/domain";
import { sanitizeHeaderAllergenIds } from "@/constants/allergens";

/** ألوان منيو واحد (خلفية، نص، مميّز، بطاقات) */
export type MenuPalette = {
  bgColor: string;
  textColor: string;
  accentColor: string;
  cardColor?: string;
  bgImage?: string;
};

function normalizeBgImage(bgImage?: string): string | undefined {
  const trimmed = bgImage?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanPalette(palette: MenuPalette): MenuPalette {
  return {
    ...palette,
    bgImage: normalizeBgImage(palette.bgImage),
  };
}

export const defaultProductsPalette: MenuPalette = {
  bgColor: "#F1EFEC",
  textColor: "#030303",
  accentColor: "#3068A8",
  cardColor: "#ededed",
};

export const defaultCropsPalette: MenuPalette = {
  bgColor: "#1A1512",
  textColor: "#F4EDE4",
  accentColor: "#B8956B",
  cardColor: "#2C241C",
};

function legacyPalette(settings: MenuSettings): MenuPalette {
  return {
    bgColor: settings.bgColor ?? defaultProductsPalette.bgColor,
    textColor: settings.textColor ?? defaultProductsPalette.textColor,
    accentColor: settings.accentColor ?? defaultProductsPalette.accentColor,
    cardColor: settings.cardColor ?? defaultProductsPalette.cardColor,
    bgImage: settings.bgImage,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** يطبّق ترحيل الألوان القديمة إلى حزمتين منفصلتين */
export function migrateMenuSettings(settings: MenuSettings): MenuSettings {
  const safeSettings = isPlainObject(settings) ? settings : ({} as MenuSettings);
  const legacy = legacyPalette(safeSettings);
  const hadLegacyOnly =
    !safeSettings.productsColors &&
    !safeSettings.cropsColors &&
    Boolean(safeSettings.bgColor || safeSettings.textColor || safeSettings.accentColor);

  const cropsHeaderRaw = isPlainObject(safeSettings.cropsHeader)
    ? safeSettings.cropsHeader
    : undefined;
  const cropsHeader = cropsHeaderRaw
    ? {
        ...cropsHeaderRaw,
        headerAllergens: sanitizeHeaderAllergenIds(
          cropsHeaderRaw.headerAllergens as string[] | null | undefined,
        ),
      }
    : undefined;

  const productsColors = isPlainObject(safeSettings.productsColors)
    ? safeSettings.productsColors
    : {};
  const cropsColors = isPlainObject(safeSettings.cropsColors)
    ? safeSettings.cropsColors
    : {};

  return {
    ...safeSettings,
    productTemplate:
      safeSettings.productTemplate === "detail"
        ? "detail"
        : safeSettings.productTemplate === "featured"
          ? "featured"
          : String(safeSettings.productTemplate ?? "") === "split"
            ? "detail"
            : "featured",
    cropsTemplate:
      safeSettings.cropsTemplate === "pureshelf" ? "pureshelf" : "molo",
    headerAllergens: sanitizeHeaderAllergenIds(safeSettings.headerAllergens),
    cropsHeader,
    productsColors: {
      ...defaultProductsPalette,
      ...(hadLegacyOnly ? legacy : {}),
      ...productsColors,
    },
    cropsColors: {
      ...defaultCropsPalette,
      ...cropsColors,
    },
  };
}

export function getProductsPalette(settings: MenuSettings): MenuPalette {
  return cleanPalette(migrateMenuSettings(settings).productsColors!);
}

export function getCropsPalette(settings: MenuSettings): MenuPalette {
  return cleanPalette(migrateMenuSettings(settings).cropsColors!);
}

export function palettePageStyle(palette: MenuPalette): CSSProperties {
  const cleaned = cleanPalette(palette);
  return cleaned.bgImage
    ? {
        backgroundImage: `linear-gradient(${cleaned.bgColor}cc, ${cleaned.bgColor}ee), url(${cleaned.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: cleaned.textColor,
      }
    : { background: cleaned.bgColor, color: cleaned.textColor };
}
