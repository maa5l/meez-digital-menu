import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VenueData } from "@/types/venue";
import {
  createEmptyVenueData,
  loadCurrentVenueData,
  loadVenueForDevice,
  syncVenueForDeviceIfStale,
} from "@/lib/venue-store";
import { mergeVenueWithPreviewDraft, THEME_PREVIEW_DRAFT_EVENT, THEME_PREVIEW_DRAFT_KEY } from "@/lib/theme-preview-draft";
import { fetchDashboardPreviewVenue } from "@/services/core/platform-security";
import { shouldUseVenueDatabase, invalidateDeviceVenueCache } from "@/services/venue/venue-supabase.service";
import { usesSupabaseAuth } from "@/config/env";
import { debounce, throttle } from "@/lib/throttle";
import { MENU_KIOSK_RESET_EVENT } from "@/lib/menu-kiosk";
import { isKioskMode } from "@/lib/kiosk-mode";
import { MENU_VENUE_POLL_MS } from "@/config/venue-sync";
import {
  classifyUserFacingError,
  menuUpdateNotice,
  type UserFacingError,
} from "@/lib/user-facing-errors";
import { logger } from "@/lib/logger";

const VENUE_UPDATED = "meez:venue-updated";
const AUTO_RETRY_MS = 8_000;

export type MenuVenueResult = VenueData & {
  isCatalogResolved: boolean;
  isSyncing: boolean;
  syncNotice: UserFacingError | null;
  syncError: UserFacingError | null;
};

function isMenuKioskContext(): boolean {
  if (typeof window === "undefined") return false;
  return isKioskMode(new URLSearchParams(window.location.search));
}

