import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Monitor, Smartphone } from "lucide-react";
import type { ThemeSectionId } from "@/pages/dashboard/theme/theme-sections";
import { cn } from "@/lib/utils";

export type PreviewOrientation = "landscape" | "portrait";

const IPAD_LANDSCAPE = { width: 1024, height: 768 } as const;
const IPAD_PORTRAIT = { width: 768, height: 1024 } as const;

const DISPLAY_WIDTH = {
  landscape: 360,
  portrait: 280,
} as const;

type Props = {
  activeSection: ThemeSectionId;
  productsPreviewUrl: string;
  cropsPreviewUrl: string;
  orientation?: PreviewOrientation;
  onOrientationChange?: (orientation: PreviewOrientation) => void;
  showOrientationToggle?: boolean;
  className?: string;
};

function useOrientation(
  orientation: PreviewOrientation | undefined,
  onOrientationChange: ((o: PreviewOrientation) => void) | undefined,
) {
  const [internal, setInternal] = useState<PreviewOrientation>("landscape");
  const value = orientation ?? internal;
  const setValue = onOrientationChange ?? setInternal;
  return [value, setValue] as const;
}

/** معاينة آيباد مصغّرة — بدون إطار خارجي */
export function ThemePreviewFrame({
  activeSection,
  productsPreviewUrl,
  cropsPreviewUrl,
  orientation,
  onOrientationChange,
  showOrientationToggle = true,
  className,
}: Props) {
  const src = activeSection.startsWith("crops") ? cropsPreviewUrl : productsPreviewUrl;
  const [ready, setReady] = useState(false);
  const [orient, setOrient] = useOrientation(orientation, onOrientationChange);

  const viewport = orient === "landscape" ? IPAD_LANDSCAPE : IPAD_PORTRAIT;
  const displayWidth = DISPLAY_WIDTH[orient];
  const scale = displayWidth / viewport.width;
  const displayHeight = Math.round(viewport.height * scale);
  const bezel = 10;

  const shell = useMemo(
    () => ({
      width: displayWidth + bezel * 2,
      height: displayHeight + bezel * 2,
    }),
    [displayWidth, displayHeight, bezel],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {showOrientationToggle && (
        <ThemePreviewOrientationToggle orientation={orient} onChange={setOrient} />
      )}

      <div
        className="relative shrink-0 transition-[width,height] duration-300 ease-out"
        style={{ width: shell.width, height: shell.height }}
      >
        {/* هيكل الآيباد */}
        <div
          className="absolute inset-0 rounded-[1.25rem] shadow-[0_20px_45px_-15px_rgba(0,0,0,0.45)]"
          style={{
            background: "linear-gradient(155deg, #4a4a50 0%, #1e1e22 42%, #2e2e34 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.35), 0 20px 45px -15px rgba(0,0,0,0.45)",
          }}
        />

        {/* شاشة */}
        <div
          className="absolute overflow-hidden rounded-[0.85rem] bg-black"
          style={{
            left: bezel,
            top: bezel,
            width: displayWidth,
            height: displayHeight,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.85)",
          }}
        >
          {ready ? (
            <iframe
              title="معاينة المنيو"
              src={src}
              className="absolute left-0 top-0 border-0 bg-white"
              style={{
                width: viewport.width,
                height: viewport.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-neutral-950 text-[10px] text-neutral-500">
              جاري التحميل…
            </div>
          )}
        </div>

        {/* كاميرا أمامية */}
        <div
          className="pointer-events-none absolute left-1/2 top-[5px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-neutral-950 ring-1 ring-neutral-700/80"
          aria-hidden
        />

        {/* مؤشر الصفحة الرئيسية */}
        <div
          className={cn(
            "pointer-events-none absolute rounded-full bg-neutral-500/70",
            orient === "landscape"
              ? "bottom-[3px] left-1/2 h-[3px] w-9 -translate-x-1/2"
              : "bottom-[5px] left-1/2 h-[3px] w-9 -translate-x-1/2",
          )}
          aria-hidden
        />
      </div>
    </div>
  );
}

function OrientationButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all touch-manipulation",
        active
          ? "bg-background text-primary shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}

export function ThemePreviewOrientationToggle({
  orientation,
  onChange,
  className,
}: {
  orientation: PreviewOrientation;
  onChange: (orientation: PreviewOrientation) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-border/60 bg-muted/40 p-0.5 shadow-sm",
        className,
      )}
      role="group"
      aria-label="اتجاه الآيباد"
    >
      <OrientationButton
        active={orientation === "landscape"}
        label="أفقي"
        icon={<Monitor className="h-3.5 w-3.5" />}
        onClick={() => onChange("landscape")}
      />
      <OrientationButton
        active={orientation === "portrait"}
        label="عمودي"
        icon={<Smartphone className="h-3.5 w-3.5" />}
        onClick={() => onChange("portrait")}
      />
    </div>
  );
}
