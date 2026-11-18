// A save queue for autosave: one save runs at a time, and while it runs only
// the latest value waits. So a fast typist never fires two "create post"
// saves at once, and stale text never overwrites newer text.

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
