function emit(level: string, event: string, meta?: Record<string, unknown>): void {
  if (!__DEV__ && level === "debug") return;
  console[level === "error" ? "error" : "log"](JSON.stringify({ level, event, ...meta }));
}

export const logger = {
  debug: (event: string, meta?: Record<string, unknown>) => emit("debug", event, meta),
  warn: (event: string, meta?: Record<string, unknown>) => emit("warn", event, meta),
  error: (event: string, meta?: Record<string, unknown>) => emit("error", event, meta),
  audit: (event: string, meta?: Record<string, unknown>) => emit("info", event, meta),
};
