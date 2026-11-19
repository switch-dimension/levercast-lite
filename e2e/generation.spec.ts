import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
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
const strip = (page: Page) => page.getByRole("navigation", { name: "Post" });

async function startFromHome(page: Page, idea: string) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "What’s been on your mind this week?" }).fill(idea);
  await page.getByRole("button", { name: "Generate drafts" }).click();
  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
  return page.url().split("/").at(-1)!;
}

test("Generate on Home opens the editor and streams all three drafts (AC-12)", async ({ page }) => {
  const postId = await startFromHome(page, `Clients buy outcomes ${randomUUID().slice(0, 6)}`);

  for (const name of ["LinkedIn", "X", "Bluesky"]) {
    await expect(panel(page, name).getByText("Draft ready")).toBeVisible();
  }
  await expect(panel(page, "LinkedIn")).toContainText("This is a mock LinkedIn draft");
  await expect(panel(page, "X")).toContainText("2/ This is a mock X thread");
  await expect(strip(page)).toContainText("Draft ready");
  await expect(page.getByRole("button", { name: "Regenerate all" })).toBeEnabled();

  const events = await sql`select type, platform, model from events where post_id = ${postId} and type <> 'post_created'`;
  expect(events.filter((e) => e.type === "generation_started")).toHaveLength(3);
  expect(events.filter((e) => e.type === "generation_completed")).toHaveLength(3);
  expect(events.every((e) => e.model === "mock")).toBe(true);

  // The start-on-arrival flag is gone, so a reload doesn't regenerate.
  await page.reload();
  await expect(panel(page, "X").getByText("Draft ready")).toBeVisible();
  const after = await sql`select 1 from events where post_id = ${postId} and type = 'generation_started'`;
  expect(after).toHaveLength(3);
});

test("X is split into tweets with their own counts; over-limit counts are highlighted (AC-14, AC-15)", async ({
  page,
}) => {
  await startFromHome(page, "Too long [mock:long]");
  const x = panel(page, "X");
  await expect(x.getByText("Draft ready")).toBeVisible();
  await expect(x.getByRole("listitem")).toHaveCount(2);
  const tweetCounts = x.getByTestId("char-count");
  await expect(tweetCounts.first()).toHaveAttribute("data-over", "true");
  await expect(tweetCounts.first()).toContainText("/ 280");
  await expect(tweetCounts.nth(1)).not.toHaveAttribute("data-over");

  await expect(panel(page, "LinkedIn").getByTestId("char-count")).toContainText("/ 3,000");
  await expect(panel(page, "LinkedIn").getByTestId("char-count")).toHaveAttribute("data-over", "true");
  await expect(panel(page, "Bluesky").getByTestId("char-count")).toContainText("/ 300");
  await expect(panel(page, "Bluesky").getByTestId("char-count")).toHaveAttribute("data-over", "true");
});

test("a failed platform shows Try again while the others finish (AC-16)", async ({ page }) => {
  const postId = await startFromHome(page, "Failing Bluesky [mock:fail:bluesky]");

  await expect(panel(page, "LinkedIn").getByText("Draft ready")).toBeVisible();
  await expect(panel(page, "X").getByText("Draft ready")).toBeVisible();
  const bluesky = panel(page, "Bluesky");
  await expect(bluesky.getByText("Didn't finish", { exact: true })).toBeVisible();
  await expect(bluesky.getByRole("alert")).toContainText("This draft didn't finish");
  await expect(strip(page)).toContainText("Didn't finish");

  const failed = await sql`select platform from events where post_id = ${postId} and type = 'generation_failed'`;
  expect(failed.map((e) => e.platform)).toEqual(["bluesky"]);

  // Fix the idea, wait for it to save, then retry just Bluesky.
  await page.getByRole("textbox", { name: "Your idea" }).fill("Bluesky works now");
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible({ timeout: 5000 });
  await bluesky.getByRole("button", { name: "Try again" }).click();
  await expect(bluesky.getByText("Draft ready")).toBeVisible();
  await expect(bluesky.getByRole("alert")).toHaveCount(0);

  const started = await sql`select platform from events where post_id = ${postId} and type = 'generation_started'`;
  expect(started.filter((e) => e.platform === "bluesky")).toHaveLength(2);
  expect(started.filter((e) => e.platform === "linkedin")).toHaveLength(1);
});

test("controls are disabled while drafts are writing (AC-19)", async ({ page }) => {
  await startFromHome(page, "Slow stream [mock:slow]");
  await expect(panel(page, "LinkedIn").getByText("Writing your LinkedIn draft")).toBeVisible();
  await expect(strip(page)).toContainText("Writing…");
  await expect(page.getByRole("button", { name: /Generate drafts|Regenerate all/ })).toBeDisabled();

  await expect(panel(page, "LinkedIn").getByText("Draft ready")).toBeVisible({ timeout: 15_000 });
  await expect(panel(page, "Bluesky").getByText("Draft ready")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Regenerate all" })).toBeEnabled();
});

test("over the daily cap, a plain message says when to try again (AC-20)", async ({ page }) => {
  const [post] = await sql`insert into posts (user_id, idea) values (${userId}, 'Capped idea') returning id`;
  await sql`insert into events (user_id, post_id, platform, type, created_at)
            select ${userId}, ${post.id}, 'linkedin', 'generation_started', now() - interval '1 hour'
            from generate_series(1, 50)`;

  await page.goto(`/posts/${post.id}`);
  await page.getByRole("button", { name: "Generate drafts" }).click();
  await expect(page.getByRole("status").filter({ hasText: "You've used today's 50 drafts" })).toContainText(
    /You can generate again at \d{1,2}:\d{2}/,
  );
  for (const name of ["LinkedIn", "X", "Bluesky"]) {
    await expect(panel(page, name).getByText("Not generated", { exact: true })).toBeVisible();
  }
  const started = await sql`select 1 from events where post_id = ${post.id} and type = 'generation_started'`;
  expect(started).toHaveLength(50);
});
