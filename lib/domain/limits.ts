// Character counting per platform (FR-13), close to how each one counts:
// - LinkedIn: characters (code points).
// - Bluesky: graphemes, so a combined emoji is one.
// - X: weighted like twitter-text: links count as 23, emoji and characters
//   outside the common Latin/punctuation ranges count as 2.
import { PLATFORM_FORMATS, type Platform } from "../platforms.ts";

const graphemes = (text: string) => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)];

const URL = /https?:\/\/\S+/g;
const X_LINK_WEIGHT = 23;
// twitter-text's weight-1 ranges (everything else weighs 2).
const LIGHT_RANGES: [number, number][] = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];
const isLight = (codePoint: number) => LIGHT_RANGES.some(([lo, hi]) => codePoint >= lo && codePoint <= hi);
const EMOJI = /\p{Extended_Pictographic}/u;

function xWeight(text: string): number {
  const links = text.match(URL)?.length ?? 0;
  const rest = text.replace(URL, "");
  let weight = links * X_LINK_WEIGHT;
  for (const { segment } of graphemes(rest)) {
    weight += EMOJI.test(segment) ? 2 : isLight(segment.codePointAt(0)!) ? 1 : 2;
  }
  return weight;
}

export function charCount(platform: Platform, text: string): number {
  if (platform === "x") return xWeight(text);
  if (platform === "bluesky") return graphemes(text).length;
  return [...text].length;
}

/** The limit for one LinkedIn or Bluesky post, or for one tweet. */
export function charLimit(platform: Platform): number {
  return PLATFORM_FORMATS[platform].charLimit;
}

export function isOverLimit(platform: Platform, text: string): boolean {
  return charCount(platform, text) > charLimit(platform);
}
