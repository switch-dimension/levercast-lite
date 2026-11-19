import { describe, expect, it } from "vitest";
import { draftState, isEdited, isStale, planRegenerateAll } from "@/lib/domain/draft-state";

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

describe("isStale (FR-20, AC-23)", () => {
  const at = "2026-11-18T10:00:00.000Z";
  it("is true only when the idea changed after the draft was generated", () => {
    expect(isStale({ generatedAt: at }, "2026-11-18T10:00:01.000Z")).toBe(true);
    expect(isStale({ generatedAt: at }, at)).toBe(false);
    expect(isStale({ generatedAt: at }, "2026-11-18T09:59:59.000Z")).toBe(false);
  });
});

describe("draftState", () => {
  const draft = { generatedAt: "2026-11-18T10:00:00.000Z" };
  const before = "2026-11-18T09:00:00.000Z";
  const after = "2026-11-18T11:00:00.000Z";

  it("writing and failed win over everything", () => {
    expect(draftState({ run: "writing", draft, ideaUpdatedAt: after })).toBe("writing");
    expect(draftState({ run: "failed", draft, ideaUpdatedAt: after })).toBe("failed");
  });

  it("an existing draft is stale or ready; no draft is empty", () => {
    expect(draftState({ draft, ideaUpdatedAt: after })).toBe("stale");
    expect(draftState({ draft, ideaUpdatedAt: before })).toBe("ready");
    expect(draftState({ run: "idle", ideaUpdatedAt: after })).toBe("empty");
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
