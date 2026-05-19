/** m:ss — for live timers (stopwatch, break countdown). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Rounded minutes — for the finish summary. */
export function formatMinutes(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000));
  return `${minutes} min`;
}
