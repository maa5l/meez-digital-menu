import { useEffect } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { usesSupabaseAuth } from "@/config/env";
import { clearSession } from "@/security/session";
import {
  getActiveSession,
  recoverInvalidRefreshSession,
  syncSessionFromSupabase,
} from "@/services/auth/auth.service";

const VENUE_UPDATED = "meez:venue-updated";

/**
 * يزامن جلسة Supabase عند التحديث/التحميل — يمنع لوحة فارغة بعد الدخول من Vercel.
 */
export function AuthBootstrap() {
  useEffect(() => {
    if (!isSupabaseConfigured() || !usesSupabaseAuth()) return;

    const supabase = getSupabase();

    void (async () => {
      await recoverInvalidRefreshSession();
      try {
        await getActiveSession();
        window.dispatchEvent(new Event(VENUE_UPDATED));
      } catch {
        /* ignore hydrate failures on boot */
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearSession();
        window.dispatchEvent(new Event(VENUE_UPDATED));
        return;
      }

      // فشل تحديث التوكن → جلسة محلية يتيمة
      if (event === "TOKEN_REFRESHED" && !session) {
        clearSession();
        window.dispatchEvent(new Event(VENUE_UPDATED));
        return;
      }

      if (
        session &&
        (event === "SIGNED_IN" || event === "INITIAL_SESSION")
      ) {
        syncSessionFromSupabase(session);
        void getActiveSession()
          .then(() => {
            window.dispatchEvent(new Event(VENUE_UPDATED));
          })
          .catch(() => {
            /* ignore hydrate failures after auth events */
          });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
