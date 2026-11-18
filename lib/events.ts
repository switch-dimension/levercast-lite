// The append-only event log (FR-21). Events are never shown in the UI and
// never hard-deleted.
import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";

/** When the user started generations since `since` (for the rate limit). */
export async function generationStartsSince(userId: string, since: Date): Promise<Date[]> {
  const rows = await db
    .select({ at: events.createdAt })
    .from(events)
    .where(and(eq(events.userId, userId), eq(events.type, "generation_started"), gt(events.createdAt, since)));
  return rows.map((r) => r.at);
}

export type NewEvent = typeof events.$inferInsert;

/** An insert query, for use alone or inside db.batch([...]). */
export function insertEvent(event: NewEvent) {
  return db.insert(events).values(event);
}

export async function recordEvent(event: NewEvent): Promise<void> {
  await insertEvent(event);
}
