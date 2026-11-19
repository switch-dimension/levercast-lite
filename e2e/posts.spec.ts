import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.TEST_DATABASE_URL!);

async function e2eUserId() {
  const [user] = await sql`select id from neon_auth."user" where email = ${process.env.E2E_TEST_EMAIL!}`;
  return user.id as string;
}

async function cleanUp(marker: string) {
  const userId = await e2eUserId();
  const ids = (await sql`select id from posts where user_id = ${userId} and idea like ${`%${marker}%`}`).map(
    (r) => r.id,
  );
  if (!ids.length) return;
  await sql`delete from events where post_id = any(${ids})`;
  await sql`delete from drafts where post_id = any(${ids})`;
  await sql`delete from posts where id = any(${ids})`;
}

test("typing on Home autosaves one post with one post_created event (AC-8a)", async ({ page }) => {
  const marker = `autosave-${randomUUID().slice(0, 8)}`;
  try {
    await page.goto("/");
    const box = page.getByRole("textbox", { name: "What’s been on your mind this week?" });
    await expect(box).toBeFocused();

    await box.pressSequentially(`First thought ${marker}`, { delay: 20 });
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible({ timeout: 5000 });
    // Keep typing quickly, across the save.
    await box.pressSequentially(" and a little more", { delay: 30 });
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible({ timeout: 5000 });

    const userId = await e2eUserId();
    const rows = await sql`select id, idea from posts where user_id = ${userId} and idea like ${`%${marker}%`}`;
    expect(rows).toHaveLength(1);
    expect(rows[0].idea).toBe(`First thought ${marker} and a little more`);
    const events = await sql`select type from events where post_id = ${rows[0].id}`;
    expect(events.map((e) => e.type)).toEqual(["post_created"]);
  } finally {
    await cleanUp(marker);
  }
});

test("Generate is disabled for an empty or over-long idea (AC-9)", async ({ page }) => {
  await page.goto("/");
  const box = page.getByRole("textbox", { name: "What’s been on your mind this week?" });
  const generate = page.getByRole("button", { name: "Generate drafts" });

  await expect(generate).toBeDisabled();
  await box.fill("   \n  ");
  await expect(generate).toBeDisabled();

  const marker = `long-${randomUUID().slice(0, 8)}`;
  try {
    await box.fill(`${marker} ${"x".repeat(5000)}`);
    await expect(generate).toBeDisabled();
    await expect(page.getByText(/characters over the 5,000 limit/)).toBeVisible();

    await box.fill(`${marker} short enough`);
    await expect(generate).toBeEnabled();
    await expect(page.getByText(/over the 5,000 limit/)).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible({ timeout: 5000 });
  } finally {
    await cleanUp(marker);
  }
});
