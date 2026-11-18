import { describe, expect, it } from "vitest";
import { charCount, charLimit, isOverLimit } from "@/lib/domain/limits";

describe("charCount (FR-13)", () => {
  it("LinkedIn counts characters, with an emoji as one", () => {
    expect(charCount("linkedin", "Hello")).toBe(5);
    expect(charCount("linkedin", "Ship it 🚀")).toBe(9);
  });

  it("Bluesky counts graphemes, so combined emoji are one", () => {
    expect(charCount("bluesky", "Hi 👋🏽")).toBe(4);
    expect(charCount("bluesky", "👨‍👩‍👧")).toBe(1);
    expect(charCount("bluesky", "café")).toBe(4);
  });

  it("X weights links as 23, emoji and wide characters as 2", () => {
    expect(charCount("x", "Hello")).toBe(5);
    expect(charCount("x", "Read https://example.com/a/very/long/path?with=query")).toBe(5 + 23);
    expect(charCount("x", "Ship 🚀")).toBe(5 + 2);
    expect(charCount("x", "日本")).toBe(4);
    expect(charCount("x", "café — “quoted”")).toBe(15);
  });
});

describe("limits (FR-12, AC-15)", () => {
  it("uses 3,000 for LinkedIn, 280 per tweet for X, and 300 for Bluesky", () => {
    expect(charLimit("linkedin")).toBe(3000);
    expect(charLimit("x")).toBe(280);
    expect(charLimit("bluesky")).toBe(300);
  });

  it("flags text over the limit, not at it", () => {
    expect(isOverLimit("bluesky", "a".repeat(300))).toBe(false);
    expect(isOverLimit("bluesky", "a".repeat(301))).toBe(true);
    expect(isOverLimit("x", "a".repeat(281))).toBe(true);
  });
});
