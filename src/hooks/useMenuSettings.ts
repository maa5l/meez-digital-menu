import { useCallback } from "react";
import type { MenuSettings } from "@/types/domain";
import { defaultMenuSettings } from "@/lib/mockData";
import { useVenueData } from "@/hooks/useVenueData";

/**
 * إعدادات المنيو — معزولة لكل حساب (SaaS tenant).
 */
export const useMenuSettings = (): [MenuSettings, (s: MenuSettings) => void] => {
  const [venue, updateVenue] = useVenueData();

  const update = useCallback(
    (s: MenuSettings) => {
      updateVenue((prev) => ({
        ...prev,
        menuSettings: { ...defaultMenuSettings, ...prev.menuSettings, ...s },
      }));
    },
    [updateVenue],
  );

  return [venue.menuSettings, update];
};
