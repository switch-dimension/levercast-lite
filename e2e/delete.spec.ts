import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.TEST_DATABASE_URL!);
let userId: string;
let postId: string;
const idea = `Delete flow ${randomUUID().slice(0, 8)}`;

test.beforeAll(async () => {
  const [user] = await sql`select id from neon_auth."user" where email = ${process.env.E2E_TEST_EMAIL!}`;
  userId = user.id;
  const [row] = await sql`insert into posts (user_id, idea) values (${userId}, ${idea}) returning id`;
  postId = row.id;
  await sql`insert into events (user_id, post_id, type) values (${userId}, ${postId}, 'post_created')`;
});

test.afterAll(async () => {
  await sql`delete from events where post_id = ${postId}`;
  await sql`delete from posts where id = ${postId}`;
});

test("deleting asks first, keeps focus in the dialog, and keeps the events (AC-10)", async ({ page }) => {
  await page.goto(`/posts/${postId}`);
  await page.getByRole("button", { name: "Delete post" }).click();

  const dialog = page.getByRole("dialog", { name: "Delete this post?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();

  // Focus can't escape the modal.
  for (const key of ["Tab", "Tab", "Tab", "Shift+Tab", "Shift+Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    expect(await dialog.evaluate((d) => d.contains(document.activeElement)), key).toBe(true);
  }

  // Cancelling changes nothing.
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Delete post" }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  const [stillThere] = await sql`select deleted_at from posts where id = ${postId}`;
  expect(stillThere.deleted_at).toBeNull();

  // Confirming deletes and returns to My posts.
  await page.getByRole("button", { name: "Delete post" }).click();
  await dialog.getByRole("button", { name: "Delete post" }).click();
  await expect(page).toHaveURL("/posts");
  await expect(page.getByRole("heading", { name: "My posts" })).toBeVisible();
  // Next keeps the previous page mounted but hidden, so check the visible list.
  await expect(page.getByRole("listitem").filter({ hasText: idea })).toHaveCount(0);

  const response = await page.goto(`/posts/${postId}`);
  expect(response?.status()).toBe(404);

  const [row] = await sql`select deleted_at from posts where id = ${postId}`;
  expect(row.deleted_at).not.toBeNull();
  const events = await sql`select type from events where post_id = ${postId}`;
  expect(events.map((e) => e.type)).toEqual(["post_created"]);
});
