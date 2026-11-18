import Link from "next/link";
import { ideaPreview, postStatus, relativeTime } from "@/lib/domain/post-status";
import type { PostListItem } from "@/lib/posts";

/** One post in Home's Recent cards or the My posts list (FR-5). */
export function PostCard({ post, now }: { post: PostListItem; now: Date }) {
  const status = postStatus(post);
  return (
    <Link
      href={`/posts/${post.id}`}
      className="grid content-between gap-2.5 rounded-lg border border-border bg-surface px-5 py-[18px] transition-colors duration-200 hover:bg-secondary"
    >
      <span className="font-serif text-[17px] leading-[1.45]">{ideaPreview(post.idea)}</span>
      <span className="flex items-center gap-2">
        <span className={`status status-${status.key}`}>{status.label}</span>
        <span className="text-caption text-neutral">
          Updated <time dateTime={post.updatedAt.toISOString()}>{relativeTime(post.updatedAt, now)}</time>
        </span>
      </span>
    </Link>
  );
}
