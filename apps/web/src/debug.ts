export type LogLevel = "info" | "warn" | "error";

export type LogEntry = {
  ts: string;
  tMs: number;
  level: LogLevel;
  msg: string;
  data?: unknown;
};

export function createLogBuffer(maxEntries = 200) {
  const t0 = performance.now();
  const entries: LogEntry[] = [];

  function add(level: LogLevel, msg: string, data?: unknown) {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      tMs: Math.max(0, Math.round(performance.now() - t0)),
      level,
      msg,
      ...(data === undefined ? {} : { data }),
    };

    entries.push(entry);
    if (entries.length > maxEntries) {
      entries.splice(0, entries.length - maxEntries);
    }
  }

  function clear() {
    entries.length = 0;
  }

  function snapshot() {
    return [...entries];
  }

  function counts() {
    let info = 0;
    let warn = 0;
    let error = 0;
    for (const e of entries) {
      if (e.level === "info") info++;
      else if (e.level === "warn") warn++;
      else error++;
    }
    return { info, warn, error, total: entries.length };
  }

  return { add, clear, snapshot, counts };
}

export function hookGlobalErrors(add: (level: LogLevel, msg: string, data?: unknown) => void) {
  window.addEventListener("error", (ev) => {
    add("error", "window.error", {
      message: ev.message,
      filename: ev.filename,
      lineno: ev.lineno,
      colno: ev.colno,
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const reason = ev.reason;
    add("error", "window.unhandledrejection", {
      reason: typeof reason === "string" ? reason : String(reason),
    });
  });
}
