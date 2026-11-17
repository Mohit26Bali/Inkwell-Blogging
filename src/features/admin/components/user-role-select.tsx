"use client";

import { useTransition } from "react";
import type { Role } from "@prisma/client";
import { toast } from "sonner";

import { updateUserRoleAction } from "@/features/admin/actions/manage-user.action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES: Role[] = ["READER", "WRITER", "MODERATOR", "ADMIN"];

export function UserRoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      try {
        await updateUserRoleAction(userId, value as Role);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update role.");
      }
    });
  }

  return (
    <Select defaultValue={role} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
