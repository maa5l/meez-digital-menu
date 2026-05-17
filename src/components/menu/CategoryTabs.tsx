import type { Category } from "@/types/domain";

type Props = {
  categories: Category[];
  activeId: string;
  accentColor: string;
  textColor: string;
  lang: "ar" | "en";
  onSelect: (id: string) => void;
};

/**
 * تبويبات التصنيفات — عربي: تبدأ من اليمين (RTL).
 * إنجليزي: تبدأ من اليسار (LTR).
 */
const CategoryTabs = ({ categories, activeId, accentColor, textColor, lang, onSelect }: Props) => {
  const rtl = lang === "ar";

  return (
    <div
      className="flex flex-wrap gap-2 justify-start"
      dir={rtl ? "rtl" : "ltr"}
    >
      {categories.map((c) => {
        const active = activeId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className="px-5 py-2 rounded-full font-bold text-sm transition-all shrink-0"
            style={{
              background: active ? accentColor : `${textColor}18`,
              color: active ? "#fff" : textColor,
            }}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
