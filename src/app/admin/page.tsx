import type { Metadata } from "next";
import { Users, FileText, MessageSquare, Flag, Mail, CheckCircle2 } from "lucide-react";

import { getAdminStats, getPostsPerDay } from "@/features/admin/services/admin.service";
import { StatCard } from "@/features/admin/components/stat-card";
import { PostsChart } from "@/features/admin/components/posts-chart";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboardPage() {
  const [stats, postsPerDay] = await Promise.all([getAdminStats(), getPostsPerDay(14)]);

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">An overview of what&apos;s happening on Inkwell.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total users" value={stats.userCount} icon={Users} />
        <StatCard label="Total posts" value={stats.postCount} icon={FileText} />
        <StatCard label="Published posts" value={stats.publishedCount} icon={CheckCircle2} />
        <StatCard label="Comments" value={stats.commentCount} icon={MessageSquare} />
        <StatCard label="Pending reports" value={stats.pendingReports} icon={Flag} />
        <StatCard label="Newsletter subscribers" value={stats.subscriberCount} icon={Mail} />
      </div>

      <div className="mt-10 rounded-xl border border-border/60 p-6">
        <h2 className="mb-4 font-medium">Posts published — last 14 days</h2>
        <PostsChart data={postsPerDay} />
      </div>
    </div>
  );
}
