import { useCallback, useEffect, useState } from "react";
import type { OwnerSubscription, SubscriptionAccess } from "@/types/subscription";
import { appEnv } from "@/config/env";
import { isSupabaseConfigured } from "@/lib/supabase/client";
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

export function notifySubscriptionUpdated(): void {
  window.dispatchEvent(new Event(SUBSCRIPTION_UPDATED));
}

export function useSubscription(): {
  subscription: OwnerSubscription | null;
  access: SubscriptionAccess;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [venue] = useVenueData();
  const [subscription, setSubscription] = useState<OwnerSubscription | null>(null);
  const [loading, setLoading] = useState(
    () => Boolean(isSupabaseConfigured() && !appEnv.useLocalMockAuth),
  );

  const localAccess = accessFromVenueSubscription(
    venue.subscription,
    venue.devices.filter((d) => d.status === "active").length,
  );

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured() || appEnv.useLocalMockAuth) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    if (!getSession()?.userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await ensureSubscriptionRecord();
      const row = await fetchOwnerSubscription();
      setSubscription(row);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdate = () => void refresh();
    window.addEventListener(SUBSCRIPTION_UPDATED, onUpdate);
    return () => window.removeEventListener(SUBSCRIPTION_UPDATED, onUpdate);
  }, [refresh]);

  const access = subscription?.access ?? localAccess ?? defaultTrialAccess();

  return { subscription, access, loading, refresh };
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
  }, [
    access.status,
    access.screen_count,
    access.active_device_count,
    access.grace_ends_at,
    access.trial_ends_at,
    access.current_period_end,
    updateVenue,
  ]);
}
