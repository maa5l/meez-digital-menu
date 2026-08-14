import { describe, expect, it } from "vitest";
import { normalizeMenuCatalogType, resolveMenuDisplayType } from "@/lib/menu-display-type";

describe("menu-display-type", () => {
  it("normalizes known menu types", () => {
    expect(normalizeMenuCatalogType("crops")).toBe("crops");
    expect(normalizeMenuCatalogType("products")).toBe("products");
    expect(normalizeMenuCatalogType("other")).toBeNull();
  });

  it("preview uses URL type and ignores device menu type", () => {
    expect(
      resolveMenuDisplayType({
        isPreview: true,
        typeParam: "crops",
        deviceMenuType: "products",
        gateMenuType: "products",
      }),
    ).toBe("crops");
  });

  it("preview without URL type defaults to products", () => {
    expect(
      resolveMenuDisplayType({
        isPreview: true,
        typeParam: null,
        deviceMenuType: "crops",
        gateMenuType: "crops",
      }),
    ).toBe("products");
  });

  it("kiosk prefers gate menu type over stale local default", () => {
    expect(
      resolveMenuDisplayType({
        isPreview: false,
        typeParam: null,
        deviceMenuType: "products",
        gateMenuType: "crops",
      }),
    ).toBe("crops");
  });

  it("kiosk URL type overrides gate and local", () => {
    expect(
      resolveMenuDisplayType({
        isPreview: false,
        typeParam: "products",
        deviceMenuType: "crops",
        gateMenuType: "crops",
      }),
    ).toBe("products");
  });
});