/** بيانات المنيو للعرض — polling + cache (RPC-only؛ لا Realtime على الجداول) */
export function useMenuVenue(
  deviceCode: string | null,
  isPreview: boolean,
  ready: boolean,
): MenuVenueResult {
  const load = useCallback(() => {
    if (!ready) return createEmptyVenueData();
    if (isPreview) return loadCurrentVenueData();
    if (deviceCode) return loadVenueForDevice(deviceCode);
    return createEmptyVenueData();
  }, [deviceCode, isPreview, ready]);

  const [venue, setVenue] = useState<VenueData>(load);
  const [isCatalogResolved, setIsCatalogResolved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<UserFacingError | null>(null);
  const [syncError, setSyncError] = useState<UserFacingError | null>(null);
  const mountedRef = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const syncNoticeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (syncNoticeTimerRef.current) clearTimeout(syncNoticeTimerRef.current);
    };
  }, []);

  const scheduleAutoRetry = useCallback((forceReload: () => void) => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      if (mountedRef.current) forceReload();
    }, AUTO_RETRY_MS);
  }, []);

  const flashSyncNotice = useCallback(() => {
    if (!mountedRef.current) return;
    setSyncNotice(menuUpdateNotice());
    if (syncNoticeTimerRef.current) clearTimeout(syncNoticeTimerRef.current);
    syncNoticeTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setSyncNotice(null);
    }, 3_000);
  }, []);

  const reloadFull = useCallback(
    async (force = false) => {
      if (!ready) {
        if (mountedRef.current) {
          setVenue(createEmptyVenueData());
          setIsCatalogResolved(false);
          setIsSyncing(false);
          setSyncNotice(null);
          setSyncError(null);
        }
        return;
      }

      setIsSyncing(true);
      setSyncError(null);

      try {
        if (isPreview) {
          let next = loadCurrentVenueData();
          if (shouldUseVenueDatabase() && usesSupabaseAuth()) {
            const fromRpc = await fetchDashboardPreviewVenue(force);
            if (fromRpc?.version === 1) {
              const rpcUpdated = fromRpc.updatedAt ?? "";
              const localUpdated = next.updatedAt ?? "";
              if (force || !localUpdated || rpcUpdated >= localUpdated) {
                next = fromRpc;
              }
            }
          }
          if (mountedRef.current) {
            setVenue(mergeVenueWithPreviewDraft(next));
            setSyncNotice(null);
          }
          return;
        }

        if (deviceCode && shouldUseVenueDatabase()) {
          if (!navigator.onLine) {
            const offline = classifyUserFacingError(new Error("offline"), { online: false });
            if (mountedRef.current) {
              setSyncError(offline);
              scheduleAutoRetry(() => void reloadFull(true));
            }
            if (mountedRef.current) setVenue(loadVenueForDevice(deviceCode));
            return;
          }

          if (force) invalidateDeviceVenueCache(deviceCode);
          const { venue: fromCloud, changed } = await syncVenueForDeviceIfStale(deviceCode, force);
          if (mountedRef.current) {
            setVenue(fromCloud);
            if (changed) flashSyncNotice();
            else setSyncNotice(null);
            setSyncError(null);
          }
          return;
        }

        if (mountedRef.current) setVenue(load());
      } catch (err) {
        const classified = classifyUserFacingError(err);
        logger.error("menu.venue_reload_failed", {
          message: err instanceof Error ? err.message : String(err),
          category: classified.category,
          logLabel: classified.logLabel,
        });
        if (mountedRef.current) {
          setSyncError(classified);
          if (classified.autoRetry) scheduleAutoRetry(() => void reloadFull(true));
        }
      } finally {
        if (mountedRef.current) {
          setIsSyncing(false);
          if (!force) setSyncNotice(null);
        }
        if (mountedRef.current && ready) setIsCatalogResolved(true);
      }
    },
    [deviceCode, isPreview, ready, load, scheduleAutoRetry, flashSyncNotice],
  );

  const reloadDebounced = useMemo(
    () =>
      debounce(
        (force?: boolean) => void reloadFull(Boolean(force)),
        isMenuKioskContext() ? 150 : 500,
      ),
    [reloadFull],
  );

  const reloadThrottled = useMemo(
    () => throttle(() => void reloadFull(false), isMenuKioskContext() ? 8_000 : 30_000),
    [reloadFull],
  );

  useEffect(() => {
    setIsCatalogResolved(false);
    void reloadFull(false);
  }, [reloadFull]);

  useEffect(() => {
    if (!ready) return;

    const applyPreviewDraft = () => {
      if (!isPreview || !mountedRef.current) return;
      setVenue(mergeVenueWithPreviewDraft(loadCurrentVenueData()));
    };

    const applyPreviewDraftDebounced = debounce(applyPreviewDraft, 400);

    const onUpdate = () => reloadDebounced(false);

    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_PREVIEW_DRAFT_KEY) {
        if (isPreview) applyPreviewDraftDebounced();
        return;
      }
      onUpdate();
    };

    const onOnline = () => {
      setSyncError(null);
      void reloadFull(true);
    };

    window.addEventListener(VENUE_UPDATED, onUpdate);
    window.addEventListener("storage", onStorage);
    window.addEventListener(THEME_PREVIEW_DRAFT_EVENT, applyPreviewDraftDebounced);
    window.addEventListener("online", onOnline);

    const onVisible = () => {
      if (!document.hidden) reloadThrottled();
    };
    document.addEventListener("visibilitychange", onVisible);

    const onKioskReset = () => void reloadFull(false);
    window.addEventListener(MENU_KIOSK_RESET_EVENT, onKioskReset);

    const pollMs =
      !isPreview && deviceCode && shouldUseVenueDatabase() && isMenuKioskContext()
        ? MENU_VENUE_POLL_MS
        : 0;
    const pollId =
      pollMs > 0
        ? window.setInterval(() => {
            if (!document.hidden) void reloadFull(false);
          }, pollMs)
        : undefined;

    return () => {
      window.removeEventListener(VENUE_UPDATED, onUpdate);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(THEME_PREVIEW_DRAFT_EVENT, applyPreviewDraftDebounced);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(MENU_KIOSK_RESET_EVENT, onKioskReset);
      if (pollId != null) window.clearInterval(pollId);
    };
  }, [ready, reloadDebounced, reloadThrottled, reloadFull, isPreview, deviceCode]);

  return {
    ...venue,
    isCatalogResolved,
    isSyncing,
    syncNotice,
    syncError,
  };
}
