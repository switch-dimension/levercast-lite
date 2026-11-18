import { describe, expect, it } from "vitest";
import { DRAFT_TEXT_MAX, isValidDraftEdit } from "@/lib/domain/editor-draft";

describe("isValidDraftEdit", () => {
  it("accepts one text for LinkedIn and Bluesky, and one per tweet for X", () => {
    expect(isValidDraftEdit("linkedin", ["Edited"])).toBe(true);
    expect(isValidDraftEdit("bluesky", [""])).toBe(true);
    expect(isValidDraftEdit("x", ["1/ One", "2/ Two"])).toBe(true);
  });

  it("refuses unknown platforms and wrongly shaped content", () => {
    expect(isValidDraftEdit("threads", ["Hi"])).toBe(false);
    expect(isValidDraftEdit("linkedin", ["One", "Two"])).toBe(false);
    expect(isValidDraftEdit("x", [])).toBe(false);
    expect(isValidDraftEdit("x", "1/ One")).toBe(false);
    expect(isValidDraftEdit("x", ["1/ One", 2])).toBe(false);
    expect(isValidDraftEdit("linkedin", ["a".repeat(DRAFT_TEXT_MAX + 1)])).toBe(false);
  });
});
