// The whole MVP loop in one go, starting signed out: sign in, write an idea
// on Home, generate (mock model), edit, regenerate with the confirmation,
// copy, and delete.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.TEST_DATABASE_URL!);
const IDEA = "Clients buy outcomes, not hours. Happy path.";
let userId: string;

test.use({ storageState: { cookies: [], origins: [] }, permissions: ["clipboard-read", "clipboard-write"] });

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
  await clearPosts();
});
test.afterAll(clearPosts);

const panel = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

async function fillHydrated(box: Locator, value: string) {
  await expect(async () => {
    await box.fill(value);
    await expect(box).toHaveValue(value, { timeout: 500 });
  }).toPass();
}

test("sign in, write, generate, edit, regenerate, copy and delete (AC-1, AC-10, AC-12, AC-18, AC-22)", async ({
  page,
  baseURL,
}) => {
  // Signed out: the app sends you to sign-in.
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);

  // The form's email code and Google can't be driven here, so sign in through
  // the app's auth handler on this browser's session (the test branch allows
  // a password for the seeded test user). Then you land on Home.
  const signIn = await page.request.post("/api/auth/sign-in/email", {
    data: { email: process.env.E2E_TEST_EMAIL, password: process.env.E2E_TEST_PASSWORD },
    headers: { origin: baseURL! },
  });
  expect(signIn.ok()).toBe(true);
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);

  // Write on Home and generate: the editor opens and all three drafts arrive.
  await fillHydrated(page.getByRole("textbox", { name: "What’s been on your mind this week?" }), IDEA);
  await page.getByRole("button", { name: "Generate drafts" }).click();
  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
  const postId = page.url().split("/").pop()!;
  await expect(page.getByRole("textbox", { name: "Your idea" })).toHaveValue(IDEA);
  for (const name of ["LinkedIn", "X", "Bluesky"]) {
    await expect(panel(page, name).getByText("Draft ready", { exact: true })).toBeVisible({ timeout: 20_000 });
  }

  // Edit the LinkedIn draft; it saves.
  const linkedin = panel(page, "LinkedIn");
  const linkedinText = linkedin.getByRole("textbox", { name: "LinkedIn draft" });
  await expect(linkedinText).toHaveValue(/mock LinkedIn draft/);
  await fillHydrated(linkedinText, "My own LinkedIn post.");
  await expect(linkedin.getByRole("status")).toHaveText("Saved", { timeout: 5000 });
  await expect(linkedin.getByText("· Edited")).toBeVisible();

  // Regenerate asks first; keeping changes nothing, replacing writes a new draft.
  await linkedin.getByRole("button", { name: "Regenerate" }).click();
  await linkedin.getByRole("button", { name: "Keep my edit" }).click();
  await expect(linkedinText).toHaveValue("My own LinkedIn post.");
  await linkedin.getByRole("button", { name: "Regenerate" }).click();
  await linkedin.getByRole("button", { name: "Replace it" }).click();
  await expect(linkedinText).toHaveValue(/mock LinkedIn draft/, { timeout: 20_000 });
  await expect(linkedin.getByText("· Edited")).toHaveCount(0);

  // Copy the X thread: every tweet, separated by blank lines.
  const x = panel(page, "X");
  await x.getByRole("button", { name: "Copy thread" }).click();
  await expect(x.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "1/ Clients don't buy hours. They buy the problem going away.\n\n2/ This is a mock X thread with two tweets.",
  );
  await expect
    .poll(async () => (await sql`select 1 from events where post_id = ${postId} and type = 'draft_copied'`).length)
    .toBe(1);

  // Delete it: gone from My posts, 404 at its URL, events kept.
  await page.getByRole("button", { name: "Delete post" }).click();
  await page.getByRole("dialog", { name: "Delete this post?" }).getByRole("button", { name: "Delete post" }).click();
  await expect(page).toHaveURL(/\/posts$/);
  await expect(page.getByRole("listitem").filter({ hasText: IDEA })).toHaveCount(0);
  expect((await page.goto(`/posts/${postId}`))?.status()).toBe(404);

  const types = (await sql`select type from events where post_id = ${postId} order by created_at`).map((e) => e.type);
  expect(types.filter((t) => t === "post_created")).toHaveLength(1);
  expect(types.filter((t) => t === "generation_started")).toHaveLength(4);
  expect(types.filter((t) => t === "generation_completed")).toHaveLength(4);
  expect(types.filter((t) => t === "draft_copied")).toHaveLength(1);
});
