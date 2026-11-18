// The generation stream's wire format: the draft text as it arrives, then a
// record separator and a JSON result. The stream always closes cleanly; a
// failure is reported in-band, because breaking the connection makes browsers
// silently retry the POST (each retry a fresh model call). A stream with no
// result (the connection dropped) counts as failed.

export const RESULT_SEPARATOR = "\u001e";

export type StreamResult = { ok: true } | { ok: false; error: string };

export function encodeResult(result: StreamResult): string {
  return RESULT_SEPARATOR + JSON.stringify(result);
}

/** Splits what has arrived so far into draft text and, once present, the result. */
export function readDraftStream(received: string): { text: string; result: StreamResult | null } {
  const at = received.indexOf(RESULT_SEPARATOR);
  if (at === -1) return { text: received, result: null };
  try {
    return { text: received.slice(0, at), result: JSON.parse(received.slice(at + 1)) as StreamResult };
  } catch {
    // The result is still arriving.
    return { text: received.slice(0, at), result: null };
  }
}
