import { useImageAutoRetry } from "@/hooks/useImageAutoRetry";
import { cn } from "@/lib/utils";

type Props = {
  src?: string;
  alt: string;
  className?: string;
  placeholder?: React.ReactNode;
};

/** صورة منتج مع إعادة محاولة تلقائية عند فشل التحميل */
export default function MenuProductImage({ src, alt, className, placeholder }: Props) {
  const { displaySrc, failed, handleError, reloadKey } = useImageAutoRetry(src);

  if (!displaySrc || failed) {
    return placeholder ? <>{placeholder}</> : null;
  }

  return (
    <img
      key={reloadKey}
      src={displaySrc}
      alt={alt}
      className={cn(className)}
      decoding="async"
      loading="lazy"
      onError={handleError}
    />
  );
}
