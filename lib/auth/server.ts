// Neon Auth (Managed Better Auth) on the server: the /api/auth handler, the
// proxy's optimistic redirect, and session reads for the DAL.
import { createNeonAuth } from "@neon/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
