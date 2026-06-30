import { Logo } from "@/components/Brand";
import MenuCalorieDisclaimer from "@/components/menu/MenuCalorieDisclaimer";
import { DEFAULT_MENU_LAYOUT_METRICS } from "@/lib/menu-layout-metrics";
import { menuChromeMotion } from "@/lib/menu-header";
import type { MenuHeaderCustomization } from "@/types/domain";
import { cn } from "@/lib/utils";

type Props = {
  lang: "ar" | "en";
  textColor: string;
  headerFg: string;
  customization: MenuHeaderCustomization;
  logoSizePx?: number;
  overlay?: boolean;
  className?: string;
  /** عنصر إضافي بجانب الشعار — مثل زر اللغة */
  trailing?: React.ReactNode;
};

function MenuHeaderLogo({
  customization,
  headerFg,
  overlay,
  logoSizePx,
}: Pick<Props, "customization" | "headerFg" | "overlay" | "logoSizePx">) {
  const size = logoSizePx ?? DEFAULT_MENU_LAYOUT_METRICS.logoSizePx;
  return customization.logoImage ? (
    <img
      src={customization.logoImage}
      alt="logo"
      className={cn("w-auto object-contain", overlay && "drop-shadow-md")}
      style={{ height: size, maxHeight: size }}
    />
  ) : (
    <span
      style={{ color: overlay ? "#fff" : headerFg, height: size, maxHeight: size }}
      className={cn("inline-flex items-center", overlay && "drop-shadow-md")}
    >
      <Logo className="h-full w-auto max-h-full aspect-[1031/736]" />
    </span>
  );
}

/** صف علوي — إفصاح السعرات والشعار على نفس المستوى (عربي: سعرات يسار / شعار يمين) */
const MenuHeaderChromeRow = ({
  lang,
  textColor,
  headerFg,
  customization,
  logoSizePx,
  overlay = false,
  className,
  trailing,
}: Props) => {
  const calories = (
    <MenuCalorieDisclaimer lang={lang} textColor={textColor} merged />
  );

  const logo = (
    <div className="flex shrink-0 items-center gap-2">
      {trailing}
      <MenuHeaderLogo
        customization={customization}
        headerFg={headerFg}
        overlay={overlay}
        logoSizePx={logoSizePx}
      />
    </div>
  );

  return (
    <div
      key={lang}
      className={cn(
        "flex w-full items-start gap-3 md:gap-5",
        menuChromeMotion,
        "animate-in fade-in duration-300 fill-mode-both motion-reduce:animate-none",
        className,
      )}
      dir="ltr"
    >
      {lang === "en" ? (
        <>
          {logo}
          <div className="flex min-w-0 flex-1 justify-end">{calories}</div>
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1">{calories}</div>
          {logo}
        </>
      )}
    </div>
  );
};

export default MenuHeaderChromeRow;
