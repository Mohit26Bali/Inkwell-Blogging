import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type AuthorCardData = {
  name: string | null;
  image: string | null;
  profile: { username: string; bio: string | null } | null;
};

export function AuthorCard({ author }: { author: AuthorCardData }) {
  const initials = (author.name ?? "U").slice(0, 2).toUpperCase();
  const username = author.profile?.username;

  return (
    <div className="flex items-start gap-4 rounded-xl border border-border/60 p-5">
      <Link href={username ? `/@${username}` : "#"}>
        <Avatar className="size-12">
          <AvatarImage src={author.image ?? undefined} alt={author.name ?? ""} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={username ? `/@${username}` : "#"} className="font-medium hover:underline">
          {author.name}
        </Link>
        {author.profile?.bio && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{author.profile.bio}</p>
        )}
        <Button variant="outline" size="sm" className="mt-3">
          Follow
        </Button>
      </div>
    </div>
  );
}
