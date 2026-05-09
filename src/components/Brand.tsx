import logo from "@/assets/logo.svg";
import riyal from "@/assets/riyal.svg";

const maskStyle = (src: string): React.CSSProperties => ({
  WebkitMask: `url(${src}) center/contain no-repeat`,
  mask: `url(${src}) center/contain no-repeat`,
});

export const Logo = ({ className = "h-8 w-auto aspect-[1031/736]" }: { className?: string }) => (
  <span
    role="img"
    aria-label="ميز"
    className={`inline-block bg-current ${className}`}
    style={maskStyle(logo)}
  />
);

export const Riyal = ({ className = "inline-block w-[0.85em] h-[0.85em] align-[-0.05em] mx-1" }: { className?: string }) => (
  <span
    role="img"
    aria-label="ريال سعودي"
    className={`bg-current ${className}`}
    style={maskStyle(riyal)}
  />
);
