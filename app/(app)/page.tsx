import { Suspense } from "react";
import { IdeaBox } from "@/components/idea-box";
import { requireUser } from "@/lib/dal";

// Home: the writing box is the New post action (FR-6).
export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 px-5 pb-28 pt-10 md:px-8 md:pt-[88px]">
      <h1
        id="home-heading"
        className="mb-7 font-serif text-[32px] font-light leading-[1.15] tracking-[-0.015em] md:text-[44px]"
      >
        What&rsquo;s been on your mind this week?
      </h1>
      <IdeaBox variant="home" labelledBy="home-heading" />
      <Suspense fallback={null}>
        <Guard />
      </Suspense>
    </main>
  );
}

// Every page checks the user itself; layouts aren't re-run on navigation.
async function Guard() {
  await requireUser();
  return null;
}
