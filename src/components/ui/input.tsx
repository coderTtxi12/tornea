import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-brand-md border border-border bg-background-muted/60 px-3 py-2 text-sm text-foreground transition-colors duration-200 placeholder:text-foreground-subtle focus-visible:border-brand-teal/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/25 disabled:cursor-not-allowed disabled:opacity-50",
        type === "date" && "[color-scheme:dark]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
