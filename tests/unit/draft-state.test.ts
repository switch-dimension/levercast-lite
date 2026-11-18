import { describe, expect, it } from "vitest";
import { isEdited, planRegenerateAll } from "@/lib/domain/draft-state";

const draft = (content: string[], generatedContent = content) => ({ content, generatedContent });

describe("isEdited (FR-15)", () => {
  it("is false when the draft matches what was generated", () => {
    expect(isEdited(draft(["Same"]))).toBe(false);
    expect(isEdited(draft(["1/ One", "2/ Two"], ["1/ One", "2/ Two"]))).toBe(false);
  });

  it("is true when any text differs, even by whitespace", () => {
    expect(isEdited(draft(["Changed"], ["Original"]))).toBe(true);
    expect(isEdited(draft(["1/ One", "2/ Two!"], ["1/ One", "2/ Two"]))).toBe(true);
    expect(isEdited(draft(["Same "], ["Same"]))).toBe(true);
  });

  it("is false once an edit is typed back to the original", () => {
    expect(isEdited(draft(["Original"], ["Original"]))).toBe(false);
  });
});

describe("planRegenerateAll (AC-12a)", () => {
  it("regenerates missing and unedited drafts now and asks about edited ones", () => {
    expect(
      planRegenerateAll({
        linkedin: draft(["Same"]),
        x: draft(["1/ Mine"], ["1/ Theirs"]),
      }),
    ).toEqual({ now: ["linkedin", "bluesky"], confirm: ["x"] });
  });

  it("with no drafts, regenerates everything", () => {
    expect(planRegenerateAll({})).toEqual({ now: ["linkedin", "x", "bluesky"], confirm: [] });
  });
});
