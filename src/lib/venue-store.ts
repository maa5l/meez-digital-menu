import type { VenueData, SubscriptionInfo } from "@/types/venue";
import type { Device } from "@/types/domain";
import { defaultMenuSettings } from "@/lib/mockData";
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
import { parseVenueDataSafe } from "@/lib/venue-schema";
import {
  compactVenueForLocalStorage,
  stripVenueImagesForStorage,
} from "@/lib/venue-storage-compact";
import { idbGetVenue, idbSetVenue } from "@/lib/venue-idb";

/** كاش جلسة — يمنع فقدان المنيو على الجوال إذا فشل localStorage (حجم الصور) */
const venueMemoryCache = new Map<string, VenueData>();

function rememberVenueInMemory(userId: string, data: VenueData): void {
  venueMemoryCache.set(userId, data);
}

function readVenueFromMemory(userId: string): VenueData | null {
  return venueMemoryCache.get(userId) ?? null;
}

function venueContentScore(data: VenueData | null | undefined): number {
  if (!data || data.version !== 1) return 0;
  return data.products.length + data.categories.length + data.crops.length;
}

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
  daysLeft: 7,
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

function productHasImage(p: { image?: string; imageLandscape?: string; imagePortrait?: string }): boolean {
  for (const value of [p.imageLandscape, p.imagePortrait, p.image]) {
    if (typeof value === "string" && value.trim().length > 8) {
      const v = value.trim();
      if (v.startsWith("data:image") || v.startsWith("http://") || v.startsWith("https://") || v.startsWith("blob:")) {
        return true;
      }
    }
  }
  return false;
}

/** عدد المنتجات التي لها صورة — لمنع رفع نسخة localStorage المجرّدة فوق السحابة */
export function countVenueProductImages(data: VenueData): number {
  return (data.products ?? []).filter(productHasImage).length;
}

function venueKey(userId: string): string {
  return `${VENUE_PREFIX}${userId}`;
}

function normalizeVenue(stored: VenueData): VenueData {
  return parseVenueDataSafe(stored);
}

export function rememberOwnerUserId(userId: string): void {
  if (!userId) return;
  setLocalJson(STORAGE_KEYS.LAST_VENUE_OWNER, userId);
}

export function clearLastVenueOwner(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.LAST_VENUE_OWNER);
  } catch {
    /* ignore */
  }
}

/** يمسح كاش الذاكرة حتى لا تومض منيو حساب سابق بعد الخروج/تبديل الحساب */
export function clearVenueMemoryCache(): void {
  venueMemoryCache.clear();
}

/** جلسة حالية أو آخر مالك — للمعاينة في تبويب جديد */
export function resolveOwnerUserId(): string | null {
  return getCurrentUserId() ?? getLocalJson<string | null>(STORAGE_KEYS.LAST_VENUE_OWNER, null);
}

let deviceSnapshotCleanupDone = false;

export function loadVenueData(userId: string): VenueData {
  if (!deviceSnapshotCleanupDone && typeof window !== "undefined") {
    freeLocalStorageFromHeavyDeviceSnapshots();
    deviceSnapshotCleanupDone = true;
  }
  const memory = readVenueFromMemory(userId);
  const stored = getLocalJson<VenueData | null>(venueKey(userId), null);
  const storedNorm =
    stored?.version === 1 ? compactVenueForLocalStorage(normalizeVenue(stored)) : null;

  // الذاكرة تفوز إذا فيها محتوى/صور أكثر (بعد سحب سحابي فشل حفظه في localStorage)
  if (
    venueContentScore(memory) > venueContentScore(storedNorm) ||
    (memory &&
      storedNorm &&
      countVenueProductImages(memory) > countVenueProductImages(storedNorm))
  ) {
    return memory!;
  }
  if (storedNorm) {
    // لا تستبدل ذاكرة فيها صور بنسخة localStorage مجرّدة
    if (memory && countVenueProductImages(memory) > countVenueProductImages(storedNorm)) {
      return memory;
    }
    rememberVenueInMemory(userId, storedNorm);
    return storedNorm;
  }
  if (memory?.version === 1) return memory;
  return createEmptyVenueData();
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
  const fromCloud = await getDeviceMenuTypeFromDatabase(deviceCode);
  if (fromCloud) setDeviceMenuType(deviceCode, fromCloud);
  return fromCloud;
}

