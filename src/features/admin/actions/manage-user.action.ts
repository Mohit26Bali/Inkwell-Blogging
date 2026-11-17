"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@prisma/client";

import { db } from "@/server/db/client";
import { requireAdmin } from "@/features/admin/services/require-admin";

const userIdSchema = z.string().cuid();
const roleSchema = z.nativeEnum(Role);

export async function toggleUserBanAction(userId: string) {
  const admin = await requireAdmin();
  const id = userIdSchema.parse(userId);
  if (admin.user.id === id) throw new Error("You can't ban yourself.");

  const user = await db.user.findUnique({
    where: { id },
    select: { isBanned: true },
  });
  if (!user) throw new Error("User not found.");

  // Takes effect at once: every action re-checks the account (see server/auth/require-session.ts).
  // The change and its audit entry succeed or fail together.
  await db.$transaction([
    db.user.update({ where: { id }, data: { isBanned: !user.isBanned } }),
    db.auditLog.create({
      data: {
        actorId: admin.user.id,
        action: user.isBanned ? "USER_UNBANNED" : "USER_BANNED",
        targetType: "USER",
        targetId: id,
      },
    }),
  ]);

  revalidatePath("/admin/users");
  return { isBanned: !user.isBanned };
}

export async function updateUserRoleAction(userId: string, role: Role) {
  const admin = await requireAdmin();
  const id = userIdSchema.parse(userId);
  const nextRole = roleSchema.parse(role);
  if (admin.user.id === id) throw new Error("You can't change your own role.");

  const exists = await db.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) throw new Error("User not found.");

  // The change and its audit entry succeed or fail together.
  await db.$transaction([
    db.user.update({ where: { id }, data: { role: nextRole } }),
    db.auditLog.create({
      data: {
        actorId: admin.user.id,
        action: "USER_ROLE_CHANGED",
        targetType: "USER",
        targetId: id,
        metadata: { role: nextRole },
      },
    }),
  ]);

  revalidatePath("/admin/users");
}
