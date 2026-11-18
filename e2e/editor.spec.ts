import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.TEST_DATABASE_URL!);
let userId: string;
const created: string[] = [];

async function seedPost(idea: string, owner = userId, deleted = false) {
  const [row] = await sql`insert into posts (user_id, idea, deleted_at)
                          values (${owner}, ${idea}, ${deleted ? new Date() : null}) returning id`;
  created.push(row.id);
  return row.id as string;
}

test.beforeAll(async () => {
  const [user] = await sql`select id from neon_auth."user" where email = ${process.env.E2E_TEST_EMAIL!}`;
  userId = user.id;
});

test.afterAll(async () => {
  const mine = (await sql`select id from posts where user_id = ${userId}`).map((r) => r.id);
  const ids = [...new Set([...created, ...mine])];
  if (!ids.length) return;
  await sql`delete from events where post_id = any(${ids})`;
  await sql`delete from drafts where post_id = any(${ids})`;
  await sql`delete from posts where id = any(${ids})`;
});

test("the editor shows the saved idea and keeps edits across a reload (AC-11)", async ({ page }) => {
  const id = await seedPost("Clients buy outcomes, not hours.");
  await page.goto(`/posts/${id}`);

  const idea = page.getByRole("textbox", { name: "Your idea" });
  await expect(idea).toHaveValue("Clients buy outcomes, not hours.");
  await expect(page.getByText("32 / 5,000")).toBeVisible();
  for (const name of ["LinkedIn", "X", "Bluesky"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }

  await idea.fill("Clients buy outcomes, not hours. Price the outcome.");
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible({ timeout: 5000 });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Your idea" })).toHaveValue(
    "Clients buy outcomes, not hours. Price the outcome.",
  );
});

test("someone else's, deleted, unknown and malformed post IDs are 404s (AC-6)", async ({ page }) => {
  const othersPost = await seedPost("Another user's private idea", `other-user-${randomUUID()}`);
  const deletedPost = await seedPost("Deleted idea", userId, true);

  for (const id of [othersPost, deletedPost, randomUUID(), "not-a-uuid"]) {
    const response = await page.goto(`/posts/${id}`);
    expect(response?.status(), id).toBe(404);
    await expect(page.getByRole("heading", { name: "This post isn’t here" })).toBeVisible();
    await expect(page.getByText("Another user's private idea")).toHaveCount(0);
  }
});

test("Generate on Home opens the post editor (AC-12)", async ({ page }) => {
  await page.goto("/");
  const marker = `generate-${randomUUID().slice(0, 8)}`;
  await page.getByRole("textbox", { name: "What’s been on your mind this week?" }).fill(`An idea ${marker}`);
  await page.getByRole("button", { name: "Generate drafts" }).click();
  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}/);
  await expect(page.getByRole("textbox", { name: "Your idea" })).toHaveValue(`An idea ${marker}`);
});
