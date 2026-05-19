import type { Category } from "@/types/domain";
import MenuLangToggle from "@/components/menu/MenuLangToggle";
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

/** أزرار تصنيف شفافة + زر اللغة */
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
  const rtl = lang === "ar";

  return (
    <div className="flex min-w-0 items-center gap-2 md:gap-3" dir={rtl ? "rtl" : "ltr"}>
      {categories.length > 0 && (
        <div className="flex min-w-0 flex-1 flex-wrap justify-start gap-2">
          {categories.map((c) => {
            const active = activeId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={cn(
                  "touch-manipulation shrink-0 rounded-full border bg-transparent px-5 py-2",
                  "text-sm font-bold transition-colors",
                  active ? "border-current" : "border-transparent",
                )}
                style={{
                  color: active ? accentColor : textColor,
                  opacity: active ? 1 : 0.75,
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {showLang && onLangToggle && (
        <MenuLangToggle lang={lang} onToggle={onLangToggle} textColor={textColor} accentColor={accentColor} />
      )}
    </div>
  );
};

export default CategoryTabs;
