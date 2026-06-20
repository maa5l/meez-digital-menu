import type { Category } from "@/types/domain";
import MenuLangToggle from "@/components/menu/MenuLangToggle";
import { localizeCategory } from "@/lib/product-i18n";
import { menuChromeMotion } from "@/lib/menu-header";
import { cn } from "@/lib/utils";

type Props = {
  categories: Category[];
  activeId: string;
  accentColor: string;
  textColor: string;
  lang: "ar" | "en";
  onSelect: (id: string) => void;
  onLangToggle?: () => void;
  showLang?: boolean;
};

/** أزرار تصنيف شفافة + زر اللغة — مواضع ثابتة، النص فقط يتبدّل */
const CategoryTabs = ({
  categories,
  activeId,
  accentColor,
  textColor,
  lang,
  onSelect,
  onLangToggle,
  showLang = true,
}: Props) => (
  <div
    className={cn(
      "flex w-full min-w-0 items-center gap-2 md:gap-3",
      menuChromeMotion,
    )}
    dir="ltr"
  >
    {showLang && onLangToggle && (
      <MenuLangToggle
        lang={lang}
        onToggle={onLangToggle}
        textColor={textColor}
        variant="tab"
        className="shrink-0 self-center"
      />
    )}

    {categories.length > 0 && (
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto overflow-y-hidden pb-0.5 md:gap-3",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {categories.map((c) => {
          const active = activeId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              dir={lang === "en" ? "ltr" : "rtl"}
              className={cn(
                "touch-manipulation shrink-0 self-center rounded-full border bg-transparent px-5 py-2",
                "text-sm font-bold transition-colors",
                active ? "border-current" : "border-transparent",
              )}
              style={{
                color: active ? accentColor : textColor,
                opacity: active ? 1 : 0.75,
              }}
            >
              {localizeCategory(c, lang)}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

export default CategoryTabs;
