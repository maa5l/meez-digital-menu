import type { SubscriptionLoadState } from "@/hooks/useSubscription";
import { UserErrorPanel } from "@/components/UserErrorPanel";
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
          title: needsMigration ? "تحديث الخدمة مطلوب" : error.title,
          message: needsMigration
            ? "نعمل على تحديث المنصة. حاول بعد قليل أو تواصل مع الدعم."
            : error.message,
          hint: needsMigration ? "إذا استمرت المشكلة، تواصل مع الدعم الفني." : error.hint,
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
        تحقق من اتصال الإنترنت ثم أعد المحاولة.
      </p>
    </div>
  );
}
