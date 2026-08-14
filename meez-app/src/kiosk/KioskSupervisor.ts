import {
  getMenuUrlForCode,
  getMenuWebUrlValidationError,
  isSupabaseConfigured,
} from "@/config/env";
import { faultFromCode } from "@/kiosk/fault-copy";
import type { FaultCode, KioskPhase, KioskSnapshot } from "@/kiosk/types";
import { logger } from "@/lib/logger";
import { invalidateCacheKey } from "@/lib/request-cache";
import { computeScheduledRetryMs } from "@/lib/rate-limit-coordinator";
import { resolveDeviceCodeFromUrl, generateDeviceCode } from "@/services/device-code";
import { setDeviceCode } from "@/security/storage";
import {
  peekDeviceRegistration,
  type RegistrationPeek,
} from "@/services/kiosk-check";
import { announceKioskPairingCode } from "@/services/kiosk-pairing";
import { AppState, type AppStateStatus, type NativeEventSubscription } from "react-native";

const POLL_MS = 30_000;
const MIN_FORCE_TICK_GAP_MS = 15_000;
const ANNOUNCE_MS = 10 * 60 * 1000;
const FAULT_AUTO_RETRY_MS = 8_000;

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
 * Rate limits affect only get_kiosk_state — never freeze the whole app.
 */
export class KioskSupervisor {
  private snapshot: KioskSnapshot = initialSnapshot();
  private listeners = new Set<Listener>();
  private pollId: ReturnType<typeof setInterval> | undefined;
  private scopedRetryId: ReturnType<typeof setTimeout> | undefined;
  private faultRetryId: ReturnType<typeof setTimeout> | undefined;
  private announceId: ReturnType<typeof setInterval> | undefined;
  private appStateSub: NativeEventSubscription | undefined;
  private openingLock = false;
  private started = false;
  private lastTickAt = 0;

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

  async restart(): Promise<void> {
    this.stopPolling();
    this.clearScopedRetry();
    this.clearFaultRetry();
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
    this.clearScopedRetry();
    this.clearFaultRetry();
    if (this.announceId != null) {
      clearInterval(this.announceId);
      this.announceId = undefined;
    }
    this.appStateSub?.remove();
    this.appStateSub = undefined;
  }

  private onAppState = (state: AppStateStatus): void => {
    if (state !== "active") return;
    const elapsed = Date.now() - this.lastTickAt;
    if (elapsed < MIN_FORCE_TICK_GAP_MS) return;
    void this.tick(true);
  };

  private stopPolling(): void {
    if (this.pollId != null) {
      clearInterval(this.pollId);
      this.pollId = undefined;
    }
  }

  private clearScopedRetry(): void {
    if (this.scopedRetryId != null) {
      clearTimeout(this.scopedRetryId);
      this.scopedRetryId = undefined;
    }
  }

  private clearFaultRetry(): void {
    if (this.faultRetryId != null) {
      clearTimeout(this.faultRetryId);
      this.faultRetryId = undefined;
    }
  }

  private scheduleFaultRetry(): void {
    this.clearFaultRetry();
    const { fault } = this.snapshot;
    if (!fault?.autoRetry) return;

    this.faultRetryId = setTimeout(() => {
      if (this.snapshot.phase !== "fault" || !this.snapshot.fault?.autoRetry) return;
      logger.audit("kiosk.fault_auto_retry", { code: this.snapshot.fault.code });
      void this.openMenu();
    }, FAULT_AUTO_RETRY_MS);
  }

  private startPolling(): void {
    this.stopPolling();
    if (!isSupabaseConfigured()) return;
    this.pollId = setInterval(() => void this.tick(false), POLL_MS);
  }

  private scheduleScopedRetry(retryAfterSeconds: number | undefined): void {
    this.clearScopedRetry();
    const delayMs = computeScheduledRetryMs(retryAfterSeconds ?? 30, 1);
    this.scopedRetryId = setTimeout(() => {
      void this.tick(true);
    }, delayMs);
  }

