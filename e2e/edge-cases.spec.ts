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
const SIGN_IN_AGAIN = /Please sign in again/;

async function fillHydrated(box: Locator, value: string) {
  await expect(async () => {
    await box.fill(value);
    await expect(box).toHaveValue(value, { timeout: 500 });
  }).toPass();
}

async function seedPost() {
  const [post] = await sql`insert into posts (user_id, idea) values (${userId}, 'Clients buy outcomes') returning id`;
  await sql`insert into drafts (post_id, platform, content, generated_content, model)
            values (${post.id}, 'linkedin', ${["Generated LinkedIn draft."]}, ${["Generated LinkedIn draft."]}, 'mock')`;
  return post.id as string;
}

test("when the session expires mid-edit, edits stay on screen and saving asks to sign in again", async ({ page }) => {
  const postId = await seedPost();
  await page.goto(`/posts/${postId}`);
  const linkedin = panel(page, "LinkedIn");
  const draft = linkedin.getByRole("textbox", { name: "LinkedIn draft" });
  await fillHydrated(draft, "Saved before expiry.");
  await expect(linkedin.getByRole("status")).toHaveText("Saved", { timeout: 5000 });

  await page.context().clearCookies();

  await draft.fill("Typed after the session expired.");
  await expect(linkedin.getByRole("status")).toHaveText(SIGN_IN_AGAIN, { timeout: 5000 });
  const idea = page.getByRole("textbox", { name: "Your idea" });
  await idea.fill("A new idea, also unsaved");
  await expect(page.getByRole("status").filter({ hasText: SIGN_IN_AGAIN })).toHaveCount(2, { timeout: 5000 });

  await page.waitForTimeout(500);
  await expect(page).toHaveURL(new RegExp(`/posts/${postId}$`));
  await expect(draft).toHaveValue("Typed after the session expired.");
  await expect(idea).toHaveValue("A new idea, also unsaved");
  const [row] = await sql`select content from drafts where post_id = ${postId} and platform = 'linkedin'`;
  expect(row.content).toEqual(["Saved before expiry."]);
});

test("leaving mid-stream discards the partial drafts and records generation failed; returning shows Not generated", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "What’s been on your mind this week?" }).fill("Leave early [mock:slow]");
  await page.getByRole("button", { name: "Generate drafts" }).click();
  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
  const postId = page.url().split("/").pop()!;
  const linkedin = panel(page, "LinkedIn");
  await expect(linkedin.getByText("Writing your LinkedIn draft")).toBeVisible();
  await expect(linkedin.getByText(/Clients/)).toBeVisible(); // part of the draft has arrived

  await page.getByRole("link", { name: "My posts" }).first().click();
  await expect(page).toHaveURL(/\/posts$/);
  const count = async (type: string) =>
    (await sql`select count(*)::int as n from events where post_id = ${postId} and type = ${type}`)[0].n as number;
  await expect.poll(() => count("generation_failed"), { timeout: 10_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(4000); // longer than a slow mock draft takes to finish
  expect(await count("generation_failed")).toBe(await count("generation_started"));
  expect(await count("generation_completed")).toBe(0);

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/posts/${postId}$`));
  for (const name of ["LinkedIn", "X", "Bluesky"]) {
    await expect(panel(page, name).getByText("Not generated yet.")).toBeVisible();
    await expect(panel(page, name).getByText(/Writing your/)).toHaveCount(0);
  }
  expect(await sql`select 1 from drafts where post_id = ${postId}`).toHaveLength(0);
});