export function inferDeviceMenuType(device: Device): "products" | "crops" {
  if (device.menuType) return device.menuType;
  if (device.name.includes("محاصيل")) return "crops";
  return "products";
}

/** نسخة منيو للجهاز — مؤشر خفيف فقط (البيانات الكاملة عند meez:venue:{owner}) */
export function refreshDeviceVenueSync(deviceCode: string, ownerUserId?: string): void {
  const code = deviceCode.trim().toUpperCase();
  const ownerId = ownerUserId ?? getDeviceOwnerUserId(code) ?? resolveOwnerUserId();
  if (!ownerId) return;
  setLocalJson(`${DEVICE_VENUE_PREFIX}${code}`, {
    ownerUserId: ownerId,
    syncedAt: new Date().toISOString(),
  });
}

/** يحرّر مساحة localStorage بإزالة نسخ المنيو المكررة داخل مفاتيح الأجهزة */
function freeLocalStorageFromHeavyDeviceSnapshots(): void {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(DEVICE_VENUE_PREFIX)) keys.push(key);
  }
  for (const key of keys) {
    const snap = getLocalJson<{ ownerUserId?: string; venue?: VenueData; syncedAt?: string } | null>(
      key,
      null,
    );
    if (!snap?.venue) continue;
    setLocalJson(key, {
      ownerUserId: snap.ownerUserId,
      syncedAt: snap.syncedAt ?? new Date().toISOString(),
    });
  }
}

function syncAllDeviceVenueSnapshots(ownerUserId: string, data: VenueData): void {
  for (const device of data.devices) {
    if (device.code.trim()) refreshDeviceVenueSync(device.code, ownerUserId);
  }
}

function saveVenueDataLocal(userId: string, data: VenueData): VenueData {
  const payload: VenueData = compactVenueForLocalStorage({
    ...data,
    updatedAt: new Date().toISOString(),
  });
  rememberVenueInMemory(userId, payload);
  void idbSetVenue(userId, payload);

  let ok = setLocalJson(venueKey(userId), payload);
  if (!ok) {
    freeLocalStorageFromHeavyDeviceSnapshots();
    ok = setLocalJson(venueKey(userId), payload);
  }
  if (!ok) {
    // الجوال غالباً يمتلئ بسبب Base64 — احفظ نسخة خفيفة حتى لا تختفي الأسماء
    const light = stripVenueImagesForStorage(payload);
    ok = setLocalJson(venueKey(userId), light);
    if (!ok) {
      logger.warn("venue.storage_quota_memory_only", {
        userId,
        products: payload.products.length,
      });
      // لا ترمِ خطأ — المنتجات تبقى في الذاكرة + IndexedDB لهذه الجلسة
    }
  }
  rememberOwnerUserId(userId);
  syncAllDeviceVenueSnapshots(userId, payload);
  return payload;
}

