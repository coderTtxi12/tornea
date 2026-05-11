import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  syncAppUserFromSupabaseAuthUser,
  userRowHasDashboardAccess,
} from "@/logic/auth/dashboard-access";
import { createClient } from "@/lib/supabase/server";

export default async function SolicitarAccesoLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const appUser = await syncAppUserFromSupabaseAuthUser(user);
  if (userRowHasDashboardAccess(appUser)) {
    redirect("/dashboard");
  }

  return children;
}
