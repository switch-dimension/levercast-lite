import { describe, expect, it } from "vitest";
import { ideaPreview, postStatus, relativeTime } from "@/lib/domain/post-status";

describe("postStatus (FR-5)", () => {
  it("is Not generated with no drafts, Draft with drafts, Copied once any draft is copied", () => {
    expect(postStatus({ hasDrafts: false, copied: false })).toEqual({ key: "none", label: "Not generated" });
    expect(postStatus({ hasDrafts: true, copied: false })).toEqual({ key: "draft", label: "Draft" });
    expect(postStatus({ hasDrafts: true, copied: true })).toEqual({ key: "copied", label: "Copied" });
  });
});

describe("ideaPreview", () => {
  it("collapses whitespace and cuts to about 120 characters with an ellipsis", () => {
    expect(ideaPreview("  Clients   buy\n\noutcomes. ")).toBe("Clients buy outcomes.");
    const long = `${"word ".repeat(40)}end`;
    const preview = ideaPreview(long);
    expect(preview.endsWith("…")).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(121);
    expect(preview).not.toMatch(/\s…$/);
  });

  it("shows a placeholder for an empty idea", () => {
    expect(ideaPreview("   ")).toBe("Untitled idea");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-11-18T15:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it("reads naturally from seconds to days, then shows a date", () => {
    expect(relativeTime(ago(20_000), now)).toBe("Just now");
    expect(relativeTime(ago(1 * MIN), now)).toBe("1 min ago");
    expect(relativeTime(ago(42 * MIN), now)).toBe("42 min ago");
    expect(relativeTime(ago(1 * HOUR), now)).toBe("1 hour ago");
    expect(relativeTime(ago(5 * HOUR), now)).toBe("5 hours ago");
    expect(relativeTime(ago(30 * HOUR), now)).toBe("Yesterday");
    expect(relativeTime(ago(3 * DAY), now)).toBe("3 days ago");
    expect(relativeTime(ago(10 * DAY), now)).toBe("8 Nov");
  });
});
