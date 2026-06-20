import type { LucideIcon } from "lucide-react";
import { Baby, User, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { menuCalorieAlignClass, menuChromeMotion } from "@/lib/menu-header";

type Props = {
  lang: "ar" | "en";
  textColor: string;
  className?: string;
  /** داخل هيدر المنتجات — بدون خلفية أو حدود منفصلة */
  embedded?: boolean;
  /** مدمج بالكامل مع خلفية الهيدر (لا فصل بصري) */
  merged?: boolean;
};

type Row = { id: string; Icon: LucideIcon; label: string; text: string };

const copy: Record<"ar" | "en", { title: string; rows: Row[] }> = {
  ar: {
    title: "إفصاح إلزامي — متوسط حرق السعرات",
    rows: [
      {
        id: "men",
        Icon: User,
        label: "الرجال",
        text: "متوسط حرق السعرات خلال 60 دقيقة: 300 – 600 سعرة حرارية",
      },
      {
        id: "women",
        Icon: UserRound,
        label: "النساء",
        text: "متوسط حرق السعرات خلال 60 دقيقة: 250 – 500 سعرة حرارية",
      },
      {
        id: "children",
        Icon: Baby,
        label: "الأطفال",
        text: "متوسط حرق السعرات خلال 60 دقيقة: 150 – 350 سعرة حرارية",
      },
    ],
  },
  en: {
    title: "Mandatory disclosure — average calorie burn",
    rows: [
      {
        id: "men",
        Icon: User,
        label: "Men",
        text: "Average burn in 60 minutes: 300 – 600 calories",
      },
      {
        id: "women",
        Icon: UserRound,
        label: "Women",
        text: "Average burn in 60 minutes: 250 – 500 calories",
      },
      {
        id: "children",
        Icon: Baby,
        label: "Children",
        text: "Average burn in 60 minutes: 150 – 350 calories",
      },
    ],
  },
};

const MenuCalorieDisclaimer = ({
  lang,
  textColor,
  className = "",
  embedded = false,
  merged = false,
}: Props) => {
  const L = copy[lang];
  const compact = embedded || merged;
  const textSize = compact
    ? "text-[8px] leading-tight md:text-[10px]"
    : "text-[9px] leading-snug md:text-[11px]";
  const iconInner = compact ? "h-4 w-4 shrink-0 md:h-5 md:w-5" : "h-5 w-5 shrink-0";

  const list = (
    <ul
      className={cn(
        "flex w-full flex-col",
        menuChromeMotion,
        compact ? "gap-0.5 md:gap-1" : "gap-1 md:gap-1.5",
        menuCalorieAlignClass(lang),
        className,
      )}
      dir="ltr"
    >
      {L.rows.map(({ id, Icon, label, text }) => (
        <li
          key={id}
          className={cn(
            "flex max-w-full items-center gap-1.5 md:gap-2",
            lang === "ar" ? "justify-start text-left" : "justify-end text-right",
          )}
          aria-label={label}
        >
          <Icon className={iconInner} strokeWidth={2.25} style={{ color: textColor }} aria-hidden />
          <span
            dir={lang === "ar" ? "rtl" : "ltr"}
            className={cn("min-w-0 font-semibold leading-tight", textSize)}
            style={{ color: textColor }}
          >
            {text}
          </span>
        </li>
      ))}
    </ul>
  );

  if (merged) {
    return (
      <div role="note" aria-label={L.title} className="w-full shrink-0">
        {list}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 w-full border-b border-black/10 bg-black/[0.04] px-3 py-1.5 md:px-6 md:py-2",
        embedded && "bg-black/[0.05] px-2.5 py-1",
      )}
      style={{ color: textColor }}
      role="note"
      aria-label={L.title}
    >
      {list}
    </div>
  );
};

export default MenuCalorieDisclaimer;
