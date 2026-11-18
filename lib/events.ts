// The append-only event log (FR-21). Events are never shown in the UI and
// never hard-deleted.
import "server-only";
import { db } from "@/db";
import { events } from "@/db/schema";

export type NewEvent = typeof events.$inferInsert;

/** An insert query, for use alone or inside db.batch([...]). */
export function insertEvent(event: NewEvent) {
  return db.insert(events).values(event);
}

export async function recordEvent(event: NewEvent): Promise<void> {
  await insertEvent(event);
}
