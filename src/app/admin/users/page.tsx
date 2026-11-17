import type { Metadata } from "next";

import { getAdminUsers } from "@/features/admin/services/admin.service";
import { UserRoleSelect } from "@/features/admin/components/user-role-select";
import { BanToggleButton } from "@/features/admin/components/ban-toggle-button";
import { ResultsPagination } from "@/components/layout/results-pagination";
import { AdminSearchInput } from "@/features/admin/components/admin-search-input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const metadata: Metadata = { title: "Manage users" };

type UsersPageProps = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { users, total, pageCount } = await getAdminUsers({ query: params.q, page });

  function buildHref(nextPage: number) {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (nextPage > 1) next.set("page", String(nextPage));
    const qs = next.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Users</h1>
          <p className="mt-1 text-muted-foreground">{total.toLocaleString()} total users</p>
        </div>
        <AdminSearchInput basePath="/admin/users" placeholder="Search users…" />
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Posts</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const initials = (user.name ?? "U").slice(0, 2).toUpperCase();
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      {user.isBanned && (
                        <Badge variant="destructive" className="shrink-0">
                          Banned
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <UserRoleSelect userId={user.id} role={user.role} />
                  </TableCell>
                  <TableCell>{user._count.posts}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <BanToggleButton userId={user.id} isBanned={user.isBanned} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ResultsPagination page={page} pageCount={pageCount} buildHref={buildHref} />
    </div>
  );
}
