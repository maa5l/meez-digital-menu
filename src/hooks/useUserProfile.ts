import { useCallback, useEffect, useState } from "react";
import { getCurrentUserId } from "@/lib/venue-store";
import { fetchUserProfile } from "@/services/auth/profile-supabase.service";
import type { UserProfile } from "@/types/profile";

const PROFILE_UPDATED = "meez:profile-updated";

export function notifyProfileUpdated(): void {
  window.dispatchEvent(new Event(PROFILE_UPDATED));
}

export function useUserProfile(): {
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const userId = getCurrentUserId();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchUserProfile(userId);
      setProfile(data);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdate = () => void refresh();
    window.addEventListener(PROFILE_UPDATED, onUpdate);
    return () => window.removeEventListener(PROFILE_UPDATED, onUpdate);
  }, [refresh]);

  return { profile, loading, refresh };
}
