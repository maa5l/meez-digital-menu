import { useCallback, useEffect, useRef, useState } from "react";
import type { OwnerSubscription, SubscriptionAccess } from "@/types/subscription";
import { appEnv } from "@/config/env";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { getSession } from "@/security/session";
import { useVenueData } from "@/hooks/useVenueData";
import {
  accessFromVenueSubscription,
  defaultTrialAccess,
  ensureSubscriptionRecord,
  fetchOwnerSubscription,
  subscriptionInfoFromAccess,
} from "@/services/subscription/subscription-enforcement";

const SUBSCRIPTION_UPDATED = "meez:subscription-updated";

export type SubscriptionLoadState =
  | { kind: "ok" }
  | { kind: "network_error"; message: string }
  | { kind: "server_error"; message: string; code?: string };

export function notifySubscriptionUpdated(): void {
  window.dispatchEvent(new Event(SUBSCRIPTION_UPDATED));
}

export function useSubscription(): {
  subscription: OwnerSubscription | null;
  access: SubscriptionAccess;
  loading: boolean;
  loadState: SubscriptionLoadState;
  refresh: () => Promise<void>;
} {
  const [venue] = useVenueData();
  const [subscription, setSubscription] = useState<OwnerSubscription | null>(null);
  const [loadState, setLoadState] = useState<SubscriptionLoadState>({ kind: "ok" });
  const [loading, setLoading] = useState(
    () => Boolean(isSupabaseConfigured() && !appEnv.useLocalMockAuth),
  );
  const initialLoadDoneRef = useRef(false);

  const localAccess = accessFromVenueSubscription(
    venue.subscription,
    venue.devices.filter((d) => d.status === "active").length,
  );

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
      setSubscription(null);
      setLoadState({ kind: "ok" });
      setLoading(false);
      return;
    }

    if (!getSession()?.userId) {
      setSubscription(null);
      setLoadState({ kind: "ok" });
      setLoading(false);
      return;
    }

    const showSpinner = !initialLoadDoneRef.current;
    if (showSpinner) setLoading(true);
    try {
      const { data: authData } = await getSupabase().auth.getSession();
      if (!authData.session?.user?.id) {
        setSubscription(null);
        setLoadState({ kind: "ok" });
        return;
      }

      await ensureSubscriptionRecord();
      const result = await fetchOwnerSubscription();
      if (result.ok) {
        setSubscription(result.data);
        setLoadState({ kind: "ok" });
        initialLoadDoneRef.current = true;
      } else if (result.isNetwork) {
        setSubscription(null);
        setLoadState({ kind: "network_error", message: result.message });
      } else {
        setSubscription(null);
        setLoadState({
          kind: "server_error",
          message: result.message,
          code: result.code,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isNetwork = /failed to fetch|networkerror|load failed/i.test(message);
      setSubscription(null);
      setLoadState(
        isNetwork
          ? { kind: "network_error", message }
          : { kind: "server_error", message },
      );
    } finally {
      if (showSpinner || initialLoadDoneRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) return;
    const { data: sub } = getSupabase().auth.onAuthStateChange((event) => {
      // تجديد التوكن يحدث باستمرار — لا نعيد تحميل الواجهة عنده
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
      void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  useEffect(() => {
    const onUpdate = () => void refresh();
    window.addEventListener(SUBSCRIPTION_UPDATED, onUpdate);
    return () => window.removeEventListener(SUBSCRIPTION_UPDATED, onUpdate);
  }, [refresh]);

  const access = subscription?.access ?? localAccess ?? defaultTrialAccess();

  return { subscription, access, loading, loadState, refresh };
}

export function useSyncVenueSubscription(): void {
  const { access } = useSubscription();
  const [, updateVenue] = useVenueData();

  useEffect(() => {
    const next = subscriptionInfoFromAccess(access);
    updateVenue((v) => {
      const s = v.subscription;
      if (
        s.status === next.status &&
        s.maxScreens === next.maxScreens &&
        s.screens === next.screens &&
        s.daysLeft === next.daysLeft
      ) {
        return v;
      }
      return { ...v, subscription: next };
    });
    // access fields listed individually to avoid syncing on unrelated access mutations
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    access.status,
    access.screen_count,
    access.active_device_count,
    access.trial_ends_at,
    access.subscription_ends_at,
    access.dashboard_allowed,
    updateVenue,
  ]);
}
