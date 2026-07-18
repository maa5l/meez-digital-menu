import {
  getMenuUrlForCode,
  getMenuWebUrlValidationError,
  isSupabaseConfigured,
} from "@/config/env";
import { faultFromCode } from "@/kiosk/fault-copy";
import type { FaultCode, KioskPhase, KioskSnapshot } from "@/kiosk/types";
import { logger } from "@/lib/logger";
import { invalidateCacheKey } from "@/lib/request-cache";
import { resolveDeviceCodeFromUrl } from "@/services/device-code";
import {
  peekDeviceRegistration,
  type RegistrationPeek,
} from "@/services/kiosk-check";
import { announceKioskPairingCode } from "@/services/kiosk-pairing";
import { AppState, type AppStateStatus, type NativeEventSubscription } from "react-native";

const POLL_MS = 12_000;
const MIN_BACKOFF_MS = 15_000;
const ANNOUNCE_MS = 10 * 60 * 1000;

type Listener = () => void;

function initialSnapshot(): KioskSnapshot {
  return {
    phase: "boot",
    code: null,
    menuUrl: null,
    fault: null,
    peek: { status: "checking" },
    remountKey: 0,
    bootError: null,
  };
}

/**
 * Singleton session supervisor — polling runs independently of UI phase.
 * Deactivation (not_registered) always wins over menu/fault/opening.
 */
