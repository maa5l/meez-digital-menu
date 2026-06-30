import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionExpired from "@/pages/SubscriptionExpired";
import { appEnv } from "@/config/env";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { fetchMyAdminProfile } from "@/services/admin/admin.service";
import { SupabaseConnectionError } from "@/components/SupabaseConnectionError";

type Props = {
  children: React.ReactNode;
};

/**
 * يمنع الوصول للوحة التحكم عند انتهاء التجربة/الاشتراك.
 * التحقق الحقيقي على الخادم (RPC) — هذا طبقة عرض فقط.
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
    void fetchMyAdminProfile()
      .then((p) => {
        setIsAdmin(Boolean(p?.isAdmin));
      })
      .catch(() => {
        setIsAdmin(false);
      })
      .finally(() => {
        setAdminChecked(true);
      });
  }, []);

  if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
    return <>{children}</>;
  }

  if (loading || !adminChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" aria-busy="true">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadState.kind !== "ok") {
    return <SupabaseConnectionError state={loadState} onRetry={() => void refresh()} />;
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  if (!access.dashboard_allowed) {
    return <SubscriptionExpired />;
  }

  return <>{children}</>;
}
