import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  lang: "ar" | "en";
  onToggle: () => void;
  textColor: string;
  accentColor: string;
  className?: string;
};

const MenuLangToggle = ({ lang, onToggle, textColor, className }: Props) => (
  <button
    type="button"
    onClick={onToggle}
    className={cn(
      "touch-manipulation shrink-0 inline-flex items-center gap-1.5 rounded-full border border-current/30",
      "bg-transparent px-4 py-2 text-sm font-bold transition-colors hover:border-current/50",
      className,
    )}
    style={{ color: textColor }}
    aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
  >
    <Languages className="h-4 w-4 shrink-0" aria-hidden />
    {lang === "ar" ? "EN" : "عربي"}
  </button>
);

export default MenuLangToggle;
