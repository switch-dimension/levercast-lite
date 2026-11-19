// Neon Auth webhook: answers user.before_create with the allowlist decision
// (AC-2). Neon fails closed: a non-2xx reply, a timeout, or anything other
// than `allowed: true` means no user row is created.
import "server-only";
import { isEmailAllowed } from "./allowlist.ts";
import { INVITE_ONLY_MESSAGE } from "./messages.ts";
import { jwksFetcher, verifyNeonWebhook } from "./webhook-signature.ts";

type Deps = {
  verify?: (rawBody: string, headers: Headers) => Promise<boolean>;
  isAllowed?: (email: string) => Promise<boolean>;
};

let neonJwks: ReturnType<typeof jwksFetcher> | undefined;
const verifyWithNeonJwks = (rawBody: string, headers: Headers) => {
  neonJwks ??= jwksFetcher(`${process.env.NEON_AUTH_BASE_URL}/.well-known/jwks.json`);
  return verifyNeonWebhook(rawBody, headers, { getJwks: neonJwks });
};

type WebhookEvent = { event_type?: string; user?: { email?: string } };

export async function handleNeonAuthWebhook(request: Request, deps: Deps = {}): Promise<Response> {
  const verify = deps.verify ?? verifyWithNeonJwks;
  const isAllowed = deps.isAllowed ?? isEmailAllowed;

  const rawBody = await request.text();
  if (!(await verify(rawBody, request.headers))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event_type !== "user.before_create") return Response.json({ ok: true });

  const email = event.user?.email;
  if (email && (await isAllowed(email))) return Response.json({ allowed: true });
  return Response.json({ allowed: false, error_message: INVITE_ONLY_MESSAGE, error_code: "NOT_INVITED" });
}