  private handleRateLimited(peek: RegistrationPeek, phase: KioskPhase): void {
    this.scheduleScopedRetry(peek.retry_after_seconds);

    if (phase === "menu" || phase === "opening") {
      logger.warn("kiosk.rate_limited_menu_continues", {
        endpoint: "get_kiosk_state",
        phase,
        retryAfterSeconds: peek.retry_after_seconds,
      });
      return;
    }

    this.patch({
      peek: {
        ...peek,
        status: peek.status === "registered" ? "registered" : "checking",
      },
    });
  }

  private invalidatePeekCache(code: string): void {
    invalidateCacheKey(`kiosk:peek:${code.trim().toUpperCase()}`);
  }

  async tick(force = false): Promise<void> {
    const { code, phase } = this.snapshot;
    if (!code || !isSupabaseConfigured()) return;

    this.lastTickAt = Date.now();
    const peek = await peekDeviceRegistration(code, force);
    if (this.snapshot.code !== code) return;

    if (peek.rateLimited || peek.reason === "rate_limited") {
      this.handleRateLimited(peek, phase);
      return;
    }

    this.patch({ peek });

    if (peek.status === "not_registered") {
      if (phase === "pairing" || phase === "boot") {
        return;
      }
      logger.audit("kiosk.deactivate_wins", { code, phase, reason: peek.reason });
      this.forcePairing(peek.reason ?? "device_inactive");
      return;
    }

    if (peek.status === "error") {
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
      const peek = await peekDeviceRegistration(code, true);
      if (peek.rateLimited || peek.reason === "rate_limited") {
        const canProceed =
          peek.status === "registered" || this.snapshot.peek?.status === "registered";
        if (canProceed) {
          logger.warn("kiosk.open_menu_rate_limited_using_cache", { code });
        } else {
          this.handleRateLimited(peek, "opening");
          return;
        }
      } else {
        this.patch({ peek });
        if (peek.status !== "registered") {
          if (peek.status === "not_registered") {
            this.forcePairing(peek.reason ?? "device_inactive");
            return;
          }
          this.reportFault("NETWORK", peek.message);
          return;
        }
      }

      const menuUrlError = getMenuWebUrlValidationError();
      if (menuUrlError) {
        this.reportFault("NETWORK", menuUrlError);
        return;
      }

      const url = getMenuUrlForCode(code);
      logger.audit("kiosk.open_menu", { url, code });
      this.clearFaultRetry();
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
    logger.error("kiosk.fault", { code, detail, logLabel: fault.message });
    this.clearFaultRetry();
    this.patch({
      phase: "fault",
      fault,
      menuUrl: null,
    });
    this.scheduleFaultRetry();
  }

  onWebMessage(raw: string): void {
    let payload: { type?: string; code?: string; detail?: string };
    try {
      payload = JSON.parse(raw) as { type?: string; code?: string; detail?: string };
    } catch {
      return;
    }

    if (payload.type === "meez:kiosk-ready") {
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
    this.clearFaultRetry();
    this.patch({
      phase: "pairing",
      menuUrl: null,
      fault: null,
      peek,
      remountKey: this.snapshot.remountKey + 1,
    });
  }

  async unlinkLocal(): Promise<void> {
    const { code: oldCode } = this.snapshot;
    if (oldCode) this.invalidatePeekCache(oldCode);

    const nextCode = generateDeviceCode();
    await setDeviceCode(nextCode);
    this.invalidatePeekCache(nextCode);

    this.openingLock = false;
    this.clearFaultRetry();

    const peek: RegistrationPeek = {
      status: "not_registered",
      reason: "local_unlink",
    };

    logger.audit("kiosk.unlink_new_code", { oldCode, nextCode });
    this.patch({
      phase: "pairing",
      code: nextCode,
      menuUrl: null,
      fault: null,
      peek,
      remountKey: this.snapshot.remountKey + 1,
    });

    if (isSupabaseConfigured()) {
      void announceKioskPairingCode(nextCode);
    }
  }

  retry(): void {
    void this.openMenu();
  }
}

export const kioskSupervisor = new KioskSupervisor();
