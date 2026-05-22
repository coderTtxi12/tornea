"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  LIVE_FIELD_CLASS,
  LIVE_FIELD_DATE_CLASS,
  LIVE_PANEL_CLASS,
  LIVE_SELECT_CLASS,
} from "./live-field-styles";

export const LiveInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    data-slot="live-input"
    className={cn(
      type === "date" ? LIVE_FIELD_DATE_CLASS : LIVE_FIELD_CLASS,
      className,
    )}
    {...props}
  />
));
LiveInput.displayName = "LiveInput";

export const LiveSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => (
  <div className="relative min-w-0">
    <select
      ref={ref}
      data-slot="live-select"
      className={cn(LIVE_SELECT_CLASS, className)}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="text-foreground-muted pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-70"
      aria-hidden
    />
  </div>
));
LiveSelect.displayName = "LiveSelect";

export const LiveCard = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Card>>(
  ({ className, ...props }, ref) => (
    <Card ref={ref} className={cn(LIVE_PANEL_CLASS, className)} {...props} />
  ),
);
LiveCard.displayName = "LiveCard";
