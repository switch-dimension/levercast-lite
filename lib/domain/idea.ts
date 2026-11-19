// Idea rules (FR-7, AC-9). Shared by the idea box and the server.

export const IDEA_MAX = 5000;
/** Autosave keeps longer text so nothing is lost; only Generate is blocked. */
export const IDEA_SAVE_MAX = 20_000;

export type IdeaCheck = { canGenerate: boolean; message: string | null };

export function checkIdea(text: string): IdeaCheck {
  if (!text.trim()) return { canGenerate: false, message: null };
  if (text.length > IDEA_MAX) {
    const over = (text.length - IDEA_MAX).toLocaleString("en-US");
    return {
      canGenerate: false,
      message: `That's ${over} characters over the ${IDEA_MAX.toLocaleString("en-US")} limit. Trim it a little to generate.`,
    };
  }
  return { canGenerate: true, message: null };
}
