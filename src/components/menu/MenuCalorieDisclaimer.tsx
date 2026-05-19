import type { LucideIcon } from "lucide-react";
import { Baby, User, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const textSize = compact ? "text-[6px] leading-[1.2] md:text-[7px]" : "text-[7px] leading-snug md:text-[8px]";
  const iconSize = compact ? "h-4 w-4 md:h-[18px] md:w-[18px]" : "h-5 w-5";
  const iconInner = compact ? "h-3.5 w-3.5 md:h-4 md:w-4" : "h-4 w-4";

  const list = (
    <ul
      className={cn(
        "grid grid-cols-3 items-start",
        compact ? "gap-1.5 md:gap-2" : "gap-2 md:gap-4",
        className,
      )}
    >
      {L.rows.map(({ id, Icon, label, text }) => (
        <li key={id} className="flex min-w-0 items-start gap-1 md:gap-1.5" aria-label={label}>
          <span
            className={cn("flex shrink-0 items-center justify-center rounded-md", iconSize)}
            style={{ color: textColor }}
            aria-hidden
          >
            <Icon className={iconInner} strokeWidth={2.25} />
          </span>
          <div className={cn("min-w-0 font-medium", textSize)} style={{ color: textColor }}>
            <span className="opacity-90 line-clamp-2">{text}</span>
          </div>
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
