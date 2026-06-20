import { Languages } from "lucide-react";
import { getMenuUi } from "@/lib/menu-i18n";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";

type Props = {
  lang: MenuLang;
  onToggle: () => void;
  textColor: string;
  className?: string;
  /** tab = نفس شكل أزرار التصنيفات */
  variant?: "default" | "tab";
};

const MenuLangToggle = ({ lang, onToggle, textColor, className, variant = "default" }: Props) => {
  const ui = getMenuUi(lang);
  const isTab = variant === "tab";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "touch-manipulation shrink-0 inline-flex items-center justify-center gap-1.5 font-bold transition-colors",
        isTab
          ? "rounded-full border border-transparent bg-transparent px-5 py-2 text-sm"
          : "rounded-full border border-current/30 bg-transparent px-4 py-2 text-sm hover:border-current/50",
        className,
      )}
      style={{ color: textColor, opacity: isTab ? 0.75 : 1 }}
      aria-label={ui.langToggleLabel}
    >
      <Languages className="h-4 w-4 shrink-0" aria-hidden />
      {ui.langToggleShort}
    </button>
  );
};

export default MenuLangToggle;
