import MenuHeaderChromeRow from "@/components/menu/MenuHeaderChromeRow";
import { useMenuLayoutMetrics } from "@/hooks/useMenuLayoutMetrics";
import {
  getCalorieDisclaimerColor,
  getEffectiveHeaderHeight,
  headerHideTransition,
} from "@/lib/menu-header";
import type { MenuHeaderCustomization, MenuPalette } from "@/types/domain";
import { cn } from "@/lib/utils";

type Props = {
  customization: MenuHeaderCustomization;
  palette: MenuPalette;
  lang: "ar" | "en";
  defaultTitleAr: string;
  defaultTitleEn: string;
  embedded?: boolean;
  visible?: boolean;
  /** @deprecated استخدم chromeTrailing */
  headerTrailing?: React.ReactNode;
  chromeTrailing?: React.ReactNode;
  /** زر أسفل يسار الهيدر (مثل الترجمة) */
  chromeBottomLeft?: React.ReactNode;
};

/** هيدر منيو موحّد — يُستخدم لمنتجات المحاصيل والمنتجات */
const MenuVenueHeader = ({
  customization,
  palette,
  lang,
  defaultTitleAr,
  defaultTitleEn,
  embedded = false,
  visible = true,
  headerTrailing,
  chromeTrailing,
  chromeBottomLeft,
}: Props) => {
  const layout = useMenuLayoutMetrics();
  const headerBg = customization.headerBgColor ?? `${palette.textColor}18`;
  const headerFg = customization.headerTextColor ?? palette.textColor;
  const bannerHasDesign = Boolean(customization.headerImage?.trim());
  const headerHeight = getEffectiveHeaderHeight(layout, customization);
  const title =
    customization.featuredTitle || (lang === "ar" ? defaultTitleAr : defaultTitleEn);
  const bannerSrc = bannerHasDesign
    ? customization.headerImage
    : customization.featuredImage || undefined;
  const calorieFallback = bannerSrc ? "#ffffff" : headerFg;
  const calorieColor = getCalorieDisclaimerColor(customization, calorieFallback);
  const trailing = chromeTrailing ?? headerTrailing;

  return (
    <header
      className={cn(
        "flex w-full shrink-0 flex-col overflow-hidden border-b border-black/10",
        !embedded && "fixed inset-x-0 top-0 z-40",
        embedded && "relative",
        !embedded && headerHideTransition,
        !embedded &&
          (visible
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none invisible"),
      )}
      style={{
        height: headerHeight,
        background: headerBg,
        color: headerFg,
      }}
    >
      {bannerSrc && (
        <>
          <img
            src={bannerSrc}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center [image-rendering:auto]"
            decoding="async"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/40"
            aria-hidden
          />
        </>
      )}

      <div
        className={cn(
          "relative z-10 flex h-full min-h-0 flex-col px-4 py-1.5 md:px-6 md:py-2",
          bannerHasDesign ? "gap-0" : "gap-1",
          bannerSrc && "pointer-events-none",
        )}
      >
        <div className={cn("shrink-0", bannerSrc && "pointer-events-auto")}>
          <MenuHeaderChromeRow
            lang={lang}
            textColor={calorieColor}
            headerFg={headerFg}
            customization={customization}
            logoSizePx={layout.logoSizePx}
            overlay={Boolean(bannerSrc)}
            trailing={trailing}
          />
        </div>

        {!bannerHasDesign && (
          <div className={cn("shrink-0 max-w-full overflow-hidden px-2 text-center", bannerSrc && "pointer-events-auto")}>
            <h1
              className={cn(
                "font-display mx-auto max-w-full break-words font-black leading-tight line-clamp-2",
                bannerSrc
                  ? "text-[11px] text-white drop-shadow-md sm:text-xs md:text-sm ipad-lg:text-base"
                  : "text-sm md:text-lg ipad-lg:text-xl",
              )}
            >
              {title}
            </h1>
            {customization.featuredSubtitle && (
              <p
                className={cn(
                  "mx-auto mt-0.5 max-w-full break-words line-clamp-2 font-bold",
                  bannerSrc
                    ? "text-[9px] text-white/90 drop-shadow-sm sm:text-[10px] md:text-xs"
                    : "text-[9px] opacity-70 md:text-[10px]",
                )}
              >
                {customization.featuredSubtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {chromeBottomLeft ? (
        <div className="pointer-events-auto absolute bottom-2 left-3 z-20 md:bottom-3 md:left-4">
          {chromeBottomLeft}
        </div>
      ) : null}
    </header>
  );
};

export default MenuVenueHeader;
