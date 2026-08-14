import { z } from "zod";
import type { Category, Crop, Product } from "@/types/domain";
import type { SubscriptionInfo, VenueData } from "@/types/venue";
import { defaultMenuSettings } from "@/lib/mockData";
import { migrateMenuSettings } from "@/lib/menu-palette";
import { logger } from "@/lib/logger";

const FALLBACK_SUBSCRIPTION: SubscriptionInfo = {
  plan: "تجربة مجانية",
  status: "trial",
  screens: 0,
  maxScreens: 1,
  pricePerScreen: 0,
  renewsOn: "—",
  daysLeft: 7,
};

function emptyVenue(): VenueData {
  const now = new Date().toISOString();
  return {
    version: 1,
    categories: [],
    products: [],
    crops: [],
    devices: [],
    menuSettings: { ...defaultMenuSettings },
    subscription: { ...FALLBACK_SUBSCRIPTION },
    createdAt: now,
    updatedAt: now,
  };
}

const coerceFiniteNumber = (fallback = 0) =>
  z.union([z.number(), z.string(), z.null(), z.undefined()]).transform((v) => {
    if (v == null || v === "") return fallback;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  });

const coerceString = (fallback = "") =>
  z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((v) => {
    if (v == null) return fallback;
    return String(v);
  });

const CategorySchema = z
  .object({
    id: coerceString(),
    name: coerceString("—"),
    nameEn: z.string().optional().catch(undefined),
    icon: z.string().optional().catch(undefined),
  })
  .passthrough();

const ProductSchema = z
  .object({
    id: coerceString(),
    categoryId: coerceString(),
    name: coerceString("—"),
    nameEn: z.string().optional().catch(undefined),
    description: coerceString(),
    descriptionEn: z.string().optional().catch(undefined),
    price: coerceFiniteNumber(0),
    calories: coerceFiniteNumber(0),
    image: z.string().nullish().catch(undefined).transform((v) => v ?? undefined),
    imageLandscape: z.string().nullish().catch(undefined).transform((v) => v ?? undefined),
    imagePortrait: z.string().nullish().catch(undefined).transform((v) => v ?? undefined),
    allergens: z.string().optional().catch(undefined),
    allergensEn: z.string().optional().catch(undefined),
    badgeText: z.string().optional().catch(undefined),
    badgeTextEn: z.string().optional().catch(undefined),
    badgeColor: z.string().optional().catch(undefined),
    cropId: z.string().optional().catch(undefined),
    sortOrder: z.number().finite().optional().catch(undefined),
  })
  .passthrough();

const CropSchema = z
  .object({
    id: coerceString(),
    beanName: coerceString("—"),
    beanNameEn: coerceString(),
    country: coerceString(),
    countryEn: coerceString(),
    process: coerceString(),
    processEn: coerceString(),
    variety: coerceString(),
    altitude: coerceString(),
    notes: coerceString(),
    notesEn: coerceString(),
    image: z.string().nullish().catch(undefined).transform((v) => v ?? undefined),
    imageLandscape: z.string().nullish().catch(undefined).transform((v) => v ?? undefined),
    imagePortrait: z.string().nullish().catch(undefined).transform((v) => v ?? undefined),
    sortOrder: z.number().finite().optional().catch(undefined),
  })
  .passthrough();

function parseArraySafe<T>(
  schema: z.ZodType<T>,
  rows: unknown,
  label: string,
): T[] {
  if (!Array.isArray(rows)) return [];
  const out: T[] = [];
  for (const row of rows) {
    const parsed = schema.safeParse(row);
    if (parsed.success) {
      if ((parsed.data as { id?: string }).id) out.push(parsed.data);
    } else {
      logger.warn("venue.schema_drop_row", { label, issues: parsed.error.issues.slice(0, 3) });
    }
  }
  return out;
}

/**
 * Safe venue parse — never throws. Bad rows are dropped; null prices coerced to 0.
 */
export function parseVenueDataSafe(raw: unknown): VenueData {
  const empty = emptyVenue();
  if (!raw || typeof raw !== "object") return empty;

  const stored = raw as Partial<VenueData> & Record<string, unknown>;
  if (stored.version !== 1 && stored.version != null) {
    logger.warn("venue.schema_bad_version", { version: stored.version });
  }

  const categories = parseArraySafe(CategorySchema, stored.categories, "categories") as Category[];
  const products = parseArraySafe(ProductSchema, stored.products, "products") as Product[];
  const crops = parseArraySafe(CropSchema, stored.crops, "crops") as Crop[];

  return {
    ...empty,
    ...stored,
    version: 1,
    categories,
    products,
    crops,
    devices: Array.isArray(stored.devices) ? (stored.devices as VenueData["devices"]) : [],
    menuSettings: migrateMenuSettings({
      ...defaultMenuSettings,
      ...(stored.menuSettings ?? {}),
    }),
    subscription: { ...FALLBACK_SUBSCRIPTION, ...(stored.subscription ?? {}) },
    createdAt: typeof stored.createdAt === "string" ? stored.createdAt : empty.createdAt,
    updatedAt: typeof stored.updatedAt === "string" ? stored.updatedAt : empty.updatedAt,
  };
}
