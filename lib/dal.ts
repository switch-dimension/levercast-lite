// Data Access Layer: the one place that decides who the current user is.
// Every page, Server Action and Route Handler goes through here. Session
// reads hit cookies, so callers in pages must sit inside <Suspense>.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export type CurrentUser = { id: string; email: string; name: string };

/** The signed-in user, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Read the request first so prerendering stops here, instead of inside
  // @neon/auth, which logs the prerender's cookies() rejection as an error.
  await cookies();
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name };
});

/** For pages and Server Actions: the user, or a redirect to sign-in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** For Route Handlers: return this when getCurrentUser() is null. */
export function unauthorized(): Response {
  return Response.json({ error: "Sign in to continue." }, { status: 401 });
}
