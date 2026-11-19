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

async function seedPost({ bluesky = true } = {}) {
  const [post] = await sql`insert into posts (user_id, idea) values (${userId}, 'Clients buy outcomes') returning id`;
  const rows: [string, string[]][] = [
    ["linkedin", ["Generated LinkedIn draft."]],
    ["x", ["1/ First.", "2/ Second."]],
  ];
  if (bluesky) rows.push(["bluesky", ["Generated Bluesky draft."]]);
  for (const [platform, content] of rows) {
    await sql`insert into drafts (post_id, platform, content, generated_content, model)
              values (${post.id}, ${platform}, ${content}, ${content}, 'mock')`;
  }
  return post.id as string;
}

/** The focused element shows a visible ring (outline or box-shadow). */
const focusRingVisible = (page: Page) =>
  page.evaluate(() => {
    const style = getComputedStyle(document.activeElement!);
    return (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
  });

async function typeHydrated(box: Locator, text: string) {
  await expect(async () => {
    await box.focus();
    await box.press("ControlOrMeta+a");
    await box.pressSequentially(text);
    await expect(box).toHaveValue(text, { timeout: 500 });
  }).toPass();
}

test("edit, regenerate (keeping the edit) and copy by keyboard alone, with focus always visible", async ({ page }) => {
  const postId = await seedPost();
  await page.goto(`/posts/${postId}`);
  const bluesky = panel(page, "Bluesky");
  const draft = bluesky.getByRole("textbox", { name: "Bluesky draft" });

  await typeHydrated(draft, "My words");
  await expect(bluesky.getByRole("status")).toHaveText("Saved", { timeout: 5000 });
  expect(await focusRingVisible(page)).toBe(true);

  await page.keyboard.press("Tab");
  const regenerate = bluesky.getByRole("button", { name: "Regenerate" });
  await expect(regenerate).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(bluesky.getByRole("button", { name: "Keep my edit" })).toBeFocused();
  expect(await focusRingVisible(page)).toBe(true);

  await page.keyboard.press("Enter");
  await expect(bluesky.getByRole("group")).toHaveCount(0);
  await expect(regenerate).toBeFocused(); // focus comes back, not lost to the page
  await expect(draft).toHaveValue("My words");

  await page.keyboard.press("Tab");
  const copy = bluesky.getByRole("button", { name: "Copy", exact: true });
  await expect(copy).toBeFocused();
  expect(await focusRingVisible(page)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(bluesky.getByText("Copied", { exact: true }).last()).toBeAttached();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("My words");
  await expect
    .poll(async () => (await sql`select 1 from events where post_id = ${postId} and type = 'draft_copied'`).length)
    .toBe(1);
});

test("reduced motion stops the writing pulse", async ({ page }) => {
  const postId = await seedPost({ bluesky: false });
  await page.goto(`/posts/${postId}`);
  const dot = page.locator(".dot-writing").first();
  const iterations = () => dot.evaluate((el) => getComputedStyle(el).animationIterationCount);

  await page.locator("#draft-bluesky").getByText("Not generated yet.").waitFor();
  await page.evaluate(() => {
    const el = document.createElement("span");
    el.className = "dot dot-writing";
    document.body.append(el);
  });
  expect(await iterations()).toBe("infinite");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await iterations()).toBe("1");
});

test.describe("at 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("the editor fits without sideways scrolling, and each platform's state is still announced", async ({
    page,
  }) => {
    const postId = await seedPost({ bluesky: false });
    await page.goto(`/posts/${postId}`);
    await expect(panel(page, "X").getByRole("textbox", { name: "Tweet 2" })).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    const strip = page.getByRole("navigation", { name: "Post" });
    await expect(strip.getByRole("link", { name: /^LinkedIn.*Draft ready$/ })).toBeVisible();
    await expect(strip.getByRole("link", { name: /^Bluesky.*Not generated$/ })).toBeVisible();
  });
});
