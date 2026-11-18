// Data Access Layer: the one place that decides who the current user is.
// Every page, Server Action and Route Handler goes through here. Session
// reads hit cookies, so callers in pages must sit inside <Suspense>.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";

export type CurrentUser = { id: string; email: string; name: string };

type Resolved = { user: CurrentUser; reason?: never } | { user: null; reason: "signed-out" | "not-invited" };

// Checks the session *and* the allowlist on every request, so removing an
// email revokes access at once. Deduplicated per request.
const resolveUser = cache(async (): Promise<Resolved> => {
  // Read the request first so prerendering stops here, instead of inside
  // @neon/auth, which logs the prerender's cookies() rejection as an error.
  await cookies();
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) return { user: null, reason: "signed-out" };
  // An unverified email proves nothing about who is signing in.
  if (!user.emailVerified || !(await isEmailAllowed(user.email))) {
    return { user: null, reason: "not-invited" };
  }
  return { user: { id: user.id, email: user.email, name: user.name } };
});

/** The signed-in, allowlisted user, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  return (await resolveUser()).user;
}

/** For pages and Server Actions: the user, or a redirect to sign-in. */
export async function requireUser(): Promise<CurrentUser> {
  const { user, reason } = await resolveUser();
  if (user) return user;
  redirect(reason === "not-invited" ? "/sign-in?notice=invite-only" : "/sign-in");
}

/** For Route Handlers: return this when getCurrentUser() is null. */
export function unauthorized(): Response {
  return Response.json({ error: "Sign in to continue." }, { status: 401 });
}
