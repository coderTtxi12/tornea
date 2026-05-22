"use client";

import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function LiveFormField({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-foreground-muted text-sm font-medium">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-brand-purple text-xs" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-foreground-subtle text-[11px]">{hint}</p>
      ) : null}
    </div>
  );
}
