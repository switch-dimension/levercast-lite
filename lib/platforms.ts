// Platform format targets (FR-12). Shared by prompts, counts, and the UI.
// Imports between lib files use explicit `.ts` extensions so scripts can run
// them with Node's native TypeScript support.
import type { Platform } from "../db/schema.ts";

export type { Platform };

export const PLATFORMS = ["linkedin", "x", "bluesky"] as const satisfies readonly Platform[];

export const PLATFORM_FORMATS = {
  linkedin: { label: "LinkedIn", charLimit: 3000 },
  x: { label: "X", charLimit: 280, minTweets: 2, maxTweets: 6 },
  bluesky: { label: "Bluesky", charLimit: 300 },
} as const satisfies Record<Platform, { label: string; charLimit: number; [k: string]: unknown }>;
