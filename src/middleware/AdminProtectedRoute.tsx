import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ROUTES } from "@/config/app";
import { isAuthenticated } from "@/security/session";
import { getActiveSession } from "@/services/auth/auth.service";
import { fetchMyAdminProfile } from "@/services/admin/admin.service";
import type { AdminProfile } from "@/types/admin";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { appEnv } from "@/config/env";

type Props = {
  children: React.ReactNode;
  minRole?: "support" | "admin" | "super_admin";
};

const ROLE_RANK: Record<string, number> = {
  support: 1,
  admin: 2,
  super_admin: 3,
};

export function AdminProtectedRoute({ children, minRole = "support" }: Props) {
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isAuthenticated()) {
        if (!cancelled) {
          setAdmin(null);
          setReady(true);
        }
        return;
      }

      if (isSupabaseConfigured() && !appEnv.useLocalMockAuth) {
        await getActiveSession();
      }

      const profile = await fetchMyAdminProfile();
      if (!cancelled) {
        setAdmin(profile);
        setReady(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" aria-busy="true">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to={ROUTES.auth} state={{ from: location.pathname }} replace />;
  }

  if (!admin) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  const required = ROLE_RANK[minRole] ?? 1;
  const actual = ROLE_RANK[admin.role] ?? 0;
  if (actual < required) {
    return <Navigate to={ROUTES.admin} replace />;
  }

  return <>{children}</>;
}
