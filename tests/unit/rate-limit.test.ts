import { describe, expect, it } from "vitest";
import { DAILY_GENERATION_CAP, rateLimit, rateLimitMessage } from "@/lib/domain/rate-limit";

const now = new Date("2026-11-18T15:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe("rateLimit (FR-17)", () => {
  it("allows generation below the cap of 50 in a rolling 24 hours", () => {
    expect(DAILY_GENERATION_CAP).toBe(50);
    const starts = Array.from({ length: 49 }, (_, i) => hoursAgo(i * 0.4));
    expect(rateLimit(starts, now)).toEqual({ allowed: true });
  });

  it("refuses at the cap and says when the oldest counted start drops out", () => {
    const starts = Array.from({ length: 50 }, (_, i) => hoursAgo(23 - i * 0.1));
    const result = rateLimit(starts, now);
    expect(result).toEqual({ allowed: false, retryAt: new Date(hoursAgo(23).getTime() + 24 * 3_600_000) });
  });

  it("ignores starts older than 24 hours", () => {
    const starts = [...Array.from({ length: 49 }, () => hoursAgo(1)), hoursAgo(24.5)];
    expect(rateLimit(starts, now).allowed).toBe(true);
  });

  it("over the cap (two clicks raced), waits until enough starts drop out", () => {
    const starts = [hoursAgo(20), hoursAgo(10), hoursAgo(5), ...Array.from({ length: 49 }, () => hoursAgo(1))];
    const result = rateLimit(starts, now);
    // 52 counted: three must expire to get below 50, so the third-oldest decides.
    expect(result).toEqual({ allowed: false, retryAt: new Date(hoursAgo(5).getTime() + 24 * 3_600_000) });
  });
});

describe("rateLimitMessage", () => {
  it("counts in drafts and gives the time in the user's locale and zone", () => {
    const message = rateLimitMessage(new Date("2026-11-18T15:10:00Z"), {
      locale: "en-US",
      timeZone: "Europe/Dublin",
    });
    expect(message).toBe("You've used today's 50 drafts. You can generate again at 3:10 PM.");
  });
});
