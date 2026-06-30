import { useCallback, useState } from "react";
import type { VenueData } from "@/types/venue";
import { loadCurrentVenueData } from "@/lib/venue-store";
import { useVenueDataContext } from "@/context/VenueDataContext";

/** بيانات المنشأة — Context مشترك في Dashboard */
export function useVenueData(): [
  VenueData,
  (patch: Partial<VenueData> | ((prev: VenueData) => VenueData)) => void,
  { loading: boolean },
] {
  const ctx = useVenueDataContext();
  const [fallbackData, setFallbackData] = useState<VenueData>(() => loadCurrentVenueData());
  const fallbackUpdate = useCallback(
    (patch: Partial<VenueData> | ((prev: VenueData) => VenueData)) => {
      setFallbackData((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        return next;
      });
    },
    [],
  );

  if (ctx) {
    return [ctx.data, ctx.update, { loading: ctx.loading }];
  }

  return [fallbackData, fallbackUpdate, { loading: false }];
}
