import { textBlockSide, type TextSide } from "@/lib/text-side";
import { cn } from "@/lib/utils";

/** نص كامل العرض: العربي يمين والإنجليزي يسار، بدون انقلاب اتجاه الصفحة */
export function ScriptAlignedText({
  value,
  fallback,
  className,
}: {
  value: string;
  fallback: TextSide;
  className?: string;
}) {
  const side = textBlockSide(value, fallback);
  return (
    <span
      dir={side === "right" ? "rtl" : "ltr"}
      className={cn("block w-full", side === "right" ? "text-right" : "text-left", className)}
    >
      {value}
    </span>
  );
}
