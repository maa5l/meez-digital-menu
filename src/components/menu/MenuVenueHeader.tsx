import MenuHeaderChromeRow from "@/components/menu/MenuHeaderChromeRow";
import {
  getCalorieDisclaimerColor,
  getMenuProductHeaderHeight,
  headerHideTransition,
} from "@/lib/menu-header";
import type { MenuHeaderCustomization, MenuPalette } from "@/types/domain";
import { cn } from "@/lib/utils";

export {
  getMenuProductHeaderHeight,
  getMenuTopChromeHeight,
  MENU_PRODUCT_HEADER_HEIGHT,
  MENU_SUBHEADER_HEIGHT,
  headerHideTransition,
} from "@/lib/menu-header";

type Props = {
  customization: MenuHeaderCustomization;
  palette: MenuPalette;
  lang: "ar" | "en";
  defaultTitleAr: string;
  defaultTitleEn: string;
  embedded?: boolean;
  visible?: boolean;
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
}: Props) => {
  const headerBg = customization.headerBgColor ?? `${palette.textColor}18`;
  const headerFg = customization.headerTextColor ?? palette.textColor;
  const headerHeight = getMenuProductHeaderHeight();
  const title =
    customization.featuredTitle || (lang === "ar" ? defaultTitleAr : defaultTitleEn);
  const bannerSrc = customization.headerImage || customization.featuredImage;
  const bannerHasDesign = Boolean(customization.headerImage);
  const calorieFallback = bannerSrc ? "#ffffff" : headerFg;
  const calorieColor = getCalorieDisclaimerColor(customization, calorieFallback);

  return (
    <header
      className={cn(
        "flex w-full flex-col overflow-hidden border-b border-black/10",
        !embedded && "fixed inset-x-0 top-0 z-40",
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
          "relative z-10 flex h-full min-h-0 flex-col px-4 py-2 md:px-8 md:py-3",
          bannerSrc && "pointer-events-none",
        )}
      >
        <div className={cn("shrink-0", bannerSrc && "pointer-events-auto")}>
          <MenuHeaderChromeRow
            lang={lang}
            textColor={calorieColor}
            headerFg={headerFg}
            customization={customization}
            overlay={Boolean(bannerSrc)}
          />
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col justify-end pb-1 pt-3 md:pt-4",
            bannerSrc && "pointer-events-none",
          )}
        >
          {!bannerHasDesign && (
            <div className={cn("text-center", bannerSrc && "pointer-events-auto")}>
              <h1
                className={cn(
                  "font-display line-clamp-2 font-black leading-tight",
                  bannerSrc
                    ? "text-sm text-white drop-shadow-md md:text-lg"
                    : "text-base md:text-xl",
                )}
              >
                {title}
              </h1>
              {customization.featuredSubtitle && (
                <p
                  className={cn(
                    "mt-0.5 line-clamp-2 font-bold",
                    bannerSrc
                      ? "text-[10px] text-white/90 drop-shadow-sm"
                      : "text-[9px] opacity-70 md:text-[10px]",
                  )}
                >
                  {customization.featuredSubtitle}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default MenuVenueHeader;
