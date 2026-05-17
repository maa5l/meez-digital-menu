import { useCallback, useEffect, useState } from "react";
import type { VenueData } from "@/types/venue";
import {
  getCurrentUserId,
  loadCurrentVenueData,
  rememberOwnerUserId,
  refreshDeviceVenueSync,
  saveCurrentVenueData,
  resolveOwnerUserId,
} from "@/lib/venue-store";

const VENUE_UPDATED = "meez:venue-updated";

export function useVenueData(): [VenueData, (patch: Partial<VenueData> | ((prev: VenueData) => VenueData)) => void] {
  const userId = resolveOwnerUserId();
  const [data, setData] = useState<VenueData>(() => loadCurrentVenueData());

  const reload = useCallback(() => {
    setData(loadCurrentVenueData());
  }, []);

  useEffect(() => {
    reload();
  }, [userId, reload]);

  useEffect(() => {
    const ownerId = getCurrentUserId();
    if (!ownerId) return;
    rememberOwnerUserId(ownerId);
    const venue = loadCurrentVenueData();
    for (const device of venue.devices) {
      refreshDeviceVenueSync(device.code, ownerId);
    }
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

  return [data, update];
}
