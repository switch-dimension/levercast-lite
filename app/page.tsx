// Placeholder until Home (the writing box) lands in task 2.1.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-prose flex-1 flex-col justify-center gap-6 px-5 py-16 md:px-8">
      <p className="flex items-center gap-2 text-eyebrow text-on-surface">
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        Levercast
      </p>
      <h1 className="font-serif text-headline-md md:text-headline-lg">
        Start with a rough idea. Leave with three drafts.
      </h1>
      <p className="font-serif text-body-md text-neutral">
        Write what you&rsquo;re thinking, and Levercast drafts it for LinkedIn, X, and Bluesky in
        your voice. You edit, copy, and post.
      </p>
    </main>
  );
}
