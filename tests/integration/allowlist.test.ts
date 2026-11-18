import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { allowedEmails } from "@/db/schema";
import { allowEmail, isEmailAllowed, removeEmail } from "@/lib/auth/allowlist";
import { handleNeonAuthWebhook } from "@/lib/auth/neon-webhook";

const id = randomUUID().slice(0, 8);
const created: string[] = [];

afterAll(async () => {
  if (created.length) await db.delete(allowedEmails).where(inArray(allowedEmails.email, created));
});

describe("allowlist (AC-2, AC-3)", () => {
  it("matches an email stored as Jo@Example.com when signing in as jo@example.com", async () => {
    // Stored with mixed case, as AC-3 describes, bypassing normalisation.
    const stored = `Jo-${id}@Example.com`;
    created.push(stored);
    await db.insert(allowedEmails).values({ email: stored });

    expect(await isEmailAllowed(`jo-${id}@example.com`)).toBe(true);
    expect(await isEmailAllowed(`  JO-${id}@EXAMPLE.COM `)).toBe(true);
    expect(await isEmailAllowed(`someone-else-${id}@example.com`)).toBe(false);
  });

  it("stores added emails normalised, and removing one revokes access", async () => {
    const email = `Tester-${id}@Example.com`;
    created.push(email.toLowerCase());

    await allowEmail(`  ${email} `, "a tester");
    const [row] = await db
      .select()
      .from(allowedEmails)
      .where(inArray(allowedEmails.email, [email.toLowerCase()]));
    expect(row).toMatchObject({ email: email.toLowerCase(), note: "a tester" });

    await allowEmail(email, "updated note"); // idempotent
    expect(await isEmailAllowed(email)).toBe(true);

    expect(await removeEmail(email)).toBe(true);
    expect(await isEmailAllowed(email)).toBe(false);
  });
});

describe("Neon Auth webhook handler", () => {
  const allowed = `webhook-${id}@example.com`;

  const request = (event: object) =>
    new Request("https://app.test/api/webhooks/neon-auth", {
      method: "POST",
      body: JSON.stringify(event),
      headers: { "content-type": "application/json" },
    });
  const beforeCreate = (email: string) => ({
    event_id: randomUUID(),
    event_type: "user.before_create",
    user: { email },
    event_data: { auth_provider: "google" },
  });
  const verified = { verify: async () => true };

  it("allows sign-up for an allowlisted email, in any case", async () => {
    created.push(allowed);
    await allowEmail(allowed);

    const res = await handleNeonAuthWebhook(request(beforeCreate(allowed.toUpperCase())), verified);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ allowed: true });
  });

  it("rejects sign-up for an email that isn't on the list", async () => {
    const res = await handleNeonAuthWebhook(request(beforeCreate(`stranger-${id}@example.com`)), verified);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ allowed: false, error_code: "NOT_INVITED" });
  });

  it("rejects a request with a bad signature without touching the allowlist", async () => {
    let checked = false;
    const res = await handleNeonAuthWebhook(request(beforeCreate(allowed)), {
      verify: async () => false,
      isAllowed: async () => {
        checked = true;
        return true;
      },
    });
    expect(res.status).toBe(401);
    expect(checked).toBe(false);
  });

  it("fails closed when the event has no email", async () => {
    const res = await handleNeonAuthWebhook(
      request({ event_id: randomUUID(), event_type: "user.before_create", user: {} }),
      verified,
    );
    expect(await res.json()).toMatchObject({ allowed: false });
  });

  it("acknowledges other events without a decision", async () => {
    const res = await handleNeonAuthWebhook(
      request({ event_id: randomUUID(), event_type: "user.created", user: { email: allowed } }),
      verified,
    );
    expect(res.status).toBe(200);
  });
});
