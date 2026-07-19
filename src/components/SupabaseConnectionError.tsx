import { Button } from "@/components/ui/button";
import { UserErrorPanel } from "@/components/UserErrorPanel";
import type { SubscriptionLoadState } from "@/hooks/useSubscription";
import { classifyUserFacingError, rpcFailureNotice } from "@/lib/user-facing-errors";

type Props = {
  state: SubscriptionLoadState;
  onRetry?: () => void;
};

function ServerErrorPanel({ message, code, onRetry }: { message: string; code?: string; onRetry?: () => void }) {
  const needsMigration =
    code === "PGRST202" ||
    code === "25006" ||
    /could not find the function|column .* does not exist|relation .* does not exist|read-only transaction/i.test(
      message,
    );

  const error = needsMigration
    ? classifyUserFacingError(message, { code })
    : rpcFailureNotice(message);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background" dir="rtl">
      <UserErrorPanel
        error={{
          ...error,
          title: needsMigration ? "تحديث قاعدة البيانات مطلوب" : error.title,
          message: needsMigration
            ? "الميزات الجديدة تحتاج تطبيق migration على Supabase."
            : error.message,
          hint: needsMigration
            ? "supabase/migrations/20260614130000_fix_subscription_rpc_volatility.sql"
            : code
              ? `${code}: ${message}`
              : error.hint,
        }}
        onRetry={onRetry}
      />
    </div>
  );
}

export function SupabaseConnectionError({ state, onRetry }: Props) {
  if (state.kind === "server_error") {
    return <ServerErrorPanel message={state.message} code={state.code} onRetry={onRetry} />;
  }

  const error = classifyUserFacingError(new Error("offline"), { online: false });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background" dir="rtl">
      <UserErrorPanel error={error} onRetry={onRetry} />
      <p className="mt-4 max-w-md text-center text-xs text-muted-foreground">
        تحقق من{" "}
        <code className="rounded bg-secondary px-1 text-[11px]">VITE_SUPABASE_URL</code> و{" "}
        <code className="rounded bg-secondary px-1 text-[11px]">VITE_SUPABASE_ANON_KEY</code> في{" "}
        <code className="rounded bg-secondary px-1 text-[11px]">.env.local</code>
      </p>
    </div>
  );
}
