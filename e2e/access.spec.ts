import { expect, test } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

const INVITE_ONLY = /Levercast is invite-only while we test it/;

test("an allowlisted user lands on Home (AC-1)", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "What’s been on your mind this week?" })).toBeVisible();
  await expect(page.getByText(process.env.E2E_TEST_EMAIL!).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("removing an email from the allowlist revokes access at once (FR-2)", async ({ page }) => {
  const sql = neon(process.env.TEST_DATABASE_URL!);
  const email = process.env.E2E_TEST_EMAIL!;
  await sql`delete from allowed_emails where email = ${email}`;
  try {
    await page.goto("/");
    await expect(page).toHaveURL("/sign-in?notice=invite-only");
    await expect(page.getByRole("status")).toHaveText(INVITE_ONLY);
  } finally {
    await sql`insert into allowed_emails (email, note) values (${email}, 'E2E test user')
              on conflict (email) do nothing`;
  }
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("app pages redirect to sign-in (AC-4)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/sign-in");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("a non-allowlisted email sees the invite-only notice, gets no code, and no user is created (AC-2)", async ({
    page,
  }) => {
    const blocked = process.env.E2E_BLOCKED_EMAIL!;
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(blocked.toUpperCase());
    await page.getByRole("button", { name: "Email me a code" }).click();

    await expect(page.getByRole("status")).toHaveText(INVITE_ONLY);
    await expect(page.getByLabel("Code")).toHaveCount(0);

    const sql = neon(process.env.TEST_DATABASE_URL!);
    const rows = await sql`select 1 from neon_auth."user" where lower(email) = lower(${blocked})`;
    expect(rows).toHaveLength(0);
  });
});
