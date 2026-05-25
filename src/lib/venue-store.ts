import type { VenueData, SubscriptionInfo } from "@/types/venue";
import type { Device } from "@/types/domain";
import { defaultMenuSettings } from "@/lib/mockData";
import { migrateMenuSettings } from "@/lib/menu-palette";
import { getLocalJson, setLocalJson } from "@/security/storage";
import { getSession } from "@/security/session";
import { STORAGE_KEYS } from "@/constants/storage";
import { logger } from "@/lib/logger";
import { VENUE_REMOTE_UPDATED_PREFIX } from "@/config/venue-sync";
import {
  fetchVenueForDeviceFromDatabase,
  fetchVenueFromDatabase,
  fetchVenueUpdatedAtForDevice,
  fetchVenueUpdatedAtForOwner,
  getDeviceMenuTypeFromDatabase,
  saveVenueToDatabase,
  shouldUseVenueDatabase,
} from "@/services/venue/venue-supabase.service";

const VENUE_PREFIX = "meez:venue:";
const DEVICE_OWNER_PREFIX = STORAGE_KEYS.DEVICE_OWNER_PREFIX;
const DEVICE_VENUE_PREFIX = STORAGE_KEYS.DEVICE_VENUE_PREFIX;
const DEVICE_MENU_TYPE_PREFIX = STORAGE_KEYS.DEVICE_MENU_TYPE_PREFIX;

export const TRIAL_SUBSCRIPTION: SubscriptionInfo = {
  plan: "تجربة مجانية",
  status: "trial",
  screens: 0,
  maxScreens: 1,
  pricePerScreen: 0,
  renewsOn: "—",
  daysLeft: 14,
};

export function createEmptyVenueData(): VenueData {
  const now = new Date().toISOString();
  return {
    version: 1,
    categories: [],
    products: [],
    crops: [],
    devices: [],
    menuSettings: { ...defaultMenuSettings },
    subscription: { ...TRIAL_SUBSCRIPTION },
    createdAt: now,
    updatedAt: now,
  };
}

/** لا منتجات ولا تصنيفات ولا أجهزة — منشأة جديدة فعلياً */
/** مزامنة اسم المنشأة من profiles إلى عنوان المنيو */
export function syncVenueNameFromProfile(venue: VenueData, venueName: string | null | undefined): VenueData {
  const name = venueName?.trim();
  if (!name) return venue;
  const current = venue.menuSettings.featuredTitle?.trim();
  if (current === name) return venue;
  return {
    ...venue,
    menuSettings: {
      ...venue.menuSettings,
      featuredTitle: name,
    },
  };
}

export function isVenueEffectivelyEmpty(data: VenueData): boolean {
  return (
    data.products.length === 0 &&
    data.categories.length === 0 &&
    data.crops.length === 0 &&
    data.devices.length === 0
  );
}

function venueKey(userId: string): string {
  return `${VENUE_PREFIX}${userId}`;
}

function normalizeVenue(stored: VenueData): VenueData {
  return {
    ...createEmptyVenueData(),
    ...stored,
    categories: stored.categories ?? [],
    products: stored.products ?? [],
    crops: stored.crops ?? [],
    devices: stored.devices ?? [],
    menuSettings: migrateMenuSettings({ ...defaultMenuSettings, ...stored.menuSettings }),
    subscription: { ...TRIAL_SUBSCRIPTION, ...stored.subscription },
  };
}

export function rememberOwnerUserId(userId: string): void {
  if (!userId) return;
  setLocalJson(STORAGE_KEYS.LAST_VENUE_OWNER, userId);
}

/** جلسة حالية أو آخر مالك — للمعاينة في تبويب جديد */
export function resolveOwnerUserId(): string | null {
  return getCurrentUserId() ?? getLocalJson<string | null>(STORAGE_KEYS.LAST_VENUE_OWNER, null);
}

export function loadVenueData(userId: string): VenueData {
  const stored = getLocalJson<VenueData | null>(venueKey(userId), null);
  if (!stored || stored.version !== 1) {
    return createEmptyVenueData();
  }
  return normalizeVenue(stored);
}

export function setDeviceMenuType(deviceCode: string, menuType: "products" | "crops"): void {
  const code = deviceCode.trim().toUpperCase();
  setLocalJson(`${DEVICE_MENU_TYPE_PREFIX}${code}`, menuType);
}

export function getDeviceMenuType(deviceCode: string): "products" | "crops" | null {
  const code = deviceCode.trim().toUpperCase();
  return getLocalJson<"products" | "crops" | null>(`${DEVICE_MENU_TYPE_PREFIX}${code}`, null);
}

