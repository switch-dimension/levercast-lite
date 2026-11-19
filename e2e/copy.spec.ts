import { expect, test, type Locator, type Page } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.TEST_DATABASE_URL!);
let userId: string;

test.describe.configure({ mode: "serial" });
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
const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

async function fillHydrated(box: Locator, value: string) {
  await expect(async () => {
    await box.fill(value);
    await expect(box).toHaveValue(value, { timeout: 500 });
  }).toPass();
}

async function seedPost() {
  const [post] = await sql`insert into posts (user_id, idea) values (${userId}, 'Copy me') returning id`;
  const rows: [string, string[]][] = [
    ["linkedin", ["Generated LinkedIn draft."]],
    ["x", ["1/ First.", "2/ Second.", "3/ Third."]],
    ["bluesky", ["Generated Bluesky draft."]],
  ];
  for (const [platform, content] of rows) {
    await sql`insert into drafts (post_id, platform, content, generated_content, model)
              values (${post.id}, ${platform}, ${content}, ${content}, 'mock')`;
  }
  return post.id as string;
}

const copyEvents = (postId: string) =>
  sql`select platform, model, tweet_index, generated_text, final_text from events
      where post_id = ${postId} and type = 'draft_copied' order by created_at`;

test("Copy thread copies every tweet with blank lines; a tweet's Copy copies just it (AC-22, AC-22a)", async ({
  page,
}) => {
  const postId = await seedPost();
  await page.goto(`/posts/${postId}`);
  const x = panel(page, "X");
  await expect(x.getByRole("textbox", { name: "Tweet 3" })).toHaveValue("3/ Third.");

  await x.getByRole("button", { name: "Copy thread" }).click();
  await expect(x.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await clipboard(page)).toBe("1/ First.\n\n2/ Second.\n\n3/ Third.");
  await expect(x.getByRole("button", { name: "Copy thread" })).toBeVisible({ timeout: 3000 });

  await fillHydrated(x.getByRole("textbox", { name: "Tweet 3" }), "3/ Third, my way.");
  await x.getByRole("button", { name: "Copy tweet 3" }).click();
  await expect.poll(() => clipboard(page)).toBe("3/ Third, my way.");

  await expect.poll(async () => (await copyEvents(postId)).length).toBe(2);
  const [thread, tweet] = await copyEvents(postId);
  expect(thread).toMatchObject({ platform: "x", model: "mock", tweet_index: null, final_text: "1/ First.\n\n2/ Second.\n\n3/ Third." });
  expect(tweet).toMatchObject({ tweet_index: 3, generated_text: "3/ Third.", final_text: "3/ Third, my way." });
});

test("copying right after an edit saves it and records both texts; the post shows Copied (AC-25, AC-7)", async ({
  page,
}) => {
  const postId = await seedPost();
  await page.goto(`/posts/${postId}`);
  const linkedin = panel(page, "LinkedIn");

  await fillHydrated(linkedin.getByRole("textbox", { name: "LinkedIn draft" }), "Edited, then copied at once.");
  await linkedin.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(linkedin.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await clipboard(page)).toBe("Edited, then copied at once.");

  await expect.poll(async () => (await copyEvents(postId)).length).toBe(1);
  const [event] = await copyEvents(postId);
  expect(event).toMatchObject({
    platform: "linkedin",
    generated_text: "Generated LinkedIn draft.",
    final_text: "Edited, then copied at once.",
  });
  const [draft] = await sql`select content from drafts where post_id = ${postId} and platform = 'linkedin'`;
  expect(draft.content).toEqual(["Edited, then copied at once."]);

  await page.goto("/posts");
  await expect(page.getByRole("link", { name: /Copy me/ })).toContainText("Copied");
});

test("when the clipboard is blocked, a message shows and nothing is recorded", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.clipboard.writeText = () => Promise.reject(new DOMException("Denied", "NotAllowedError"));
  });
  const postId = await seedPost();
  await page.goto(`/posts/${postId}`);
  const bluesky = panel(page, "Bluesky");

  await bluesky.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(bluesky.getByRole("alert")).toHaveText("Couldn't copy. Select the text and copy it manually.");
  await expect(bluesky.getByRole("button", { name: "Copied" })).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(await copyEvents(postId)).toHaveLength(0);
});
