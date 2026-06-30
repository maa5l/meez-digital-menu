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

const VENUE_UPDATED = "meez:venue-updated";

/** بيانات المنيو للعرض — polling + cache (RPC-only؛ لا Realtime على الجداول) */
export function useMenuVenue(
  deviceCode: string | null,
  isPreview: boolean,
  ready: boolean,
): VenueData {
  const load = useCallback(() => {
    if (!ready) return createEmptyVenueData();
    if (isPreview) return loadCurrentVenueData();
    if (deviceCode) return loadVenueForDevice(deviceCode);
    return createEmptyVenueData();
  }, [deviceCode, isPreview, ready]);

  const [venue, setVenue] = useState<VenueData>(load);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reloadFull = useCallback(
    async (force = false) => {
      if (!ready) {
        if (mountedRef.current) setVenue(createEmptyVenueData());
        return;
      }
      if (isPreview) {
        let next = loadCurrentVenueData();
        if (shouldUseVenueDatabase() && usesSupabaseAuth()) {
          const fromRpc = await fetchDashboardPreviewVenue(force);
          if (fromRpc?.version === 1) {
            const rpcItems = fromRpc.products.length + fromRpc.crops.length;
            const localItems = next.products.length + next.crops.length;
            if (rpcItems >= localItems) next = fromRpc;
          }
        }
        if (mountedRef.current) setVenue(mergeVenueWithPreviewDraft(next));
        return;
      }
      if (deviceCode && shouldUseVenueDatabase()) {
        if (force) invalidateDeviceVenueCache(deviceCode);
        const fromCloud = await syncVenueForDeviceIfStale(deviceCode, force);
        if (mountedRef.current) setVenue(fromCloud);
        return;
      }
      if (mountedRef.current) setVenue(load());
    },
    [deviceCode, isPreview, ready, load],
  );

  const reloadDebounced = useMemo(
    () => debounce((force?: boolean) => void reloadFull(Boolean(force)), 500),
    [reloadFull],
  );

  const reloadThrottled = useMemo(
    () => throttle(() => void reloadFull(false), 30_000),
    [reloadFull],
  );

  useEffect(() => {
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

    window.addEventListener(VENUE_UPDATED, onUpdate);
    window.addEventListener("storage", onStorage);
    window.addEventListener(THEME_PREVIEW_DRAFT_EVENT, applyPreviewDraftDebounced);

    const onVisible = () => {
      if (!document.hidden) reloadThrottled();
    };
    document.addEventListener("visibilitychange", onVisible);

    const onKioskReset = () => void reloadFull(true);
    window.addEventListener(MENU_KIOSK_RESET_EVENT, onKioskReset);

    return () => {
      window.removeEventListener(VENUE_UPDATED, onUpdate);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(THEME_PREVIEW_DRAFT_EVENT, applyPreviewDraftDebounced);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(MENU_KIOSK_RESET_EVENT, onKioskReset);
    };
  }, [ready, reloadDebounced, reloadThrottled, reloadFull, isPreview]);

  return venue;
}