export async function getDeviceMenuTypeAsync(deviceCode: string): Promise<"products" | "crops" | null> {
  const local = getDeviceMenuType(deviceCode);
  if (local) return local;
  if (!shouldUseVenueDatabase()) return null;
  return getDeviceMenuTypeFromDatabase(deviceCode);
}

export function inferDeviceMenuType(device: Device): "products" | "crops" {
  if (device.menuType) return device.menuType;
  if (device.name.includes("محاصيل")) return "crops";
  return "products";
}

/** نسخة منيو للجهاز — تُحدَّث عند كل حفظ من لوحة التحكم */
export function refreshDeviceVenueSync(deviceCode: string, ownerUserId?: string): void {
  const code = deviceCode.trim().toUpperCase();
  const ownerId = ownerUserId ?? getDeviceOwnerUserId(code) ?? resolveOwnerUserId();
  if (!ownerId) return;
  const venue = loadVenueData(ownerId);
  setLocalJson(`${DEVICE_VENUE_PREFIX}${code}`, {
    ownerUserId: ownerId,
    venue,
    syncedAt: new Date().toISOString(),
  });
}

function syncAllDeviceVenueSnapshots(ownerUserId: string, data: VenueData): void {
  for (const device of data.devices) {
    if (device.code.trim()) refreshDeviceVenueSync(device.code, ownerUserId);
  }
}

function saveVenueDataLocal(userId: string, data: VenueData): VenueData {
  const payload: VenueData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  setLocalJson(venueKey(userId), payload);
  rememberOwnerUserId(userId);
  syncAllDeviceVenueSnapshots(userId, payload);
  return payload;
}

/** بعد حفظ سحابي ناجح — يمنع إعادة جلب JSON كاملاً دون داعٍ */
export function markVenueRemoteSynced(userId: string, updatedAt: string | null): void {
  rememberRemoteUpdatedAt(venueRemoteUpdatedKey(userId), updatedAt);
  const venue = loadVenueData(userId);
  for (const device of venue.devices) {
    if (device.code.trim()) {
      rememberRemoteUpdatedAt(deviceRemoteUpdatedKey(device.code), updatedAt);
    }
  }
}

