"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions/mark-read.action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationItem = {
  id: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
  actor: {
    name: string | null;
    image: string | null;
  } | null;
};

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const [items, setItems] = useState(notifications);
  const [count, setCount] = useState(unreadCount);
  const [, startTransition] = useTransition();

  function handleItemClick(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setCount((prev) => Math.max(0, prev - (items.find((n) => n.id === id)?.isRead ? 0 : 1)));
    startTransition(async () => {
      await markNotificationReadAction(id).catch(() => undefined);
    });
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setCount(0);
    startTransition(async () => {
      await markAllNotificationsReadAction().catch(() => undefined);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4.5" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]"
            >
              {count > 9 ? "9+" : count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <p className="text-sm font-medium">Notifications</p>
          {count > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="flex flex-col">
              {items.map((notification) => {
                const body = (
                  <div
                    className={
                      "flex flex-col gap-0.5 px-3 py-2.5 text-sm hover:bg-muted/50 " +
                      (!notification.isRead ? "bg-muted/30" : "")
                    }
                  >
                    <span className="line-clamp-2">{notification.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                );

                return notification.link ? (
                  <Link
                    key={notification.id}
                    href={notification.link}
                    onClick={() => handleItemClick(notification.id)}
                  >
                    {body}
                  </Link>
                ) : (
                  <button
                    key={notification.id}
                    type="button"
                    className="text-left"
                    onClick={() => handleItemClick(notification.id)}
                  >
                    {body}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
