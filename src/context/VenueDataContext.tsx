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
import { logger } from "@/lib/logger";
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
import { THEME_PREVIEW_DRAFT_KEY } from "@/lib/theme-preview-draft";

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
  const initialCloudLoadDoneRef = useRef(false);

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
      const showSpinner = !initialCloudLoadDoneRef.current;
      if (showSpinner) setLoading(true);
      try {
        const venue = await pullVenueFromCloud(userId);
        if (mountedRef.current) {
          setData(venue);
          initialCloudLoadDoneRef.current = true;
        }
      } finally {
        if (mountedRef.current && (showSpinner || initialCloudLoadDoneRef.current)) {
          setLoading(false);
        }
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

  const skipSelfReloadRef = useRef(false);

  useEffect(() => {
    const onUpdate = () => {
      if (skipSelfReloadRef.current) {
        skipSelfReloadRef.current = false;
        return;
      }
      reloadLocal();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_PREVIEW_DRAFT_KEY) return;
      onUpdate();
    };
    window.addEventListener(VENUE_UPDATED, onUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(VENUE_UPDATED, onUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, [reloadLocal]);

  const update = useCallback(
    (patch: Partial<VenueData> | ((prev: VenueData) => VenueData)) => {
      setData((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        if (next === prev) return prev;
        try {
          saveCurrentVenueData(next);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error("venue.local_save_failed", { message });
          // أعد الحالة السابقة إن فشل التخزين (غالباً امتلاء المساحة بسبب الصور)
          window.setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent("meez:venue-save-failed", {
                detail: { reason: message },
              }),
            );
          }, 0);
          return prev;
        }
        skipSelfReloadRef.current = true;
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
