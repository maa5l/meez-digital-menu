import { appEnv } from "@/config/env";

type LogLevel = "debug" | "info" | "warn" | "error" | "audit";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  audit: 4,
};

const currentLevel = (appEnv.logLevel as LogLevel) in LEVEL_ORDER ? (appEnv.logLevel as LogLevel) : "warn";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function emit(level: LogLevel, event: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  };
  if (level === "error") {
    console.error(JSON.stringify(payload));
  } else if (level === "warn") {
    console.warn(JSON.stringify(payload));
  } else if (appEnv.isDev) {
    console.log(JSON.stringify(payload));
  }
}

export const logger = {
  debug: (event: string, meta?: Record<string, unknown>) => emit("debug", event, meta),
  info: (event: string, meta?: Record<string, unknown>) => emit("info", event, meta),
  warn: (event: string, meta?: Record<string, unknown>) => emit("warn", event, meta),
  error: (event: string, meta?: Record<string, unknown>) => emit("error", event, meta),
  audit: (event: string, meta?: Record<string, unknown>) => emit("audit", event, meta),
  security: (event: string, meta?: Record<string, unknown>) => emit("audit", `security.${event}`, meta),
};
