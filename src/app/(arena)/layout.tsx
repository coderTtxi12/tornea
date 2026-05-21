import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import DashboardArenaShell from "@/components/dashboard/DashboardArenaShell";
import {
  syncAppUserFromSupabaseAuthUser,
  userRowHasDashboardAccess,
} from "@/logic/auth/dashboard-access";
import { createClient } from "@/lib/supabase/server";

/** Rutas del panel operador: auth + acceso al dashboard. */
export default async function ArenaLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?error=auth");
  }

  const appUser = await syncAppUserFromSupabaseAuthUser(user);
  if (!userRowHasDashboardAccess(appUser)) {
    redirect("/solicitar-acceso");
  }

  return (
    <>
      <DashboardArenaShell />
      {children}
    </>
  );
}
