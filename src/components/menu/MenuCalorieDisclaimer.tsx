import type { LucideIcon } from "lucide-react";
import { Baby, User, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { menuChromeMotion } from "@/lib/menu-header";

type Props = {
  lang: "ar" | "en";
  textColor: string;
  className?: string;
  /** جهة الإفصاح على الشاشة — عكس الشعار، ولا تتبدل مع اللغة */
  align?: "left" | "right";
  /** داخل هيدر المنتجات — بدون خلفية أو حدود منفصلة */
  embedded?: boolean;
  /** مدمج بالكامل مع خلفية الهيدر (لا فصل بصري) */
  merged?: boolean;
  /** بطاقات اللوحة: صف واحد، أيقونة واسم ثم الرقم ثم الوحدة */
  board?: boolean;
};

type Card = {
  id: string;
  Icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  detail: string;
};

const copy: Record<"ar" | "en", { title: string; cards: Card[] }> = {
  ar: {
    title: "إفصاح إلزامي — متوسط حرق السعرات خلال 60 دقيقة",
    cards: [
      {
        id: "men",
        Icon: User,
        label: "الرجال",
        value: "300–600",
        unit: "سعرة · 60 د",
        detail: "متوسط حرق السعرات خلال 60 دقيقة: 300 – 600 سعرة حرارية",
      },
      {
        id: "women",
        Icon: UserRound,
        label: "النساء",
        value: "250–500",
        unit: "سعرة · 60 د",
        detail: "متوسط حرق السعرات خلال 60 دقيقة: 250 – 500 سعرة حرارية",
      },
      {
        id: "children",
        Icon: Baby,
        label: "الأطفال",
        value: "150–350",
        unit: "سعرة · 60 د",
        detail: "متوسط حرق السعرات خلال 60 دقيقة: 150 – 350 سعرة حرارية",
      },
    ],
  },
  en: {
    title: "Mandatory disclosure — average calorie burn in 60 minutes",
    cards: [
      {
        id: "men",
        Icon: User,
        label: "Men",
        value: "300–600",
        unit: "kcal · 60 min",
        detail: "Average burn in 60 minutes: 300 – 600 calories",
      },
      {
        id: "women",
        Icon: UserRound,
        label: "Women",
        value: "250–500",
        unit: "kcal · 60 min",
        detail: "Average burn in 60 minutes: 250 – 500 calories",
      },
      {
        id: "children",
        Icon: Baby,
        label: "Children",
        value: "150–350",
        unit: "kcal · 60 min",
        detail: "Average burn in 60 minutes: 150 – 350 calories",
      },
    ],
  },
};

const MenuCalorieDisclaimer = ({
  lang,
  textColor,
  className = "",
  align = "left",
  embedded = false,
  merged = false,
  board = false,
}: Props) => {
  const L = copy[lang];
  const compact = embedded || merged;
  const onRight = align === "right";

  const cards = (
    <ul
      className={cn(
        board ? "flex flex-nowrap gap-3" : "flex w-full flex-wrap justify-center",
        !board && (compact ? "gap-0.5" : "max-w-xs gap-1"),
        !compact && (onRight ? "ml-auto" : "mr-auto"),
        menuChromeMotion,
        className,
      )}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      {L.cards.map(({ id, Icon, label, value, unit, detail }) => (
        <li
          key={id}
          aria-label={detail}
          className={cn(
            "shrink-0 bg-[rgba(70,25,5,0.24)]",
            board
              ? "min-w-[clamp(112px,11.87vw,178px)] rounded-[clamp(16px,1.6vw,24px)] px-[clamp(12px,1.47vw,22px)] py-[clamp(8px,0.93vw,14px)]"
              : "rounded-lg",
            !board && (compact ? "w-[4.55rem] px-1 py-0.5" : "w-full px-2.5 py-1.5"),
          )}
        >
          <div className="flex items-center gap-0.5">
            <Icon
              className={board ? "h-[18px] w-[18px] shrink-0" : compact ? "h-2.5 w-2.5 shrink-0" : "h-4 w-4 shrink-0"}
              strokeWidth={board ? 1.6 : 2.25}
              style={{ color: textColor }}
              aria-hidden
            />
            <span
              className={cn(
                "whitespace-nowrap font-medium leading-none",
                board ? "text-[clamp(13px,1.2vw,18px)]" : compact ? "text-[7px]" : "text-[11px]",
              )}
              style={{ color: textColor }}
            >
              {label}
            </span>
          </div>
          <div
            dir="ltr"
            className={cn(
              "font-extrabold leading-none tracking-tight",
              board ? "mt-1 text-[clamp(22px,2.27vw,34px)]" : "mt-0.5",
              lang === "ar" ? "text-right" : "text-left",
              !board && (compact ? "text-[10px]" : "text-sm"),
            )}
            style={{ color: textColor }}
          >
            {value}
          </div>
          <div
            className={cn(
              "whitespace-nowrap font-normal leading-none",
              board ? "mt-1 text-[clamp(12px,1vw,15px)]" : "mt-0.5 opacity-80",
              !board && (compact ? "text-[6px]" : "text-[10px]"),
            )}
            style={{ color: textColor }}
          >
            {unit}
          </div>
        </li>
      ))}
    </ul>
  );

  if (merged) {
    return (
      <div role="note" aria-label={L.title} className="w-full min-w-0">
        {cards}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full shrink-0 border-b border-black/10 bg-black/[0.04] px-3 py-1.5 md:px-6 md:py-2",
        embedded && "bg-black/[0.05] px-2.5 py-1",
      )}
      style={{ color: textColor }}
      role="note"
      aria-label={L.title}
    >
      {cards}
    </div>
  );
};

export default MenuCalorieDisclaimer;
