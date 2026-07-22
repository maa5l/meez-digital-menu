import { useMemo, useRef } from "react";
import { catalogOrderSeed, orderCatalogItems } from "@/lib/catalog-order";
import type { CatalogOrderMode } from "@/types/domain";

/** ترتيب كتالوج المنيو — عشوائي ثابت لكل جلسة تحميل */
export function useOrderedCatalog<T extends { id: string; sortOrder?: number }>(
  items: T[],
  mode: CatalogOrderMode | undefined,
): T[] {
  const sessionSalt = useRef(Math.floor(Math.random() * 0xffffffff) || 1);
  const fingerprint = items.map((i) => `${i.id}:${i.sortOrder ?? ""}`).join("|");

  return useMemo(() => {
    const seed = catalogOrderSeed(
      items.map((i) => i.id),
      sessionSalt.current,
    );
    return orderCatalogItems(items, mode, seed);
  }, [items, mode, fingerprint]);
}
