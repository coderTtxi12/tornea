"use client";

import { signOut } from "firebase/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
} from "@/lib/firebase/client";

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
    if (!isFirebaseConfigured()) return;
    setSigningOut(true);
    try {
      await signOut(getFirebaseAuth());
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
          aria-label="Loading"
          role="status"
        />
      </div>
    );
  }

  const photo = user.photoURL;
  const name =
    user.displayName ??
    user.providerData.find((p) => p.displayName)?.displayName ??
    "Player";

  return (
    <div className="bg-background text-foreground min-h-dvh px-5 py-12 sm:px-10">
      <div className="border-border bg-surface-card mx-auto flex max-w-lg flex-col gap-8 rounded-brand-xl border px-6 py-8 shadow-[var(--card-shadow)] sm:px-8">
        <div className="flex flex-wrap items-center gap-4">
          {photo ? (
            <Image
              src={photo}
              alt=""
              width={56}
              height={56}
              className="border-border rounded-full border object-cover"
            />
          ) : (
            <div className="border-border bg-brand-teal/20 flex size-14 shrink-0 items-center justify-center rounded-full border text-lg font-bold text-brand-teal">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-foreground-muted text-sm font-medium uppercase tracking-wide">
              Signed in
            </p>
            <p className="truncate text-lg font-semibold">{name}</p>
            {user.email ? (
              <p className="text-foreground-muted truncate text-sm">{user.email}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-foreground-muted text-sm leading-relaxed">
            Tournament and league experiences stay branded around Organiza,
            Compite, Conecta — replace this stub with your first flows when ready.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut || !configured}
          className="border-border hover:bg-surface-code rounded-brand-lg border px-4 py-3 text-sm font-semibold transition disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
