import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  dir?: "rtl" | "ltr";
  labelledBy?: string;
};

/** نافذة منبثقة فوق كل طبقات المنيو — blur متدرّج + portal لتجنب قصّ fixed داخل animate/transform */
export function MenuModalPortal({ onClose, children, className, dir, labelledBy }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6",
        "transition-opacity duration-300 motion-reduce:transition-none",
        visible ? "opacity-100" : "opacity-0",
      )}
      onClick={onClose}
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        className={cn(
          "absolute inset-0 bg-[#1a1510]/40 motion-reduce:backdrop-blur-sm",
          "transition-[opacity,backdrop-filter] duration-500 ease-out motion-reduce:transition-none",
          visible
            ? "opacity-100 backdrop-blur-[22px] backdrop-saturate-[1.15]"
            : "opacity-0 backdrop-blur-none",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "relative z-10 w-full opacity-100",
          "transition-[transform,opacity] duration-460 ease-menu-spring motion-reduce:transition-none",
          visible ? "translate-y-0 scale-100" : "translate-y-3 scale-[0.97] opacity-0",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
