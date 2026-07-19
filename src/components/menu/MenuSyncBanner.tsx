import type { UserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Props = {
  syncing: boolean;
  notice: UserFacingError | null;
  error: UserFacingError | null;
  className?: string;
};

/** شريط خفيف لتحديث المنيو أو أخطاء مؤقتة — لا يحجب المحتوى */
export function MenuSyncBanner({ syncing, notice, error, className }: Props) {
  const active = syncing && notice ? notice : error;
  if (!active) return null;

  const isError = Boolean(error && !syncing);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold shadow-sm md:text-sm",
        isError ? "bg-amber-600/95 text-white" : "bg-black/70 text-white backdrop-blur-sm",
        className,
      )}
    >
      {syncing && notice ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
      <span>{active.message}</span>
      {active.autoRetry ? <span className="opacity-80">· جاري إعادة المحاولة...</span> : null}
    </div>
  );
}
