import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });

// `DRIZZLE_TARGET=test` (used by `npm run db:migrate:test`) points drizzle-kit
// at the `test` Neon branch instead of the one in DATABASE_URL.
const prefix = process.env.DRIZZLE_TARGET === "test" ? "TEST_" : "";
const url = process.env[`${prefix}DATABASE_URL_UNPOOLED`] ?? process.env[`${prefix}DATABASE_URL`];
if (!url) {
  throw new Error(`${prefix}DATABASE_URL_UNPOOLED or ${prefix}DATABASE_URL must be set`);
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
