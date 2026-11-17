import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/features/profile/components/follow-button";

type WriterCardData = {
  id: string;
  name: string | null;
  image: string | null;
  profile: { username: string; bio: string | null } | null;
  _count: { posts: number; followers: number };
};

export function WriterCard({
  writer,
  isFollowing,
  isAuthenticated,
  isSelf,
}: {
  writer: WriterCardData;
  isFollowing: boolean;
  isAuthenticated: boolean;
  isSelf: boolean;
}) {
  if (!writer.profile) return null;
  const initials = (writer.name ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 p-6 text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:border-border hover:bg-muted/40 hover:shadow-lg">
      <Link href={`/@${writer.profile.username}`} className="flex flex-col items-center gap-3">
        <Avatar className="size-16">
          <AvatarImage src={writer.image ?? undefined} alt={writer.name ?? ""} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{writer.name}</p>
          <p className="text-xs text-muted-foreground">
            {writer._count.followers.toLocaleString()} followers · {writer._count.posts} articles
          </p>
        </div>
      </Link>
      {writer.profile.bio && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{writer.profile.bio}</p>
      )}
      <FollowButton
        className="mt-1 w-full"
        targetUserId={writer.id}
        initialFollowing={isFollowing}
        isAuthenticated={isAuthenticated}
        isSelf={isSelf}
      />
    </div>
  );
}
