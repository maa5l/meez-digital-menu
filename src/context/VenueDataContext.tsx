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
import type { VenueData } from "@/types/venue";
import { appEnv } from "@/config/env";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { debounce, throttle } from "@/lib/throttle";
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
import { invalidateOwnerVenueCache } from "@/services/venue/venue-supabase.service";

const VENUE_UPDATED = "meez:venue-updated";

type VenueDataContextValue = {
  data: VenueData;
  update: (patch: Partial<VenueData> | ((prev: VenueData) => VenueData)) => void;
  loading: boolean;
  refreshFromCloud: (force?: boolean) => Promise<void>;
};

const VenueDataContext = createContext<VenueDataContextValue | null>(null);

export function VenueDataProvider({ children }: { children: ReactNode }) {
  const userId = resolveOwnerUserId();
  const [data, setData] = useState<VenueData>(() => loadCurrentVenueData());
  const [loading, setLoading] = useState(
    () => Boolean(userId && isSupabaseConfigured() && !appEnv.useLocalMockAuth),
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reloadLocal = useCallback(() => {
    setData(loadCurrentVenueData());
  }, []);

  const refreshFromCloud = useCallback(
    async (force = false) => {
      if (!userId || !isSupabaseConfigured() || appEnv.useLocalMockAuth) {
        reloadLocal();
        return;
      }
      if (force) invalidateOwnerVenueCache(userId);
      setLoading(true);
      try {
        const venue = await pullVenueFromCloud(userId);
        if (mountedRef.current) setData(venue);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [userId, reloadLocal],
  );

  const refreshDebounced = useMemo(
    () => debounce(() => void refreshFromCloud(false), 500),
    [refreshFromCloud],
  );

  useEffect(() => {
    const onCloudRefresh = () => refreshDebounced();
    window.addEventListener("meez:venue-cloud-refresh", onCloudRefresh);
    return () => window.removeEventListener("meez:venue-cloud-refresh", onCloudRefresh);
  }, [refreshDebounced]);

  const refreshThrottled = useMemo(
    () => throttle(() => void refreshFromCloud(false), 30_000),
    [refreshFromCloud],
  );

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) refreshThrottled();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshThrottled]);

  useEffect(() => {
    reloadLocal();
  }, [userId, reloadLocal]);

  useEffect(() => {
    void refreshFromCloud(false);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps -- مرة عند تغيّر المستخدم فقط

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
    const onUpdate = () => reloadLocal();
    window.addEventListener(VENUE_UPDATED, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(VENUE_UPDATED, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [reloadLocal]);

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

  const value = useMemo(
    () => ({ data, update, loading, refreshFromCloud }),
    [data, update, loading, refreshFromCloud],
  );

  return (
    <VenueDataContext.Provider value={value}>
      {children}
    </VenueDataContext.Provider>
  );
}

export function useVenueDataContext(): VenueDataContextValue | null {
  return useContext(VenueDataContext);
}
