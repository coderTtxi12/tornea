import * as React from "react";

import { cn } from "@/lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      data-slot="select"
      className={cn(
        "flex h-10 w-full min-w-0 cursor-pointer appearance-none rounded-brand-md border border-border bg-background-muted/60 px-3 py-2 text-sm text-foreground transition-colors duration-200 focus-visible:border-brand-teal/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/25 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export { Select };
