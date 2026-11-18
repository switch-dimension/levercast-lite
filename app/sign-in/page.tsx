import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · Levercast" };

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center gap-8 px-5 py-16">
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-eyebrow">
          <span aria-hidden className="size-1.5 rounded-full bg-primary" />
          Levercast
        </p>
        <h1 className="font-serif text-headline-md">Sign in</h1>
      </div>
      {/* useSearchParams reads the request, so the form streams in. */}
      <Suspense fallback={<div className="h-[248px]" />}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
