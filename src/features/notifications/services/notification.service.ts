import "server-only";

import { db } from "@/server/db/client";

export function getRecentNotifications(userId: string, take = 15) {
  return db.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { include: { profile: true } } },
  });
}

export function getUnreadNotificationCount(userId: string) {
  return db.notification.count({ where: { recipientId: userId, isRead: false } });
}
