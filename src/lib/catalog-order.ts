import type { CatalogOrderMode } from "@/types/domain";

type Orderable = { id: string; sortOrder?: number };

/** خلط Fisher–Yates مع بذرة بسيطة لثبات الجلسة */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const out = [...items];
  const rand = mulberry32(seed || 1);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** ترتيب يدوي حسب sortOrder تصاعدياً */
export function sortCatalogManual<T extends Orderable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.id.localeCompare(b.id);
  });
}

/**
 * يرتّب عناصر الكتالوج حسب الوضع.
 * @param seed بذرة للعشوائي (ثابتة لكل جلسة عرض)
 */
export function orderCatalogItems<T extends Orderable>(
  items: T[],
  mode: CatalogOrderMode | undefined,
  seed = 1,
): T[] {
  if (items.length <= 1) return items;
  if (mode === "random") return shuffleWithSeed(items, seed);
  return sortCatalogManual(items);
}

/** أكبر رقم ترتيب + 1 لإضافة عنصر جديد */
export function nextSortOrder(items: { sortOrder?: number }[]): number {
  let max = 0;
  for (const item of items) {
    if (typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)) {
      max = Math.max(max, item.sortOrder);
    }
  }
  return max + 1;
}

/** بذرة مستقرة من معرفات العناصر + ملح جلسة */
export function catalogOrderSeed(ids: string[], sessionSalt: number): number {
  let h = sessionSalt >>> 0;
  for (const id of ids) {
    for (let i = 0; i < id.length; i++) {
      h = Math.imul(h ^ id.charCodeAt(i), 16777619);
    }
  }
  return h || 1;
}
