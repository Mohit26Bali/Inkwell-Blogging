import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ResultsPagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="mt-16 flex items-center justify-center gap-2">
      <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
        {page > 1 ? (
          <Link href={buildHref(page - 1)}>
            <ChevronLeft className="size-4" />
            Previous
          </Link>
        ) : (
          <span>
            <ChevronLeft className="size-4" />
            Previous
          </span>
        )}
      </Button>
      <span className="px-3 text-sm text-muted-foreground">
        Page {page} of {pageCount}
      </span>
      <Button variant="outline" size="sm" disabled={page >= pageCount} asChild={page < pageCount}>
        {page < pageCount ? (
          <Link href={buildHref(page + 1)}>
            Next
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span>
            Next
            <ChevronRight className="size-4" />
          </span>
        )}
      </Button>
    </div>
  );
}
