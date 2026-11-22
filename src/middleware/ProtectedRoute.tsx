import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ROUTES } from "@/config/app";
import { isAuthenticated } from "@/security/session";
import { getActiveSession } from "@/services/auth/auth.service";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { appEnv } from "@/config/env";
import { VenueDataProvider } from "@/context/VenueDataContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { SubscriptionGate } from "@/middleware/SubscriptionGate";
import { logger } from "@/lib/logger";

type Props = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: Props) {
  const location = useLocation();
  const needsSupabase = isSupabaseConfigured() && !appEnv.useLocalMockAuth;
  // لا تعرض اللوحة قبل التحقق من JWT — وإلا RPC تطلع not_authenticated كـ anon
  const [ready, setReady] = useState(!needsSupabase);
  const [authed, setAuthed] = useState(() => (!needsSupabase ? isAuthenticated() : false));

  useEffect(() => {
    if (!needsSupabase) {
      setAuthed(isAuthenticated());
      setReady(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const session = await getActiveSession();
        if (!session) {
          if (!cancelled) setAuthed(false);
          return;
        }
        const { data } = await getSupabase().auth.getSession();
        const jwtReady =
          Boolean(data.session?.access_token) && data.session?.user?.id === session.userId;
        if (!cancelled) setAuthed(jwtReady);
      } catch {
        if (!cancelled) setAuthed(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [needsSupabase]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" aria-busy="true">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    logger.security("route.blocked_unauthenticated", { path: location.pathname });
    return <Navigate to={ROUTES.auth} state={{ from: location.pathname }} replace />;
  }

  return (
    <VenueDataProvider>
      <SubscriptionProvider>
        <SubscriptionGate>{children}</SubscriptionGate>
      </SubscriptionProvider>
    </VenueDataProvider>
  );
}
