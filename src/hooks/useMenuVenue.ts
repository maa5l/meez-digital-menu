import { useCallback, useEffect, useState } from "react";
import type { VenueData } from "@/types/venue";
import {
  createEmptyVenueData,
  loadCurrentVenueData,
  loadVenueForDevice,
} from "@/lib/venue-store";

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

  useEffect(() => {
    setVenue(load());
  }, [load]);

  useEffect(() => {
    if (!ready) return;

    const onUpdate = () => setVenue(load());
    window.addEventListener(VENUE_UPDATED, onUpdate);
    window.addEventListener("storage", onUpdate);

    const poll = !isPreview ? setInterval(onUpdate, 2500) : undefined;

    return () => {
      window.removeEventListener(VENUE_UPDATED, onUpdate);
      window.removeEventListener("storage", onUpdate);
      if (poll) clearInterval(poll);
    };
  }, [load, ready, isPreview]);

  return venue;
}
