import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ROUTES } from "@/config/app";
import { isAuthenticated } from "@/security/session";
import { getActiveSession } from "@/services/auth/auth.service";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { appEnv } from "@/config/env";
import { VenueDataProvider } from "@/context/VenueDataContext";
import { logger } from "@/lib/logger";

type Props = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: Props) {
  const location = useLocation();
  const [ready, setReady] = useState(true);
  const [authed, setAuthed] = useState(() => isAuthenticated());

  useEffect(() => {
    if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) return;

    getActiveSession()
      .then((session) => setAuthed(!!session))
      .catch(() => setAuthed(false))
      .finally(() => setReady(true));
  }, []);

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

  return <VenueDataProvider>{children}</VenueDataProvider>;
}
