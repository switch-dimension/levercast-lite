import { expect, test, type Page } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.TEST_DATABASE_URL!);
let userId: string;

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

async function clearPosts() {
  const ids = (await sql`select id from posts where user_id = ${userId}`).map((r) => r.id);
  if (!ids.length) return;
  await sql`delete from events where post_id = any(${ids})`;
  await sql`delete from drafts where post_id = any(${ids})`;
  await sql`delete from posts where id = any(${ids})`;
}

test.beforeAll(async () => {
  const [user] = await sql`select id from neon_auth."user" where email = ${process.env.E2E_TEST_EMAIL!}`;
  userId = user.id;
});
test.beforeEach(clearPosts);
test.afterAll(clearPosts);

const panel = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

test("create, generate, regenerate one platform, copy two drafts: the event log matches (AC-24)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "What’s been on your mind this week?" }).fill("Clients buy outcomes");
  await page.getByRole("button", { name: "Generate drafts" }).click();
  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
  const postId = page.url().split("/").at(-1)!;
  for (const name of ["LinkedIn", "X", "Bluesky"]) {
    await expect(panel(page, name).getByText("Draft ready", { exact: true })).toBeVisible();
  }

  await panel(page, "Bluesky").getByRole("button", { name: "Regenerate" }).click();
  await expect.poll(async () => (await sql`select 1 from events where post_id = ${postId} and type = 'generation_completed'`).length).toBe(4);
  await expect(panel(page, "Bluesky").getByText("Draft ready", { exact: true })).toBeVisible();

  await panel(page, "LinkedIn").getByRole("button", { name: "Copy", exact: true }).click();
  await panel(page, "X").getByRole("button", { name: "Copy thread" }).click();

  await expect
    .poll(async () => (await sql`select 1 from events where post_id = ${postId} and type = 'draft_copied'`).length)
    .toBe(2);
  const log = await sql`select type, user_id, platform, model, created_at from events where post_id = ${postId}`;
  const count = (type: string) => log.filter((e) => e.type === type).length;
  expect(count("post_created")).toBe(1);
  expect(count("generation_started")).toBe(4);
  expect(count("generation_completed")).toBe(4);
  expect(count("draft_copied")).toBe(2);
  expect(count("generation_failed")).toBe(0);
  for (const e of log) {
    expect(e.user_id).toBe(userId);
    expect(e.created_at).toBeTruthy();
    if (e.type !== "post_created") expect(e).toMatchObject({ model: "mock", platform: expect.any(String) });
  }
});
