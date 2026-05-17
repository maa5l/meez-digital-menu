import { Languages } from "lucide-react";
import { Logo } from "@/components/Brand";
import type { MenuSettings } from "@/types/domain";
import MenuCalorieDisclaimer from "@/components/menu/MenuCalorieDisclaimer";

type Props = {
  settings: MenuSettings;
  lang: "ar" | "en";
  onLangToggle: () => void;
};

function TopBar({
  settings,
  lang,
  headerFg,
  onLangToggle,
  overlay,
}: {
  settings: MenuSettings;
  lang: "ar" | "en";
  headerFg: string;
  onLangToggle: () => void;
  overlay: boolean;
}) {
  const showLang = settings.showLanguageToggle !== false;

  return (
    <div className="grid grid-cols-3 items-center gap-1.5">
      <div className="text-end" aria-hidden />
      <div className="flex justify-center">
        {settings.logoImage ? (
          <img
            src={settings.logoImage}
            alt="logo"
            className={`h-7 md:h-8 w-auto max-w-[96px] object-contain ${overlay ? "drop-shadow-md" : ""}`}
          />
        ) : (
          <span style={{ color: overlay ? "#fff" : headerFg }} className={overlay ? "drop-shadow-md" : ""}>
            <Logo className="h-7 md:h-8 w-auto aspect-[1031/736]" />
          </span>
        )}
      </div>
      <div className="flex justify-start">
        {showLang && (
          <button
            type="button"
            onClick={onLangToggle}
            className={
              overlay
                ? "text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-full border border-white/40 bg-black/25 text-white backdrop-blur-sm"
                : "text-[9px] md:text-[10px] font-bold opacity-80 px-2 py-1 rounded-full border border-current/25"
            }
          >
            <Languages className="w-3 h-3 inline-block me-0.5 align-[-2px]" />
            {lang === "ar" ? "اللغة" : "Lang"}
          </button>
        )}
      </div>
    </div>
  );
}

const MenuProductHeader = ({ settings, lang, onLangToggle }: Props) => {
  const headerBg = settings.headerBgColor ?? `${settings.textColor}18`;
  const headerFg = settings.headerTextColor ?? settings.textColor;
  const title =
    settings.featuredTitle ||
    (lang === "ar" ? "منتج او مشروب الشهر" : "Product or Drink of the Month");
  const bannerSrc = settings.headerImage || settings.featuredImage;
  /** صورة بانر جاهزة (فيها نص/تصميم) — لا نكرّر العنوان فوقها */
  const bannerHasDesign = Boolean(settings.headerImage);

  if (bannerSrc) {
    return (
      <header className="relative shrink-0 w-full overflow-hidden border-b border-black/10 flex flex-col">
        <MenuCalorieDisclaimer lang={lang} textColor={settings.textColor} />
        <div className="relative">
        <img
          src={bannerSrc}
          alt=""
          className="w-full aspect-[6/1] object-cover object-center block"
        />
        <div className="absolute inset-0 flex flex-col justify-between px-5 md:px-10 py-2 md:py-2.5 pointer-events-none">
          <div className="pointer-events-auto">
            <TopBar settings={settings} lang={lang} headerFg={headerFg} onLangToggle={onLangToggle} overlay={true} />
          </div>
          {!bannerHasDesign && (
            <div className="text-center pb-1.5 pointer-events-none">
              <div
                className="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-b from-transparent via-black/25 to-black/50 pointer-events-none -z-10"
                aria-hidden
              />
              <h1 className="font-display font-black text-lg md:text-2xl lg:text-3xl text-white leading-snug drop-shadow-md">
                {title}
              </h1>
              {settings.featuredSubtitle && (
                <p className="text-xs md:text-sm text-white/90 mt-1 font-bold drop-shadow-sm line-clamp-1">
                  {settings.featuredSubtitle}
                </p>
              )}
            </div>
          )}
        </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className="shrink-0 flex flex-col border-b border-black/5"
      style={{ background: headerBg, color: headerFg }}
    >
      <MenuCalorieDisclaimer lang={lang} textColor={headerFg} />
      <div className="px-5 md:px-10 py-3 md:py-4 flex flex-col justify-center">
        <TopBar settings={settings} lang={lang} headerFg={headerFg} onLangToggle={onLangToggle} overlay={false} />
        <h1 className="font-display font-black text-xl md:text-3xl text-center leading-snug mt-2">
          {title}
        </h1>
        {settings.featuredSubtitle && (
          <p className="text-center text-[10px] md:text-xs opacity-70 mt-0.5 font-bold line-clamp-1">
            {settings.featuredSubtitle}
          </p>
        )}
      </div>
    </header>
  );
};

export default MenuProductHeader;
