// Signs in the E2E test user once and saves the session for every test.
// Self-healing: on a fresh `test` branch it creates the user (password
// sign-up, which the test branch allows), marks the email verified, and
// adds it to the allowlist.
import { mkdirSync } from "node:fs";
import { request, type FullConfig } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  const storageState = config.projects[0].use.storageState as string;
  const email = process.env.E2E_TEST_EMAIL!;
  const password = process.env.E2E_TEST_PASSWORD!;
  const authURL = process.env.TEST_NEON_AUTH_BASE_URL!;
  const sql = neon(process.env.TEST_DATABASE_URL!);

  if (!email || !password || !authURL) {
    throw new Error("Set E2E_TEST_EMAIL, E2E_TEST_PASSWORD and TEST_NEON_AUTH_BASE_URL in .env.local");
  }
  if (!authURL.includes(new URL(process.env.TEST_DATABASE_URL!).hostname.split("-pooler")[0])) {
    throw new Error("TEST_NEON_AUTH_BASE_URL doesn't belong to the TEST_DATABASE_URL branch");
  }

  await sql`insert into allowed_emails (email, note) values (${email}, 'E2E test user')
            on conflict (email) do nothing`;

  const [existing] = await sql`select id from neon_auth."user" where email = ${email}`;
  if (!existing) {
    const res = await fetch(`${authURL}/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseURL },
      body: JSON.stringify({ email, password, name: "E2E Tester" }),
    });
    if (!res.ok) throw new Error(`E2E sign-up failed: ${res.status} ${await res.text()}`);
  }
  // Password sign-ups never verify the email, and the app requires it.
  await sql`update neon_auth."user" set "emailVerified" = true where email = ${email}`;

  // Sign in through the app's own auth handler so the cookie is set for it.
  const context = await request.newContext({ baseURL });
  const res = await context.post("/api/auth/sign-in/email", {
    data: { email, password },
    headers: { origin: baseURL },
  });
  if (!res.ok()) throw new Error(`E2E sign-in failed: ${res.status()} ${await res.text()}`);

  mkdirSync("e2e/.auth", { recursive: true });
  await context.storageState({ path: storageState });
  await context.dispose();
}
