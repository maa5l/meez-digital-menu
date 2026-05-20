import { useCallback, useEffect, useState } from "react";
import type { VenueData } from "@/types/venue";
import { appEnv } from "@/config/env";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getCurrentUserId,
  loadCurrentVenueData,
  pullVenueFromCloud,
  rememberOwnerUserId,
  refreshDeviceVenueSync,
  saveCurrentVenueData,
  resolveOwnerUserId,
  syncDeviceActivationsToCloud,
} from "@/lib/venue-store";

const VENUE_UPDATED = "meez:venue-updated";

export function useVenueData(): [
  VenueData,
  (patch: Partial<VenueData> | ((prev: VenueData) => VenueData)) => void,
  { loading: boolean },
] {
  const userId = resolveOwnerUserId();
  const [data, setData] = useState<VenueData>(() => loadCurrentVenueData());
  const [loading, setLoading] = useState(
    () => Boolean(userId && isSupabaseConfigured() && !appEnv.useLocalMockAuth),
  );

  const reload = useCallback(() => {
    setData(loadCurrentVenueData());
  }, []);

  useEffect(() => {
    reload();
  }, [userId, reload]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured() || appEnv.useLocalMockAuth) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    pullVenueFromCloud(userId)
      .then((venue) => {
        if (!cancelled) setData(venue);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const ownerId = getCurrentUserId();
    if (!ownerId) return;
    rememberOwnerUserId(ownerId);
    const venue = loadCurrentVenueData();
    for (const device of venue.devices) {
      refreshDeviceVenueSync(device.code, ownerId);
    }
    void syncDeviceActivationsToCloud(ownerId, venue.devices);
  }, []);

  useEffect(() => {
    const onUpdate = () => reload();
    window.addEventListener(VENUE_UPDATED, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(VENUE_UPDATED, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [reload]);

  const update = useCallback(
    (patch: Partial<VenueData> | ((prev: VenueData) => VenueData)) => {
      setData((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        saveCurrentVenueData(next);
        window.dispatchEvent(new Event(VENUE_UPDATED));
        return next;
      });
    },
    [],
  );

  return [data, update, { loading }];
}
