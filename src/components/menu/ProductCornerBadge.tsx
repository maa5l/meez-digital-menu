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
          ? "top-2 start-2 md:top-2.5 md:start-2.5"
          : "-top-2 start-3 md:-top-2.5 md:start-4",
        className,
      )}
      aria-hidden
    >
      <span
        className={cn(
          "inline-block truncate rounded-lg font-black leading-tight",
          size === "md"
            ? "max-w-[10rem] px-3 py-1.5 text-[10px] md:text-[11px]"
            : "max-w-[5.5rem] px-2 py-1 text-[8px] md:max-w-[6.5rem] md:px-2.5 md:text-[9px]",
        )}
        style={{ backgroundColor: color, color: fg }}
      >
        {text}
      </span>
    </div>
  );
};

export default ProductCornerBadge;
