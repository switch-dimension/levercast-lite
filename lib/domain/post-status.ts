// How a post is summarised in lists (FR-5): status, idea preview, and age.

export type PostStatusKey = "none" | "draft" | "copied";

export function postStatus({ hasDrafts, copied }: { hasDrafts: boolean; copied: boolean }) {
  if (copied) return { key: "copied" as const, label: "Copied" };
  if (hasDrafts) return { key: "draft" as const, label: "Draft" };
  return { key: "none" as const, label: "Not generated" };
}

export function ideaPreview(idea: string, max = 120): string {
  const text = idea.replace(/\s+/g, " ").trim();
  if (!text) return "Untitled idea";
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function relativeTime(date: Date, now: Date = new Date()): string {
  const ago = now.getTime() - date.getTime();
  if (ago < MIN) return "Just now";
  if (ago < HOUR) return `${Math.floor(ago / MIN)} min ago`;
  if (ago < DAY) {
    const hours = Math.floor(ago / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (ago < 2 * DAY) return "Yesterday";
  if (ago < 7 * DAY) return `${Math.floor(ago / DAY)} days ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
