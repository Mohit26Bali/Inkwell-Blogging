import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Globe, AtSign, Code2, Briefcase } from "lucide-react";

import { auth } from "@/server/auth";
import {
  getIsFollowing,
  getProfileByUsername,
  getUserPublishedPosts,
} from "@/features/profile/services/profile.service";
import { PostCard } from "@/features/posts/components/post-card";
import { FollowButton } from "@/features/profile/components/follow-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ProfilePageProps = { params: Promise<{ handle: string }> };

function resolveUsername(handle: string): string | null {
  const decoded = decodeURIComponent(handle);
  return decoded.startsWith("@") ? decoded.slice(1) : null;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const username = resolveUsername(handle);
  if (!username) return {};

  const user = await getProfileByUsername(username);
  if (!user) return {};

  return {
    title: user.name ?? `@${username}`,
    description: user.profile?.bio ?? undefined,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;
  const username = resolveUsername(handle);
  if (!username) notFound();

  const user = await getProfileByUsername(username);
  if (!user || !user.profile) notFound();

  const session = await auth();
  const [posts, isFollowing] = await Promise.all([
    getUserPublishedPosts(user.id),
    getIsFollowing(session?.user?.id, user.id),
  ]);
  const initials = (user.name ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <Avatar className="size-24">
          <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="font-serif text-3xl font-medium tracking-tight">{user.name}</h1>
          <p className="text-muted-foreground">@{user.profile.username}</p>
          {user.profile.bio && <p className="mt-3 max-w-xl">{user.profile.bio}</p>}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
            <span>
              <strong className="text-foreground">{user._count.posts}</strong> articles
            </span>
            <span>
              <strong className="text-foreground">{user._count.followers}</strong> followers
            </span>
            <span>
              <strong className="text-foreground">{user._count.following}</strong> following
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            {user.profile.website && (
              <Link
                href={user.profile.website}
                target="_blank"
                className="text-muted-foreground hover:text-foreground"
              >
                <Globe className="size-4" />
              </Link>
            )}
            {user.profile.twitter && (
              <Link
                href={`https://twitter.com/${user.profile.twitter}`}
                target="_blank"
                className="text-muted-foreground hover:text-foreground"
              >
                <AtSign className="size-4" />
              </Link>
            )}
            {user.profile.github && (
              <Link
                href={`https://github.com/${user.profile.github}`}
                target="_blank"
                className="text-muted-foreground hover:text-foreground"
              >
                <Code2 className="size-4" />
              </Link>
            )}
            {user.profile.linkedin && (
              <Link
                href={`https://linkedin.com/in/${user.profile.linkedin}`}
                target="_blank"
                className="text-muted-foreground hover:text-foreground"
              >
                <Briefcase className="size-4" />
              </Link>
            )}
          </div>

          <FollowButton
            className="mt-5"
            targetUserId={user.id}
            initialFollowing={isFollowing}
            isAuthenticated={Boolean(session?.user)}
            isSelf={session?.user?.id === user.id}
          />
        </div>
      </div>

      <div className="mt-14">
        <h2 className="mb-8 font-serif text-2xl font-medium tracking-tight">Articles</h2>
        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <CalendarDays className="size-6" />
            <p>No published articles yet.</p>
          </div>
        ) : (
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
