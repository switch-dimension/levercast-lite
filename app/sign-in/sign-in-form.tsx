"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { INVITE_ONLY_MESSAGE } from "@/lib/auth/messages";
import { sendSignInCode, type SendCodeState } from "./actions";

const field =
  "h-12 w-full rounded-sm border border-border bg-surface px-3.5 text-ui-body text-on-surface transition-colors duration-200 focus-visible:border-accent-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-tertiary-tint aria-invalid:border-error";
const primary =
  "inline-flex h-12 w-full items-center justify-center rounded-sm bg-primary px-[22px] text-label-md text-on-primary transition-colors duration-200 hover:bg-primary-hover active:translate-y-px disabled:cursor-not-allowed disabled:bg-border disabled:text-disabled";
const secondary =
  "inline-flex h-12 w-full items-center justify-center rounded-sm border border-border bg-surface px-[21px] text-label-md text-on-surface transition-colors duration-200 hover:bg-secondary active:translate-y-px disabled:cursor-not-allowed disabled:text-disabled";
// Better Auth appends ?error=<code> when a Google sign-in fails. A sign-up the
// allowlist webhook rejected surfaces as one of these codes.
const INVITE_ERRORS = /invit|not_invited|unable_to_create_user|sign_?up/i;

const textButton =
  "min-h-11 text-label-md text-accent-strong underline-offset-4 hover:underline disabled:text-disabled";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const googleError = params.get("error");
  const redirectedNotInvited =
    params.get("notice") === "invite-only" || (googleError !== null && INVITE_ERRORS.test(googleError));
  const [sendState, sendCode, sending] = useActionState<SendCodeState, FormData>(sendSignInCode, {
    status: "idle",
  });
  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifying, startVerify] = useTransition();
  const [googlePending, setGooglePending] = useState(false);
  // "Use a different email" dismisses the current send; a new send is a new
  // state object, so it shows the code step again.
  const [dismissed, setDismissed] = useState<SendCodeState | null>(null);

  const codeSentTo = sendState.status === "sent" && sendState !== dismissed ? sendState.email : null;

  async function signInWithGoogle() {
    setGooglePending(true);
    const origin = window.location.origin;
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${origin}/`,
      errorCallbackURL: `${origin}/sign-in`,
    });
    if (error) setGooglePending(false);
  }

  function verifyCode(formData: FormData) {
    const otp = String(formData.get("code") ?? "").replace(/\s/g, "");
    setCodeError(null);
    startVerify(async () => {
      const { error } = await authClient.signIn.emailOtp({ email: codeSentTo!, otp });
      if (error) {
        setCodeError("That code didn't work. Check it and try again, or send a new one.");
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  if (codeSentTo) {
    return (
      <div className="flex flex-col gap-6">
        <p className="font-serif text-body-md text-neutral">
          We sent a 6-digit code to <span className="text-on-surface">{codeSentTo}</span>. It may take a
          minute to arrive.
        </p>
        <form action={verifyCode} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="code" className="text-label-md">
              Code
            </label>
            <input
              id="code"
              name="code"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              aria-invalid={codeError ? true : undefined}
              aria-describedby={codeError ? "code-error" : undefined}
              className={`${field} tracking-[0.2em]`}
            />
            {codeError && (
              <p id="code-error" role="alert" className="text-caption text-error">
                {codeError}
              </p>
            )}
          </div>
          <button type="submit" disabled={verifying} className={primary}>
            {verifying ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="flex flex-wrap gap-x-6">
          <form action={sendCode}>
            <input type="hidden" name="email" value={codeSentTo} />
            <button type="submit" disabled={sending} className={textButton}>
              {sending ? "Sending…" : "Send a new code"}
            </button>
          </form>
          <button type="button" onClick={() => setDismissed(sendState)} className={textButton}>
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  const sendError = sendState.status === "error" ? sendState : null;
  const notInvited = sendState.status === "not-invited" || (sendState.status === "idle" && redirectedNotInvited);

  return (
    <div className="flex flex-col gap-6">
      {notInvited && (
        <p role="status" className="rounded-lg border border-border bg-surface p-5 font-serif text-body-md">
          {INVITE_ONLY_MESSAGE}
        </p>
      )}
      <button type="button" onClick={signInWithGoogle} disabled={googlePending} className={secondary}>
        {googlePending ? "Opening Google…" : "Continue with Google"}
      </button>
      {googleError && !redirectedNotInvited && (
        <p role="alert" className="-mt-3 text-caption text-error">
          Google sign-in didn&rsquo;t finish. Try again, or use your email instead.
        </p>
      )}

      <div className="flex items-center gap-3 text-caption text-neutral" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={sendCode} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-label-md">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={sendState.status === "idle" ? undefined : sendState.email}
            aria-invalid={sendError ? true : undefined}
            aria-describedby={sendError ? "email-error" : undefined}
            className={field}
          />
          {sendError && (
            <p id="email-error" role="alert" className="text-caption text-error">
              {sendError.message}
            </p>
          )}
        </div>
        <button type="submit" disabled={sending} className={primary}>
          {sending ? "Sending…" : "Email me a code"}
        </button>
      </form>
    </div>
  );
}
