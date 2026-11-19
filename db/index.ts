import "server-only";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.ts";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const db = drizzle(process.env.DATABASE_URL, { schema });
