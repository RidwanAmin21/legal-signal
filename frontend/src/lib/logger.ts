import { NextRequest } from "next/server";
import { randomUUID } from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId: string;
  route: string;
  method: string;
  userId?: string;
  clientId?: string;
  [key: string]: unknown;
}

function formatLog(
  level: LogLevel,
  message: string,
  ctx: Partial<LogContext>,
  extra?: Record<string, unknown>
): string {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...ctx,
    ...(extra && Object.keys(extra).length > 0 ? extra : {}),
  };
  return JSON.stringify(entry);
}

function log(
  level: LogLevel,
  message: string,
  ctx: Partial<LogContext>,
  extra?: Record<string, unknown>
) {
  const line = formatLog(level, message, ctx, extra);
  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      console.debug(line);
      break;
    default:
      console.log(line);
  }
}

export interface ApiLogger {
  info: (message: string, extra?: Record<string, unknown>) => void;
  warn: (message: string, extra?: Record<string, unknown>) => void;
  error: (message: string, extra?: Record<string, unknown>) => void;
  debug: (message: string, extra?: Record<string, unknown>) => void;
  setUser: (userId: string, clientId?: string) => void;
  /** Call at the end of the request to log the final status and duration */
  done: (status: number, extra?: Record<string, unknown>) => void;
}

/**
 * Create a scoped logger for a Next.js API route handler.
 * Generates a unique request ID, captures route/method, and tracks timing.
 */
export function createApiLogger(req: NextRequest, route: string): ApiLogger {
  const requestId = randomUUID().slice(0, 8);
  const method = req.method;
  const startTime = Date.now();

  const ctx: LogContext = { requestId, route, method };

  log("info", "Request received", ctx, {
    url: req.url,
    userAgent: req.headers.get("user-agent") ?? undefined,
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
  });

  return {
    info(message, extra) {
      log("info", message, ctx, extra);
    },
    warn(message, extra) {
      log("warn", message, ctx, extra);
    },
    error(message, extra) {
      log("error", message, ctx, extra);
    },
    debug(message, extra) {
      log("debug", message, ctx, extra);
    },
    setUser(userId: string, clientId?: string) {
      ctx.userId = userId;
      if (clientId) ctx.clientId = clientId;
    },
    done(status, extra) {
      const durationMs = Date.now() - startTime;
      log("info", "Request completed", ctx, { status, durationMs, ...extra });
    },
  };
}
