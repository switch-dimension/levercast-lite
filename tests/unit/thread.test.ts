import { describe, expect, it } from "vitest";
import { joinThread, parseThread } from "@/lib/domain/thread";

describe("parseThread (AC-14)", () => {
  it("splits a numbered thread into tweets, keeping the numbers", () => {
    expect(parseThread("1/ First point.\n\n2/ Second point.\n\n3/ Third.")).toEqual([
      "1/ First point.",
      "2/ Second point.",
      "3/ Third.",
    ]);
  });

  it("keeps blank lines inside a tweet (real model output does this)", () => {
    const text = "1/ Most decks protect the presenter.\n\nYou can usually tell.\n\n2/ Every risk gets a slide.";
    expect(parseThread(text)).toEqual([
      "1/ Most decks protect the presenter.\n\nYou can usually tell.",
      "2/ Every risk gets a slide.",
    ]);
  });

  it("tolerates extra whitespace, single newlines between tweets, and stray blank lines", () => {
    expect(parseThread("\n\n  1/ One\n2/ Two  \n\n\n\n3/   Three\n\n")).toEqual(["1/ One", "2/ Two", "3/   Three"]);
  });

  it("handles up to six tweets and beyond without losing any", () => {
    const text = Array.from({ length: 7 }, (_, i) => `${i + 1}/ Tweet ${i + 1}`).join("\n\n");
    expect(parseThread(text)).toHaveLength(7);
  });

  it("falls back to one tweet when the output isn't numbered", () => {
    expect(parseThread("Just a paragraph.\n\nAnd another.")).toEqual(["Just a paragraph.\n\nAnd another."]);
  });

  it("keeps any text before the first number as its own tweet", () => {
    expect(parseThread("Here you go:\n\n1/ One\n\n2/ Two")).toEqual(["Here you go:", "1/ One", "2/ Two"]);
  });

  it("doesn't split on a fraction or a number mid-line", () => {
    expect(parseThread("1/ Mix 1/2 cup of honesty.\n\n2/ Done in 3/4 of the time.")).toEqual([
      "1/ Mix 1/2 cup of honesty.",
      "2/ Done in 3/4 of the time.",
    ]);
  });

  it("returns no tweets for empty output", () => {
    expect(parseThread("  \n ")).toEqual([]);
  });
});

describe("joinThread (FR-19)", () => {
  it("separates tweets with blank lines for Copy thread", () => {
    expect(joinThread(["1/ One", "2/ Two"])).toBe("1/ One\n\n2/ Two");
  });
});
