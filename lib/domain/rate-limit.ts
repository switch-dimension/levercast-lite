// Per-user generation cap (FR-17): 50 platform generations in any rolling
// 24 hours, counted from generation_started events. One Generate click is 3.

export const DAILY_GENERATION_CAP = 50;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export type RateLimit = { allowed: true } | { allowed: false; retryAt: Date };

export function rateLimit(starts: Date[], now: Date = new Date(), cap = DAILY_GENERATION_CAP): RateLimit {
  const counted = starts
    .filter((t) => now.getTime() - t.getTime() < WINDOW_MS)
    .sort((a, b) => a.getTime() - b.getTime());
  if (counted.length < cap) return { allowed: true };
  // Enough of the oldest must expire to drop below the cap.
  const decider = counted[counted.length - cap];
  return { allowed: false, retryAt: new Date(decider.getTime() + WINDOW_MS) };
}

/** The refusal shown to the user, counted in drafts (the user never sees "generations"). */
export function rateLimitMessage(retryAt: Date, opts: { locale?: string; timeZone?: string } = {}): string {
  const time = retryAt.toLocaleTimeString(opts.locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: opts.timeZone,
  });
  return `You've used today's ${DAILY_GENERATION_CAP} drafts. You can generate again at ${time}.`;
}