/** بعد الدخول على الجوال: إن كان localStorage فارغ اسحب من IndexedDB */
export async function hydrateVenueFromIdbIfNeeded(userId: string): Promise<VenueData> {
  const current = loadVenueData(userId);
  const fromIdb = await idbGetVenue(userId);
  if (!fromIdb || fromIdb.version !== 1 || isVenueEffectivelyEmpty(fromIdb)) {
    return current;
  }
  // استرجع من IDB إذا المحلي فارغ أو بلا صور بينما IDB فيه صور
  const idbHasRicherImages =
    countVenueProductImages(fromIdb) > countVenueProductImages(current);
  if (!isVenueEffectivelyEmpty(current) && !idbHasRicherImages) return current;
  const normalized = normalizeVenue(fromIdb);
  rememberVenueInMemory(userId, normalized);
  // حاول إعادة التعبئة في localStorage (قد تفشل بسبب الحجم — لا مشكلة)
  try {
    saveVenueDataLocal(userId, normalized);
  } catch {
    rememberVenueInMemory(userId, normalized);
  }
  return loadVenueData(userId);
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

const pendingCloudSave = new Map<string, VenueData>();
const cloudSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const cloudSaveInFlight = new Map<string, Promise<void>>();
const CLOUD_SAVE_DEBOUNCE_MS = 1000;
const CLOUD_SAVE_MAX_ATTEMPTS = 3;
/** أطول من مهلة Postgres (60s) بقليل — المنيو الكبير يحتاج وقت نقل */
const CLOUD_SAVE_TIMEOUT_MS = 70_000;

function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
let cloudFlushListenersInstalled = false;

function dispatchCloudSaveFailed(userId: string, message: string): void {
  window.dispatchEvent(
    new CustomEvent("meez:venue-save-failed", {
      detail: { reason: message, userId, scope: "cloud" },
    }),
  );
}

function takePendingVenue(userId: string, fallback: VenueData): VenueData {
  const latest = pendingCloudSave.get(userId);
  if (!latest) return fallback;
  pendingCloudSave.delete(userId);
  return latest;
}

function isTransientCloudSaveError(message: string): boolean {
  return /timeout|busy|57014|canceling statement|cloud_save_timeout|stale_skipped|not_authenticated/i.test(
    message,
  );
}

async function persistVenueToCloud(userId: string, payload: VenueData): Promise<void> {
  let current = payload;
  let lastError: unknown;
  for (let attempt = 1; attempt <= CLOUD_SAVE_MAX_ATTEMPTS; attempt++) {
    current = takePendingVenue(userId, current);
    try {
      await withTimeout(
        saveVenueToDatabase(userId, current),
        CLOUD_SAVE_TIMEOUT_MS,
        "cloud_save_timeout",
      );
      window.dispatchEvent(
        new CustomEvent("meez:venue-cloud-saved", { detail: { userId } }),
      );
      return;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      logger.error("venue.cloud_save_async_failed", {
        userId,
        attempt,
        message,
      });
      // busy/timeout: أعد للطابور بدل إعادة ضرب القفل فوراً
      if (isTransientCloudSaveError(message)) {
        let retryPayload = takePendingVenue(userId, current);
        // stale: ارفع updatedAt ثم أعد المحاولة حتى تُكتب المنتجات فعلاً
        if (/stale_skipped/i.test(message) && !isVenueEffectivelyEmpty(retryPayload)) {
          retryPayload = saveVenueDataLocal(userId, retryPayload);
        }
        pendingCloudSave.set(userId, retryPayload);
        if (attempt < CLOUD_SAVE_MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1200 * attempt));
          continue;
        }
        // اتركه معلّقاً ليُفرَّغ لاحقاً بدل إشعار فشل مزعج
        scheduleCloudVenueSave(userId, pendingCloudSave.get(userId) ?? retryPayload);
        return;
      }
      if (attempt < CLOUD_SAVE_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }
  }
  dispatchCloudSaveFailed(
    userId,
    lastError instanceof Error ? lastError.message : String(lastError ?? "cloud_save_failed"),
  );
}

/** طلب سحابي واحد لكل حساب. أي تعديل أثناء الطلب يُحفظ بعده، ولا يُعلَّق خلف طلب متوقف. */
function pumpCloudVenueSave(userId: string): Promise<void> {
  const existing = cloudSaveInFlight.get(userId);
  if (existing) return existing;
  const payload = pendingCloudSave.get(userId);
  if (!payload) return Promise.resolve();
  pendingCloudSave.delete(userId);
  const run = persistVenueToCloud(userId, payload).finally(() => {
    if (cloudSaveInFlight.get(userId) === run) cloudSaveInFlight.delete(userId);
    if (pendingCloudSave.has(userId)) pumpCloudVenueSave(userId);
  });
  cloudSaveInFlight.set(userId, run);
  return run;
}

function scheduleCloudVenueSave(userId: string, payload: VenueData): void {
  // لا ترفع منشأة فارغة أبداً — كانت تمسح منتجات السحابة بعد دخول من جهاز جديد وفشل السحب
  if (isVenueEffectivelyEmpty(payload)) {
    logger.warn("venue.skip_empty_cloud_save", { userId });
    return;
  }
  // لا ترفع منيو فيها منتجات بلا صور (نسخة ضغط الجوال) — كانت تمسح صور السحابة
  if (payload.products.length > 0 && countVenueProductImages(payload) === 0) {
    logger.warn("venue.skip_imageless_cloud_save", {
      userId,
      products: payload.products.length,
    });
    return;
  }
  pendingCloudSave.set(userId, payload);
  const existing = cloudSaveTimers.get(userId);
  if (existing) clearTimeout(existing);
  cloudSaveTimers.set(
    userId,
    setTimeout(() => {
      cloudSaveTimers.delete(userId);
      void pumpCloudVenueSave(userId);
    }, CLOUD_SAVE_DEBOUNCE_MS),
  );
}

