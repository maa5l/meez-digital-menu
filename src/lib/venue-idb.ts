import type { VenueData } from "@/types/venue";
import { logger } from "@/lib/logger";

const DB_NAME = "meez-venue-v1";
const STORE = "venues";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb_unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexeddb_open_failed"));
  });
}

export async function idbSetVenue(userId: string, data: VenueData): Promise<boolean> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(data, userId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("indexeddb_put_failed"));
      tx.onabort = () => reject(tx.error ?? new Error("indexeddb_aborted"));
    });
    db.close();
    return true;
  } catch (error) {
    logger.warn("venue.idb_write_failed", {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function idbGetVenue(userId: string): Promise<VenueData | null> {
  try {
    const db = await openDb();
    const value = await new Promise<VenueData | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(userId);
      req.onsuccess = () => {
        const row = req.result;
        resolve(row && typeof row === "object" ? (row as VenueData) : null);
      };
      req.onerror = () => reject(req.error ?? new Error("indexeddb_get_failed"));
    });
    db.close();
    return value;
  } catch (error) {
    logger.warn("venue.idb_read_failed", {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
