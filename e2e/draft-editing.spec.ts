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

const panel = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

/** Typing before hydration can land after the old text (React moves the caret), so retry until it sticks. */
async function fillHydrated(box: Locator, value: string) {
  await expect(async () => {
    await box.fill(value);
    await expect(box).toHaveValue(value, { timeout: 500 });
  }).toPass();
}

/** A post with generated drafts on all three platforms. */
async function seedPost() {
  const [post] = await sql`insert into posts (user_id, idea) values (${userId}, 'Clients buy outcomes') returning id`;
  const rows: [string, string[]][] = [
    ["linkedin", ["Generated LinkedIn draft."]],
    ["x", ["1/ First tweet.", "2/ Second tweet."]],
    ["bluesky", ["Generated Bluesky draft."]],
  ];
  for (const [platform, content] of rows) {
    await sql`insert into drafts (post_id, platform, content, generated_content, model)
              values (${post.id}, ${platform}, ${content}, ${content}, 'mock')`;
  }
  return post.id as string;
}

const draftContent = async (postId: string, platform: string) =>
  (await sql`select content from drafts where post_id = ${postId} and platform = ${platform}`)[0].content;

test("edits to a draft and to one tweet save on their own and survive a reload (AC-21, AC-11)", async ({ page }) => {
  const postId = await seedPost();
  await page.goto(`/posts/${postId}`);

  const linkedin = panel(page, "LinkedIn");
  const linkedinText = linkedin.getByRole("textbox", { name: "LinkedIn draft" });
  await expect(linkedinText).toHaveValue("Generated LinkedIn draft.");
  await fillHydrated(linkedinText, "My own LinkedIn words.");
  await expect(linkedin.getByRole("status")).toHaveText("Saved", { timeout: 5000 });

  const tweet2 = panel(page, "X").getByRole("textbox", { name: "Tweet 2" });
  await fillHydrated(tweet2, "2/ Second tweet, in my words.");
  await expect(panel(page, "X").getByRole("status")).toHaveText("Saved", { timeout: 5000 });

  await page.waitForTimeout(1000);
  await page.reload();
  await expect(linkedinText).toHaveValue("My own LinkedIn words.");
  await expect(tweet2).toHaveValue("2/ Second tweet, in my words.");
  await expect(panel(page, "X").getByRole("textbox", { name: "Tweet 1" })).toHaveValue("1/ First tweet.");

  expect(await draftContent(postId, "x")).toEqual(["1/ First tweet.", "2/ Second tweet, in my words."]);
  expect(await draftContent(postId, "bluesky")).toEqual(["Generated Bluesky draft."]);
  const [draft] = await sql`select generated_content from drafts where post_id = ${postId} and platform = 'linkedin'`;
  expect(draft.generated_content).toEqual(["Generated LinkedIn draft."]);
});

test("the count follows the edit, and going over the limit is highlighted but still saves (AC-15)", async ({
  page,
}) => {
  const postId = await seedPost();
  await page.goto(`/posts/${postId}`);

  const bluesky = panel(page, "Bluesky");
  await fillHydrated(bluesky.getByRole("textbox", { name: "Bluesky draft" }), "a".repeat(301));
  await expect(bluesky.getByTestId("char-count")).toHaveText(/301 \/ 300/);
  await expect(bluesky.getByTestId("char-count")).toHaveAttribute("data-over", "true");
  await expect(bluesky.getByRole("status")).toHaveText("Saved", { timeout: 5000 });
  expect(await draftContent(postId, "bluesky")).toEqual(["a".repeat(301)]);
});

test("leaving the page right after typing still saves the edit", async ({ page }) => {
  const postId = await seedPost();
  await page.goto(`/posts/${postId}`);
  await fillHydrated(panel(page, "LinkedIn").getByRole("textbox", { name: "LinkedIn draft" }), "Typed then left.");
  await page.getByRole("link", { name: "My posts" }).first().click();
  await expect(page).toHaveURL(/\/posts$/);
  await expect.poll(() => draftContent(postId, "linkedin"), { timeout: 5000 }).toEqual(["Typed then left."]);
});
