/**
 * Parse an ISO date string (YYYY-MM-DD) without timezone shifting.
 * Appending T00:00:00 forces local-timezone parse instead of UTC midnight.
 */
export function parseWeekDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

export function formatWeekDate(dateStr: string): string {
  return parseWeekDate(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatPercent(rate: number): string {
  return (rate * 100).toFixed(1) + "%";
}
