// X threads (FR-12, AC-14): the model writes tweets numbered "1/", "2/", ...
// Tweets can contain blank lines, so split on the numbers at line starts,
// not on blank lines. Unnumbered output stays one tweet ("shown as returned").

const TWEET_START = /^[ \t]*\d{1,2}\/(?!\d)/gm;

export function parseThread(text: string): string[] {
  const starts = [...text.matchAll(TWEET_START)].map((m) => m.index);
  const pieces = starts.length ? [text.slice(0, starts[0]), ...starts.map((s, i) => text.slice(s, starts[i + 1]))] : [text];
  return pieces.map((piece) => piece.trim().replace(/\n{3,}/g, "\n\n")).filter(Boolean);
}

/** Copy thread: every tweet, separated by blank lines (FR-19). */
export function joinThread(tweets: string[]): string {
  return tweets.join("\n\n");
}
