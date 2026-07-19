import type { RegistrationPeek } from "@/services/kiosk-check";

export type KioskPhase = "boot" | "pairing" | "opening" | "menu" | "fault";

export type FaultCode =
  | "MENU_EMPTY"
  | "SCHEMA"
  | "NETWORK"
  | "LOAD_BLANK"
  | "STORAGE"
  | "MEDIA_DEGRADED";

export type Fault = {
  code: FaultCode;
  title: string;
  message: string;
  hint?: string;
  autoRetry?: boolean;
  detail?: string;
};

export type KioskSnapshot = {
  phase: KioskPhase;
  code: string | null;
  menuUrl: string | null;
  fault: Fault | null;
  peek: RegistrationPeek | null;
  remountKey: number;
  bootError: string | null;
};
