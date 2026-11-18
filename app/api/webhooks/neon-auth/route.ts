import { handleNeonAuthWebhook } from "@/lib/auth/neon-webhook";

// Called by Neon Auth, not by users: authenticated by its signature.
export async function POST(request: Request) {
  return handleNeonAuthWebhook(request);
}