export function saveVenueData(userId: string, data: VenueData): void {
  const payload = saveVenueDataLocal(userId, data);
  if (shouldUseVenueDatabase()) {
    void saveVenueToDatabase(userId, payload).catch((err) => {
      logger.error("venue.cloud_save_async_failed", {
        userId,
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

function venueRemoteUpdatedKey(userId: string): string {
  return `${VENUE_REMOTE_UPDATED_PREFIX}${userId}`;
}

function deviceRemoteUpdatedKey(code: string): string {
  return `${VENUE_REMOTE_UPDATED_PREFIX}device:${code.trim().toUpperCase()}`;
}

function rememberRemoteUpdatedAt(key: string, updatedAt: string | null): void {
  if (!updatedAt) return;
  setLocalJson(key, updatedAt);
}

function getRememberedRemoteUpdatedAt(key: string): string | null {
  return getLocalJson<string | null>(key, null);
}

/** مزامنة من السحابة — يجلب JSON كاملاً فقط عند تغيّر updated_at */
export async function pullVenueFromCloud(userId: string): Promise<VenueData> {
  const local = loadVenueData(userId);
  if (!shouldUseVenueDatabase()) return local;

  try {
    const remoteUpdatedAt = await fetchVenueUpdatedAtForOwner(userId);
    const cacheKey = venueRemoteUpdatedKey(userId);
    const known = getRememberedRemoteUpdatedAt(cacheKey);

    if (
      remoteUpdatedAt &&
      known === remoteUpdatedAt &&
      local.version === 1 &&
      !isVenueEffectivelyEmpty(local)
    ) {
      return local;
    }

    const remote = await fetchVenueFromDatabase(userId);
    if (!remote || remote.version !== 1) {
      if (!isVenueEffectivelyEmpty(local)) {
        await saveVenueToDatabase(userId, local);
      }
      return local;
    }

    const remoteNorm = normalizeVenue(remote);
    saveVenueDataLocal(userId, remoteNorm);
    rememberRemoteUpdatedAt(cacheKey, remoteUpdatedAt);
    return remoteNorm;
  } catch (err) {
    logger.error("venue.cloud_pull_failed", {
      userId,
      message: err instanceof Error ? err.message : String(err),
    });
    return local;
  }
}

/** ينشئ منشأة فارغة عند أول تسجيل — لا بيانات ولا صور */
export function initializeVenueForUser(userId: string, venueName?: string): VenueData {
  const existing = getLocalJson<VenueData | null>(venueKey(userId), null);
  if (existing?.version === 1) {
    return loadVenueData(userId);
  }

  const empty = createEmptyVenueData();
  if (venueName) {
    empty.menuSettings = {
      ...empty.menuSettings,
      featuredTitle: venueName,
    };
  }
  saveVenueData(userId, empty);
  logger.audit("venue.initialized_empty", { userId });
  return empty;
}

/** لا مزامنة كتابة للأجهزة — التسجيل عبر register_device_with_license فقط */
export async function syncDeviceActivationsToCloud(
  _ownerUserId: string,
  _devices: Device[],
): Promise<void> {
  return;
}

export function getCurrentUserId(): string | null {
  return getSession()?.userId ?? null;
}

export function loadCurrentVenueData(): VenueData {
  const userId = resolveOwnerUserId();
  if (!userId) return createEmptyVenueData();
  return loadVenueData(userId);
}

export function saveCurrentVenueData(data: VenueData): void {
  const userId = resolveOwnerUserId();
  if (!userId) return;
  saveVenueData(userId, data);
}

/** ربط رمز الجهاز بصاحب الحساب — لعرض منيوه على التابلت */
export function linkDeviceToOwner(deviceCode: string, ownerUserId: string): void {
  const code = deviceCode.trim().toUpperCase();
  setLocalJson(`${DEVICE_OWNER_PREFIX}${code}`, ownerUserId);
  rememberOwnerUserId(ownerUserId);
  refreshDeviceVenueSync(code, ownerUserId);
}

/** يعيد ربط كل أجهزة الحساب — مفيد بعد التحديث أو إذا فُقد الربط */
export function syncDeviceLinks(codes: string[], ownerUserId: string): void {
  for (const code of codes) {
    if (code.trim()) linkDeviceToOwner(code, ownerUserId);
  }
}

export function getDeviceOwnerUserId(deviceCode: string): string | null {
  const code = deviceCode.trim().toUpperCase();
  return getLocalJson<string | null>(`${DEVICE_OWNER_PREFIX}${code}`, null);
}

export function loadVenueForDevice(deviceCode: string): VenueData {
  const code = deviceCode.trim().toUpperCase();
  const ownerId = getDeviceOwnerUserId(code);
  if (ownerId) return loadVenueData(ownerId);

  const snap = getLocalJson<{ ownerUserId?: string; venue?: VenueData } | null>(
    `${DEVICE_VENUE_PREFIX}${code}`,
    null,
  );
  if (snap?.venue?.version === 1) {
    return normalizeVenue(snap.venue);
  }
  return createEmptyVenueData();
}

/** تحميل منيو الجهاز من Supabase (مع fallback محلي) */
export async function loadVenueForDeviceAsync(
  deviceCode: string,
  knownRemoteUpdatedAt?: string | null,
): Promise<VenueData> {
  const code = deviceCode.trim().toUpperCase();

  if (shouldUseVenueDatabase()) {
    try {
      const remoteUpdatedAt =
        knownRemoteUpdatedAt !== undefined
          ? knownRemoteUpdatedAt
          : await fetchVenueUpdatedAtForDevice(code);
      const remote = await fetchVenueForDeviceFromDatabase(code);
      if (remote?.version === 1) {
        const normalized = normalizeVenue(remote);
        const ownerId = getDeviceOwnerUserId(code);
        if (ownerId) saveVenueDataLocal(ownerId, normalized);
        setLocalJson(`${DEVICE_VENUE_PREFIX}${code}`, {
          venue: normalized,
          syncedAt: new Date().toISOString(),
          remoteUpdatedAt: remoteUpdatedAt ?? undefined,
        });
        rememberRemoteUpdatedAt(deviceRemoteUpdatedKey(code), remoteUpdatedAt);
        return normalized;
      }
    } catch (err) {
      logger.error("venue.device_cloud_load_failed", {
        code,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return loadVenueForDevice(code);
}

/** مزامنة كاملة فقط عند تغيّر updated_at — وإلا البيانات المحلية */
export async function syncVenueForDeviceIfStale(deviceCode: string): Promise<VenueData> {
  const code = deviceCode.trim().toUpperCase();
  if (!shouldUseVenueDatabase()) return loadVenueForDevice(code);

  try {
    const remoteUpdatedAt = await fetchVenueUpdatedAtForDevice(code);
    const cacheKey = deviceRemoteUpdatedKey(code);
    if (
      remoteUpdatedAt &&
      getRememberedRemoteUpdatedAt(cacheKey) === remoteUpdatedAt
    ) {
      return loadVenueForDevice(code);
    }
    return loadVenueForDeviceAsync(code, remoteUpdatedAt);
  } catch {
    return loadVenueForDevice(code);
  }
}
