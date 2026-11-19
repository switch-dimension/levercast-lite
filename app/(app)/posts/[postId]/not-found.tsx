import Link from "next/link";

export default function PostNotFound() {
  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 px-5 py-16 md:px-8">
      <h1 className="mb-4 font-serif text-headline-md">This post isn&rsquo;t here</h1>
      <p className="mb-8 font-serif text-body-md text-neutral">
        It may have been deleted, or the link is wrong.
      </p>
      <Link href="/posts" className="btn btn-secondary">
        Back to My posts
      </Link>
    </main>
  );
}
