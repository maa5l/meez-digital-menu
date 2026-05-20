import { useCallback, useEffect, useState } from "react";
import type { VenueData } from "@/types/venue";
import {
  createEmptyVenueData,
  loadCurrentVenueData,
  loadVenueForDevice,
  loadVenueForDeviceAsync,
} from "@/lib/venue-store";
import { shouldUseVenueDatabase } from "@/services/venue/venue-supabase.service";

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

  const reload = useCallback(async () => {
    if (!ready) {
      setVenue(createEmptyVenueData());
      return;
    }
    if (isPreview) {
      setVenue(loadCurrentVenueData());
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
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!ready) return;

    const onUpdate = () => void reload();
    window.addEventListener(VENUE_UPDATED, onUpdate);
    window.addEventListener("storage", onUpdate);

    const poll = !isPreview ? setInterval(() => void reload(), 2500) : undefined;

    return () => {
      window.removeEventListener(VENUE_UPDATED, onUpdate);
      window.removeEventListener("storage", onUpdate);
      if (poll) clearInterval(poll);
    };
  }, [reload, ready, isPreview]);

  return venue;
}
