import type { Metadata } from "next";

import { db } from "@/server/db/client";
import { ResultsPagination } from "@/components/layout/results-pagination";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 25;

type Props = { searchParams: Promise<{ page?: string }> };

/** Read-only history of administrator actions (bans, role changes, post status, reports). */
export default async function AdminAuditPage({ searchParams }: Props) {
  const page = Math.max(1, Math.floor(Number((await searchParams).page)) || 1);

  const [total, entries] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (n: number) =>
    n > 1 ? `/admin/audit?page=${n}` : "/admin/audit";

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium tracking-tight">
        Audit log
      </h1>
      <p className="mt-1 text-muted-foreground">
        {total.toLocaleString()} recorded actions
      </p>

      {entries.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border/60 px-6 py-16 text-center text-muted-foreground">
          Nothing recorded yet.
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {e.createdAt.toISOString().replace("T", " ").slice(0, 16)}{" "}
                    UTC
                  </TableCell>
                  <TableCell>{e.actor?.name ?? "Deleted user"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {e.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.targetType ?? "—"}
                    {e.targetId ? ` · ${e.targetId.slice(0, 8)}…` : ""}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {e.metadata ? JSON.stringify(e.metadata) : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ResultsPagination
        page={page}
        pageCount={pageCount}
        buildHref={buildHref}
      />
    </div>
  );
}
