import { Logo } from "@/components/Brand";
import MenuCalorieDisclaimer from "@/components/menu/MenuCalorieDisclaimer";
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

function TopBar({
  customization,
  headerFg,
  overlay,
}: {
  customization: MenuHeaderCustomization;
  headerFg: string;
  overlay: boolean;
}) {
  return (
    <div className="flex shrink-0 justify-center">
      {customization.logoImage ? (
        <img
          src={customization.logoImage}
          alt="logo"
          className={cn(
            "h-8 w-auto max-w-[110px] object-contain md:h-10 md:max-w-[140px]",
            overlay && "drop-shadow-md",
          )}
        />
      ) : (
        <span style={{ color: overlay ? "#fff" : headerFg }} className={overlay ? "drop-shadow-md" : ""}>
          <Logo className="h-8 w-auto aspect-[1031/736] md:h-10" />
        </span>
      )}
    </div>
  );
}

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
        !embedded && (visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"),
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
          "relative z-10 flex h-full min-h-0 flex-col gap-0.5 px-4 py-1 md:px-8 md:py-1.5",
          bannerSrc && "pointer-events-none",
        )}
      >
        <div className={cn("shrink-0", bannerSrc && "pointer-events-auto")}>
          <MenuCalorieDisclaimer lang={lang} textColor={calorieColor} merged />
        </div>

        {bannerSrc ? (
          <div className="pointer-events-none flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 justify-center pt-0.5 md:pt-1">
              <TopBar customization={customization} headerFg={headerFg} overlay />
            </div>
            <div className="min-h-0 flex-1" aria-hidden />
            {!bannerHasDesign && (
              <div className="pb-0.5 text-center">
                <h1 className="font-display line-clamp-1 text-sm font-black leading-tight text-white drop-shadow-md md:text-lg">
                  {title}
                </h1>
                {customization.featuredSubtitle && (
                  <p className="line-clamp-1 text-[10px] font-bold text-white/90 drop-shadow-sm">
                    {customization.featuredSubtitle}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-1">
            <TopBar customization={customization} headerFg={headerFg} overlay={false} />
            <h1 className="mt-0.5 line-clamp-1 text-center font-display text-base font-black leading-tight md:text-xl">
              {title}
            </h1>
            {customization.featuredSubtitle && (
              <p className="line-clamp-1 text-center text-[9px] font-bold opacity-70 md:text-[10px]">
                {customization.featuredSubtitle}
              </p>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default MenuVenueHeader;
