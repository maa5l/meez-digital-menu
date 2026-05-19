import { Logo } from "@/components/Brand";
import type { MenuSettings } from "@/types/domain";
import MenuCalorieDisclaimer from "@/components/menu/MenuCalorieDisclaimer";
import { getCalorieDisclaimerColor, getMenuProductHeaderHeight, headerHideTransition } from "@/lib/menu-header";
import { cn } from "@/lib/utils";

export {
  getMenuProductHeaderHeight,
  getMenuTopChromeHeight,
  MENU_PRODUCT_HEADER_HEIGHT,
  MENU_SUBHEADER_HEIGHT,
  headerHideTransition,
} from "@/lib/menu-header";

type Props = {
  settings: MenuSettings;
  lang: "ar" | "en";
  /** عند true: جزء من كتلة ثابتة خارجية (بدون fixed/إخفاء ذاتي) */
  embedded?: boolean;
  visible?: boolean;
};

function TopBar({
  settings,
  headerFg,
  overlay,
}: {
  settings: MenuSettings;
  headerFg: string;
  overlay: boolean;
}) {
  return (
    <div className="flex shrink-0 justify-center">
      {settings.logoImage ? (
        <img
          src={settings.logoImage}
          alt="logo"
          className={cn(
            "h-6 md:h-7 w-auto max-w-[88px] object-contain",
            overlay && "drop-shadow-md",
          )}
        />
      ) : (
        <span style={{ color: overlay ? "#fff" : headerFg }} className={overlay ? "drop-shadow-md" : ""}>
          <Logo className="h-6 md:h-7 w-auto aspect-[1031/736]" />
        </span>
      )}
    </div>
  );
}

const MenuProductHeader = ({ settings, lang, embedded = false, visible = true }: Props) => {
  const headerBg = settings.headerBgColor ?? `${settings.textColor}18`;
  const headerFg = settings.headerTextColor ?? settings.textColor;
  const headerHeight = getMenuProductHeaderHeight(settings);
  const title =
    settings.featuredTitle ||
    (lang === "ar" ? "منتج او مشروب الشهر" : "Product or Drink of the Month");
  const bannerSrc = settings.headerImage || settings.featuredImage;
  const bannerHasDesign = Boolean(settings.headerImage);
  const calorieFallback = bannerSrc ? "#ffffff" : headerFg;
  const calorieColor = getCalorieDisclaimerColor(settings, calorieFallback);

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
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/40"
            aria-hidden
          />
        </>
      )}

      <div
        className={cn(
          "relative z-10 flex h-full min-h-0 flex-col gap-1 px-4 py-1.5 md:px-8 md:py-2",
          bannerSrc && "pointer-events-none",
        )}
      >
        <div className={cn("shrink-0", bannerSrc && "pointer-events-auto")}>
          <MenuCalorieDisclaimer lang={lang} textColor={calorieColor} merged />
        </div>

        {bannerSrc ? (
          <div className="pointer-events-none flex min-h-0 flex-1 flex-col justify-between">
            <TopBar settings={settings} headerFg={headerFg} overlay />
            {!bannerHasDesign && (
              <div className="pb-0.5 text-center">
                <h1 className="font-display line-clamp-1 text-sm font-black leading-tight text-white drop-shadow-md md:text-lg">
                  {title}
                </h1>
                {settings.featuredSubtitle && (
                  <p className="line-clamp-1 text-[10px] font-bold text-white/90 drop-shadow-sm">
                    {settings.featuredSubtitle}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-0.5">
            <TopBar settings={settings} headerFg={headerFg} overlay={false} />
            <h1 className="mt-0.5 line-clamp-1 text-center font-display text-base font-black leading-tight md:text-xl">
              {title}
            </h1>
            {settings.featuredSubtitle && (
              <p className="line-clamp-1 text-center text-[9px] font-bold opacity-70 md:text-[10px]">
                {settings.featuredSubtitle}
              </p>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default MenuProductHeader;
