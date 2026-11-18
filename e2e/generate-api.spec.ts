import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.TEST_DATABASE_URL!);
let userId: string;
const created: string[] = [];

async function seedPost(idea: string, owner = userId) {
  const [row] = await sql`insert into posts (user_id, idea) values (${owner}, ${idea}) returning id`;
  created.push(row.id);
  return row.id as string;
}

test.beforeAll(async () => {
  const [user] = await sql`select id from neon_auth."user" where email = ${process.env.E2E_TEST_EMAIL!}`;
  userId = user.id;
});

test.afterAll(async () => {
  if (!created.length) return;
  await sql`delete from events where post_id = any(${created})`;
  await sql`delete from drafts where post_id = any(${created})`;
  await sql`delete from posts where id = any(${created})`;
});

test("streams a draft with the mock model and saves it (AC-12, AC-24)", async ({ request }) => {
  const id = await seedPost("Clients buy outcomes, not hours.");
  const res = await request.post(`/api/posts/${id}/generate/x`);
  expect(res.status()).toBe(200);
  expect(await res.text()).toMatch(/^1\/ /);

  const [draft] = await sql`select content, model from drafts where post_id = ${id} and platform = 'x'`;
  expect(draft.model).toBe("mock");
  const types = (await sql`select type from events where post_id = ${id} order by created_at`).map((e) => e.type);
  expect(types).toEqual(["generation_started", "generation_completed"]);
});

test("other users' posts, unknown platforms and empty ideas are refused", async ({ request }) => {
  const others = await seedPost("Not yours", `other-user-${randomUUID()}`);
  expect((await request.post(`/api/posts/${others}/generate/linkedin`)).status()).toBe(404);
  expect((await request.post(`/api/posts/${randomUUID()}/generate/linkedin`)).status()).toBe(404);

  const mine = await seedPost("Mine");
  expect((await request.post(`/api/posts/${mine}/generate/instagram`)).status()).toBe(404);

  const empty = await seedPost("   ");
  expect((await request.post(`/api/posts/${empty}/generate/linkedin`)).status()).toBe(400);

  const log = await sql`select 1 from events where post_id = any(${[others, mine, empty]})`;
  expect(log).toHaveLength(0);
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the generate API returns 401, not a redirect (AC-4)", async ({ request }) => {
    const id = await seedPost("Anything");
    const res = await request.post(`/api/posts/${id}/generate/linkedin`, { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
});
