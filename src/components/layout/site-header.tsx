import Link from "next/link";
import { PenLine, Search } from "lucide-react";

import { auth } from "@/server/auth";
import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from "@/features/notifications/services/notification.service";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

const NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/discover?filter=trending", label: "Trending" },
  { href: "/categories", label: "Categories" },
];

export async function SiteHeader() {
  const session = await auth();

  const [notifications, unreadCount] = session?.user
    ? await Promise.all([
        getRecentNotifications(session.user.id),
        getUnreadNotificationCount(session.user.id),
      ])
    : [[], 0];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <PenLine className="size-5" />
            Inkwell
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            {session?.user && (
              <Link
                href="/feed"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Following
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" aria-label="Search" asChild>
            <Link href="/discover">
              <Search className="size-4.5" />
            </Link>
          </Button>
          <ThemeToggle />
          {session?.user ? (
            <>
              <NotificationBell notifications={notifications} unreadCount={unreadCount} />
              <UserMenu user={session.user} />
            </>
          ) : (
            <div className="ml-1 flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
