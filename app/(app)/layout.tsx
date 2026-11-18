import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/dal";
import { SignOutButton } from "./sign-out-button";

// Signed-in pages. The header is static; the account menu reads the session,
// so it streams in behind its own boundary and never holds up {children}.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-page items-center justify-between gap-4 px-5 md:px-8">
          <Link href="/" className="font-serif text-[22px] font-medium tracking-[-0.01em]">
            Levercast
          </Link>
          <Suspense fallback={null}>
            <AccountMenu />
          </Suspense>
        </div>
      </header>
      {children}
    </>
  );
}

async function AccountMenu() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-4">
      <span className="hidden text-caption text-neutral sm:inline">{user.email}</span>
      <SignOutButton />
    </div>
  );
}
