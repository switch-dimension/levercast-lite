"use server";

import { auth } from "@/lib/auth/server";
import { isEmailAllowed, normalizeEmail } from "@/lib/auth/allowlist";

// @neon/auth 0.8.2 mounts email-otp/send-verification-otp on the server
// instance (createApiProxy over API_ENDPOINTS) but types the plugin as
// `unknown`, so give the one method we use its shape.
type EmailOtpServer = {
  sendVerificationOtp(args: { email: string; type: "sign-in" }): Promise<{ error: unknown }>;
};
const emailOtp = (auth as unknown as { emailOtp: EmailOtpServer }).emailOtp;

export type SendCodeState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "not-invited"; email: string }
  | { status: "error"; message: string; email: string };

/**
 * Step 1 of email sign-in: send a one-time code. The allowlist is checked
 * first, so uninvited people see the notice at once and get no email.
 */
export async function sendSignInCode(_prev: SendCodeState, formData: FormData): Promise<SendCodeState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { status: "error", message: "Enter your email address.", email };

  if (!(await isEmailAllowed(email))) return { status: "not-invited", email };

  const { error } = await emailOtp.sendVerificationOtp({ email, type: "sign-in" });
  if (error) {
    return {
      status: "error",
      message: "We couldn't send a code to that address. Check it and try again.",
      email,
    };
  }
  return { status: "sent", email };
}
