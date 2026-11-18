import { expect, test } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.TEST_DATABASE_URL!);
let userId: string;

async function clearPosts() {
  const ids = (await sql`select id from posts where user_id = ${userId}`).map((r) => r.id);
  if (!ids.length) return;
  await sql`delete from events where post_id = any(${ids})`;
  await sql`delete from drafts where post_id = any(${ids})`;
  await sql`delete from posts where id = any(${ids})`;
}

/** Inserts posts whose updated_at goes back one minute per item, newest first. */
async function seed(ideas: string[]) {
  const rows = await sql`
    insert into posts (user_id, idea, updated_at)
    select ${userId}, idea, now() - (ord * interval '1 minute')
    from unnest(${ideas}::text[]) with ordinality as t(idea, ord)
    returning id, idea`;
  return Object.fromEntries(rows.map((r) => [r.idea as string, r.id as string]));
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const [user] = await sql`select id from neon_auth."user" where email = ${process.env.E2E_TEST_EMAIL!}`;
  userId = user.id;
});
test.beforeEach(clearPosts);
test.afterAll(clearPosts);

test("with no posts, Home shows only the writing box and My posts links back (AC-8)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "What’s been on your mind this week?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent" })).toHaveCount(0);

  await page.getByRole("link", { name: "My posts" }).click();
  await expect(page).toHaveURL("/posts");
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
  await page.getByRole("link", { name: "Start with a rough idea." }).click();
  await expect(page).toHaveURL("/");
});

test("lists posts newest-updated first with preview, time and status (AC-7, AC-8)", async ({ page }) => {
  const ids = await seed(["Newest idea", "Has a draft", "Was copied", "Fourth", "Fifth and oldest"]);
  await sql`insert into drafts (post_id, platform, content, generated_content, model)
            values (${ids["Has a draft"]}, 'linkedin', '{d}', '{d}', 'mock'),
                   (${ids["Was copied"]}, 'x', '{t}', '{t}', 'mock')`;
  await sql`insert into events (user_id, post_id, platform, type)
            values (${userId}, ${ids["Was copied"]}, 'x', 'draft_copied')`;

  await page.goto("/posts");
  const items = page.getByRole("listitem");
  await expect(items).toHaveCount(5);
  await expect(items.nth(0)).toContainText("Newest idea");
  await expect(items.nth(0)).toContainText("Not generated");
  await expect(items.nth(0)).toContainText("Updated 1 min ago");
  await expect(items.nth(1)).toContainText("Has a draft");
  await expect(items.nth(1)).toContainText("Draft");
  await expect(items.nth(2)).toContainText("Was copied");
  await expect(items.nth(2)).toContainText("Copied");
  await expect(items.nth(4)).toContainText("Fifth and oldest");

  await page.goto("/");
  const recent = page.getByRole("region", { name: "Recent" }).getByRole("listitem");
  await expect(recent).toHaveCount(4);
  await expect(recent.first()).toContainText("Newest idea");
  await page.getByRole("link", { name: "All posts →" }).click();
  await expect(page).toHaveURL("/posts");
});

test("My posts loads in under a second with 100 posts (NFR)", async ({ page }) => {
  await seed(Array.from({ length: 100 }, (_, i) => `Seeded idea number ${i + 1} ${"lorem ipsum ".repeat(15)}`));
  await page.goto("/posts"); // warm up dev compilation
  await expect(page.getByRole("listitem")).toHaveCount(100);

  const start = Date.now();
  const response = await page.goto("/posts");
  await expect(page.getByRole("listitem")).toHaveCount(100);
  const elapsed = Date.now() - start;
  expect(response?.ok()).toBe(true);
  expect(elapsed).toBeLessThan(1000);
});
