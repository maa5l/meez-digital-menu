import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import type { SubscriptionLoadState } from "@/hooks/useSubscription";

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

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 bg-background text-center"
      dir="rtl"
    >
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-amber-600" aria-hidden />
      </div>
      <h1 className="font-display font-black text-2xl mb-3">تحديث قاعدة البيانات مطلوب</h1>
      <p className="text-muted-foreground max-w-lg mb-4 leading-relaxed">
        {needsMigration
          ? "الميزات الجديدة تحتاج تطبيق migration على Supabase. افتح Supabase Dashboard → SQL Editor ونفّذ الملف:"
          : "حدث خطأ من الخادم أثناء جلب حالة الاشتراك."}
      </p>
      {needsMigration && (
        <>
          <code className="text-xs bg-secondary px-3 py-2 rounded-lg mb-2 block">
            supabase/migrations/20260614130000_fix_subscription_rpc_volatility.sql
          </code>
          <p className="text-xs text-muted-foreground mb-4">
            (أو أعد تنفيذ الملف السابق بعد تحديثه — تم إصلاح STABLE → VOLATILE)
          </p>
        </>
      )}
      {!needsMigration && (
        <p className="text-xs text-muted-foreground mb-4 font-mono" dir="ltr">
          {code ? `${code}: ` : ""}
          {message}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 ml-2" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

export function SupabaseConnectionError({ state, onRetry }: Props) {
  if (state.kind === "server_error") {
    return <ServerErrorPanel message={state.message} code={state.code} onRetry={onRetry} />;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 bg-background text-center"
      dir="rtl"
    >
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
        <WifiOff className="w-8 h-8 text-destructive" aria-hidden />
      </div>
      <h1 className="font-display font-black text-2xl mb-3">تعذّر الاتصال بالخادم</h1>
      <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
        تحقق من اتصال الإنترنت ومن{" "}
        <code className="text-xs bg-secondary px-1 rounded">VITE_SUPABASE_URL</code> و{" "}
        <code className="text-xs bg-secondary px-1 rounded">VITE_SUPABASE_ANON_KEY</code> في{" "}
        <code className="text-xs bg-secondary px-1 rounded">.env.local</code>.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 ml-2" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}
