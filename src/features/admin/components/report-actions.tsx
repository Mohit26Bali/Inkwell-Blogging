"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

import { updateReportStatusAction } from "@/features/admin/actions/manage-report.action";
import { Button } from "@/components/ui/button";

export function ReportActions({ reportId }: { reportId: string }) {
  const [isPending, startTransition] = useTransition();

  function handle(status: "RESOLVED" | "DISMISSED") {
    startTransition(async () => {
      try {
        await updateReportStatusAction(reportId, status);
        toast.success(status === "RESOLVED" ? "Report resolved." : "Report dismissed.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update report.");
      }
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" disabled={isPending} onClick={() => handle("DISMISSED")}>
        <X className="size-3.5" />
        Dismiss
      </Button>
      <Button size="sm" disabled={isPending} onClick={() => handle("RESOLVED")}>
        <Check className="size-3.5" />
        Resolve
      </Button>
    </div>
  );
}
