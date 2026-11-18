// Runs before every test file. Points the app's database client at the
// `test` Neon branch so tests never touch the dev or production data.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must be set (see .env.local)");
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
