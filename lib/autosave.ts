// A save queue for autosave: one save runs at a time, and while it runs only
// the latest value waits. So a fast typist never fires two "create post"
// saves at once, and stale text never overwrites newer text.

/**
 * Returned by the Server Actions the editor calls in the background (autosave,
 * copy) when the session has gone. A redirect would navigate away from
 * unsaved text, so they report it instead.
 */
export const SIGNED_OUT = { signedOut: true } as const;
export type SignedOut = typeof SIGNED_OUT;

export const isSignedOut = (value: unknown): value is SignedOut =>
  typeof value === "object" && value !== null && "signedOut" in value;

/** Thrown by a save when the action reported SIGNED_OUT. */
export class SignedOutError extends Error {
  constructor() {
    super("Signed out");
    this.name = "SignedOutError";
  }
}

type Options = { onError?: (error: unknown) => void };

export function createSaveQueue<T>(save: (value: T) => Promise<void>, { onError }: Options = {}) {
  let running: Promise<void> | null = null;
  let pending: { value: T } | null = null;

  async function drain() {
    while (pending) {
      const { value } = pending;
      pending = null;
      try {
        await save(value);
      } catch (error) {
        onError?.(error);
      }
    }
    running = null;
  }

  return {
    /** Queues a value; resolves once it (or a newer value) has been saved. */
    save(value: T): Promise<void> {
      pending = { value };
      running ??= drain();
      return running;
    },
    /** Resolves when nothing is saving or waiting. */
    async flush(): Promise<void> {
      while (running) await running;
    },
    get busy() {
      return running !== null;
    },
  };
}
