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
const confirmIn = (region: Locator) => region.getByRole("group", { name: "Regenerating replaces your edits to this draft." });

async function fillHydrated(box: Locator, value: string) {
  await expect(async () => {
    await box.fill(value);
    await expect(box).toHaveValue(value, { timeout: 500 });
  }).toPass();
}

/** Drafts whose text differs from the mock model's, so a regeneration is visible. */
async function seedPost(idea = "Regenerate me") {
  const [post] = await sql`insert into posts (user_id, idea) values (${userId}, ${idea}) returning id`;
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

const starts = async (postId: string) =>
  (await sql`select platform from events where post_id = ${postId} and type = 'generation_started'`).map(
    (e) => e.platform,
  );

test("Regenerate on an unedited draft replaces only that platform (AC-17)", async ({ page }) => {
  const postId = await seedPost();
  await page.goto(`/posts/${postId}`);
  const linkedin = panel(page, "LinkedIn");
  await expect(linkedin.getByRole("textbox")).toHaveValue("Old LinkedIn draft.");

  await linkedin.getByRole("button", { name: "Regenerate" }).click();
  await expect(linkedin.getByRole("textbox")).toHaveValue(/mock LinkedIn draft/);
  await expect(confirmIn(linkedin)).toHaveCount(0);
  await expect(panel(page, "X").getByRole("textbox", { name: "Tweet 1" })).toHaveValue("1/ Old first.");
  await expect(panel(page, "Bluesky").getByRole("textbox")).toHaveValue("Old Bluesky draft.");
  expect(await starts(postId)).toEqual(["linkedin"]);
});

test("Regenerate on an edited draft asks first: keep changes nothing, replace regenerates (AC-18)", async ({
  page,
}) => {
  const postId = await seedPost();
  await page.goto(`/posts/${postId}`);
  const bluesky = panel(page, "Bluesky");
  await fillHydrated(bluesky.getByRole("textbox"), "My Bluesky words.");
  await expect(bluesky.getByText("· Edited")).toBeVisible();

  await bluesky.getByRole("button", { name: "Regenerate" }).click();
  const confirm = confirmIn(bluesky);
  await expect(confirm).toBeVisible();
  await expect(confirm.getByRole("button", { name: "Keep my edit" })).toBeFocused();

  await confirm.getByRole("button", { name: "Keep my edit" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(bluesky.getByRole("textbox")).toHaveValue("My Bluesky words.");
  await page.waitForTimeout(500);
  expect(await starts(postId)).toEqual([]);

  await bluesky.getByRole("button", { name: "Regenerate" }).click();
  await confirmIn(bluesky).getByRole("button", { name: "Replace it" }).click();
  await expect(bluesky.getByRole("textbox")).toHaveValue(/Mock Bluesky draft/);
  await expect(bluesky.getByText("· Edited")).toHaveCount(0);
  expect(await starts(postId)).toEqual(["bluesky"]);
});

test("Regenerate all regenerates unedited drafts at once and asks in the edited panel (AC-12a)", async ({ page }) => {
  const postId = await seedPost();
  await page.goto(`/posts/${postId}`);
  const x = panel(page, "X");
  await fillHydrated(x.getByRole("textbox", { name: "Tweet 2" }), "2/ My second tweet.");

  await page.getByRole("button", { name: "Regenerate all" }).click();
  await expect(panel(page, "LinkedIn").getByRole("textbox")).toHaveValue(/mock LinkedIn draft/);
  await expect(panel(page, "Bluesky").getByRole("textbox")).toHaveValue(/Mock Bluesky draft/);
  await expect(confirmIn(x)).toBeVisible();
  await expect(x.getByRole("textbox", { name: "Tweet 2" })).toHaveValue("2/ My second tweet.");

  await confirmIn(x).getByRole("button", { name: "Keep my edit" }).click();
  await expect(confirmIn(x)).toHaveCount(0);
  await page.waitForTimeout(500);
  expect((await starts(postId)).sort()).toEqual(["bluesky", "linkedin"]);
  const [draft] = await sql`select content from drafts where post_id = ${postId} and platform = 'x'`;
  expect(draft.content).toEqual(["1/ Old first.", "2/ My second tweet."]);

  await page.getByRole("button", { name: "Regenerate all" }).click();
  await confirmIn(x).getByRole("button", { name: "Replace it" }).click();
  await expect(x.getByRole("textbox", { name: "Tweet 2" })).toHaveValue(/2\/ This is a mock X thread/);
  expect((await starts(postId)).filter((p) => p === "x")).toEqual(["x"]);
});

test("Try again after a failed run asks first when the draft was edited (#26, FR-15)", async ({ page }) => {
  // The mock model fails every Bluesky run for this idea.
  const postId = await seedPost("Regenerate me [mock:fail:bluesky]");
  await page.goto(`/posts/${postId}`);
  const bluesky = panel(page, "Bluesky");
  await expect(bluesky.getByRole("textbox")).toHaveValue("Old Bluesky draft.");

  // An unedited draft regenerates at once; the run fails and the old draft stays.
  await bluesky.getByRole("button", { name: "Regenerate" }).click();
  const tryAgain = bluesky.getByRole("button", { name: "Try again" });
  await expect(tryAgain).toBeVisible();
  await expect(confirmIn(bluesky)).toHaveCount(0);
  expect(await starts(postId)).toEqual(["bluesky"]);

  await fillHydrated(bluesky.getByRole("textbox"), "My Bluesky words.");
  await expect(bluesky.getByText("· Edited")).toBeVisible();

  await tryAgain.click();
  const confirm = confirmIn(bluesky);
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Keep my edit" }).click();
  await expect(confirm).toHaveCount(0);
  await expect(bluesky.getByRole("textbox")).toHaveValue("My Bluesky words.");
  await page.waitForTimeout(500);
  expect(await starts(postId)).toEqual(["bluesky"]);

  await tryAgain.click();
  await confirmIn(bluesky).getByRole("button", { name: "Replace it" }).click();
  await expect.poll(() => starts(postId)).toEqual(["bluesky", "bluesky"]);
});