export class KioskSupervisor {
  private snapshot: KioskSnapshot = initialSnapshot();
  private listeners = new Set<Listener>();
  private pollId: ReturnType<typeof setInterval> | undefined;
  private backoffId: ReturnType<typeof setTimeout> | undefined;
  private announceId: ReturnType<typeof setInterval> | undefined;
  private appStateSub: NativeEventSubscription | undefined;
  private openingLock = false;
  private started = false;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): KioskSnapshot => this.snapshot;

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private patch(partial: Partial<KioskSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
    this.emit();
  }

  private setPhase(phase: KioskPhase, extra: Partial<KioskSnapshot> = {}): void {
    this.patch({ phase, ...extra });
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.appStateSub = AppState.addEventListener("change", this.onAppState);
    await this.boot();
  }

  /** Re-run boot after STORAGE fault (keeps singleton alive). */
  async restart(): Promise<void> {
    this.stopPolling();
    if (this.announceId != null) {
      clearInterval(this.announceId);
      this.announceId = undefined;
    }
    this.openingLock = false;
    this.snapshot = initialSnapshot();
    this.emit();
    await this.boot();
  }

  private async boot(): Promise<void> {
    this.setPhase("boot", { bootError: null, fault: null, menuUrl: null });

    try {
      const code = await resolveDeviceCodeFromUrl(null);
      this.patch({ code, peek: { status: "checking" } });
      this.setPhase("pairing");

      if (isSupabaseConfigured()) {
        void announceKioskPairingCode(code);
        if (this.announceId == null) {
          this.announceId = setInterval(() => {
            const current = this.snapshot.code;
            if (current) void announceKioskPairingCode(current);
          }, ANNOUNCE_MS);
        }
      }

      this.startPolling();
      void this.tick(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذّر تحميل رمز الجهاز";
      logger.error("kiosk.boot_failed", { message });
      this.patch({
        bootError: message,
        fault: faultFromCode("STORAGE", message),
        phase: "fault",
      });
    }
  }

  stop(): void {
    this.started = false;
    this.stopPolling();
    if (this.announceId != null) {
      clearInterval(this.announceId);
      this.announceId = undefined;
    }
    this.appStateSub?.remove();
    this.appStateSub = undefined;
  }

  private onAppState = (state: AppStateStatus): void => {
    if (state === "active") void this.tick(true);
  };

  private stopPolling(): void {
    if (this.pollId != null) {
      clearInterval(this.pollId);
      this.pollId = undefined;
    }
    if (this.backoffId != null) {
      clearTimeout(this.backoffId);
      this.backoffId = undefined;
    }
  }

  private startPolling(): void {
    this.stopPolling();
    if (!isSupabaseConfigured()) return;
    this.pollId = setInterval(() => void this.tick(false), POLL_MS);
  }

  private scheduleBackoff(delayMs: number): void {
    this.stopPolling();
    this.backoffId = setTimeout(() => {
      this.startPolling();
      void this.tick(false);
    }, delayMs);
  }

  private invalidatePeekCache(code: string): void {
    invalidateCacheKey(`kiosk:peek:${code.trim().toUpperCase()}`);
  }

  async tick(force = false): Promise<void> {
    const { code, phase } = this.snapshot;
    if (!code || !isSupabaseConfigured()) return;

    const peek = await peekDeviceRegistration(code, force);
    if (this.snapshot.code !== code) return;

    this.patch({ peek });

    if (peek.reason === "rate_limited") {
      const waitSec = peek.retry_after_seconds ?? 60;
      this.scheduleBackoff(Math.max(MIN_BACKOFF_MS, waitSec * 1000));
      return;
    }

    // Deactivation always wins outside pairing/boot
    if (peek.status === "not_registered") {
      if (phase === "pairing" || phase === "boot") {
        return;
      }
      logger.audit("kiosk.deactivate_wins", { code, phase, reason: peek.reason });
      this.forcePairing(peek.reason ?? "device_inactive");
      return;
    }

    if (peek.status === "error") {
      // Transient RPC errors must not wipe an active menu session
      return;
    }

    if (peek.status === "registered" && phase === "pairing") {
      void this.openMenu();
    }
  }

  async openMenu(): Promise<void> {
    const { code } = this.snapshot;
    if (!code || this.openingLock) return;

    this.openingLock = true;
    this.setPhase("opening", { fault: null });

    try {
      // Single forced peek (avoids verify + peek double RPC burst)
      const peek = await peekDeviceRegistration(code, true);
      this.patch({ peek });
      if (peek.status !== "registered") {
        if (peek.status === "not_registered") {
          this.forcePairing(peek.reason ?? "device_inactive");
          return;
        }
        this.reportFault("NETWORK", peek.message);
        return;
      }

      const menuUrlError = getMenuWebUrlValidationError();
      if (menuUrlError) {
        this.reportFault("NETWORK", menuUrlError);
        return;
      }

      const url = getMenuUrlForCode(code);
      logger.audit("kiosk.open_menu", { url, code });
      this.patch({
        menuUrl: url,
        phase: "menu",
        fault: null,
        remountKey: this.snapshot.remountKey + 1,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("kiosk.open_menu_failed", { code, message });
      this.reportFault("NETWORK", message);
    } finally {
      this.openingLock = false;
    }
  }

  reportFault(code: FaultCode, detail?: string): void {
    const fault = faultFromCode(code, detail);
    logger.error("kiosk.fault", { code, detail });
    this.patch({
      phase: "fault",
      fault,
      menuUrl: null,
    });
  }

  onWebMessage(raw: string): void {
    let payload: { type?: string; code?: string; detail?: string };
    try {
      payload = JSON.parse(raw) as { type?: string; code?: string; detail?: string };
    } catch {
      return;
    }

    if (payload.type === "meez:kiosk-ready") {
      // MenuWebView clears its own loader; supervisor stays in menu
      return;
    }

    if (payload.type === "meez:kiosk-fault" && payload.code) {
      const code = payload.code as FaultCode;
      this.reportFault(code, payload.detail);
    }
  }

  onLoadBlank(): void {
    this.reportFault("LOAD_BLANK");
  }

  forcePairing(reason: string): void {
    const { code } = this.snapshot;
    this.openingLock = false;
    if (code) this.invalidatePeekCache(code);

    const peek: RegistrationPeek = {
      status: "not_registered",
      reason,
    };

    logger.audit("kiosk.force_pairing", { code, reason });
    this.patch({
      phase: "pairing",
      menuUrl: null,
      fault: null,
      peek,
      remountKey: this.snapshot.remountKey + 1,
    });
  }

  /** Local unlink — keep device code, clear session, return to PairScreen */
  unlinkLocal(): void {
    const { code } = this.snapshot;
    if (code) this.invalidatePeekCache(code);
    this.forcePairing("local_unlink");
  }

  retry(): void {
    void this.openMenu();
  }
}

export const kioskSupervisor = new KioskSupervisor();
