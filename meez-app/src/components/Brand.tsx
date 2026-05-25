const maskStyle = (src: string): React.CSSProperties => ({
  WebkitMask: `url(${src}) center/contain no-repeat`,
  mask: `url(${src}) center/contain no-repeat`,
});

export const Logo = ({ className = "h-8 w-auto aspect-[1031/736]" }: { className?: string }) => (
  <span
    role="img"
    aria-label="ميز"
    className={`inline-block bg-current ${className}`}
    style={maskStyle("/logo.svg")}
  />
);
