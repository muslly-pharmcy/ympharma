// ============================================================
// Logger — JSON-line logger, Worker-safe (writes to console)
// ============================================================
// • No pino, no node streams; Cloudflare Workers stream stdout to logs.
// • Optionally fans out to OtlpHttpExporter when OTEL_EXPORTER_OTLP_ENDPOINT set.

import type { RequestContext } from "./RequestContext";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  [k: string]: unknown;
}

export interface LogRecord extends LogFields {
  ts: string;
  level: LogLevel;
  msg: string;
  correlation_id?: string;
  trace_id?: string;
  span_id?: string;
}

export class Logger {
  constructor(private base: LogFields = {}) {}

  child(extra: LogFields): Logger {
    return new Logger({ ...this.base, ...extra });
  }

  withContext(ctx: RequestContext): Logger {
    return this.child({
      correlation_id: ctx.correlation_id,
      trace_id: ctx.trace_id,
      span_id: ctx.span_id,
    });
  }

  log(level: LogLevel, msg: string, fields: LogFields = {}): void {
    const rec: LogRecord = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...this.base,
      ...fields,
    };
    const line = safeStringify(rec);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }

  debug(msg: string, fields?: LogFields) { this.log("debug", msg, fields); }
  info(msg: string, fields?: LogFields) { this.log("info", msg, fields); }
  warn(msg: string, fields?: LogFields) { this.log("warn", msg, fields); }
  error(msg: string, fields?: LogFields) { this.log("error", msg, fields); }
}

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return JSON.stringify({ ts: new Date().toISOString(), level: "error", msg: "log_serialization_failed" });
  }
}

export const logger = new Logger({ service: "ympharma" });
