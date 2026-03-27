import { NextResponse } from "next/server";
import type { ApiLogger } from "./logger";

/**
 * Return a generic 500 response and log the real error server-side.
 * Prevents leaking internal DB schema details to clients.
 *
 * When an ApiLogger is passed, structured JSON is emitted instead of a
 * plain console.error line, making it easier to correlate with request IDs.
 */
export function internalError(
  error: { message: string; code?: string; details?: string; hint?: string },
  context?: string,
  logger?: ApiLogger
) {
  if (logger) {
    logger.error("Internal server error", {
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
      context,
    });
    logger.done(500);
  } else {
    console.error(`[API${context ? ` ${context}` : ""}]`, error.message);
  }
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
