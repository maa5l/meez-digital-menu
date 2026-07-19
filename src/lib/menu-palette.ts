import type { CSSProperties } from "react";
import type { MenuSettings } from "@/types/domain";

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

/** يطبّق ترحيل الألوان القديمة إلى حزمتين منفصلتين */
export function migrateMenuSettings(settings: MenuSettings): MenuSettings {
  const legacy = legacyPalette(settings);
  const hadLegacyOnly =
    !settings.productsColors &&
    !settings.cropsColors &&
    Boolean(settings.bgColor || settings.textColor || settings.accentColor);

  return {
    ...settings,
    productsColors: {
      ...defaultProductsPalette,
      ...(hadLegacyOnly ? legacy : {}),
      ...settings.productsColors,
    },
    cropsColors: {
      ...defaultCropsPalette,
      ...settings.cropsColors,
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
