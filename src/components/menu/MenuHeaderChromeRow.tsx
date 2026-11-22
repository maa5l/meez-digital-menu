import { Logo } from "@/components/Brand";
import MenuCalorieDisclaimer from "@/components/menu/MenuCalorieDisclaimer";
import MenuHeaderAllergenLegend from "@/components/menu/MenuHeaderAllergenLegend";
import { resolveHeaderAllergenIds } from "@/constants/allergens";
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
      className="w-auto object-contain"
      style={{ height: size, maxHeight: size }}
    />
  ) : (
    <span
      style={{ color: overlay ? "#fff" : headerFg, height: size, maxHeight: size }}
      className="inline-flex items-center"
    >
      <Logo className="h-full w-auto max-h-full aspect-[1031/736]" />
    </span>
  );
}

/** صف علوي — سعرات | أسطورة حساسية في الوسط أعلى | شعار */
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
  /** موضع ثابت على الشاشة — لا يتأثر بتبديل اللغة */
  const logoOnRight = (customization.logoSide ?? "right") === "right";
  const calories = (
    <MenuCalorieDisclaimer
      lang={lang}
      textColor={textColor}
      merged
      align={logoOnRight ? "left" : "right"}
    />
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

  const allergenColor =
    customization.headerAllergenColor?.trim() || textColor;
  const showAllergens = resolveHeaderAllergenIds(customization.headerAllergens).length > 0;

  const allergens = showAllergens ? (
    <div className="flex min-w-0 max-w-full justify-center overflow-hidden px-1">
      <MenuHeaderAllergenLegend
        allergenIds={customization.headerAllergens}
        color={allergenColor}
        lang={lang}
      />
    </div>
  ) : null;

  return (
    <div
      key={lang}
      className={cn(
        "grid w-full items-start gap-x-2 md:gap-x-3",
        showAllergens
          ? logoOnRight
            ? "grid-cols-[minmax(0,1fr)_auto_auto]"
            : "grid-cols-[auto_auto_minmax(0,1fr)]"
          : logoOnRight
            ? "grid-cols-[minmax(0,1fr)_auto]"
            : "grid-cols-[auto_minmax(0,1fr)]",
        menuChromeMotion,
        "animate-in fade-in duration-300 fill-mode-both motion-reduce:animate-none",
        className,
      )}
      dir="ltr"
    >
      {logoOnRight ? (
        <>
          <div className="min-w-0 overflow-hidden">{calories}</div>
          {allergens}
          <div className="justify-self-end">{logo}</div>
        </>
      ) : (
        <>
          <div className="justify-self-start">{logo}</div>
          {allergens}
          <div className="min-w-0 overflow-hidden">{calories}</div>
        </>
      )}
    </div>
  );
};

export default MenuHeaderChromeRow;
