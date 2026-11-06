import type { Category } from "@/types/domain";
import MenuLangToggle from "@/components/menu/MenuLangToggle";
import { localizeCategory } from "@/lib/product-i18n";
import { sortCatalogManual } from "@/lib/catalog-order";
import { menuChromeMotion } from "@/lib/menu-header";
import { badgeForeground } from "@/lib/product-badge";
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

/**
 * تبويبات التصنيف مرتبة 1→2→3:
 * عربي: من اليمين لليسار | إنجليزي: من اليسار لليمين
 * زر اللغة يبقى ثابتاً على اليسار
 */
const CategoryTabs = ({
  categories,
  activeId,
  accentColor,
  textColor,
  lang,
  onSelect,
  onLangToggle,
  showLang = true,
}: Props) => {
  const ordered = sortCatalogManual(categories);
  const tabsDir = lang === "ar" ? "rtl" : "ltr";

  return (
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

      {ordered.length > 0 && (
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center justify-start gap-2 overflow-x-auto overflow-y-hidden pb-0.5 md:gap-3",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
          dir={tabsDir}
        >
          {ordered.map((c) => {
            const active = activeId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                dir={tabsDir}
                className={cn(
                  "touch-manipulation shrink-0 self-center rounded-full border px-4 py-1.5",
                  "text-sm font-bold transition-colors md:px-5 md:py-2",
                  active ? "border-transparent" : "border-transparent bg-transparent",
                )}
                style={
                  active
                    ? {
                        backgroundColor: accentColor,
                        color: badgeForeground(accentColor),
                        opacity: 1,
                      }
                    : {
                        color: textColor,
                        opacity: 0.75,
                      }
                }
              >
                {localizeCategory(c, lang)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryTabs;
