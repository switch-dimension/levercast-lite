import { Suspense } from "react";
import { requireUser } from "@/lib/dal";

// Home. Placeholder until the writing box lands in task 2.1.
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-prose flex-1 flex-col gap-6 px-5 py-16 md:px-8">
      <h1 className="font-serif text-headline-md md:text-headline-lg">
        What&rsquo;s been on your mind this week?
      </h1>
      <Suspense fallback={null}>
        <Greeting />
      </Suspense>
    </main>
  );
}

async function Greeting() {
  const user = await requireUser();
  return (
    <p className="font-serif text-body-md text-neutral">
      You&rsquo;re signed in as {user.email}. The writing box arrives here next.
    </p>
  );
}
