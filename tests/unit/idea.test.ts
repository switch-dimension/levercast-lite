import { describe, expect, it } from "vitest";
import { checkIdea, IDEA_MAX } from "@/lib/domain/idea";
import { createSaveQueue } from "@/lib/autosave";

describe("checkIdea (AC-9)", () => {
  it("can't generate from an empty or whitespace-only idea", () => {
    expect(checkIdea("")).toEqual({ canGenerate: false, message: null });
    expect(checkIdea("  \n\t ")).toEqual({ canGenerate: false, message: null });
  });

  it("accepts up to 5,000 characters", () => {
    expect(IDEA_MAX).toBe(5000);
    expect(checkIdea("x".repeat(5000)).canGenerate).toBe(true);
  });

  it("explains how far over 5,000 characters the idea is", () => {
    const result = checkIdea("x".repeat(5012));
    expect(result.canGenerate).toBe(false);
    expect(result.message).toBe("That's 12 characters over the 5,000 limit. Trim it a little to generate.");
  });
});

describe("createSaveQueue", () => {
  const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => (resolve = r));
    return { promise, resolve };
  };

  it("runs one save at a time and only saves the latest value after an in-flight save", async () => {
    const calls: string[] = [];
    const gates: ReturnType<typeof deferred>[] = [];
    const queue = createSaveQueue<string>(async (value) => {
      calls.push(value);
      const gate = deferred();
      gates.push(gate);
      await gate.promise;
    });

    queue.save("a");
    queue.save("ab");
    const done = queue.save("abc");
    expect(calls).toEqual(["a"]); // nothing else starts while "a" is saving

    gates[0].resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toEqual(["a", "abc"]); // "ab" was superseded

    gates[1].resolve();
    await done; // resolves once the queue has drained
    expect(calls).toEqual(["a", "abc"]);
    expect(queue.busy).toBe(false);
  });

  it("flush waits for the in-flight save and the pending one", async () => {
    const calls: string[] = [];
    const queue = createSaveQueue<string>(async (value) => {
      await new Promise((r) => setTimeout(r, 5));
      calls.push(value);
    });
    queue.save("one");
    queue.save("two");
    await queue.flush();
    expect(calls).toEqual(["one", "two"]);
  });

  it("reports a failed save and keeps going with the next one", async () => {
    const errors: unknown[] = [];
    const queue = createSaveQueue<string>(
      async (value) => {
        if (value === "bad") throw new Error("nope");
      },
      { onError: (e) => errors.push(e) },
    );
    await queue.save("bad");
    await queue.save("good");
    expect(errors).toHaveLength(1);
  });
});
