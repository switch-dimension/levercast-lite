// Optimistic redirect only: signed-out page requests go to /sign-in. The real
// check is requireUser() in lib/dal.ts, which every page, Server Action and
// Route Handler calls. API routes are excluded here so they can return 401.
import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/sign-in",
  publicRoutes: ["/sign-in"],
});

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
