import { redirect } from "next/navigation";

import { getActiveSession } from "@/server/auth/require-session";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Live role from the database (the JWT's role can be weeks out of date).
  const session = await getActiveSession();
  if (!session || session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="flex min-h-svh">
      <AdminSidebar />
      <div className="flex-1 overflow-x-hidden px-6 py-8 sm:px-10">{children}</div>
    </div>
  );
}
