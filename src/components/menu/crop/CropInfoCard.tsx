import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  lang: "ar" | "en";
  compact?: boolean;
  accentColor?: string;
};

/** بطاقة معلومة — أيقونة + تسمية + قيمة */
const CropInfoCard = ({
  icon: Icon,
  label,
  value,
  lang,
  compact = false,
  accentColor,
}: Props) => (
  <div
    className={cn(
      "flex min-w-0 flex-col rounded-2xl border border-black/[0.06] bg-white/90 shadow-sm backdrop-blur-sm",
      compact ? "gap-1.5 p-3" : "gap-2 p-3.5 md:p-4",
    )}
  >
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-black/[0.04]",
          compact ? "h-7 w-7" : "h-8 w-8 md:h-9 md:w-9",
        )}
        style={accentColor ? { background: `${accentColor}18`, color: accentColor } : undefined}
      >
        <Icon
          className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")}
          style={accentColor ? { color: accentColor } : undefined}
          strokeWidth={2}
        />
      </span>
      <span
        className={cn(
          "min-w-0 truncate font-bold uppercase tracking-wide text-[#1a1a1a]/45",
          compact ? "text-[9px]" : "text-[10px] md:text-[11px]",
        )}
      >
        {label}
      </span>
    </div>
    <p
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={cn(
        "font-display font-black leading-snug text-[#1a1a1a]",
        compact ? "text-sm" : "text-base md:text-lg",
      )}
    >
      {value}
    </p>
  </div>
);

export default CropInfoCard;
