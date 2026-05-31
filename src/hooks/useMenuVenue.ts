import { useCallback, useEffect, useState } from "react";
import type { VenueData } from "@/types/venue";
import {
  createEmptyVenueData,
  loadCurrentVenueData,
  loadVenueForDevice,
  loadVenueForDeviceAsync,
} from "@/lib/venue-store";
import { fetchDashboardPreviewVenue } from "@/services/core/platform-security";
import { checkKioskAccess } from "@/services/subscription/subscription-enforcement";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";
import { subscribeVenueChanges } from "@/services/venue/venue-realtime.service";
import { usesSupabaseAuth } from "@/config/env";

const VENUE_UPDATED = "meez:venue-updated";

/** بيانات المنيو للعرض — Realtime + fallback عند العودة للتبويب */
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

  useEffect(() => {
    void reloadFull();
  }, [reloadFull]);

  useEffect(() => {
    if (!ready) return;

    const onUpdate = () => void reloadFull();
    window.addEventListener(VENUE_UPDATED, onUpdate);
    window.addEventListener("storage", onUpdate);

    const onVisible = () => {
      if (!document.hidden) void reloadFull();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener(VENUE_UPDATED, onUpdate);
      window.removeEventListener("storage", onUpdate);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reloadFull, ready]);

  useEffect(() => {
    if (!ready || isPreview || !deviceCode || !shouldUseVenueDatabase()) return;

    let cancelled = false;
    let unsubscribeVenue: (() => void) | undefined;

    void (async () => {
      const access = await checkKioskAccess(deviceCode);
      if (cancelled || !access.owner_id) return;

      unsubscribeVenue = subscribeVenueChanges(access.owner_id, () => {
        if (!cancelled) void reloadFull();
      });
    })();

    return () => {
      cancelled = true;
      unsubscribeVenue?.();
    };
  }, [deviceCode, isPreview, ready, reloadFull]);

  return venue;
}
