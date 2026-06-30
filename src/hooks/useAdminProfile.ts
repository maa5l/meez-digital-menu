import { useCallback, useEffect, useState } from "react";
import type { AdminProfile } from "@/types/admin";
import { fetchMyAdminProfile } from "@/services/admin/admin.service";

export function useAdminProfile(): {
  profile: AdminProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetchMyAdminProfile();
      setProfile(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, loading, refresh };
}
