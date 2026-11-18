// Optimistic redirect only: signed-out page requests go to /sign-in. The real
// check is requireUser() in lib/dal.ts, which every page, Server Action and
// Route Handler calls. API routes and Server Action requests are excluded
// here: APIs return 401, and background actions (autosave) report a lost
// session instead of redirecting away from unsaved text.
import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/sign-in",
  publicRoutes: ["/sign-in"],
});

export const config = {
  matcher: [
    {
      source: "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
