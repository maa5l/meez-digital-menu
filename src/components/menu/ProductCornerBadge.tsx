import { cn } from "@/lib/utils";
import { badgeForeground } from "@/lib/product-badge";

type Props = {
  text: string;
  color: string;
  /** sm = قائمة/شبكة — md = بطاقة تفصيل */
  size?: "sm" | "md";
  /** inset = داخل إطار الصورة — corner = تبرز من زاوية البطاقة */
  placement?: "inset" | "corner";
  className?: string;
};

/** شارة مستقيمة على البطاقة */
const ProductCornerBadge = ({
  text,
  color,
  size = "sm",
  placement = "corner",
  className,
}: Props) => {
  const fg = badgeForeground(color);

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-20 max-w-[calc(100%-1.5rem)]",
        placement === "inset"
          ? "top-2.5 start-2.5 md:top-3 md:start-3"
          : "top-2.5 start-3 md:top-3 md:start-4",
        className,
      )}
      aria-hidden
    >
      <span
        className={cn(
          "inline-block truncate rounded-xl font-black leading-tight shadow-lg ring-2 ring-white/95",
          size === "md"
            ? "max-w-[14rem] px-4 py-2 text-sm md:max-w-[16rem] md:px-5 md:py-2.5 md:text-base"
            : "max-w-[9rem] px-3 py-1.5 text-[11px] md:max-w-[11rem] md:px-3.5 md:text-xs",
        )}
        style={{ backgroundColor: color, color: fg }}
      >
        {text}
      </span>
    </div>
  );
};

export default ProductCornerBadge;
