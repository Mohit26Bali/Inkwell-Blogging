import Link from "next/link";
import type { Metadata } from "next";

import { getAdminReports, type AdminReportFilters } from "@/features/admin/services/admin.service";
import { resolveReportTarget } from "@/features/admin/services/report-target";
import { ReportActions } from "@/features/admin/components/report-actions";
import { StatusFilterSelect } from "@/features/admin/components/status-filter-select";
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

export const metadata: Metadata = { title: "Moderation queue" };

type ReportsPageProps = { searchParams: Promise<{ status?: string; page?: string }> };

const STATUS_FILTERS: NonNullable<AdminReportFilters["status"]>[] = [
  "PENDING",
  "REVIEWING",
  "RESOLVED",
  "DISMISSED",
];

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Harassment",
  MISINFORMATION: "Misinformation",
  PLAGIARISM: "Plagiarism",
  NSFW: "NSFW",
  OTHER: "Other",
};

export default async function AdminReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = STATUS_FILTERS.includes(params.status as never)
    ? (params.status as NonNullable<AdminReportFilters["status"]>)
    : "PENDING";

  const { reports, total, pageCount } = await getAdminReports({ status, page });
  const targets = await Promise.all(
    reports.map((r) => resolveReportTarget(r.targetType, r.targetId))
  );

  function buildHref(nextPage: number) {
    const next = new URLSearchParams();
    if (status !== "PENDING") next.set("status", status);
    if (nextPage > 1) next.set("page", String(nextPage));
    const qs = next.toString();
    return qs ? `/admin/reports?${qs}` : "/admin/reports";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Moderation queue</h1>
          <p className="mt-1 text-muted-foreground">{total.toLocaleString()} reports</p>
        </div>
        <StatusFilterSelect statuses={STATUS_FILTERS} currentStatus={status} />
      </div>

      {reports.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border/60 px-6 py-16 text-center text-muted-foreground">
          Nothing here.
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Reported by</TableHead>
                {status === "PENDING" && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report, index) => {
                const target = targets[index];
                return (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="secondary" className="font-normal">
                          {REASON_LABELS[report.reason] ?? report.reason}
                        </Badge>
                        {report.detail && (
                          <p className="max-w-xs truncate text-xs text-muted-foreground">
                            {report.detail}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {target ? (
                        <Link href={target.href} className="line-clamp-1 hover:underline">
                          <Badge variant="outline" className="mr-2 font-normal">
                            {report.targetType}
                          </Badge>
                          {target.label}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Deleted</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.reporter.name}
                    </TableCell>
                    {status === "PENDING" && (
                      <TableCell>
                        <ReportActions reportId={report.id} />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ResultsPagination page={page} pageCount={pageCount} buildHref={buildHref} />
    </div>
  );
}
