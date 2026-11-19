// The invite list (FR-2). Checked in three places, all on the server: the
// Neon Auth user.before_create webhook, the email sign-in action (before a
// code is sent), and requireUser() on every request.
import { sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { allowedEmails } from "../../db/schema.ts";

/** Emails are compared trimmed and lowercase (AC-3). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Compare on lower(email) so a row stored with capitals still matches.
const matches = (email: string) => sql`lower(${allowedEmails.email}) = ${normalizeEmail(email)}`;

export async function isEmailAllowed(email: string): Promise<boolean> {
  if (!normalizeEmail(email)) return false;
  const rows = await db
    .select({ email: allowedEmails.email })
    .from(allowedEmails)
    .where(matches(email))
    .limit(1);
  return rows.length > 0;
}

/** Adds (or updates the note on) an invited email, stored normalised. */
export async function allowEmail(email: string, note?: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) throw new Error(`Not an email address: ${email}`);
  await db
    .insert(allowedEmails)
    .values({ email: normalized, note })
    .onConflictDoUpdate({
      target: allowedEmails.email,
      set: note === undefined ? { email: normalized } : { note },
    });
}

/** Removes an email. Returns false if it wasn't on the list. */
export async function removeEmail(email: string): Promise<boolean> {
  const removed = await db.delete(allowedEmails).where(matches(email)).returning();
  return removed.length > 0;
}

export async function listAllowedEmails() {
  return db.select().from(allowedEmails).orderBy(allowedEmails.createdAt);
}
