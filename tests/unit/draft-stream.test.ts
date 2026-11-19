import { describe, expect, it } from "vitest";
import { encodeResult, readDraftStream } from "@/lib/domain/draft-stream";

describe("draft stream format", () => {
  it("is plain text until the result arrives", () => {
    expect(readDraftStream("Clients buy ")).toEqual({ text: "Clients buy ", result: null });
  });

  it("splits off a success or failure result", () => {
    expect(readDraftStream(`Done.${encodeResult({ ok: true })}`)).toEqual({ text: "Done.", result: { ok: true } });
    expect(readDraftStream(`Half a dr${encodeResult({ ok: false, error: "Timed out" })}`)).toEqual({
      text: "Half a dr",
      result: { ok: false, error: "Timed out" },
    });
  });

  it("waits while the result is only partly received", () => {
    const whole = `Text${encodeResult({ ok: true })}`;
    expect(readDraftStream(whole.slice(0, -3))).toEqual({ text: "Text", result: null });
  });
});
