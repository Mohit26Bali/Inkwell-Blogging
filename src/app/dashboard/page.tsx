import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { FileText, FileEdit, Users, UserPlus, Eye, Heart, MessageCircle, Bookmark, PenSquare } from "lucide-react";

import { auth } from "@/server/auth";
import {
  getDashboardStats,
  getRecentActivity,
  getUserPosts,
} from "@/features/dashboard/services/dashboard.service";
import { DashboardPostsTable } from "@/features/dashboard/components/dashboard-posts-table";
import { RecentActivityList } from "@/features/dashboard/components/recent-activity-list";
import { StatCard } from "@/features/admin/components/stat-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  const [stats, posts, activity] = await Promise.all([
    getDashboardStats(session.user.id),
    getUserPosts(session.user.id),
    getRecentActivity(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">
            Welcome back, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-muted-foreground">Here&apos;s how your writing is doing.</p>
        </div>
        <Button asChild>
          <Link href="/new-post">
            <PenSquare className="size-4" />
            Write a new story
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Published" value={stats.publishedCount} icon={FileText} />
        <StatCard label="Drafts" value={stats.draftCount} icon={FileEdit} />
        <StatCard label="Followers" value={stats.followerCount} icon={Users} />
        <StatCard label="Following" value={stats.followingCount} icon={UserPlus} />
        <StatCard label="Total views" value={stats.totalViews} icon={Eye} />
        <StatCard label="Total likes" value={stats.totalLikes} icon={Heart} />
        <StatCard label="Total comments" value={stats.totalComments} icon={MessageCircle} />
        <StatCard label="Bookmarks" value={stats.bookmarkCount} icon={Bookmark} />
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-4 font-serif text-xl font-medium tracking-tight">Your stories</h2>
          <DashboardPostsTable posts={posts} />
        </div>
        <div>
          <h2 className="mb-4 font-serif text-xl font-medium tracking-tight">Recent activity</h2>
          <RecentActivityList notifications={activity} />
        </div>
      </div>
    </div>
  );
}
