import { useImageAutoRetry } from "@/hooks/useImageAutoRetry";
import { cropFieldLabels } from "@/lib/crop-i18n";
import {
  resolveCropHeroAspect,
  type CropImageOrientation,
} from "@/lib/crop-spec";
import type { MenuLang } from "@/lib/product-i18n";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

type Props = {
  imageUrl?: string;
  alt: string;
  lang: MenuLang;
  className?: string;
  rounded?: "xl" | "2xl" | "3xl";
  overlay?: boolean;
  /** عمودية أو عرضية — يغيّر نسبة العرض في تفاصيل المحصول */
  orientation?: CropImageOrientation;
};

/** صورة بطل المحصول — نسبة حسب الاتجاه (عمودي / عرضي) */
const CropHeroImage = ({
  imageUrl,
  alt,
  lang,
  className,
  rounded = "2xl",
  overlay = false,
  orientation = "landscape",
}: Props) => {
  const { displaySrc, failed, handleError, reloadKey } = useImageAutoRetry(imageUrl);
  const L = cropFieldLabels[lang];
  const radius =
    rounded === "3xl" ? "rounded-[1.75rem]" : rounded === "2xl" ? "rounded-2xl" : "rounded-xl";

  const showImage = Boolean(displaySrc) && !failed;
  const aspect = resolveCropHeroAspect(orientation);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-neutral-100/80 ring-1 ring-black/[0.06]",
        orientation === "portrait" && "mx-auto max-w-[min(100%,320px)] md:max-w-[min(100%,380px)]",
        radius,
        className,
      )}
      style={{ aspectRatio: aspect }}
    >
      {showImage ? (
        <>
          <img
            key={reloadKey}
            src={displaySrc}
            alt={alt}
            className="absolute inset-0 h-full w-full object-cover object-center"
            decoding="async"
            loading="lazy"
            onError={handleError}
          />
          {overlay && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-400">
          <ImageIcon className="h-10 w-10 opacity-40" strokeWidth={1.5} />
          <span className="text-xs font-semibold opacity-60">{L.noImage}</span>
        </div>
      )}
    </div>
  );
};

export default CropHeroImage;
