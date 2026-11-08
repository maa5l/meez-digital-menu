import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { OwnerSubscription, SubscriptionAccess } from "@/types/subscription";
import { appEnv } from "@/config/env";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { getSession } from "@/security/session";
import { useVenueDataContext } from "@/context/VenueDataContext";
import { loadCurrentVenueData } from "@/lib/venue-store";
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

type SubscriptionContextValue = {
  subscription: OwnerSubscription | null;
  access: SubscriptionAccess;
  loading: boolean;
  loadState: SubscriptionLoadState;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function notifySubscriptionUpdated(): void {
  window.dispatchEvent(new Event(SUBSCRIPTION_UPDATED));
}

/** مزوّد واحد لكل لوحة التحكم — يمنع تكرار ensure/fetch من كل صفحة */
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const venueCtx = useVenueDataContext();
  const venue = venueCtx?.data ?? loadCurrentVenueData();
  const updateLocalOnly = venueCtx?.updateLocalOnly;

  const [subscription, setSubscription] = useState<OwnerSubscription | null>(null);
  const [loadState, setLoadState] = useState<SubscriptionLoadState>({ kind: "ok" });
  // لا نبدأ بسبينر — الكاش المحلي يكفي للدخول التفاؤلي
  const [loading, setLoading] = useState(false);
  const initialLoadDoneRef = useRef(false);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const localAccess = accessFromVenueSubscription(
    venue.subscription,
    venue.devices.filter((d) => d.status === "active").length,
  );

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      await refreshInFlightRef.current;
      return;
    }

    const run = (async () => {
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

      try {
        const sessionUserId = getSession()?.userId ?? null;
        const { data: authData } = await getSupabase().auth.getSession();
        const userId = authData.session?.user?.id ?? sessionUserId;
        if (!userId) {
          setSubscription(null);
          setLoadState({ kind: "ok" });
          setLoading(false);
          return;
        }

        // جلب أولاً — ensure البطيء فقط إن لم يوجد سجل بعد
        let result = await fetchOwnerSubscription();
        if (result.ok === false && result.isNetwork === false) {
          await ensureSubscriptionRecord(userId);
          result = await fetchOwnerSubscription();
        }
        if (result.ok === true) {
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
        setLoading(false);
      }
    })();

    refreshInFlightRef.current = run;
    try {
      await run;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) return;
    const { data: sub } = getSupabase().auth.onAuthStateChange((event) => {
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

  // مزامنة ملخص الاشتراك محلياً فقط — بدون رفع JSON المنشأة للسحابة
  useEffect(() => {
    if (!updateLocalOnly) return;
    const next = subscriptionInfoFromAccess(access);
    updateLocalOnly((v) => {
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
  }, [
    access.status,
    access.screen_count,
    access.active_device_count,
    access.trial_ends_at,
    access.subscription_ends_at,
    access.dashboard_allowed,
    updateLocalOnly,
  ]);

  const value = useMemo(
    () => ({ subscription, access, loading, loadState, refresh }),
    [subscription, access, loading, loadState, refresh],
  );

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}
