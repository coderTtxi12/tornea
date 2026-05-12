"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DashboardArenaLayout } from "@/components/dashboard/DashboardArenaLayout";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import {
  getAvatarUrl,
  getDisplayName,
} from "@/lib/supabase/user-display";

export default function DashboardPage() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  async function handleSignOut() {
    if (!isSupabaseAuthConfigured()) return;
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/");
    } finally {
      setSigningOut(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center">
        <div
          className="border-brand-teal size-11 animate-spin rounded-full border-2 border-t-transparent"
          aria-label="Cargando"
          role="status"
        />
      </div>
    );
  }

  const name = getDisplayName(user);
  const photo = getAvatarUrl(user);
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <DashboardArenaLayout
      displayName={name}
      email={user.email ?? null}
      avatarUrl={photo}
      avatarInitial={initial}
      onSignOut={() => void handleSignOut()}
      signingOut={signingOut}
      authConfigured={configured}
    />
  );
}
