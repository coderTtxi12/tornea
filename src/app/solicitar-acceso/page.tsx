import { redirect } from "next/navigation";

import { AccessRequestWizard } from "@/components/access-request/AccessRequestWizard";
import { userHasAnyDashboardAccessRequest } from "@/logic/access-request/access-request-form";
import { syncAppUserFromSupabaseAuthUser } from "@/logic/auth/dashboard-access";
import { createClient } from "@/lib/supabase/server";

export default async function SolicitarAccesoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const appUser = await syncAppUserFromSupabaseAuthUser(user);
  const alreadySubmitted = await userHasAnyDashboardAccessRequest(appUser.id);

  return (
    <AccessRequestWizard
      alreadySubmitted={alreadySubmitted}
      userEmail={user.email ?? ""}
    />
  );
}
