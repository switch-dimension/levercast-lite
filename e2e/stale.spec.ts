import { expect, test, type Locator, type Page } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.TEST_DATABASE_URL!);
let userId: string;

test.describe.configure({ mode: "serial" });

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

const NOTE = "Your idea changed since this draft.";
const panel = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
const strip = (page: Page) => page.getByRole("navigation", { name: "Post" });
const note = (region: Locator) => region.getByText(NOTE);
const ideaSaved = (page: Page) => page.getByRole("status").filter({ hasText: /^Saved$/ }).first();

async function fillHydrated(box: Locator, value: string) {
  await expect(async () => {
    await box.fill(value);
    await expect(box).toHaveValue(value, { timeout: 500 });
  }).toPass();
}

async function seedPost() {
  const [post] = await sql`insert into posts (user_id, idea) values (${userId}, 'Original idea') returning id`;
  const rows: [string, string[]][] = [
    ["linkedin", ["Old LinkedIn draft."]],
    ["x", ["1/ Old first.", "2/ Old second."]],
    ["bluesky", ["Old Bluesky draft."]],
  ];
  for (const [platform, content] of rows) {
    await sql`insert into drafts (post_id, platform, content, generated_content, model)
              values (${post.id}, ${platform}, ${content}, ${content}, 'mock')`;
  }
  return post.id as string;
}

test("editing the idea marks every draft Idea changed without touching the text; Regenerate clears it (AC-23)", async ({
  page,
}) => {
  const postId = await seedPost();
  await page.goto(`/posts/${postId}`);
  for (const name of ["LinkedIn", "X", "Bluesky"]) await expect(note(panel(page, name))).toHaveCount(0);

  await fillHydrated(page.getByRole("textbox", { name: "Your idea" }), "A sharper idea");
  await expect(ideaSaved(page)).toBeVisible({ timeout: 5000 });

  for (const name of ["LinkedIn", "X", "Bluesky"]) {
    await expect(note(panel(page, name))).toBeVisible();
    await expect(panel(page, name).getByText("Idea changed", { exact: true })).toBeVisible();
  }
  await expect(strip(page)).toContainText("Idea changed");
  await expect(panel(page, "LinkedIn").getByRole("textbox")).toHaveValue("Old LinkedIn draft.");
  await expect(panel(page, "X").getByRole("textbox", { name: "Tweet 1" })).toHaveValue("1/ Old first.");

  const linkedin = panel(page, "LinkedIn");
  await linkedin.getByText(NOTE).locator("..").getByRole("button", { name: "Regenerate" }).click();
  await expect(linkedin.getByRole("textbox")).toHaveValue(/mock LinkedIn draft/);
  await expect(note(linkedin)).toHaveCount(0);
  await expect(linkedin.getByText("Draft ready", { exact: true })).toBeVisible();
  await expect(note(panel(page, "Bluesky"))).toBeVisible();

  await page.reload();
  await expect(note(panel(page, "X"))).toBeVisible();
  await expect(note(panel(page, "LinkedIn"))).toHaveCount(0);
});

test("drafts started before an idea edit finish against the old idea, then show the note", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "What’s been on your mind this week?" }).fill("Slow drafts [mock:slow]");
  await page.getByRole("button", { name: "Generate drafts" }).click();
  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
  await expect(panel(page, "LinkedIn").getByText("Writing your LinkedIn draft")).toBeVisible();

  await page.getByRole("textbox", { name: "Your idea" }).fill("Slow drafts [mock:slow], edited mid-stream");
  await expect(ideaSaved(page)).toBeVisible({ timeout: 5000 });

  for (const name of ["LinkedIn", "X", "Bluesky"]) {
    await expect(note(panel(page, name))).toBeVisible({ timeout: 20_000 });
  }
  await expect(panel(page, "LinkedIn").getByRole("textbox")).toHaveValue(/mock LinkedIn draft/);
});
