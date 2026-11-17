"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AuthRequiredDialog({
  open,
  onOpenChange,
  message = "Sign in to continue.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-center sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in required</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => router.push("/login")}>Sign in</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
