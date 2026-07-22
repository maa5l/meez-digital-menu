import { z } from "zod";
import { HEX_COLOR_PATTERN } from "@/config/app";

const hexColor = z.string().regex(HEX_COLOR_PATTERN, "لون غير صالح");

const menuPaletteSchema = z.object({
  bgColor: hexColor,
  textColor: hexColor,
  accentColor: hexColor,
  cardColor: hexColor.optional(),
  bgImage: z.string().max(2_000_000).optional(),
});

const menuHeaderCustomizationSchema = z.object({
  featuredTitle: z.string().max(120).optional(),
  featuredSubtitle: z.string().max(200).optional(),
  featuredImage: z.string().max(2_000_000).optional(),
  headerBgColor: hexColor.optional(),
  headerTextColor: hexColor.optional(),
  logoImage: z.string().max(2_000_000).optional(),
  headerImage: z.string().max(2_000_000).optional(),
  headerImageAspectRatio: z.number().positive().finite().optional(),
  calorieTextColor: hexColor.optional(),
  showLanguageToggle: z.boolean().optional(),
  autoHideHeaderOnScroll: z.boolean().optional(),
  hideHeader: z.boolean().optional(),
});

export const menuSettingsSchema = z.object({
  productTemplate: z.enum(["featured", "detail"]),
  cropsTemplate: z.enum(["molo", "pureshelf"]),
  productsOrderMode: z.enum(["manual", "random"]).optional(),
  cropsOrderMode: z.enum(["manual", "random"]).optional(),
  productsColors: menuPaletteSchema.optional(),
  cropsColors: menuPaletteSchema.optional(),
  cropsHeader: menuHeaderCustomizationSchema.optional(),
  bgColor: hexColor.optional(),
  textColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  showBurnBar: z.boolean(),
  bgImage: z.string().url().optional().or(z.literal("")),
  cardColor: hexColor.optional(),
  featuredProductId: z.string().max(64).optional(),
  featuredCropId: z.string().max(64).optional(),
  featuredTitle: z.string().max(120).optional(),
  featuredSubtitle: z.string().max(200).optional(),
  featuredImage: z.string().max(2_000_000).optional(),
  headerBgColor: hexColor.optional(),
  headerTextColor: hexColor.optional(),
  logoImage: z.string().max(2_000_000).optional(),
  headerImage: z.string().max(2_000_000).optional(),
  headerImageAspectRatio: z.number().positive().finite().optional(),
  burnBarText: z.string().max(80).optional(),
  burnBarTextEn: z.string().max(80).optional(),
  showLanguageToggle: z.boolean().optional(),
  calorieTextColor: hexColor.optional(),
  autoHideHeaderOnScroll: z.boolean().optional(),
  hideHeader: z.boolean().optional(),
});
