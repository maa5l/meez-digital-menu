import logo from "@/assets/logo.svg";
import riyal from "@/assets/riyal.svg";
import { cn } from "@/lib/utils";

export const Logo = ({ className = "h-8 w-auto aspect-[1031/736]" }: { className?: string }) => (
  <img src={logo} alt="ميز" className={cn("object-contain", className)} />
);

export const Riyal = ({
  className = "inline-block h-[0.85em] w-[0.85em] align-[-0.05em] mx-1 object-contain",
}: {
  className?: string;
}) => (
  <img src={riyal} alt="" aria-hidden className={className} />
);
