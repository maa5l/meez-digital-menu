import { useCallback, useEffect, useRef, useState } from "react";
import type { VenueData } from "@/types/venue";
import { MENU_VENUE_POLL_MS } from "@/config/venue-sync";
import {
  createEmptyVenueData,
  loadCurrentVenueData,
  loadVenueForDevice,
  loadVenueForDeviceAsync,
  syncVenueForDeviceIfStale,
} from "@/lib/venue-store";
import { fetchDashboardPreviewVenue } from "@/services/core/platform-security";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";
import { usesSupabaseAuth } from "@/config/env";

const VENUE_UPDATED = "meez:venue-updated";

/** بيانات المنيو للعرض — معاينة من لوحة التحكم أو جهاز مفعّل */
export function useMenuVenue(
  deviceCode: string | null,
  isPreview: boolean,
  /** false أثناء انتظار التفعيل */
  ready: boolean,
): VenueData {
  const load = useCallback(() => {
    if (!ready) return createEmptyVenueData();
    if (isPreview) return loadCurrentVenueData();
    if (deviceCode) return loadVenueForDevice(deviceCode);
    return createEmptyVenueData();
  }, [deviceCode, isPreview, ready]);

  const [venue, setVenue] = useState<VenueData>(load);
  const pollInFlightRef = useRef(false);

  const reloadFull = useCallback(async () => {
    if (!ready) {
      setVenue(createEmptyVenueData());
      return;
    }
    if (isPreview) {
      let next = loadCurrentVenueData();
      if (shouldUseVenueDatabase() && usesSupabaseAuth()) {
        const fromRpc = await fetchDashboardPreviewVenue();
        if (fromRpc?.version === 1) {
          next = fromRpc;
        }
      }
      setVenue(next);
      return;
    }
    if (deviceCode && shouldUseVenueDatabase()) {
      const fromCloud = await loadVenueForDeviceAsync(deviceCode);
      setVenue(fromCloud);
      return;
    }
    setVenue(load());
  }, [deviceCode, isPreview, ready, load]);

  const pollForChanges = useCallback(async () => {
    if (!ready || isPreview || !deviceCode || !shouldUseVenueDatabase()) return;
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    try {
      const next = await syncVenueForDeviceIfStale(deviceCode);
      setVenue(next);
    } finally {
      pollInFlightRef.current = false;
    }
  }, [deviceCode, isPreview, ready]);

  useEffect(() => {
    void reloadFull();
  }, [reloadFull]);

  useEffect(() => {
    if (!ready) return;

    const onUpdate = () => void reloadFull();
    window.addEventListener(VENUE_UPDATED, onUpdate);
    window.addEventListener("storage", onUpdate);

    const poll =
      !isPreview && deviceCode && shouldUseVenueDatabase()
        ? setInterval(() => void pollForChanges(), MENU_VENUE_POLL_MS)
        : undefined;

    return () => {
      window.removeEventListener(VENUE_UPDATED, onUpdate);
      window.removeEventListener("storage", onUpdate);
      if (poll) clearInterval(poll);
    };
  }, [reloadFull, pollForChanges, ready, isPreview, deviceCode]);

  return venue;
}
