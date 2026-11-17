"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Flag, Loader2 } from "lucide-react";

import {
  createReportSchema,
  REPORT_REASON_LABELS,
  type CreateReportInput,
} from "@/features/reports/schemas/report.schema";
import { createReportAction } from "@/features/reports/actions/create-report.action";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function ReportDialog({
  targetType,
  targetId,
  reportedUserId,
  trigger,
}: {
  targetType: CreateReportInput["targetType"];
  targetId: string;
  reportedUserId?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateReportInput>({
    resolver: zodResolver(createReportSchema),
    defaultValues: { targetType, targetId, reportedUserId, reason: "SPAM", detail: "" },
  });

  function onSubmit(values: CreateReportInput) {
    startTransition(async () => {
      try {
        await createReportAction(values);
        toast.success("Thanks — our team will take a look.");
        setOpen(false);
        form.reset({ targetType, targetId, reportedUserId, reason: "SPAM", detail: "" });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to submit report.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            <Flag className="size-3.5" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report content</DialogTitle>
          <DialogDescription>
            Let us know what&apos;s wrong. Reports are reviewed by moderators.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="detail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional details (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Anything else we should know?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Submit report
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
