import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ActivityNotification = {
  id: string;
  message: string;
  link: string | null;
  createdAt: Date;
  actor: {
    name: string | null;
    image: string | null;
    profile: { username: string } | null;
  } | null;
};

export function RecentActivityList({ notifications }: { notifications: ActivityNotification[] }) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border/60 px-6 py-12 text-center text-muted-foreground">
        <Bell className="size-5" />
        <p className="text-sm">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border/60 rounded-xl border border-border/60">
      {notifications.map((notification) => {
        const initials = (notification.actor?.name ?? "?").slice(0, 2).toUpperCase();
        const content = (
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={notification.actor?.image ?? undefined} alt="" />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{notification.message}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>
        );

        return notification.link ? (
          <Link key={notification.id} href={notification.link} className="hover:bg-muted/40">
            {content}
          </Link>
        ) : (
          <div key={notification.id}>{content}</div>
        );
      })}
    </div>
  );
}
