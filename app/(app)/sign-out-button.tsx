"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await authClient.signOut();
          router.replace("/sign-in");
          router.refresh();
        })
      }
      className="inline-flex min-h-11 items-center rounded-sm border border-border px-3.5 text-label-md transition-colors duration-200 hover:bg-secondary disabled:cursor-not-allowed disabled:text-disabled"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
