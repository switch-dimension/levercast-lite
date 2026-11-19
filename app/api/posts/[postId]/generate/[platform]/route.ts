import { generateDraft } from "@/lib/ai/generate";
import { getCurrentUser, unauthorized } from "@/lib/dal";
import { checkIdea } from "@/lib/domain/idea";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { getPost } from "@/lib/posts";

const notFound = () => Response.json({ error: "Not found" }, { status: 404 });

/** Streams one platform's draft for the user's post (see lib/ai/generate.ts). */
export async function POST(request: Request, ctx: RouteContext<"/api/posts/[postId]/generate/[platform]">) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { postId, platform } = await ctx.params;
  if (!PLATFORMS.includes(platform as Platform)) return notFound();
  const post = await getPost(user.id, postId);
  if (!post) return notFound();

  if (!checkIdea(post.idea).canGenerate) {
    return Response.json({ error: "Add an idea of up to 5,000 characters to generate." }, { status: 400 });
  }

  return generateDraft({ userId: user.id, post, platform: platform as Platform, signal: request.signal });
}
