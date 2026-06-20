import { Logo } from "@/components/Brand";
import MenuCalorieDisclaimer from "@/components/menu/MenuCalorieDisclaimer";
import { MENU_LOGO_SIZE_PX, menuChromeMotion } from "@/lib/menu-header";
import type { MenuHeaderCustomization } from "@/types/domain";
import { cn } from "@/lib/utils";

type Props = {
  lang: "ar" | "en";
  textColor: string;
  headerFg: string;
  customization: MenuHeaderCustomization;
  overlay?: boolean;
  className?: string;
};

function MenuHeaderLogo({
  customization,
  headerFg,
  overlay,
}: Pick<Props, "customization" | "headerFg" | "overlay">) {
  return customization.logoImage ? (
    <img
      src={customization.logoImage}
      alt="logo"
      className={cn("w-auto object-contain", overlay && "drop-shadow-md")}
      style={{ height: MENU_LOGO_SIZE_PX, maxHeight: MENU_LOGO_SIZE_PX }}
    />
  ) : (
    <span style={{ color: overlay ? "#fff" : headerFg }} className={overlay ? "drop-shadow-md" : ""}>
      <Logo className="h-[100px] w-auto aspect-[1031/736]" />
    </span>
  );
}

/** صف علوي — إفصاح السعرات والشعار على نفس المستوى (عربي: سعرات يسار / شعار يمين) */
const MenuHeaderChromeRow = ({
  lang,
  textColor,
  headerFg,
  customization,
  overlay = false,
  className,
}: Props) => {
  const calories = (
    <MenuCalorieDisclaimer lang={lang} textColor={textColor} merged />
  );

  const logo = (
    <div className="shrink-0">
      <MenuHeaderLogo customization={customization} headerFg={headerFg} overlay={overlay} />
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
