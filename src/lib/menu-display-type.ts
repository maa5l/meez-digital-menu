export type MenuCatalogType = "products" | "crops";

/** يطبّع قيمة نوع المنيو من URL أو RPC */
export function normalizeMenuCatalogType(
  value: string | null | undefined,
): MenuCatalogType | null {
  if (value === "crops" || value === "products") return value;
  return null;
}

/**
 * يحدّد نوع المنيو للعرض.
 * - المعاينة: من URL فقط (لا يتأثر برمز جهاز معلّق في localStorage)
 * - الكشك: URL → localStorage → gate RPC → products
 */
export function resolveMenuDisplayType(options: {
  isPreview: boolean;
  typeParam: string | null;
  deviceMenuType: MenuCatalogType | null;
  gateMenuType: string | null | undefined;
}): MenuCatalogType {
  const fromUrl = normalizeMenuCatalogType(options.typeParam);
  if (fromUrl) return fromUrl;

  if (options.isPreview) return "products";

  const fromGate = normalizeMenuCatalogType(options.gateMenuType);
  if (fromGate) return fromGate;

  return options.deviceMenuType ?? "products";
}
