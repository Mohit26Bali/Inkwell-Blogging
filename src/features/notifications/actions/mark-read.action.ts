"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/server/auth/require-session";
import { db } from "@/server/db/client";

export async function markNotificationReadAction(notificationId: string) {
  const session = await requireSession("You must be signed in.");

  const notification = await db.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.recipientId !== session.user.id) {
    throw new Error("Notification not found.");
  }

  await db.notification.update({ where: { id: notificationId }, data: { isRead: true } });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  const session = await requireSession("You must be signed in.");

  await db.notification.updateMany({
    where: { recipientId: session.user.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/", "layout");
}