/** تفريغ فوري لأي حفظ معلّق — يمنع بقاء التعديلات على الجهاز فقط عند إغلاق التبويب */
export function flushPendingCloudVenueSaves(): void {
  for (const [userId, timer] of cloudSaveTimers) {
    clearTimeout(timer);
    cloudSaveTimers.delete(userId);
  }
  for (const userId of [...pendingCloudSave.keys()]) {
    void pumpCloudVenueSave(userId);
  }
}

function installCloudFlushListeners(): void {
  if (cloudFlushListenersInstalled || typeof window === "undefined") return;
  cloudFlushListenersInstalled = true;
  const flush = () => flushPendingCloudVenueSaves();
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export function saveVenueData(userId: string, data: VenueData): void {
  const payload = saveVenueDataLocal(userId, data);
  if (shouldUseVenueDatabase()) {
    installCloudFlushListeners();
    scheduleCloudVenueSave(userId, payload);
  }
}

/** تحديث محلي فقط — لا يرفع للسحابة ولا يغيّر updatedAt (لملخص الاشتراك وغيره) */
export function patchVenueDataLocalOnly(
  userId: string,
  patch: (prev: VenueData) => VenueData,
): VenueData {
  const prev = loadVenueData(userId);
  const next = patch(prev);
  const payload = compactVenueForLocalStorage({
    ...next,
    updatedAt: prev.updatedAt,
  });
  const ok = setLocalJson(venueKey(userId), payload);
  if (!ok) throw new Error("storage_quota_exceeded");
  return payload;
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

/** بعد await — أعد قراءة المحلي حتى لا نمسح تعديلات حصلت أثناء السحب */
function readLatestLocalVenue(userId: string): VenueData {
  return loadVenueData(userId);
}

function isLocalVenueNewer(local: VenueData, remote: VenueData): boolean {
  if (!local.updatedAt) return false;
  if (!remote.updatedAt) return !isVenueEffectivelyEmpty(local);
  return local.updatedAt > remote.updatedAt;
}

/** لا تستبدل محلياً فيه محتوى بمنشأة سحابية فارغة أثناء سباق التحميل */
function shouldKeepLocalOverRemote(local: VenueData, remote: VenueData): boolean {
  // محلي فارغ (غالباً بعد مسح الكاش أو أول تحميل) لا يفوز على سحابة فيها بيانات
  // حتى لو كان updatedAt أحدث — وإلا يُتجاهل السحب وتختفي التصنيفات/المنتجات بعد إعادة الدخول
  if (isVenueEffectivelyEmpty(local) && !isVenueEffectivelyEmpty(remote)) return false;
  const localImages = countVenueProductImages(local);
  const remoteImages = countVenueProductImages(remote);
  // نسخة الجوال بدون صور لا تفوز على سحابة فيها صور
  if (localImages === 0 && remoteImages > 0) return false;
  if (isLocalVenueNewer(local, remote)) return true;
  if (!isVenueEffectivelyEmpty(local) && isVenueEffectivelyEmpty(remote)) return true;
  if (localImages > remoteImages) return true;
  return false;
}

async function pushLocalVenueIfNeeded(userId: string, local: VenueData): Promise<void> {
  if (isVenueEffectivelyEmpty(local)) return;
  if (local.products.length > 0 && countVenueProductImages(local) === 0) {
    logger.warn("venue.skip_imageless_push", { userId, products: local.products.length });
    return;
  }
  const latest = readLatestLocalVenue(userId);
  const candidate = isLocalVenueNewer(latest, local) ? latest : local;
  if (candidate.products.length > 0 && countVenueProductImages(candidate) === 0) {
    logger.warn("venue.skip_imageless_push_latest", { userId });
    return;
  }
  pendingCloudSave.set(userId, candidate);
  try {
    await pumpCloudVenueSave(userId);
  } catch (err) {
    logger.error("venue.push_newer_local_failed", {
      userId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export type PullVenueOutcome = {
  venue: VenueData;
  /** true إذا فشل الطلب الشبكي/الـ RPC (ليس مجرد سحابة فارغة) */
  pullFailed: boolean;
  remoteUpdatedAt: string | null;
};

/** مزامنة من السحابة — يجلب JSON كاملاً فقط عند تغيّر updated_at */
export async function pullVenueFromCloudDetailed(
  userId: string,
  force = false,
): Promise<PullVenueOutcome> {
  if (!shouldUseVenueDatabase()) {
    return {
      venue: loadVenueData(userId),
      pullFailed: false,
      remoteUpdatedAt: null,
    };
  }

  // جوال: استرجع من IndexedDB قبل السحب إن المحلي فارغ
  await hydrateVenueFromIdbIfNeeded(userId);

  try {
    const remoteUpdatedAt = await fetchVenueUpdatedAtForOwner(userId, force);
    const cacheKey = venueRemoteUpdatedKey(userId);
    const known = getRememberedRemoteUpdatedAt(cacheKey);
    const localAfterMeta = readLatestLocalVenue(userId);

    if (
      !force &&
      remoteUpdatedAt &&
      known === remoteUpdatedAt &&
      localAfterMeta.version === 1 &&
      !isVenueEffectivelyEmpty(localAfterMeta)
    ) {
      return {
        venue: readLatestLocalVenue(userId),
        pullFailed: false,
        remoteUpdatedAt,
      };
    }

    const remote = await fetchVenueFromDatabase(userId, force);
    const latestLocal = readLatestLocalVenue(userId);

    if (!remote || remote.version !== 1) {
      await pushLocalVenueIfNeeded(userId, latestLocal);
      return {
        venue: readLatestLocalVenue(userId),
        pullFailed: false,
        remoteUpdatedAt,
      };
    }

    const remoteNorm = normalizeVenue(remote);

    // لا تستبدل محلياً أحدث (يشمل التصنيفات/المنتجات المضافة أثناء السحب)
    if (shouldKeepLocalOverRemote(latestLocal, remoteNorm)) {
      await pushLocalVenueIfNeeded(userId, latestLocal);
      return {
        venue: readLatestLocalVenue(userId),
        pullFailed: false,
        remoteUpdatedAt,
      };
    }

    // قبل الكتابة فوق التخزين — تحقق مرة أخيرة من تعديلات متزامنة
    const finalLocal = readLatestLocalVenue(userId);
    if (shouldKeepLocalOverRemote(finalLocal, remoteNorm)) {
      await pushLocalVenueIfNeeded(userId, finalLocal);
      return {
        venue: readLatestLocalVenue(userId),
        pullFailed: false,
        remoteUpdatedAt,
      };
    }

    saveVenueDataLocal(userId, remoteNorm);
    rememberRemoteUpdatedAt(cacheKey, remoteUpdatedAt);
    return {
      venue: readLatestLocalVenue(userId),
      pullFailed: false,
      remoteUpdatedAt,
    };
  } catch (err) {
    logger.error("venue.cloud_pull_failed", {
      userId,
      message: err instanceof Error ? err.message : String(err),
    });
    // فشل السحب لا يمنع رفع المحلي — وإلا المنتجات تبقى على البي سي فقط والجوال فارغ
    const localOnFail = readLatestLocalVenue(userId);
    await pushLocalVenueIfNeeded(userId, localOnFail);
    return {
      venue: localOnFail,
      pullFailed: true,
      remoteUpdatedAt: null,
    };
  }
}

/** رفع فوري للمحتوى المحلي إن وُجد — لربط الجوال بنفس منتجات البي سي */
export async function ensureLocalVenueUploadedToCloud(userId: string): Promise<boolean> {
  if (!shouldUseVenueDatabase()) return false;
  let local = readLatestLocalVenue(userId);
  if (isVenueEffectivelyEmpty(local)) return false;
  if (local.products.length > 0 && countVenueProductImages(local) === 0) {
    logger.warn("venue.ensure_upload_skipped_imageless", {
      userId,
      products: local.products.length,
    });
    return false;
  }
  // جدّد updatedAt حتى لا يُرفض الرفع كـ stale أمام سحابة فارغة أحدث
  local = saveVenueDataLocal(userId, local);
  pendingCloudSave.set(userId, local);
  const timer = cloudSaveTimers.get(userId);
  if (timer) {
    clearTimeout(timer);
    cloudSaveTimers.delete(userId);
  }
  try {
    await pumpCloudVenueSave(userId);
    return true;
  } catch (err) {
    logger.error("venue.ensure_upload_failed", {
      userId,
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function pullVenueFromCloud(userId: string): Promise<VenueData> {
  const result = await pullVenueFromCloudDetailed(userId);
  return result.venue;
}

/** ينشئ منشأة فارغة محلياً فقط — بدون رفع للسحابة */
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
  // محلي فقط — رفع فارغ كان يمحو منيو السحابة عند فشل السحب بعد تسجيل الدخول
  saveVenueDataLocal(userId, empty);
  logger.audit("venue.initialized_empty_local", { userId });
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
  const snap = getLocalJson<{ ownerUserId?: string; venue?: VenueData } | null>(
    `${DEVICE_VENUE_PREFIX}${code}`,
    null,
  );
  // كاش الجهاز أولاً — لا تعرض meez:venue لمالك آخر بالخطأ
  if (snap?.venue?.version === 1) {
    return normalizeVenue(snap.venue);
  }
  const ownerId = snap?.ownerUserId || getDeviceOwnerUserId(code);
  if (ownerId) return loadVenueData(ownerId);
  return createEmptyVenueData();
}

/** تحميل منيو الجهاز من Supabase — يجلب JSON كاملاً فقط عند تغيّر updated_at */
export async function loadVenueForDeviceAsync(
  deviceCode: string,
  _knownRemoteUpdatedAt?: string | null,
): Promise<VenueData> {
  const result = await syncVenueForDeviceIfStale(deviceCode);
  return result.venue;
}

/** مزامنة كاملة فقط عند تغيّر updated_at — وإلا البيانات المحلية */
export async function syncVenueForDeviceIfStale(
  deviceCode: string,
  force = false,
): Promise<{ venue: VenueData; changed: boolean }> {
  const code = deviceCode.trim().toUpperCase();
  if (!shouldUseVenueDatabase()) {
    return { venue: loadVenueForDevice(code), changed: false };
  }

  try {
    const local = loadVenueForDevice(code);
    const remoteUpdatedAt = await fetchVenueUpdatedAtForDevice(code, force);
    const cacheKey = deviceRemoteUpdatedKey(code);
    const remembered = getRememberedRemoteUpdatedAt(cacheKey);
    // لا تتخطّ المزامنة إن كان كاش الجهاز فارغاً رغم تطابق الختم
    if (
      !force &&
      remoteUpdatedAt &&
      remembered === remoteUpdatedAt &&
      !isVenueEffectivelyEmpty(local)
    ) {
      return { venue: local, changed: false };
    }

    const remote = await fetchVenueForDeviceFromDatabase(code, force);
    if (remote?.version === 1) {
      const normalized = compactVenueForLocalStorage(normalizeVenue(remote));
      const ownerId = getDeviceOwnerUserId(code);
      // لا تكتب منيو الجهاز فوق meez:venue:{owner} — كانت تسبب وميض منيو ثانية/تلوث كاش المالك
      setLocalJson(`${DEVICE_VENUE_PREFIX}${code}`, {
        ...(ownerId ? { ownerUserId: ownerId } : {}),
        venue: normalized,
        syncedAt: new Date().toISOString(),
        remoteUpdatedAt: remoteUpdatedAt ?? undefined,
      });
      rememberRemoteUpdatedAt(cacheKey, remoteUpdatedAt);
      const changed = Boolean(remoteUpdatedAt && remoteUpdatedAt !== remembered);
      return { venue: normalized, changed: force || changed };
    }
  } catch (err) {
    logger.error("venue.device_cloud_load_failed", {
      code,
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  return { venue: loadVenueForDevice(code), changed: false };
}
