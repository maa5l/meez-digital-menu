import { Languages } from "lucide-react";
import { getMenuUi } from "@/lib/menu-i18n";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";

type Props = {
  lang: MenuLang;
  onToggle: () => void;
  textColor: string;
  className?: string;
};

const MenuLangToggle = ({ lang, onToggle, textColor, className }: Props) => {
  const ui = getMenuUi(lang);
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "touch-manipulation shrink-0 inline-flex items-center gap-1.5 rounded-full border border-current/30",
        "bg-transparent px-4 py-2 text-sm font-bold transition-colors hover:border-current/50",
        className,
      )}
      style={{ color: textColor }}
      aria-label={ui.langToggleLabel}
    >
      <Languages className="h-4 w-4 shrink-0" aria-hidden />
      {ui.langToggleShort}
    </button>
  );
};

export default MenuLangToggle;
