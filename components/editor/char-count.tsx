import { charCount, charLimit } from "@/lib/domain/limits";
import type { Platform } from "@/lib/platforms";

/** A live count against the platform limit; over the limit is highlighted, never blocking (FR-13). */
export function CharCount({ platform, text }: { platform: Platform; text: string }) {
  const count = charCount(platform, text);
  const limit = charLimit(platform);
  const over = count > limit;
  return (
    <span
      data-testid="char-count"
      data-over={over || undefined}
      className={`text-caption tabular-nums ${over ? "font-semibold text-error" : "text-neutral"}`}
    >
      {count.toLocaleString("en-US")} / {limit.toLocaleString("en-US")}
      {over && <span className="sr-only"> (over the limit)</span>}
    </span>
  );
}
