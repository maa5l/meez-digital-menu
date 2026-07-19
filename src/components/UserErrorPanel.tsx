import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Clock,
  Database,
  FolderOpen,
  ImageOff,
  Link2Off,
  Loader2,
  MonitorOff,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
  Store,
  UtensilsCrossed,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ErrorCategory, UserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";

const ICONS: Record<ErrorCategory, LucideIcon> = {
  internet: WifiOff,
  connection_lost: Wifi,
  server: ServerCrash,
  timeout: Clock,
  rpc: Database,
  session: ShieldAlert,
  menu_update: RefreshCw,
  image: ImageOff,
  menu_data: AlertTriangle,
  branch_missing: Store,
  branch_inactive: Store,
  kiosk_inactive: MonitorOff,
  invalid_link: Link2Off,
  empty_menu: UtensilsCrossed,
  empty_category: FolderOpen,
  schema: Database,
  storage: AlertTriangle,
  unexpected: AlertTriangle,
  unknown: AlertTriangle,
};

type Props = {
  error: UserFacingError;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
  loading?: boolean;
};

/** لوحة أخطاء موحّدة — عنوان + وصف + أيقونة + إعادة محاولة */
export function UserErrorPanel({
  error,
  onRetry,
  retryLabel = "إعادة المحاولة",
  className,
  compact = false,
  loading = false,
}: Props) {
  const Icon = ICONS[error.category] ?? AlertTriangle;
  const showRetry = error.retryable && onRetry;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-3 p-4" : "gap-4 p-8",
        className,
      )}
      dir="rtl"
      role="alert"
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-amber-500/10",
          compact ? "h-12 w-12" : "h-16 w-16",
        )}
      >
        {loading || error.category === "menu_update" ? (
          <Loader2 className={cn("animate-spin text-amber-600", compact ? "h-6 w-6" : "h-8 w-8")} />
        ) : (
          <Icon className={cn("text-amber-600", compact ? "h-6 w-6" : "h-8 w-8")} aria-hidden />
        )}
      </div>

      <div className="max-w-md space-y-2">
        <h2 className={cn("font-display font-black", compact ? "text-lg" : "text-2xl")}>{error.title}</h2>
        <p className={cn("leading-relaxed opacity-80", compact ? "text-xs" : "text-sm")}>{error.message}</p>
        {error.hint ? (
          <p className={cn("opacity-60", compact ? "text-[11px]" : "text-xs")}>{error.hint}</p>
        ) : null}
        {error.autoRetry ? (
          <p className="text-xs font-semibold text-amber-700/90">سيتم إعادة المحاولة تلقائيًا...</p>
        ) : null}
      </div>

      {showRetry ? (
        <Button type="button" variant="outline" size={compact ? "sm" : "default"} onClick={onRetry}>
          <RefreshCw className="ml-2 h-4 w-4" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
