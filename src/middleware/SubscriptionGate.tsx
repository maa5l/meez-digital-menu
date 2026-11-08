import { lazy, Suspense, useEffect, useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { appEnv } from "@/config/env";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchMyAdminProfile } from "@/services/admin/admin.service";
import { SupabaseConnectionError } from "@/components/SupabaseConnectionError";

const SubscriptionExpired = lazy(() => import("@/pages/SubscriptionExpired"));

type Props = {
  children: React.ReactNode;
};

const ADMIN_CHECK_TIMEOUT_MS = 2500;

/**
 * يمنع الوصول للوحة التحكم عند انتهاء التجربة/الاشتراك.
 * لا يحجب الواجهة إن كان الكاش المحلي يسمح بالدخول أثناء انتظار السحابة.
 */
export function SubscriptionGate({ children }: Props) {
  const { access, loading, loadState, refresh } = useSubscription();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
      setAdminChecked(true);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setAdminChecked(true);
    }, ADMIN_CHECK_TIMEOUT_MS);

    void fetchMyAdminProfile()
      .then((p) => {
        if (!cancelled) setIsAdmin(Boolean(p?.isAdmin));
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      })
      .finally(() => {
        if (!cancelled) {
          setAdminChecked(true);
          window.clearTimeout(timeout);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    return <>{children}</>;
  }

  // دخول تفاؤلي من الكاش المحلي — لا ننتظر 10 ثوانٍ لسبينر كامل الشاشة
  const canEnterOptimistically = access.dashboard_allowed || isAdmin;

  if (loading && !canEnterOptimistically) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" aria-busy="true">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!adminChecked && !canEnterOptimistically) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" aria-busy="true">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!loading && loadState.kind !== "ok" && !canEnterOptimistically) {
    return <SupabaseConnectionError state={loadState} onRetry={() => void refresh()} />;
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  if (!access.dashboard_allowed && adminChecked && !loading) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-background" aria-busy="true">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <SubscriptionExpired />
      </Suspense>
    );
  }

  return <>{children}</>;
}
